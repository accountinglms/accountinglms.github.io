import { chromium, webkit } from 'playwright';

const browserName=process.env.BROWSER||'chromium';
const engine=browserName==='webkit'?webkit:chromium;
const baseURL=process.env.TEST_BASE_URL||'https://127.0.0.1:4173';
const AUTH_KEY='icaew-lms-auth-v2';

function assert(condition,message){if(!condition)throw new Error(message);}
const user={id:'11111111-1111-4111-8111-111111111111',email:'owner@example.com',email_confirmed_at:'2026-10-09T00:00:00Z',confirmed_at:'2026-10-09T00:00:00Z',user_metadata:{display_name:'Portal Owner'},factors:[]};
const peer={id:'22222222-2222-4222-8222-222222222222',display_name:'Study Partner'};
const session={access_token:'portal-token',refresh_token:'portal-refresh',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user};

function cors(){return {'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,PATCH,DELETE,OPTIONS','access-control-allow-headers':'authorization,apikey,content-type,prefer','access-control-expose-headers':'*'};}
function json(route,body,status=200){return route.fulfill({status,contentType:'application/json',headers:cors(),body:JSON.stringify(body)});}

function installFakeWebSocket(context){
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

async function installMock(context){
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
    feedback:[],
    mutations:{feedback:0,announcement:0,message:0,reaction:0,file:0,subjectPatch:0}
  };

  await context.route('https://uangiwgznukuicrfnohq.supabase.co/**',async route=>{
    const req=route.request(),url=new URL(req.url()),path=url.pathname,method=req.method();
    if(method==='OPTIONS')return route.fulfill({status:204,headers:cors(),body:''});
    if(path==='/auth/v1/user')return json(route,user);
    if(path==='/rest/v1/rpc/get_my_access')return json(route,{allowed:true,editor:true,role:'owner',mfa_required:false,mfa_satisfied:true,aal:'aal2'});

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
      return json(route,state.subjects);
    }
    if(table==='chapters')return json(route,state.chapters);
    if(table==='lessons')return json(route,state.lessons);
    if(table==='exercises')return json(route,state.exercises);
    if(table==='exercise_attempts')return json(route,state.attempts);
    if(table==='user_progress')return json(route,state.progress);
    if(table==='profiles')return json(route,state.profiles);

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
      if(method==='POST'){
        const body=JSON.parse(req.postData()||'{}'),row={id:state.messages.length+1,created_at:new Date().toISOString(),deleted_at:null,...body};
        state.messages.push(row);state.mutations.message++;return json(route,[row],201);
      }
      if(method==='DELETE'){
        const id=Number(url.searchParams.get('id')?.replace('eq.',''));state.messages=state.messages.filter(m=>m.id!==id);return json(route,[]);
      }
      const group=url.searchParams.get('group_id')?.replace('eq.','');
      const data=group?state.messages.filter(m=>m.group_id===group):[...state.messages].sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at));
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

async function newPortalPage(browser,stateSetup=true){
  const context=await browser.newContext({serviceWorkers:'block',ignoreHTTPSErrors:true,viewport:{width:1280,height:850}});
  await installFakeWebSocket(context);
  const state=stateSetup?await installMock(context):null;
  const page=await context.newPage();
  await page.addInitScript(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:AUTH_KEY,value:session});
  return {context,page,state};
}

async function testHome(browser){
  const {context,page,state}=await newPortalPage(browser);
  await page.goto(baseURL+'/home.html',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#admin-home-panel:not([hidden])');
  await page.waitForFunction(()=>document.querySelector('#metric-attempts')?.textContent==='3');
  assert((await page.textContent('#welcome-title')).includes('Portal Owner'),'Home did not render member identity');
  assert((await page.textContent('#metric-starred'))==='3','Home starred count is wrong');
  assert((await page.textContent('#global-notification-count'))==='2','Home notification badge should combine chat + admin unread');
  assert((await page.locator('#subject-catalog .subject-row').count())===1,'Home subject catalog did not render');
  assert((await page.locator('#subject-catalog .chapter-row').count())===2,'Home chapter TOC did not render');

  await page.fill('#feedback-subject','Need another mock');
  await page.fill('#feedback-message','Please add a timed mock for adjustments.');
  await page.click('#feedback-form button[type="submit"]');
  await page.waitForTimeout(350);
  const feedbackStatus=await page.textContent('#feedback-status');
  assert(feedbackStatus?.includes('Đã gửi'), `Feedback flow failed: status=${feedbackStatus} mutations=${state.mutations.feedback}`);
  assert(state.mutations.feedback===1,'Member feedback was not sent to admin backend');

  await page.fill('#announcement-title','Update tối nay');
  await page.fill('#announcement-body','Sửa phần lịch sử và thêm tài liệu.');
  await page.click('#announcement-form button[type="submit"]');
  await page.waitForTimeout(350);
  const announcementStatus=await page.textContent('#announcement-status');
  assert(announcementStatus?.includes('Đã gửi'), `Announcement flow failed: status=${announcementStatus} mutations=${state.mutations.announcement}`);
  assert(state.mutations.announcement===1,'Admin announcement was not published');

  await page.selectOption('.subject-level-select','professional');
  await page.waitForTimeout(30);
  assert(state.mutations.subjectPatch===1 && state.subjects[0].exam_level==='professional','Admin subject exam-level update failed');

  await context.close();
}

async function testCommunity(browser){
  const {context,page,state}=await newPortalPage(browser);
  await page.goto(baseURL+'/community.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#room-title')?.textContent?.includes('General'));
  assert((await page.textContent('#global-notification-count'))==='2','Community unread bell badge is incorrect');
  assert((await page.textContent('#message-stream')).includes('Ai đang ôn adjustments?'),'Existing group message is missing');

  await page.fill('#message-input','Mình đang ôn phần này.');
  await page.click('#send-btn');
  await page.waitForFunction(()=>document.querySelector('#message-stream')?.textContent?.includes('Mình đang ôn phần này.'));
  assert(state.mutations.message===1,'Chat text message was not persisted');

  const peerMessage=page.locator('[data-message-id="1"]');
  await peerMessage.locator('[data-add-reaction="👍"]').click();
  await page.waitForFunction(()=>document.querySelector('[data-message-id="1"] .reaction')?.textContent?.includes('1'));
  assert(state.mutations.reaction===1,'Message reaction was not persisted');

  await page.setInputFiles('#file-input',{name:'exercise.pdf',mimeType:'application/pdf',buffer:Buffer.from('pdf')});
  await page.fill('#message-input','Bài tập tuần này');
  await page.selectOption('#message-type','assignment');
  await page.click('#send-btn');
  await page.waitForFunction(()=>document.querySelector('#message-stream')?.textContent?.includes('exercise.pdf'));
  assert(state.mutations.file===1,'Chat attachment was not uploaded');
  assert(state.mutations.message===2,'Attachment message was not persisted');

  await page.click('#create-group-btn');
  await page.fill('#group-name','Exam Week');
  await page.fill('#group-description','Ôn trước kỳ thi');
  await page.click('#group-form button[type="submit"]');
  await page.waitForFunction(()=>document.querySelector('#room-title')?.textContent?.includes('Exam Week'));
  assert(state.groups.some(g=>g.name==='Exam Week'),'Group creation failed');

  await context.close();
}

async function testProgress(browser){
  const {context,page}=await newPortalPage(browser);
  await page.goto(baseURL+'/progress.html',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#progress-content:not([hidden])');
  assert((await page.textContent('#official-pass'))==='55%','Certificate official pass mark should be 55%');
  assert((await page.textContent('#safe-target'))==='65%','Internal safe target should be 65%');
  assert((await page.locator('#trend-chart svg').count())===1,'Progress line graph did not render');
  assert((await page.locator('#trend-chart .chart-dot').count())===3,'Trend graph should contain three attempts');
  assert((await page.locator('#weak-list .weak-row').count())===2,'Weakness analysis did not cover both chapters');
  assert((await page.locator('#plan-list .plan-step').count())>=2,'Action plan did not render');
  assert((await page.textContent('#standard-copy')).includes('không phải yêu cầu chính thức'),'Safe target disclaimer is missing');
  await context.close();
}

const browser=await engine.launch({headless:true});
try{
  await testHome(browser);
  await testCommunity(browser);
  await testProgress(browser);
  console.log(`PASS ${browserName}: member home + community + progress portal`);
}finally{
  await browser.close();
}
