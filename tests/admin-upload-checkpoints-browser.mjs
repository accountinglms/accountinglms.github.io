import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';

const engine=process.env.BROWSER==='webkit'?webkit:chromium;
const base=process.env.TEST_BASE_URL||'https://127.0.0.1:4173';
const owner='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const text='Original accounting source, preserved without AI.';
const pdf='%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF';
const file=name=>({name,mimeType:name.endsWith('.pdf')?'application/pdf':'text/plain',buffer:Buffer.from(name.endsWith('.pdf')?pdf:text)});
const cors={'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,PATCH,OPTIONS',
  'access-control-allow-headers':'authorization,apikey,content-type,prefer,x-upsert'};
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',headers:cors,body:JSON.stringify(body)});
const session=id=>({access_token:'test-'+id,refresh_token:'test-refresh',expires_at:Math.floor(Date.now()/1000)+3600,user:{id,email:'recovery@example.test'}});
const browser=await engine.launch({headless:true});

async function fixture({brokenStorage=false}={}){
  const context=await browser.newContext({serviceWorkers:'block',ignoreHTTPSErrors:true,viewport:{width:390,height:844}});
  const db={sources:new Map(),drafts:new Map(),objects:new Map(),lessons:[],uploads:[],aiCalls:0};
  const faults={uploadAt:0,lostUpload:false,lostSource:false,lostDraft:false,lostAI:false,readFailure:0,failReady:false,holdSecond:false,holdFirst:false};
  let currentOwner=owner;
  await context.route('https://uangiwgznukuicrfnohq.supabase.co/**',async route=>{
    const req=route.request(),url=new URL(req.url()),path=url.pathname,method=req.method();
    if(method==='OPTIONS')return route.fulfill({status:204,headers:cors,body:''});
    if(path==='/auth/v1/user')return json(route,{id:currentOwner,email:'recovery@example.test'});
    if(path==='/rest/v1/rpc/get_my_access')return json(route,{allowed:true,editor:true,mfa_required:false,mfa_satisfied:true});
    if(path==='/rest/v1/rpc/get_my_content_access')return json(route,{content_owner:false});
    const catalog={subjects:[{id:'accounting',title:'Accounting',sort_order:0,is_active:true}],chapters:[{id:'inventory',subject_id:'accounting',title:'Inventory',sort_order:0,is_active:true}],exercises:[{id:'practice',chapter_id:'inventory',title:'Practice',sort_order:0,is_active:true}]};
    for(const name of Object.keys(catalog))if(path==='/rest/v1/'+name)return json(route,catalog[name]);
    if(['/rest/v1/questions','/rest/v1/content_audit_log','/rest/v1/content_snapshots','/rest/v1/import_repair_runs'].includes(path))return json(route,[]);
    if(path.startsWith('/storage/v1/object/authenticated/content-imports/')){
      const key=decodeURIComponent(path.split('/content-imports/')[1]);
      assert.ok(key.startsWith(currentOwner+'/'),'Recovery downloaded another account’s file');
      return route.fulfill({status:db.objects.has(key)?200:404,headers:cors,contentType:'text/plain',body:db.objects.get(key)||''});
    }
    if(path.startsWith('/storage/v1/object/content-imports/')){
      const key=decodeURIComponent(path.split('/content-imports/')[1]);db.uploads.push(key);
      assert.equal(req.headers()['x-upsert'],'false','Retry overwrote an existing source');
      if(db.uploads.length===faults.uploadAt)return json(route,{message:'Temporary upload failure'},503);
      if((faults.holdFirst&&db.uploads.length===1)||(faults.holdSecond&&db.uploads.length===2)){
        // Leave the request in flight until the test closes/reloads its page.
        return;
      }
      if(db.objects.has(key))return json(route,{message:'The resource already exists'},409);
      db.objects.set(key,req.postDataBuffer()||Buffer.from(req.headers()['content-type']==='application/pdf'?pdf:text));
      if(faults.lostUpload){faults.lostUpload=false;return route.abort('failed');}
      return json(route,{Key:key});
    }
    for(const [table,map] of [['content_sources',db.sources],['import_drafts',db.drafts]])if(path==='/rest/v1/'+table){
      if(method==='GET'){
        assert.equal(url.searchParams.get('created_by'),'eq.'+currentOwner,'Recovery query lacked owner scope');
        if(faults.readFailure){faults.readFailure--;return json(route,{message:'Read unavailable'},503);}
        const rows=[...map.values()].filter(row=>row.created_by===currentOwner&&(!url.searchParams.has('id')||row.id===url.searchParams.get('id').slice(3))&&(!url.searchParams.has('status')||row.status===url.searchParams.get('status').slice(3)));
        return json(route,rows.map(row=>table==='import_drafts'?{...row,content_sources:db.sources.get(row.source_id)}:row));
      }
      const body=req.postDataJSON();
      if(method==='POST'){
        assert.ok(body.id,'Import writes require a stable ID before sending');
        if(map.has(body.id))return json(route,{message:'duplicate key value'},409);
        const row={...body,updated_at:new Date().toISOString()};map.set(row.id,row);
        const fault=table==='content_sources'?'lostSource':'lostDraft';
        if(faults[fault]){faults[fault]=false;faults.readFailure=1;return route.abort('failed');}
        return json(route,[row],201);
      }
      const id=url.searchParams.get('id').slice(3),row=map.get(id);
      if(url.searchParams.has('updated_at')&&url.searchParams.get('updated_at')!=='eq.'+row.updated_at)return json(route,[]);
      if(faults.failReady&&body.payload?.processing?.state==='ready'){
        faults.failReady=false;return json(route,{message:'Save unavailable'},503);
      }
      Object.assign(row,body,{updated_at:new Date().toISOString()});return json(route,[row]);
    }
    if(path==='/rest/v1/lessons'){
      if(method==='GET')return json(route,db.lessons);
      const row={...req.postDataJSON(),id:crypto.randomUUID()};db.lessons.push(row);return json(route,[row],201);
    }
    if(path==='/functions/v1/icaew-ai-import'){
      db.aiCalls++;
      const result={title:'Recovered AI result',model_name:'test',questions:[{question_type:'single',prompt:'A source question?',options:['Yes','No'],correct_answer:0,source_file:1}],lesson:null,warnings:[]};
      if(faults.lostAI){
        faults.lostAI=false;const draft=db.drafts.get(req.postDataJSON().draftId);
        draft.payload={...draft.payload,...result,processing:{state:'ready'}};draft.updated_at=new Date(Date.now()+1000).toISOString();
        return route.abort('failed');
      }
      return json(route,result);
    }
    throw Error('Unexpected request '+method+' '+path);
  });
  await context.addInitScript(({saved,broken})=>{
    if(!localStorage.getItem('icaew-lms-auth-v2'))localStorage.setItem('icaew-lms-auth-v2',JSON.stringify(saved));
    if(broken)indexedDB.open=()=>{throw Error('Storage unavailable');};
  },{saved:session(owner),broken:brokenStorage});
  let page=await context.newPage();
  const open=async()=>{await page.goto(base+'/admin.html',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#subject')?.options.length>1);};
  await open();
  return {db,faults,context,get page(){return page;},open,
    async select(files){await page.setInputFiles('#import-file',files);await page.selectOption('#subject','accounting');await page.selectOption('#chapter','inventory');await page.selectOption('#exercise','practice');await page.click('#confirm-destination');},
    async reload(){await open();},
    async newPage(){await page.close();page=await context.newPage();await open();},
    async switchAccount(id){currentOwner=id;await page.evaluate(saved=>localStorage.setItem('icaew-lms-auth-v2',JSON.stringify(saved)),session(id));await open();},
    async saved(){await page.waitForFunction(()=>document.querySelector('#import-local-status').textContent.includes('Đã tự lưu'));},
    async failed(){await page.waitForFunction(()=>document.querySelector('#notice.error')&&!document.querySelector('#import-file').disabled);},
    async recover(){await page.click('[data-resume-local],[data-resume-import]');await page.waitForFunction(()=>document.querySelector('#notice').textContent.startsWith('Đã khôi phục')||document.querySelector('#notice').textContent.startsWith('Đã mở lại'));},
    async publish(){await page.click('#publish-source-fallback');await page.waitForFunction(()=>document.querySelector('#notice').textContent.startsWith('Đã xuất bản tài liệu gốc'));}
  };
}

try{
  // Close the page during the very first upload: no server draft exists yet.
  {
    const f=await fixture();await f.select([file('first.pdf'),file('second.txt')]);await f.saved();
    f.faults.holdFirst=true;await f.page.click('#save-import');
    await f.page.waitForFunction(()=>document.querySelector('#import-progress').textContent.includes('Đang lưu tệp 1/2'));
    await f.newPage();await f.recover();
    const recoveredPDF=await f.page.evaluate(async owner=>{
      const {createImportCheckpoints}=await import('/assets/import-checkpoints.js');
      const records=await createImportCheckpoints(owner).list();return new Blob([records[0].files[0].bytes]).text();
    },owner);
    assert.equal(recoveredPDF,pdf,'PDF bytes changed across page closure');
    f.faults.holdFirst=false;await f.publish();
    assert.equal(f.db.objects.size,2);assert.equal(f.db.drafts.size,1);assert.equal(f.db.lessons.length,1);assert.equal(f.db.aiCalls,0);
    await f.context.close();
  }
  // Completed files remain on the server; local bytes restore only the unfinished file.
  {
    const f=await fixture();await f.select([file('part-1.txt'),file('part-2.txt')]);f.faults.uploadAt=2;
    await f.page.click('#save-import');await f.failed();assert.equal(f.db.objects.size,1);
    const firstPath=f.db.uploads[0];await f.reload();await f.recover();await f.publish();
    assert.equal(f.db.uploads.filter(key=>key===firstPath).length,1,'Uploaded first file again');
    assert.equal(f.db.sources.size,2);assert.equal(f.db.drafts.size,1);assert.equal(f.db.lessons.length,1);
    assert.equal(await f.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    await f.context.close();
  }
  for(const fault of ['lostUpload','lostSource','lostDraft']){
    const f=await fixture();await f.select(file(fault+'.txt'));f.faults[fault]=true;
    await f.page.click('#save-import');await f.failed();await f.newPage();await f.recover();await f.publish();
    assert.equal(f.db.objects.size,1,fault+' duplicated the original');assert.equal(f.db.sources.size,1,fault+' duplicated the source row');
    assert.equal(f.db.drafts.size,1,fault+' duplicated the draft');assert.equal(f.db.lessons.length,1);
    await f.context.close();
  }
  // A valid AI response survives a failed server save AND a page close.
  {
    const f=await fixture();await f.select(file('ai-result.txt'));f.faults.failReady=true;
    await f.page.click('#ai-generate');await f.failed();assert.equal(f.db.aiCalls,1);
    await f.newPage();await f.recover();await f.page.click('#ai-generate');await f.page.waitForSelector('.importCard');
    assert.equal(f.db.aiCalls,1,'Reload consumed AI quota a second time');await f.context.close();
  }
  {
    const f=await fixture();await f.select(file('ai-saved-on-server.txt'));f.faults.lostAI=true;
    await f.page.click('#ai-generate');await f.failed();await f.newPage();await f.recover();
    await f.page.click('#ai-generate');await f.page.waitForSelector('.importCard');
    assert.equal(f.db.aiCalls,1,'A lost reply ignored the result already saved on the server');await f.context.close();
  }
  // Local persistence is account-scoped, including bytes from an unfinished selection.
  {
    const f=await fixture();await f.select(file('private-selection.txt'));await f.saved();
    await f.switchAccount(other);assert.equal(await f.page.locator('[data-resume-local]').count(),0);
    await f.switchAccount(owner);await f.recover();assert.equal(await f.page.locator('.importFile').count(),1);
    await f.publish();assert.equal(f.db.aiCalls,0);await f.context.close();
  }
  // Browsers denying local storage must still permit normal upload/publication.
  {
    const f=await fixture({brokenStorage:true});await f.select(file('storage-denied.txt'));await f.publish();
    assert.equal(f.db.lessons.length,1);assert.equal(f.db.aiCalls,0);
    assert.match(await f.page.locator('#import-local-status').innerText(),/chưa lưu được/);await f.context.close();
  }
  console.log('PASS durable file recovery: first/partial upload, lost replies, AI save, account isolation, denied storage ('+(process.env.BROWSER||'chromium')+')');
}finally{await browser.close();}
