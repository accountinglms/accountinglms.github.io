// Raw Supabase protocol v1 payloads. Read receipts never invalidate messages.
export function planChatUpdate(payload,{roomId,messageIds=[]}={}){
  const data=payload?.data;
  if(!data||data.schema&&data.schema!=='public')return data?{}:{core:true,messages:true};
  const row=(data.type==='DELETE'?data.old_record:data.record)||{},ids=new Set(messageIds.map(String));
  if(data.table==='chat_reads')return {read:row,readDeleted:data.type==='DELETE'};
  if(data.table==='chat_messages'){
    const id=String(row.id??'');
    const current=row.group_id===roomId||!row.group_id&&ids.has(id);
    return {summaries:true,...(current&&/^\d+$/.test(id)&&(data.type==='INSERT'||ids.has(id))?{messageIds:[id]}:!row.group_id&&!id?{messages:true}:{})};
  }
  if(data.table==='chat_message_reactions')return row.message_id?(ids.has(String(row.message_id))?{reactionIds:[String(row.message_id)]}:{}):{reactions:true};
  if(data.table==='profiles')return {core:true,render:true};
  if(['chat_groups','chat_group_members','announcements'].includes(data.table))return {core:true};
  return {};
}

// One active refresh; a continuous burst cannot keep postponing the first batch.
export function createChatUpdateQueue(run,{delay=180,isPaused=()=>false,onError=console.warn}={}){
  let pending=null,failed=null,timer=null,running=false,stopped=false;
  const merge=update=>{
    pending??={messageIds:new Set(),reactionIds:new Set()};
    for(const [key,value] of Object.entries(update)){
      if(key==='messageIds'||key==='reactionIds')for(const id of value)pending[key].add(String(id));
      else if(value)pending[key]=true;
    }
  };
  const schedule=()=>{if(!stopped&&pending&&!timer&&!running&&!isPaused())timer=setTimeout(flush,delay);};
  async function flush(){
    timer=null;
    if(stopped||running||!pending||isPaused())return;
    const batch=pending;pending=null;running=true;
    batch.messageIds=[...batch.messageIds];
    batch.reactionIds=[...batch.reactionIds];
    try{await run(batch);}catch(error){failed=batch;onError(error);}
    finally{
      running=false;
      // Retry failed IDs with the next event, without a self-sustaining retry loop.
      if(pending&&failed){merge(failed);failed=null;}
      schedule();
    }
  }
  return {
    push(update){
      if(stopped||!update||!Object.keys(update).length)return;
      if(failed){merge(failed);failed=null;}
      merge(update);
      schedule();
    },
    resume:schedule,
    stop(){stopped=true;clearTimeout(timer);timer=null;pending=null;failed=null;}
  };
}
