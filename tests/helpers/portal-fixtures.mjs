export function assert(condition,message){if(!condition)throw new Error(message);}
export const user={id:'11111111-1111-4111-8111-111111111111',email:'owner@example.com',email_confirmed_at:'2026-10-09T00:00:00Z',confirmed_at:'2026-10-09T00:00:00Z',user_metadata:{display_name:'Portal Owner'},factors:[]};
export const peer={id:'22222222-2222-4222-8222-222222222222',display_name:'Study Partner'};
export const session={access_token:'portal-token',refresh_token:'portal-refresh',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user};

function cors(){return {'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,PATCH,DELETE,OPTIONS','access-control-allow-headers':'authorization,apikey,content-type,prefer','access-control-expose-headers':'*'};}
function json(route,body,status=200){return route.fulfill({status,contentType:'application/json',headers:cors(),body:JSON.stringify(body)});}

export function installFakeWebSocket(context){
  return context.addInitScript(()=>{
    class FakeWebSocket{
      static OPEN=1; static CONNECTING=0; static CLOSED=3;
      constructor(){this.readyState=0;this.handlers={};setTimeout(()=>{this.readyState=1;this.emit('open',{});},5);}
      addEventListener(type,handler){(this.handlers[type]??=[]).push(handler);}
      send(){}
      close(){this.readyState=3;this.emit('close',{});}
      emit(type,event){for(const fn of this.handlers[type]||[])fn(event);}
    }
    window.WebSocket=FakeWebSocket;
  });
}

export async function installMock(context){
  const state={
    subjects:[{id:'accounting',title:'Accounting',sort_order:0,is_active:true,exam_level:'certificate'}],
    chapters:[
      {id:'ch1',subject_id:'accounting',title:'Accounting principles',sort_order:0,is_active:true},
      {id:'ch2',subject_id:'accounting',title:'Adjustments',sort_order:1,is_active:true}
    ],
    lessons:[{id:'lesson-1',chapter_id:'ch1',title:'Conceptual framework',summary:'Core theory',status:'published',sort_order:0}],
    exercises:[
      {id:'ex1',chapter_id:'ch1',title:'Practice 1',question_count:10,sort_order:0,is_active:true},
      {id:'ex2',chapter_id:'ch2',title:'Practice 2',question_count:10,sort_order:0,is_active:true}
    ],
    attempts:[
      {id:'a1',user_id:user.id,exercise_id:'ex1',score:5,total_questions:10,accuracy:50,correct_count:5,wrong_count:5,bookmarked_count:2,completed_at:'2026-10-01T10:00:00Z',context_snapshot:{subject_id:'accounting',chapter_id:'ch1'}},
      {id:'a2',user_id:user.id,exercise_id:'ex1',score:6,total_questions:10,accuracy:60,correct_count:6,wrong_count:4,bookmarked_count:1,completed_at:'2026-10-05T10:00:00Z',context_snapshot:{subject_id:'accounting',chapter_id:'ch1'}},
      {id:'a3',user_id:user.id,exercise_id:'ex2',score:5,total_questions:10,accuracy:50,correct_count:5,wrong_count:5,bookmarked_count:1,completed_at:'2026-10-08T10:00:00Z',context_snapshot:{subject_id:'accounting',chapter_id:'ch2'}}
    ],
    progress:[{user_id:user.id,exercise_id:'ex1',bookmarks:[true,false,true,false,false,false,false,false,false,false]},{user_id:user.id,exercise_id:'ex2',bookmarks:[true,false,false,false,false,false,false,false,false,false]}],
    announcements:[{id:'ann-1',title:'Bảo trì cuối tuần',body:'Hệ thống sẽ cập nhật phần Progress.',kind:'maintenance',status:'published',audience:'members',published_at:'2026-10-09T12:00:00Z',created_at:'2026-10-09T12:00:00Z'}],
    announcementReads:[],
    groups:[{id:'00000000-0000-4000-8000-000000000001',name:'General',description:'Kênh chung',is_public:true,is_official:true,created_by:null,created_at:'2026-10-09T08:00:00Z',updated_at:'2026-10-09T12:00:00Z'}],
    memberships:[
      {group_id:'00000000-0000-4000-8000-000000000001',user_id:user.id,role:'member',joined_at:'2026-10-09T08:00:00Z'},
      {group_id:'00000000-0000-4000-8000-000000000001',user_id:peer.id,role:'member',joined_at:'2026-10-09T08:00:00Z'}
    ],
    reads:[{group_id:'00000000-0000-4000-8000-000000000001',user_id:user.id,last_read_at:'2026-10-09T10:00:00Z',updated_at:'2026-10-09T10:00:00Z'}],
    messages:[{id:1,group_id:'00000000-0000-4000-8000-000000000001',sender_id:peer.id,body:'Ai đang ôn adjustments?',message_type:'text',attachment_path:null,attachment_name:null,attachment_size:null,created_at:'2026-10-09T11:00:00Z',deleted_at:null}],
    reactions:[],
    profiles:[{id:user.id,display_name:'Portal Owner'},peer],
    friendships:[{id:'req-1',requester_id:peer.id,recipient_id:user.id,status:'pending',created_at:'2026-10-09T12:00:00Z'}],
    feedback:[],
    avatarFiles:new Map(),
    mutations:{feedback:0,announcement:0,message:0,reaction:0,file:0,subjectPatch:0}
  };

  await context.route('https://uangiwgznukuicrfnohq.supabase.co/**',async route=>{
    const req=route.request(),url=new URL(req.url()),path=url.pathname,method=req.method();
    if(method==='OPTIONS')return route.fulfill({status:204,headers:cors(),body:''});
    if(path==='/auth/v1/user')return json(route,user);
    if(path==='/rest/v1/rpc/get_my_access')return json(route,{allowed:true,editor:true,role:'owner',mfa_required:false,mfa_satisfied:true,aal:'aal2'});
    if(path==='/rest/v1/rpc/get_portal_unread_counts'){
      const rows=state.memberships.filter(m=>m.user_id===user.id).map(m=>{
        const read=state.reads.find(x=>x.group_id===m.group_id&&x.user_id===user.id)?.last_read_at||'1970-01-01T00:00:00Z';
        const unread=state.messages.filter(msg=>msg.group_id===m.group_id&&msg.sender_id!==user.id&&msg.created_at>read&&!msg.deleted_at).length;
        return {group_id:m.group_id,unread_count:unread};
      });
      return json(route,rows);
    }


    if(path==='/rest/v1/rpc/search_chat_messages'){
      const body=JSON.parse(req.postData()||'{}'),q=String(body.p_query||'').toLowerCase();
      return json(route,state.messages.filter(m=>m.group_id===body.p_group&&String(m.body||'').toLowerCase().includes(q)).map(m=>({id:m.id,body:m.body,sender_id:m.sender_id,created_at:m.created_at})));
    }
    if(path==='/rest/v1/rpc/create_study_group'){
      const body=JSON.parse(req.postData()||'{}');
      const row={id:'33333333-3333-4333-8333-333333333333',name:body.p_name,
        description:body.p_description,is_public:body.p_public,is_official:false,
        kind:'group',created_by:user.id,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
      state.groups.unshift(row);
      state.memberships.push({group_id:row.id,user_id:user.id,role:'owner',joined_at:new Date().toISOString()});
      return json(route,row.id);
    }
    if(path==='/rest/v1/rpc/respond_friend'){
      const body=JSON.parse(req.postData()||'{}');
      const f=state.friendships.find(x=>x.id===body.p_request);
      if(f){if(body.p_accept)f.status='accepted';else state.friendships=state.friendships.filter(x=>x.id!==f.id);}
      return json(route,true);
    }
    if(path==='/rest/v1/rpc/request_friend'){
      const body=JSON.parse(req.postData()||'{}'),id='req-'+(state.friendships.length+1);
      state.friendships.unshift({id,requester_id:user.id,recipient_id:body.p_recipient,status:'pending',created_at:new Date().toISOString()});
      return json(route,id);
    }
    if(path==='/rest/v1/rpc/remove_friend'){
      const body=JSON.parse(req.postData()||'{}');
      state.friendships=state.friendships.filter(f=>f.requester_id!==body.p_friend&&f.recipient_id!==body.p_friend);
      return json(route,true);
    }
    if(path==='/rest/v1/rpc/start_direct_chat'){
      const body=JSON.parse(req.postData()||'{}');
      if(!state.friendships.some(f=>f.status==='accepted'&&f.requester_id===body.p_friend||f.status==='accepted'&&f.recipient_id===body.p_friend))
        return json(route,{message:'Accept friendship first'},400);
      const id='44444444-4444-4444-8444-444444444444';
      if(!state.groups.some(g=>g.id===id)){
        state.groups.unshift({id,name:'Tin nhắn riêng',kind:'direct',direct_low:user.id,direct_high:body.p_friend,is_public:false,is_official:false,created_at:new Date().toISOString(),updated_at:new Date().toISOString()});
        for(const member of [user.id,body.p_friend])state.memberships.push({group_id:id,user_id:member,role:'member',joined_at:new Date().toISOString()});
      }
      return json(route,id);
    }

    if(path.startsWith('/storage/v1/object/profile-avatars/')){
      if(method==='POST'){
        // WebKit does not expose streamed Blob request bytes to Playwright route.postDataBuffer().
        // Return a genuine WebP sample so signed-in GET/cross-page rendering is exercised.
        const webpSample=Buffer.from('UklGRjYAAABXRUJQVlA4ICoAAACQAQCdASoQABAAAUAmJZgCdLoAA5gA/vLrf/xDnQ50OX/v+xZy2BYgAAA=','base64');
        state.avatarFiles.set(path,webpSample);
        return json(route,{Key:path},201);
      }
      if(method==='GET')return json(route,{message:'Private avatars require the authenticated download endpoint'},403);
      if(method==='DELETE'){state.avatarFiles.delete(path);return json(route,{});}
    }
    if(path.startsWith('/storage/v1/object/authenticated/profile-avatars/')){
      if(method!=='GET'||!req.headers().authorization?.startsWith('Bearer '))
        return json(route,{message:'Authentication required'},401);
      const storagePath=path.replace('/object/authenticated/','/object/');
      const buffer=state.avatarFiles.get(storagePath);
      return buffer?route.fulfill({status:200,headers:{...cors(),'content-type':'image/webp'},body:buffer})
        :json(route,{message:'File not found'},404);
    }
    if(path.startsWith('/storage/v1/object/chat-files/')){
      state.mutations.file++;
      return json(route,{Key:'ok'});
    }
    if(path.startsWith('/storage/v1/object/authenticated/chat-files/')){
      return route.fulfill({status:200,headers:{...cors(),'content-type':'text/plain'},body:'test-file'});
    }

    const table=path.startsWith('/rest/v1/')?path.slice('/rest/v1/'.length):'';
    if(table==='subjects'){
      if(method==='PATCH'){const body=JSON.parse(req.postData()||'{}');state.subjects[0]={...state.subjects[0],...body};state.mutations.subjectPatch++;return json(route,[state.subjects[0]]);}
      if(method==='POST'){
        const body=JSON.parse(req.postData()||'{}');
        const row={exam_level:'certificate',...body};
        state.subjects.push(row);
        return json(route,[row],201);
      }
      return json(route,state.subjects);
    }
    if(table==='chapters')return json(route,state.chapters);
    if(table==='lessons')return json(route,state.lessons);
    if(table==='exercises')return json(route,state.exercises);
    if(table==='exercise_attempts')return json(route,state.attempts);
    if(table==='user_progress')return json(route,state.progress);
    if(table==='profiles'){
      if(method==='PATCH'){
        const uid=url.searchParams.get('id')?.replace('eq.','');
        const row=state.profiles.find(p=>p.id===uid);
        if(row)Object.assign(row,JSON.parse(req.postData()||'{}'));
        return json(route,row?[row]:[]);
      }
      const columns=(url.searchParams.get('select')||'*').split(',');
      const profileRows=state.profiles.filter(p=>{
        const uid=url.searchParams.get('id')?.replace('eq.','');
        return !uid||p.id===uid;
      }).map(p=>columns.includes('*')?{...p}:Object.fromEntries(columns.filter(c=>Object.hasOwn(p,c)).map(c=>[c,p[c]])));
      return json(route,profileRows);
    }
    if(table==='social_friendships')return json(route,state.friendships);

    if(table==='announcements'){
      if(method==='POST'){
        const body=JSON.parse(req.postData()||'{}'),row={id:'ann-'+(state.announcements.length+1),created_at:new Date().toISOString(),...body};
        state.announcements.unshift(row);state.mutations.announcement++;return json(route,[row],201);
      }
      return json(route,state.announcements.filter(a=>a.status==='published'));
    }
    if(table==='announcement_reads'){
      if(method==='POST'){
        const body=JSON.parse(req.postData()||'{}');state.announcementReads.push({...body,read_at:new Date().toISOString()});return json(route,[state.announcementReads.at(-1)],201);
      }
      return json(route,state.announcementReads);
    }
    if(table==='feedback'){
      if(method==='POST'){
        const body=JSON.parse(req.postData()||'{}'),row={id:'fb-'+(state.feedback.length+1),status:'new',created_at:new Date().toISOString(),...body};
        state.feedback.unshift(row);state.mutations.feedback++;return json(route,[row],201);
      }
      if(method==='PATCH'){
        const id=url.searchParams.get('id')?.replace('eq.','');const body=JSON.parse(req.postData()||'{}');const row=state.feedback.find(x=>x.id===id);if(row)Object.assign(row,body);return json(route,row?[row]:[]);
      }
      return json(route,state.feedback);
    }
    if(table==='chat_groups'){
      if(method==='POST'){
        const body=JSON.parse(req.postData()||'{}'),row={id:'33333333-3333-4333-8333-333333333333',created_at:new Date().toISOString(),updated_at:new Date().toISOString(),...body};
        state.groups.unshift(row);state.memberships.push({group_id:row.id,user_id:user.id,role:'owner',joined_at:new Date().toISOString()});return json(route,[row],201);
      }
      return json(route,state.groups);
    }
    if(table==='chat_group_members'){
      if(method==='POST'){const body=JSON.parse(req.postData()||'{}');state.memberships.push({...body,joined_at:new Date().toISOString()});return json(route,[body],201);}
      return json(route,state.memberships);
    }
    if(table==='chat_reads'){
      if(method==='POST'){
        const body=JSON.parse(req.postData()||'{}');const row=state.reads.find(r=>r.group_id===body.group_id&&r.user_id===body.user_id);
        if(row)Object.assign(row,body);else state.reads.push(body);
        return json(route,[body],201);
      }
      return json(route,state.reads);
    }
    if(table==='chat_messages'){
      if(method==='PATCH'){
        const id=Number(url.searchParams.get('id')?.replace('eq.',''));
        const msg=state.messages.find(m=>m.id===id);
        if(msg)Object.assign(msg,JSON.parse(req.postData()||'{}'),{edited_at:new Date().toISOString()});
        return json(route,msg?[msg]:[]);
      }
      if(method==='POST'){
        const body=JSON.parse(req.postData()||'{}'),row={id:state.messages.length+1,created_at:new Date().toISOString(),deleted_at:null,...body};
        state.messages.push(row);state.mutations.message++;return json(route,[row],201);
      }
      if(method==='DELETE'){
        const id=Number(url.searchParams.get('id')?.replace('eq.',''));state.messages=state.messages.filter(m=>m.id!==id);return json(route,[]);
      }
      const group=url.searchParams.get('group_id')?.replace('eq.','');
      let data=group?state.messages.filter(m=>m.group_id===group):[...state.messages];
      const beforeId=Number(url.searchParams.get('id')?.replace('lt.',''));
      if(Number.isFinite(beforeId)&&beforeId>0)data=data.filter(m=>m.id<beforeId);
      if((url.searchParams.get('order')||'').includes('desc'))data.sort((a,b)=>Number(b.id)-Number(a.id));
      else data.sort((a,b)=>Number(a.id)-Number(b.id));
      const limit=Number(url.searchParams.get('limit'));
      if(Number.isFinite(limit)&&limit>0)data=data.slice(0,limit);
      return json(route,data);
    }
    if(table==='chat_message_reactions'){
      if(method==='POST'){const body=JSON.parse(req.postData()||'{}');state.reactions.push({...body,created_at:new Date().toISOString()});state.mutations.reaction++;return json(route,[body],201);}
      if(method==='DELETE'){
        const mid=Number(url.searchParams.get('message_id')?.replace('eq.','')),emoji=(url.searchParams.get('emoji')||'').replace('eq.','');
        state.reactions=state.reactions.filter(r=>!(r.message_id===mid&&r.user_id===user.id&&r.emoji===emoji));return json(route,[]);
      }
      return json(route,state.reactions);
    }
    if(path.startsWith('/rest/v1/')){
      if(method==='GET')return json(route,[]);
      return json(route,[]);
    }
    return json(route,{});
  });
  return state;
}

