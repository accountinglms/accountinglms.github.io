// Draft text belongs to one signed-in account and one conversation.
// File objects stay in memory; after a reload their names request re-selection.
const MAX_ROOMS=50;
const empty=()=>({text:'',type:'text',replyTo:null,editingId:null,file:null,attachment:null});
const messageId=value=>Number.isSafeInteger(value)&&value>0?value:null;
function clean(value={}){
  const attachment=value.file?{name:value.file.name,size:value.file.size}:value.attachment;
  return {
    text:String(value.text||'').slice(0,8000),
    type:['text','assignment'].includes(value.type)?value.type:'text',
    replyTo:messageId(value.replyTo),editingId:messageId(value.editingId),
    file:value.file||null,
    attachment:attachment?.name?{name:String(attachment.name).slice(0,255),size:Number(attachment.size)||0}:null
  };
}
export function createChatDrafts(userId,storage){
  if(!userId)throw new Error('Drafts require a signed-in account');
  const key='lms-chat-drafts-v1:'+userId,rooms=new Map();
  try{
    const saved=JSON.parse(storage?.getItem(key)||'[]');
    if(Array.isArray(saved))for(const entry of saved.slice(-MAX_ROOMS)){
      if(Array.isArray(entry)&&typeof entry[0]==='string'&&entry[1]&&typeof entry[1]==='object')rooms.set(entry[0],clean({...entry[1],file:null}));
    }
  }catch{/* Unavailable storage must not interrupt composing. */}
  const get=room=>({...rooms.get(room)||empty()});
  const put=(room,value)=>{
    if(!room)return;
    const draft=clean(value);
    rooms.delete(room);
    if(draft.text||draft.attachment||draft.replyTo||draft.editingId)rooms.set(room,draft);
    while(rooms.size>MAX_ROOMS)rooms.delete(rooms.keys().next().value);
  };
  const flush=()=>{
    try{storage?.setItem(key,JSON.stringify([...rooms].map(([room,{file,...draft}])=>[room,draft])));}catch{}
  };
  const consume=(room,sent,{sticker=false}={})=>{
    const draft=get(room);
    if(!sticker){
      if(draft.text===sent.text)draft.text='';
      if(draft.file===sent.file){draft.file=null;draft.attachment=null;}
      if(draft.editingId===sent.editingId)draft.editingId=null;
    }
    if(draft.replyTo===sent.replyTo)draft.replyTo=null;
    put(room,draft);flush();
    return get(room);
  };
  return {get,put,flush,consume};
}
