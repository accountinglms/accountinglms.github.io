import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';

const engine=process.env.BROWSER==='webkit'?webkit:chromium;
const baseURL=process.env.TEST_BASE_URL||'https://127.0.0.1:4173';
const user={id:'11111111-1111-4111-8111-111111111111',email:'content.test@example.com',
  email_confirmed_at:'2026-10-09T00:00:00Z',confirmed_at:'2026-10-09T00:00:00Z',factors:[],user_metadata:{role:'owner'}};
const session={access_token:'mock-token',refresh_token:'mock-refresh',expires_at:Math.floor(Date.now()/1000)+3600,user};
const cors={'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,PATCH,OPTIONS',
  'access-control-allow-headers':'authorization,apikey,content-type,prefer'};

async function setup(browser,width,{owner=true,editor=true,accessError=false}={}){
  const context=await browser.newContext({ignoreHTTPSErrors:true,serviceWorkers:'block',viewport:{width,height:900}});
  const data={
    subjects:[{id:'s',title:'Accounting',is_active:true,created_at:'2026-10-10T08:00:00Z',updated_at:'2026-10-10T08:00:00Z'}],
    chapters:[{id:'c1',subject_id:'s',title:'The accounting equation',is_active:true,created_at:'2026-10-10T08:18:16Z',updated_at:'2026-10-10T08:18:16Z'},
      {id:'c2',subject_id:'s',title:'The accounting equation',is_active:true,created_at:'2026-10-10T08:18:53Z',updated_at:'2026-10-10T08:18:53Z'}],
    exercises:[{id:'e1',chapter_id:'c1',title:'Question bank',question_count:1,is_active:true,updated_at:'2026-10-10T08:00:00Z'},
      {id:'e2',chapter_id:'c2',title:'Question bank',question_count:0,is_active:true,updated_at:'2026-10-10T08:00:00Z'}],
    questions:[{id:'q1',exercise_id:'e1',prompt:'A preserved question',question_type:'single',status:'draft'}],
    lessons:[{id:'l1',chapter_id:'c1',title:'Preserved lesson'}]
  };
  let calls=0, failNext=false, inserts=0;
  await context.route('https://uangiwgznukuicrfnohq.supabase.co/**',async route=>{
    const request=route.request(),url=new URL(request.url()),path=url.pathname;
    const reply=(body,status=200)=>route.fulfill({status,contentType:'application/json',headers:cors,body:JSON.stringify(body)});
    if(request.method()==='OPTIONS')return route.fulfill({status:204,headers:cors,body:''});
    if(path==='/auth/v1/user')return reply(user);
    if(path==='/rest/v1/rpc/get_my_access')return reply({allowed:true,editor,role:editor?'owner':'member',mfa_required:false,mfa_satisfied:true});
    if(path==='/rest/v1/rpc/get_my_content_access')return reply(accessError?{message:'Access unavailable'}:{content_owner:owner},accessError?500:200);
    if(path==='/rest/v1/rpc/set_course_item_deleted'){
      calls++;
      if(failNext){failNext=false;return reply({code:'40001',message:'Mục vừa thay đổi. Hãy tải lại trước khi xoá hoặc khôi phục.'},409)}
      assert.equal(owner,true);
      const payload=request.postDataJSON();
      const table={subject:'subjects',chapter:'chapters',exercise:'exercises'}[payload.p_kind];
      const item=data[table].find(x=>x.id===payload.p_id);
      assert.ok(item);assert.equal(payload.p_expected_updated_at,item.updated_at);
      if(payload.p_deleted){item.previous_is_active=item.is_active;item.is_active=false;item.deleted_at='2026-10-10T10:00:00Z'}
      else{item.is_active=item.previous_is_active??true;item.deleted_at=null;item.previous_is_active=null}
      item.updated_at=new Date(Date.UTC(2026,9,10,10,0,calls)).toISOString();
      return reply(item);
    }
    const table=path.split('/').pop();
    if(path.startsWith('/rest/v1/')&&request.method()==='GET')return reply(data[table]||[]);
    if(path.startsWith('/rest/v1/')&&request.method()==='POST'){inserts++;return reply([request.postDataJSON()],201)}
    throw new Error('Unexpected request: '+request.method()+' '+path);
  });
  const page=await context.newPage();
  const ownershipResponse=editor?page.waitForResponse(response=>response.url().endsWith('/rest/v1/rpc/get_my_content_access')):null;
  await page.addInitScript(value=>localStorage.setItem('icaew-lms-auth-v2',JSON.stringify(value)),session);
  await page.goto(baseURL+'/admin.html',{waitUntil:'domcontentloaded'});
  if(!editor){await page.waitForSelector('#auth-block:not(.hidden)');return {context,page,data,get calls(){return calls}}}
  await page.waitForFunction(()=>document.querySelector('#subject').options.length>1);
  await page.waitForFunction(()=>document.querySelector('#admin-user').textContent.includes('content.test'));
  await ownershipResponse;
  if(owner&&!accessError)await page.waitForSelector('#delete-chapter:not(.hidden)',{state:'attached'});
  return {context,page,data,get calls(){return calls},get inserts(){return inserts},failNext(){failNext=true}};
}
async function choose(page,chapter='c2',exercise=''){
  await page.selectOption('#subject','s');
  await page.selectOption('#chapter',chapter);
  if(exercise)await page.selectOption('#exercise',exercise);
  await page.locator('details:has(#delete-chapter)').evaluate(el=>el.open=true);
}

const browser=await engine.launch({headless:true});
try{
  for(const width of [320,390,820]){
    const test=await setup(browser,width),{page,data}=test;
    await choose(page);
    assert.match(await page.textContent('#chapter-selection'),/The accounting equation.*Tạo/);
    await page.click('#delete-chapter');
    await page.waitForSelector('#content-delete-dialog[open]');
    assert.match(await page.textContent('#content-delete-meta'),/0 câu hỏi.*0 bài học/);
    const bounds=await page.locator('#content-delete-dialog').boundingBox();
    assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width,'Delete dialog exceeds viewport');
    const overflow=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,
      offenders:[...document.querySelectorAll('body *')].map(el=>({tag:el.tagName,id:el.id,class:el.className,right:el.getBoundingClientRect().right}))
        .filter(x=>x.right>innerWidth+1).slice(0,12)}));
    assert.ok(overflow.scrollWidth<=overflow.width,'Horizontal overflow: '+JSON.stringify(overflow));
    await page.click('#content-delete-cancel');
    assert.equal(test.calls,0,'Cancel sent a mutation');

    await page.click('#delete-chapter');test.failNext();
    await page.click('#content-delete-confirm');
    await page.waitForFunction(()=>document.querySelector('#content-delete-error').textContent.includes('vừa thay đổi'));
    assert.equal(await page.locator('#content-delete-dialog').getAttribute('open'),'');
    assert.equal(await page.inputValue('#chapter'),'c2','Failed deletion changed selection');
    await page.click('#content-delete-confirm');
    await page.waitForFunction(()=>document.querySelector('#content-delete-dialog').open===false);
    await page.waitForFunction(()=>![...document.querySelector('#chapter').options].some(x=>x.value==='c2'));
    assert.equal(test.calls,2);
    assert.equal(data.exercises.length,2);assert.equal(data.questions.length,1);assert.equal(data.lessons.length,1);
    await page.locator('#content-trash').evaluate(el=>el.open=true);
    page.once('dialog',dialog=>dialog.accept());
    await page.click('[data-restore-content="c2"]');
    await page.waitForFunction(()=>[...document.querySelector('#chapter').options].some(x=>x.value==='c2'));

    // Creating the same title must reuse the selected node, including whitespace/case variants.
    await page.fill('#chapter-new','  THE   ACCOUNTING EQUATION  ');
    await page.locator('#chapter-form button').click();
    await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('Tên đã có'));
    assert.equal(test.inserts,0);
    assert.equal(await page.inputValue('#chapter'),'c1');

    await choose(page,'c1','e1');
    await page.setInputFiles('#import-file',{name:'source.txt',mimeType:'text/plain',buffer:Buffer.from('Fixture source')});
    await page.click('#confirm-destination');
    assert.equal(await page.locator('#ai-generate').isEnabled(),true);
    await page.click('#delete-chapter');
    assert.match(await page.textContent('#content-delete-meta'),/1 câu hỏi.*1 bài học/);
    await page.click('#content-delete-confirm');
    await page.waitForFunction(()=>document.querySelector('#chapter').value==='');
    assert.equal(await page.locator('#ai-generate').isDisabled(),true,'Import stayed enabled for deleted destination');
    await page.click('#delete-subject');await page.click('#content-delete-confirm');
    await page.waitForFunction(()=>document.querySelector('#subject').value==='');
    assert.equal(await page.locator('[data-restore-content="c1"]').isDisabled(),true);
    page.once('dialog',dialog=>dialog.accept());await page.click('[data-restore-content="s"]');
    await page.waitForFunction(()=>document.querySelector('[data-restore-content="c1"]').disabled===false);
    page.once('dialog',dialog=>dialog.accept());await page.click('[data-restore-content="c1"]');
    await page.waitForFunction(()=>!document.querySelector('[data-restore-content="c1"]'));
    assert.equal(data.questions.length,1);assert.equal(data.lessons.length,1);
    // Removing every subject must also clear the built-in learner fallback.
    data.subjects.length=0;
    await page.goto(baseURL+'/index.html',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.querySelector('#auth-gate').classList.contains('hidden'));
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('accountingLMSCatalog_v1')||'null')?.subjects?.length===0);
    assert.equal(await page.locator('#menu-c1_s1').count(),0,'An empty server catalog resurrected the legacy course');
    assert.equal(await page.locator('.learner-start-option').count(),0);
    await test.context.route(/\/rest\/v1\/subjects\?/,route=>route.abort());
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.querySelector('#auth-gate').classList.contains('hidden'));
    assert.equal(await page.locator('#menu-c1_s1').count(),0,'An empty offline catalog resurrected a deleted course');
    await test.context.close();
  }
  for(const options of [{owner:false},{owner:true,accessError:true}]){
    const test=await setup(browser,390,options),{page}=test;
    await choose(page);
    assert.equal(await page.locator('#delete-chapter').isVisible(),false,'Non-owner saw deletion controls');
    assert.equal(await page.locator('#content-trash').isVisible(),false);
    await page.evaluate(()=>document.querySelector('#delete-chapter').click());
    assert.equal(test.calls,0,'Forged UI click sent an owner mutation');
    await test.context.close();
  }
  const member=await setup(browser,390,{owner:false,editor:false});
  assert.equal(await member.page.locator('#app').isVisible(),false);
  await member.context.close();
  console.log('PASS: owner-only deletion UI, cancellation/error handling, subtree restore, duplicate reuse, import invalidation and responsive dialog (320/390/820).');
}finally{await browser.close()}
