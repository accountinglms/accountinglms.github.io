import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';

const browserName=process.env.BROWSER||'chromium';
const engine=browserName==='webkit'?webkit:chromium;
const baseURL=process.env.TEST_BASE_URL||'https://127.0.0.1:4173';
const user={id:'11111111-1111-4111-8111-111111111111',email:'import.test@example.com',
  email_confirmed_at:'2026-10-09T00:00:00Z',confirmed_at:'2026-10-09T00:00:00Z',user_metadata:{},factors:[]};
const session={access_token:'token-aal2',refresh_token:'refresh-aal2',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user};
const cors={'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,PATCH,PUT,DELETE,OPTIONS',
  'access-control-allow-headers':'authorization,apikey,content-type,prefer,x-upsert','access-control-expose-headers':'*'};
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',headers:cors,body:JSON.stringify(body)});
const sourceText='A business receives GBP 12,000 for 6 months. After 2 months, revenue = GBP 4,000.';
const aiResult={title:'Revenue practice',questions:[{question_type:'single',prompt:'Revenue after 2 months?',
  options:['GBP 12,000','GBP 4,000'],correct_answer:1,confidence:1,verification_status:'source_only',
  explanation_en:'(GBP 12,000 / 6 months) * 2 months = GBP 4,000.'}],lesson:null,warnings:[],model_name:'mock-free'};
const drafts=new Map(),sources=new Map(),objects=new Map(),questions=[],lessons=[];
let uploads=0,aiCalls=0,failReadyPatch=false;

const browser=await engine.launch({headless:true});
try{
  const context=await browser.newContext({serviceWorkers:'block',ignoreHTTPSErrors:true,viewport:{width:1280,height:900},acceptDownloads:true});
  await context.route('https://uangiwgznukuicrfnohq.supabase.co/**',async route=>{
    const req=route.request(),url=new URL(req.url()),path=url.pathname,method=req.method();
    if(method==='OPTIONS')return route.fulfill({status:204,headers:cors,body:''});
    if(path==='/auth/v1/user')return json(route,user);
    if(path==='/rest/v1/rpc/get_my_access')return json(route,{allowed:true,editor:true,role:'owner',mfa_required:false,mfa_satisfied:true,aal:'aal2'});
    if(path==='/rest/v1/subjects')return json(route,[{id:'accounting',title:'Accounting',sort_order:0,is_active:true}]);
    if(path==='/rest/v1/chapters')return json(route,[{id:'revenue',subject_id:'accounting',title:'Revenue',sort_order:0,is_active:true}]);
    if(path==='/rest/v1/exercises')return json(route,[{id:'practice',chapter_id:'revenue',title:'Practice',sort_order:0,is_active:true,question_count:0}]);
    if(path==='/rest/v1/content_audit_log'||path==='/rest/v1/content_snapshots')return json(route,[]);
    if(path==='/rest/v1/questions'||path==='/rest/v1/lessons'){
      const rows=path.endsWith('questions')?questions:lessons;
      if(method==='GET')return json(route,rows);
      const body=req.postDataJSON();const incoming=(Array.isArray(body)?body:[body]).map(x=>({...x,id:'record-'+(rows.length+1)}));
      rows.push(...incoming);return json(route,incoming,201);
    }
    if(path.startsWith('/storage/v1/object/authenticated/content-imports/')){
      assert.equal(req.headers().authorization,'Bearer token-aal2','Saved source was not fetched with user auth');
      const key=decodeURIComponent(path.split('/content-imports/')[1]);
      assert.ok(objects.has(key),'Saved source did not exist');
      return route.fulfill({status:200,contentType:'text/plain',headers:cors,body:objects.get(key)});
    }
    if(path.startsWith('/storage/v1/object/content-imports/')){
      uploads++;objects.set(decodeURIComponent(path.split('/content-imports/')[1]),req.postData());return json(route,{Key:path});
    }
    if(path==='/rest/v1/content_sources'){
      assert.equal(method,'POST');const row={...req.postDataJSON(),id:'source-'+(sources.size+1)};
      sources.set(row.id,row);return json(route,[row],201);
    }
    if(path==='/rest/v1/import_drafts'){
      if(method==='GET'){
        assert.equal(url.searchParams.get('created_by'),'eq.'+user.id,'Recovery list was not scoped to the editor');
        return json(route,[...drafts.values()].filter(d=>d.status==='draft').reverse().map(d=>({...d,content_sources:sources.get(d.source_id)})));
      }
      const body=req.postDataJSON();
      if(method==='POST'){
        assert.ok(sources.has(body.source_id),'Draft was created without a persisted source');
        const row={...body,id:'draft-'+(drafts.size+1)};drafts.set(row.id,row);return json(route,[row],201);
      }
      const id=url.searchParams.get('id')?.slice(3);assert.ok(drafts.has(id));
      if(failReadyPatch&&body.payload?.processing?.state==='ready'){
        failReadyPatch=false;return json(route,{message:'Temporary save error'},500);
      }
      const row={...drafts.get(id),...body};drafts.set(id,row);return json(route,[row]);
    }
    if(path==='/functions/v1/icaew-ai-route')return json(route,{error:'AI hết hạn mức. Hãy chọn nơi lưu thủ công.',code:'AI_QUOTA_EXCEEDED'},429);
    if(path==='/functions/v1/icaew-ai-import'){
      aiCalls++;
      const payload=req.postDataJSON();
      const persisted=[...drafts.values()].find(d=>sources.get(d.source_id)?.storage_key===payload.storagePath&&d.payload.destination.target_type===payload.targetType);
      assert.ok(persisted,'AI request ran before the draft was saved');
      if(aiCalls===1)return json(route,{error:'AI đang chạm hạn mức.',code:'AI_QUOTA_EXCEEDED',quota_scope:'minute',retry_after_seconds:2},429);
      return json(route,aiResult);
    }
    throw new Error('Unexpected request: '+method+' '+path);
  });
  const page=await context.newPage();
  await page.addInitScript(({session})=>localStorage.setItem('icaew-lms-auth-v2',JSON.stringify(session)),{session});
  const open=async()=>{
    await page.goto(baseURL+'/admin.html',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.querySelector('#subject')?.options.length>1);
  };
  const confirm=async()=>{
    await page.selectOption('#subject','accounting');await page.selectOption('#chapter','revenue');
    await page.selectOption('#exercise','practice');await page.click('#confirm-destination');
  };
  await open();
  await page.setInputFiles('#import-file',{name:'revenue.txt',mimeType:'text/plain',buffer:Buffer.from(sourceText)});
  await page.click('#ai-route');
  await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('chọn nơi lưu thủ công'));
  await confirm();
  await page.click('#ai-generate');
  await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('được giữ lại'));
  assert.equal(uploads,1);assert.equal(sources.size,1);assert.equal(drafts.size,1);assert.equal(aiCalls,1);
  assert.equal(drafts.get('draft-1').payload.processing.state,'failed');
  assert.equal(await page.isDisabled('#ai-generate'),true,'RetryInfo did not disable immediate retry');
  assert.equal(await page.isDisabled('#save-import'),false,'Quota blocked saving without AI');
  assert.equal(await page.isVisible('#continue-manual-import'),true);
  const downloadEvent=page.waitForEvent('download');await page.click('#download-import-source');
  const download=await downloadEvent;assert.equal(download.suggestedFilename(),'revenue.txt');

  await open();
  await page.click('[data-resume-import="draft-1"]');
  assert.equal(await page.inputValue('#exercise'),'practice');
  assert.equal(await page.evaluate(()=>document.querySelector('#import-file').files.length),0,'Recovery required choosing the file again');
  await page.click('#continue-manual-import');
  await page.fill('#q-prompt','Revenue after 2 months?');await page.fill('#q-options','GBP 12,000\nGBP 4,000');await page.fill('#q-answer','2');
  await page.click('#question-form button.primary');
  await page.waitForFunction(()=>document.querySelector('#notice').textContent==='Đã lưu câu hỏi.');
  assert.equal(questions[0].source_id,'source-1');assert.equal(questions[0].metadata.import_draft_id,'draft-1');
  assert.equal(questions[0].status,'draft');assert.equal(aiCalls,1);
  await page.waitForFunction(()=>!document.querySelector('#ai-generate').disabled);
  await page.evaluate(()=>{const btn=document.querySelector('#ai-generate');btn.click();btn.click()});
  await page.waitForSelector('.importCard');
  assert.equal(aiCalls,2,'Double click generated duplicate AI requests');
  assert.equal(uploads,1);assert.equal(sources.size,1);assert.equal(drafts.size,1);
  assert.equal(drafts.get('draft-1').payload.processing.state,'ready');

  await open();await page.click('[data-resume-import="draft-1"]');await page.click('#ai-generate');
  await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('AI đã lưu'));
  assert.equal(aiCalls,2,'Opening a ready draft consumed quota again');
  await page.selectOption('#import-target','lesson');await page.click('#confirm-destination');
  await page.click('#save-import');
  await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('không cần AI'));
  assert.equal(drafts.size,2);assert.equal(uploads,1);assert.equal(sources.size,1);assert.equal(aiCalls,2);
  assert.equal(drafts.get('draft-2').target_type,'lesson');
  await page.click('#continue-manual-import');
  await page.waitForFunction(text=>document.querySelector('#manual-lesson-content').value===text,sourceText);
  await page.click('#lesson-form button.primary');
  await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('Đã lưu bài học'));
  assert.equal(lessons[0].content_markdown,sourceText);assert.equal(lessons[0].source_id,'source-1');assert.equal(lessons[0].status,'draft');

  // A successful AI response must survive a failed DB write without another provider request.
  await page.selectOption('#import-target','questions');
  await page.setInputFiles('#import-file',{name:'revenue-second.txt',mimeType:'text/plain',buffer:Buffer.from(sourceText)});
  await confirm();failReadyPatch=true;await page.click('#ai-generate');
  await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('được giữ lại'));
  assert.equal(aiCalls,3);await page.click('#ai-generate');await page.waitForSelector('.importCard');
  assert.equal(aiCalls,3,'Retrying a draft save made another Gemini request');assert.equal(drafts.size,3);assert.equal(uploads,2);
  assert.equal(drafts.get('draft-3').payload.processing.state,'ready');
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'Recovery UI overflowed a phone viewport');
  console.log(`PASS ${browserName}: draft before AI, quota recovery, reload/resume, source reuse, manual save, and failed-save retry.`);
  await context.close();
}finally{await browser.close()}
