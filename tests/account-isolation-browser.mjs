import { chromium,webkit } from 'playwright';
const browserName=process.env.BROWSER||'chromium';
const browser=await (browserName==='webkit'?webkit:chromium).launch({headless:true});
const base=process.env.TEST_BASE_URL||'https://127.0.0.1:4173';
const A='11111111-1111-4111-8111-111111111111';
const B='22222222-2222-4222-8222-222222222222';
const session=id=>({
 access_token:id===A?'token-a':'token-b',
 refresh_token:'refresh-token',
 expires_at:Math.floor(Date.now()/1000)+3600,
 token_type:'bearer',
 user:{id,email:id===A?'account-a@example.test':'account-b@example.test',user_metadata:{display_name:id===A?'Student A':'Student B'},factors:[]}
});
const cors={'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,PATCH,DELETE,OPTIONS','access-control-allow-headers':'authorization,apikey,content-type,prefer'};
const respond=(route,data,status=200)=>route.fulfill({status,contentType:'application/json',headers:cors,body:JSON.stringify(data)});
const context=await browser.newContext({ignoreHTTPSErrors:true,serviceWorkers:'block',viewport:{width:1200,height:850}});
const writes=[];
await context.route('https://uangiwgznukuicrfnohq.supabase.co/**',async route=>{
  const req=route.request(),url=new URL(req.url()),path=url.pathname;
  const token=req.headers()['authorization']==='Bearer token-b'?B:A;
  if(req.method()==='OPTIONS')return respond(route,{});
  if(path==='/auth/v1/user')return respond(route,session(token).user);
  if(path==='/rest/v1/rpc/get_my_access')return respond(route,{allowed:true,editor:false,role:'member',aal:'aal2',mfa_required:false,mfa_satisfied:true});
  if(path==='/rest/v1/subjects')return respond(route,[{id:'accounting',title:'Accounting',sort_order:0,is_active:true}]);
  if(path==='/rest/v1/chapters')return respond(route,[{id:'chapter_1',subject_id:'accounting',title:'Chapter 1',sort_order:0,is_active:true}]);
  if(path==='/rest/v1/exercises')return respond(route,[{id:'exercise_1',chapter_id:'chapter_1',title:'Practice Questions',content_mode:'database',question_count:1,sort_order:0,is_active:true}]);
  if(path==='/rest/v1/questions')return respond(route,[{id:'question_1',exercise_id:'exercise_1',sort_order:0,question_type:'single',prompt:'Test accounting?',options:['Correct','Wrong'],correct_answer:0,required_selections:1,status:'published'}]);
  if(path==='/rest/v1/user_progress'||path==='/rest/v1/user_preferences'||path==='/rest/v1/exercise_attempts'){
    if(req.method()==='GET')return respond(route,[]);
    writes.push({owner:token,path});return respond(route,[]);
  }
  if(path==='/rest/v1/rpc/record_exercise_attempt'){
    writes.push({owner:token,path});return respond(route,[]);
  }
  if(path.startsWith('/auth/v1/'))return respond(route,{});
  return respond(route,[]);
});
const page=await context.newPage();
const seeded={
  answersStatus:[null],isAnswered:[false],bookmarks:[true],userSelections:[null],draftSelections:[null],
  score:0,lastQuestion:0,runId:null,startedAt:null,attemptRecorded:false,updatedAt:Date.now()
};
await page.addInitScript(({a,b,state})=>{
  if(!localStorage.getItem('isolation-seed')){
    localStorage.setItem('isolation-seed','1');
    localStorage.setItem('icaew-lms-auth-v2',JSON.stringify(a));
    localStorage.setItem('accountingLMSProgress_v2:user:'+a.user.id,JSON.stringify({exercise_1:state}));
    localStorage.setItem('accountingLMSProgress_v2',JSON.stringify({exercise_1:state}));
    localStorage.setItem('icaew-lms-attempt-queue-v2:user:'+a.user.id,JSON.stringify([{
      exercise_id:'exercise_1',run_id:'33333333-3333-4333-8333-333333333333',
      owner_user_id:a.user.id,score:1,total_questions:1,correct_count:1,wrong_count:0,unanswered_count:0
    }]));
  }
}, {a:session(A),b:session(B),state:seeded});
await page.goto(base+'/',{waitUntil:'domcontentloaded'});
await page.waitForFunction(()=>document.querySelector('#auth-gate')?.classList.contains('hidden')===true);
await page.waitForSelector('#menu-exercise_1');
await page.click('#menu-exercise_1');
await page.waitForSelector('#bookmark-btn');
if(!await page.locator('#bookmark-btn').evaluate(el=>el.classList.contains('active')))throw Error('Student A lost own saved star');
await page.evaluate(s=>localStorage.setItem('icaew-lms-auth-v2',JSON.stringify(s)),session(B));
await page.reload({waitUntil:'domcontentloaded'});
await page.waitForFunction(()=>document.querySelector('#auth-gate')?.classList.contains('hidden')===true);
await page.waitForSelector('#menu-exercise_1');
await page.click('#menu-exercise_1');
await page.waitForSelector('#bookmark-btn');
if(await page.locator('#bookmark-btn').evaluate(el=>el.classList.contains('active')))throw Error('Student B inherited A bookmark from shared browser');
if(writes.some(w=>w.owner===B&&w.path.includes('record_exercise_attempt')))throw Error('Student B uploaded A queued attempt');
const aData=await page.evaluate(id=>localStorage.getItem('accountingLMSProgress_v2:user:'+id),A);
if(!JSON.parse(aData||'{}').exercise_1?.bookmarks?.[0])throw Error('A archive was modified by B login');
await context.close();
await browser.close();
console.log('PASS '+browserName+': browser offline progress and queued attempts remain account-isolated');
