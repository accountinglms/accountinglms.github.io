import { chromium, webkit } from 'playwright';

const browserName = process.env.BROWSER || 'chromium';
const engine = browserName === 'webkit' ? webkit : chromium;
const baseURL = process.env.TEST_BASE_URL || 'https://127.0.0.1:4173';
const AUTH_KEY = 'icaew-lms-auth-v2';

const user = {
  id:'11111111-1111-4111-8111-111111111111',
  email:'attempt.test@example.com',
  email_confirmed_at:'2026-10-09T00:00:00Z',
  confirmed_at:'2026-10-09T00:00:00Z',
  user_metadata:{display_name:'Attempt Test'},
  factors:[]
};

const session = {
  access_token:'token-aal2',
  refresh_token:'refresh-aal2',
  expires_at:Math.floor(Date.now()/1000)+3600,
  token_type:'bearer',
  user
};

function cors(){
  return {
    'access-control-allow-origin':'*',
    'access-control-allow-methods':'GET,POST,PATCH,PUT,DELETE,OPTIONS',
    'access-control-allow-headers':'authorization,apikey,content-type,prefer',
    'access-control-expose-headers':'*'
  };
}

function json(route,body,status=200){
  return route.fulfill({status,contentType:'application/json',headers:cors(),body:JSON.stringify(body)});
}

function assert(condition,message){
  if(!condition) throw new Error(message);
}

async function installMock(context){
  const attempts=[];
  const rpcPayloads=[];

  await context.route('https://uangiwgznukuicrfnohq.supabase.co/**',async route=>{
    const req=route.request();
    const url=new URL(req.url());
    const path=url.pathname;

    if(req.method()==='OPTIONS') return route.fulfill({status:204,headers:cors(),body:''});
    if(path==='/auth/v1/user') return json(route,user);
    if(path==='/rest/v1/rpc/get_my_access'){
      return json(route,{allowed:true,editor:true,role:'owner',mfa_required:false,mfa_satisfied:true,aal:'aal2'});
    }

    if(path==='/rest/v1/subjects'){
      return json(route,[{id:'accounting_fundamental',title:'Accounting Fundamental',sort_order:0,is_active:true}]);
    }
    if(path==='/rest/v1/chapters'){
      return json(route,[{id:'chapter_1',subject_id:'accounting_fundamental',title:'Chapter 1',sort_order:0,is_active:true}]);
    }
    if(path==='/rest/v1/exercises'){
      return json(route,[{
        id:'exercise_1',chapter_id:'chapter_1',title:'Practice Questions',
        sort_order:0,is_active:true,content_mode:'database',question_count:1
      }]);
    }
    if(path==='/rest/v1/questions'){
      return json(route,[{
        id:'question_1',
        exercise_id:'exercise_1',
        sort_order:1,
        question_type:'single',
        prompt:'Which cost should be capitalised?',
        options:['Direct machine delivery','Routine servicing'],
        correct_answer:0,
        required_selections:1,
        explanation_en:'Delivery can be directly attributable.',
        explanation_vi:'Chi phí vận chuyển có thể trực tiếp liên quan.',
        standard_reference:'IAS 16.17',
        status:'published',
        metadata:{}
      }]);
    }
    if(path==='/rest/v1/user_progress'){
      if(req.method()==='GET') return json(route,[{
        user_id:user.id,
        exercise_id:'exercise_1',
        current_question:0,
        score:0,
        answers_status:[],
        is_answered:[],
        selected_answers:[],
        draft_selections:[],
        bookmarks:[],
        attempt_run_id:null,
        attempt_started_at:null,
        attempt_recorded:false,
        completed:false,
        completed_at:null,
        updated_at:'2026-10-09T08:00:00Z'
      }]);
      return route.fulfill({status:204,headers:cors(),body:''});
    }
    if(path==='/rest/v1/user_preferences'){
      if(req.method()==='GET') return json(route,[]);
      return route.fulfill({status:204,headers:cors(),body:''});
    }
    if(path==='/rest/v1/exercise_attempts'){
      return json(route,attempts.slice().sort((a,b)=>Date.parse(b.completed_at)-Date.parse(a.completed_at)));
    }
    if(path==='/rest/v1/rpc/record_exercise_attempt'){
      const body=JSON.parse(req.postData()||'{}');
      rpcPayloads.push(body);
      const existing=attempts.find(x=>x.run_id===body.p_run_id && x.exercise_id===body.p_exercise_id);
      if(existing) return json(route,[{id:existing.id,attempt_no:existing.attempt_no,completed_at:existing.completed_at}]);

      const n=attempts.length+1;
      const completedAt=new Date(Date.UTC(2026,9,9,9,n,0)).toISOString();
      const answered=Number(body.p_total_questions||0)-Number(body.p_unanswered_count||0);
      const accuracy=answered?Number(body.p_correct_count||0)*100/answered:0;
      const row={
        id:`attempt-${n}`,
        user_id:user.id,
        exercise_id:body.p_exercise_id,
        run_id:body.p_run_id,
        attempt_no:n,
        score:body.p_score,
        total_questions:body.p_total_questions,
        accuracy,
        started_at:body.p_started_at,
        completed_at:completedAt,
        correct_count:body.p_correct_count,
        wrong_count:body.p_wrong_count,
        unanswered_count:body.p_unanswered_count,
        bookmarked_count:body.p_bookmarked_count,
        duration_seconds:body.p_duration_seconds,
        answers_status:body.p_answers_status,
        selected_answers:body.p_selected_answers,
        bookmarks:body.p_bookmarks,
        question_snapshot:body.p_question_snapshot,
        context_snapshot:body.p_context_snapshot,
        submitted_from:body.p_submitted_from
      };
      attempts.push(row);
      return json(route,[{id:row.id,attempt_no:row.attempt_no,completed_at:row.completed_at}]);
    }

    if(path.startsWith('/rest/v1/')){
      if(req.method()==='GET') return json(route,[]);
      return route.fulfill({status:204,headers:cors(),body:''});
    }
    return json(route,{});
  });

  return {attempts,rpcPayloads};
}

const browser=await engine.launch({headless:true});
try{
  const context=await browser.newContext({
    serviceWorkers:'block',
    ignoreHTTPSErrors:true,
    viewport:{width:390,height:844},
    isMobile:true,
    hasTouch:true
  });
  const mock=await installMock(context);

  const page=await context.newPage();
  await page.addInitScript(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:AUTH_KEY,value:session});
  await page.goto(baseURL+'/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#auth-gate')?.classList.contains('hidden')===true);
  await page.waitForSelector('#menu-exercise_1');
  await page.waitForFunction(()=>/Đã đồng bộ/.test(document.querySelector('#cloud-sync-label')?.textContent||''));

  await page.click('#mobile-menu-btn');
  await page.click('#menu-exercise_1');
  await page.waitForSelector('#options-container .option');

  await page.click('#bookmark-btn');
  await page.waitForFunction(()=>document.querySelector('#bookmark-btn')?.classList.contains('active'));
  assert(await page.locator('#nav-btn-0').evaluate(el=>el.classList.contains('bookmarked')),'Starred question is not marked in the navigator');

  await page.click('#options-container .option:nth-child(1)');
  await page.click('#next-btn');

  await page.waitForSelector('#score-board .result-card');
  await page.waitForFunction(()=>document.querySelector('.history-result-link'));
  await page.waitForFunction(()=>document.querySelector('#menu-exercise_1 .section-score-badge')?.textContent==='1/1');

  assert(mock.rpcPayloads.length===1,'First submission did not create exactly one attempt');
  const firstStartedAt=Date.parse(mock.rpcPayloads[0].p_started_at||'');
  assert(Number.isFinite(firstStartedAt) && firstStartedAt>=Date.parse('2026-10-09T00:00:00Z'),'Legacy progress without attempt_started_at was parsed as an old date');
  assert(firstStartedAt>=Date.now()-120000,'Legacy progress timer did not start when the exercise became trackable');
  assert(mock.rpcPayloads[0].p_duration_seconds==null || mock.rpcPayloads[0].p_duration_seconds<=120,'Legacy progress produced an implausibly large duration');
  assert(mock.rpcPayloads[0].p_question_snapshot?.[0]?.question_id==='question_1','Question snapshot did not preserve database question ID');
  assert(mock.rpcPayloads[0].p_question_snapshot?.[0]?.selected_answer===0,'Question snapshot did not preserve selected answer');
  assert(mock.rpcPayloads[0].p_bookmarks?.[0]===true,'First attempt did not preserve the starred question');
  assert(Number(mock.rpcPayloads[0].p_bookmarked_count)===1,'First attempt bookmark count is incorrect');
  assert(mock.rpcPayloads[0].p_context_snapshot?.exercise_id==='exercise_1','Attempt context snapshot is missing exercise identity');

  page.once('dialog',dialog=>dialog.accept());
  await page.click('.danger-btn');
  await page.waitForSelector('#quiz-body:not([style*="display: none"])');

  const badgeAfterReset=await page.textContent('#menu-exercise_1 .section-score-badge');
  assert(badgeAfterReset==='1/1','Latest score disappeared from sidebar after starting a new attempt');
  assert(await page.locator('#bookmark-btn').evaluate(el=>el.classList.contains('active')),'Starred question was cleared by retry');
  assert(await page.locator('#nav-btn-0').evaluate(el=>el.classList.contains('bookmarked')),'Navigator lost the star after retry');
  assert((await page.textContent('#stat-bookmarked'))==='1','Bookmark statistic did not survive retry');

  // Persistence must also survive a real page reload, not only an in-memory retry.
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#auth-gate')?.classList.contains('hidden')===true);
  await page.waitForSelector('#menu-exercise_1');
  await page.waitForFunction(()=>/Đã đồng bộ/.test(document.querySelector('#cloud-sync-label')?.textContent||''));
  await page.click('#mobile-menu-btn');
  await page.click('#menu-exercise_1');
  await page.waitForSelector('#options-container .option');
  assert(await page.locator('#bookmark-btn').evaluate(el=>el.classList.contains('active')),'Starred question did not survive reload');
  assert(await page.locator('#nav-btn-0').evaluate(el=>el.classList.contains('bookmarked')),'Navigator star did not survive reload');

  await page.click('#options-container .option:nth-child(2)');
  await page.click('#next-btn');
  await page.waitForSelector('#score-board .result-card');
  try{
    await page.waitForFunction(()=>window.localStorage.getItem('icaew-lms-attempt-queue-v2:user:11111111-1111-4111-8111-111111111111')==='[]',null,{timeout:4000});
  }catch(error){
    const queue=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([k])=>k.includes('attempt-queue'))));
    throw new Error('Offline queue did not drain: '+JSON.stringify({queue,recordedRpcCount:mock.rpcPayloads.length,capturedAttempts:mock.attempts.length}));
  }

  assert(mock.rpcPayloads.length===2,'Second submission did not append a second attempt');
  assert(mock.rpcPayloads[0].p_run_id!==mock.rpcPayloads[1].p_run_id,'Two attempts reused the same run_id');
  assert(mock.rpcPayloads[1].p_bookmarks?.[0]===true,'Starred question was not carried into the next attempt');
  assert(Number(mock.rpcPayloads[1].p_bookmarked_count)===1,'Second attempt bookmark count is incorrect');
  assert(mock.attempts.length===2,'Attempt history was overwritten instead of appended');

  const history=await context.newPage();
  await history.goto(baseURL+'/history.html?exercise=exercise_1',{waitUntil:'domcontentloaded'});
  await history.waitForSelector('#app:not(.hidden)');
  await history.waitForFunction(()=>document.querySelectorAll('.attempt').length===2);

  const summary=await history.evaluate(()=>({
    attempts:document.querySelector('#metric-attempts')?.textContent,
    timeline:document.querySelectorAll('.attempt').length,
    latest:document.querySelector('.chip.latest')?.textContent,
    best:document.querySelector('.chip.best')?.textContent,
    firstTime:document.querySelector('.attempt .time')?.textContent,
    overflow:document.documentElement.scrollWidth>window.innerWidth+1
  }));

  assert(summary.attempts==='2','History summary did not count both attempts');
  assert(summary.timeline===2,'History timeline did not render both attempts');
  assert(summary.latest==='Mới nhất','Latest-attempt badge is missing');
  assert(summary.best==='Tốt nhất','Best-attempt badge is missing');
  assert(/16:02/.test(summary.firstTime||''),'Attempt timestamp is not displayed in Asia/Ho_Chi_Minh time');
  assert(!summary.overflow,'Attempt History overflows mobile viewport');

  await history.locator('.attempt').first().locator('summary').click();
  const detail=await history.locator('.attempt').first().locator('.question').first().textContent();
  assert(/Bạn chọn/.test(detail||''),'Attempt detail does not show selected answer');
  assert(/Đáp án đúng/.test(detail||''),'Wrong attempt detail does not show correct answer');

  console.log(`PASS ${browserName}: append-only history + persistent starred questions + mobile timeline`);
  await context.close();
}finally{
  await browser.close();
}
