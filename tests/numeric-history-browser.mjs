import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {installMock,installFakeWebSocket,session,user} from './helpers/portal-fixtures.mjs';
import {createAttemptDb} from './helpers/numeric-attempt-db.mjs';
const engine=process.env.BROWSER==='webkit'?webkit:chromium;
const base=process.env.TEST_BASE_URL||'https://127.0.0.1:4173';
const cors={'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,PATCH,OPTIONS','access-control-allow-headers':'authorization,apikey,content-type,prefer'};
const json=(route,value,status=200)=>route.fulfill({status,contentType:'application/json',headers:cors,body:JSON.stringify(value)});
const {db,record}=await createAttemptDb();
const browser=await engine.launch({headless:true});
async function fixture(answer=[550,503.939393939]){
  await db.query('delete from exercise_attempts');
  const context=await browser.newContext({ignoreHTTPSErrors:true,serviceWorkers:'block',viewport:{width:390,height:844}});
  await installFakeWebSocket(context);const state=await installMock(context);state.progress=[];state.attempts=[];
  state.exercises=state.exercises.slice(0,1);state.exercises[0].content_mode='database';state.exercises[0].question_count=1;
  const questions=[{id:'numeric-1',exercise_id:'ex1',question_type:'numeric',prompt:'Cost of closing inventory',options:['FIFO basis (£)','AVCO basis (£)'],correct_answer:answer,required_selections:2,sort_order:0,status:'published',metadata:{numeric_policy:{mode:'rounded',decimal_places:2,rounding:'half_up',unit:'£',tolerance:0}}}];
  await context.route('**/rest/v1/questions*',async route=>{
    if(route.request().method()==='GET')return json(route,questions);
    const row={...route.request().postDataJSON(),id:'manual-numeric'};questions.push(row);return json(route,[row],201);
  });
  await context.route('**/rest/v1/user_progress*',async route=>{
    if(route.request().method()==='GET')return json(route,state.progress);
    const body=route.request().postDataJSON();state.progress=Array.isArray(body)?body:[body];return json(route,state.progress);
  });
  await context.route('**/rest/v1/exercise_attempts*',async route=>json(route,(await db.query('select * from exercise_attempts order by attempt_no desc')).rows));
  await context.route('**/rest/v1/rpc/record_exercise_attempt',async route=>{
    try{return json(route,await record(route.request().postDataJSON()));}catch(error){return json(route,{message:error.message},400);}
  });
  await context.addInitScript(session=>localStorage.setItem('icaew-lms-auth-v2',JSON.stringify(session)),session);
  const page=await context.newPage();page.on('dialog',dialog=>dialog.accept());
  const open=async()=>{await page.goto(base+'/index.html?exercise=ex1',{waitUntil:'domcontentloaded'});await page.waitForSelector('#options-container .numeric-answer-field input');};
  await open();
  return {context,page,state,questions,open,async fill(values){for(let i=0;i<values.length;i++)await page.fill('[data-numeric-index="'+i+'"]',values[i]);},
    async submit(expectedCount=1){
      await page.click('#next-btn');
      if(await page.locator('button[onclick="showResults(true)"]').isVisible())await page.click('button[onclick="showResults(true)"]');
      await page.waitForSelector('.result-score');
      await page.waitForFunction(()=>localStorage.getItem('icaew-lms-attempt-queue-v2:user:'+JSON.parse(localStorage.getItem('icaew-lms-auth-v2')).user.id)==='[]');
      const rows=(await db.query('select * from exercise_attempts order by attempt_no')).rows;assert.equal(rows.length,expectedCount);return rows.at(-1);
    },
    async history(){const history=await context.newPage();await history.goto(base+'/history.html?exercise=ex1',{waitUntil:'domcontentloaded'});await history.waitForSelector('.attempt');await history.locator('.attempt summary').first().click();return history;}
  };
}
try{
  for(const test of [
    {values:['£550','503,94'],status:'correct',score:1},
    {values:['549','503.94'],status:'wrong',score:0},
    {values:['550','450'],status:'wrong',score:0},
    {values:['550','503.945'],key:[550,503.94],status:'wrong',score:0},
    {values:['550',''],status:null,score:0},
    {values:['550','503.94'],key:[550,null],status:'ungraded',score:0},
    {values:['0','0'],key:[0,0],status:'correct',score:1}
  ]){
    const f=await fixture(test.key);await f.fill(test.values);const row=await f.submit();
    assert.equal(row.score,test.score);assert.equal(row.correct_count,test.score);
    assert.equal(row.answers_status[0],test.status);
    const history=await f.history();
    assert.equal(await history.locator('.numericHistory tbody tr').count(),2);
    assert.match(await history.locator('.numericHistory').innerText(),/FIFO basis/);
    assert.match(await history.locator('.numericHistory').innerText(),/AVCO basis/);
    assert.equal(await history.locator('.qStatus').innerText(),test.status==='correct'?'Đúng':test.status==='wrong'?'Sai':test.status==='ungraded'?'Chưa chấm':'Chưa hoàn thành');
    assert.equal(row.question_snapshot[0].numeric_policy.decimal_places,2);
    if(test.status==='ungraded'){
      assert.equal(row.ungraded_count,1);assert.equal(row.unanswered_count,0);assert.equal(row.wrong_count,0);
      assert.match(await f.page.locator('.result-score').innerText(),/Chưa có điểm/);
      assert.equal(await history.locator('.attempt .percent').innerText(),'Chưa chấm');
      assert.equal(await f.page.locator('.numeric-wrong').count(),0,'Incomplete answer key marked a field wrong');
      const portal=await f.context.newPage();
      await portal.goto(base+'/home.html',{waitUntil:'domcontentloaded'});
      await portal.waitForFunction(()=>document.querySelector('#metric-attempts')?.textContent==='1');
      assert.equal(await portal.locator('#metric-average').innerText(),'—');
      await portal.goto(base+'/progress.html',{waitUntil:'domcontentloaded'});
      await portal.waitForFunction(()=>document.querySelector('#trend-chart')?.textContent.includes('Chưa có điểm đã chấm'));
      assert.equal(await portal.locator('#recent-average').innerText(),'—');
      assert.equal(await portal.locator('#trend-chart svg').count(),0,'Pending attempt produced a score chart');
    }
    if(test.status===null){assert.equal(row.question_snapshot[0].selected_answer[0],'550');assert.equal(row.unanswered_count,1);}
    await history.setViewportSize({width:320,height:844});
    assert.equal(await history.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'Numeric history overflowed iPhone viewport');
    await f.context.close();
  }
  // Reload/autosave, another attempt, and later answer changes preserve history.
  {
    const f=await fixture();await f.page.click('#bookmark-btn');await f.fill(['550','503.94']);
    await f.page.waitForResponse(response=>response.url().includes('/user_progress')&&response.request().method()==='POST');
    await f.open();assert.equal(await f.page.inputValue('[data-numeric-index="1"]'),'503.94');
    const first=await f.submit();const snapshot=first.question_snapshot;
    f.questions[0].correct_answer=[1,2];await f.open();await f.page.evaluate(()=>resetSection());
    assert.equal(await f.page.locator('#bookmark-btn').evaluate(node=>node.classList.contains('active')),true);
    await f.fill(['550','503.94']);const second=await f.submit(2);assert.equal(second.score,0);
    assert.deepEqual((await db.query('select question_snapshot from exercise_attempts where id=$1',[first.id])).rows[0].question_snapshot,snapshot);
    await f.context.close();
  }
  // The manual editor persists an explicit per-question numeric rule.
  {
    const f=await fixture();await f.page.goto(base+'/admin.html',{waitUntil:'domcontentloaded'});
    await f.page.waitForFunction(()=>document.querySelector('#subject')?.options.length>1);
    await f.page.selectOption('#subject','accounting');await f.page.selectOption('#chapter','ch1');await f.page.selectOption('#exercise','ex1');
    await f.page.evaluate(()=>document.querySelectorAll('details').forEach(node=>node.open=true));
    await f.page.selectOption('#q-type','numeric');await f.page.fill('#q-prompt','A manually entered numeric question');
    await f.page.fill('#q-options','Units');await f.page.fill('#q-answer','12');
    await f.page.fill('#q-numeric-policy [data-numeric-policy-field="decimal_places"]','0');
    await f.page.fill('#q-numeric-policy [data-numeric-policy-field="unit"]','units');
    await f.page.click('#question-form button.primary');
    await f.page.waitForFunction(()=>document.querySelector('#notice').textContent==='Đã lưu câu hỏi.');
    assert.equal(f.questions.at(-1).metadata.numeric_policy.decimal_places,0);assert.equal(f.questions.at(-1).metadata.numeric_policy.unit,'units');await f.context.close();
  }
  console.log('PASS Numeric Entry → autosave/reload → actual Postgres RPC → History → retry; grading boundaries, pending keys and editor policy ('+(process.env.BROWSER||'chromium')+')');
}finally{await browser.close();await db.close();}
