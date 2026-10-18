import {chromium,webkit} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {buildRepairTargets,validateRepairs} from '../supabase/functions/_shared/import-repair.js';

const engine=process.env.BROWSER==='webkit'?webkit:chromium,base=process.env.TEST_BASE_URL||'https://127.0.0.1:4173';
const owner='11111111-1111-4111-8111-111111111111',id='22222222-2222-4222-8222-222222222222';
const user={id:owner,email:'repair.test@example.com',email_confirmed_at:'2026-10-09',confirmed_at:'2026-10-09',user_metadata:{},factors:[]};
const session={access_token:'synthetic-aal2',refresh_token:'synthetic-refresh',expires_at:Math.floor(Date.now()/1000)+3600,user,token_type:'bearer'};
const cors={'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,PATCH,OPTIONS','access-control-allow-headers':'authorization,apikey,content-type,prefer'};
const initial={files:[{name:'saved.pdf',mimeType:'application/pdf',size:200,key:'saved',sourceId:'source',storagePath:owner+'/saved.pdf'}],destination:{target_type:'questions',subject_id:'subject',chapter_id:'chapter',exercise_id:'exercise',subject_title:'Accounting',chapter_title:'Reconciliations',exercise_title:'Practice'},questions:Array.from({length:17},(_,i)=>({question_type:'single',prompt:'Question '+(i+1)+'\nPreserve this complete source scenario and its amounts.',options:['£40','£80'],correct_answer:0,confidence:1,source_file:1,source_files:[1],source_page:1,explanation_en:'40 + 0 = 40',explanation_vi:'£40 là đáp án từ nguồn.',practical_example_en:'A business receives £40 from a customer.',practical_example_vi:'Doanh nghiệp nhận £40 từ khách hàng.',verification_status:'source_only'})),lesson:null,warnings:[],processing:{state:'ready'}};
for(const n of [0,2,3,6,8,12])initial.questions[n].practical_example_vi='[UNREADABLE]';
initial.questions[0].explanation_en="Wait, let's check the source.";initial.questions[2].explanation_en='2 + 2 = 5';
const db=new PGlite(),browser=await engine.launch({headless:true});let repairs=0,published=0,release;
const gate=new Promise(resolve=>release=resolve);const tasks=[];
const rpc=async(name,body)=>{const keys=Object.keys(body);return (await db.query(`select public.${name}(${keys.map((key,i)=>key+'=> $'+(i+1)).join(',')}) as result`,Object.values(body))).rows[0].result};
const draft=async()=> (await db.query('select * from public.import_drafts where id=$1',[id])).rows[0];
try{
  await db.exec(`create role anon;create role authenticated;create schema auth;create schema private;
    create table auth.users(id uuid primary key);grant usage on schema auth,private to authenticated;
    create function auth.uid() returns uuid language sql stable as $$select '${owner}'::uuid$$;
    create function private.is_editor() returns boolean language sql stable as $$select true$$;
    create table public.import_drafts(id uuid primary key,title text,source_id text,target_type text,payload jsonb not null,status text default 'draft',model_name text,created_by uuid,updated_by uuid,created_at timestamptz default now(),updated_at timestamptz default clock_timestamp());
    create function private.touch() returns trigger language plpgsql as $$begin new.updated_at=clock_timestamp();return new;end$$;
    create trigger touch before update on public.import_drafts for each row execute function private.touch();`);
  const migration=fs.readdirSync('supabase/migrations').find(p=>p.endsWith('_import_draft_targeted_repair.sql'));await db.exec(fs.readFileSync('supabase/migrations/'+migration,'utf8'));
  await db.query('insert into auth.users values($1)',[owner]);
  await db.query('insert into public.import_drafts(id,title,source_id,target_type,payload,created_by) values($1,$2,$3,$4,$5,$6)',[id,'Saved 17 questions','source','questions',JSON.stringify(initial),owner]);
  const context=await browser.newContext({serviceWorkers:'block',ignoreHTTPSErrors:true,viewport:{width:1280,height:900}});
  await context.addInitScript(s=>localStorage.setItem('icaew-lms-auth-v2',JSON.stringify(s)),session);
  await context.route('https://uangiwgznukuicrfnohq.supabase.co/**',async route=>{
    const req=route.request(),url=new URL(req.url()),path=url.pathname;
    const json=(body,status=200)=>route.fulfill({status,contentType:'application/json',headers:cors,body:JSON.stringify(body)});
    if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
    if(path==='/auth/v1/user')return json(user);
    if(path==='/rest/v1/rpc/get_my_access')return json({allowed:true,editor:true,role:'owner',mfa_required:true,mfa_satisfied:true,aal:'aal2'});
    if(path==='/rest/v1/rpc/get_my_content_access')return json({content_owner:true});
    if(path==='/rest/v1/subjects')return json([{id:'subject',title:'Accounting',sort_order:0,is_active:true}]);
    if(path==='/rest/v1/chapters')return json([{id:'chapter',subject_id:'subject',title:'Reconciliations',sort_order:0,is_active:true}]);
    if(path==='/rest/v1/exercises')return json([{id:'exercise',chapter_id:'chapter',title:'Practice',sort_order:0,is_active:true}]);
    if(path==='/rest/v1/questions'){if(req.method()==='POST')published++;return json([])}
    if(['/rest/v1/lessons','/rest/v1/content_audit_log','/rest/v1/content_snapshots'].includes(path))return json([]);
    if(path==='/rest/v1/import_drafts')return json([await draft()]);
    if(path==='/rest/v1/import_repair_runs'&&url.searchParams.get('select')==='base_payload,after_payload')return json((await db.query('select base_payload,after_payload from public.import_repair_runs where id=$1',[url.searchParams.get('id').slice(3)])).rows);
    if(path==='/rest/v1/import_repair_runs')return json((await db.query('select id,draft_id,mode,state,applied,suggestions,issues,error,created_at,lease_expires_at,finished_at from public.import_repair_runs order by created_at desc')).rows);
    if(path==='/functions/v1/icaew-ai-repair'){
      repairs++;const body=req.postDataJSON(),claim=await rpc('begin_import_repair',{p_draft_id:body.draftId,p_request_id:body.requestId,p_expected_updated_at:body.expectedUpdatedAt,p_mode:body.mode});
      if(claim.state==='claimed')tasks.push((async()=>{
        await gate;const p=claim.draft.payload,targets=buildRepairTargets(p.questions,p.lesson);
        const repairs=targets.map(t=>({question_index:t.question_index,changes:{practical_example_vi:'Một doanh nghiệp nhận £40 từ khách hàng.'},reason:'Dịch từ ví dụ EN.'}));
        for(const n of [0,2])Object.assign(repairs.find(x=>x.question_index===n),{changes:{practical_example_vi:'Một doanh nghiệp nhận £40 từ khách hàng.',explanation_en:'2 + 2 = 4',explanation_vi:'2 + 2 = 4'},source_file:1,source_page:2,source_quote:'2 + 2 = 4',reason:'Đối chiếu lời giải từ nguồn.'});
        await rpc('finish_import_repair',{p_run_id:claim.run_id,p_result:validateRepairs({repairs},p,targets,1)});
      })());
      return json({state:'running',run_id:claim.run_id},202);
    }
    if(path.startsWith('/rest/v1/rpc/')){
      try{return json(await rpc(path.split('/').at(-1),req.postDataJSON()))}catch(error){return json({message:error.message},400)}
    }
    throw Error('Unexpected request '+path);
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const open=async()=>{await page.goto(base+'/admin.html');await page.waitForSelector('[data-resume-import]');await page.click('[data-resume-import]')};
  await open();await page.waitForFunction(()=>document.querySelector('#import-repair-panel')?.textContent.includes('Đang kiểm tra'));
  for(let i=0;repairs<1&&i<50;i++)await new Promise(r=>setTimeout(r,50));assert.equal(repairs,1);assert.equal(published,0);
  await page.waitForLoadState('networkidle');
  await page.reload();await page.waitForSelector('[data-resume-import]');await page.click('[data-resume-import]');
  await page.waitForFunction(()=>document.querySelector('#import-repair-panel')?.textContent.includes('Đang kiểm tra'));
  await page.waitForLoadState('networkidle');
  // Simulate returning from a backgrounded phone after the UI polling deadline.
  await page.evaluate(()=>{window.repairRealNow=Date.now;Date.now=()=>window.repairRealNow()+120000});
  release();await Promise.all(tasks);
  await page.waitForFunction(()=>document.querySelectorAll('.repairProposal').length===2&&!document.querySelector('[data-i="0"][data-k="practical_example_vi"]').value.includes('[UNREADABLE]'));
  await page.evaluate(()=>{Date.now=window.repairRealNow;delete window.repairRealNow});
  assert.equal(repairs,1,'Reload started a second AI request');assert.equal((await draft()).payload.questions.length,17);
  for(let i=0;i<17;i++){assert.equal((await draft()).payload.questions[i].prompt,initial.questions[i].prompt);assert.deepEqual((await draft()).payload.questions[i].options,initial.questions[i].options)}
  assert.equal(await page.isDisabled('#publish-imported'),true,'Unresolved source explanations allowed publication');
  assert.match(await page.locator('#import-repair-panel').innerText(),/2 câu/);
  for(let i=0;i<2;i++){
    await page.locator('.repairProposal summary').first().click();await page.locator('[data-repair-apply]').first().click();
    await page.waitForFunction(n=>document.querySelectorAll('.repairProposal').length===n,1-i);
  }
  await page.waitForFunction(()=>document.querySelector('#publish-imported')?.disabled===false);
  assert.equal(await page.isDisabled('#publish-imported'),false);assert.equal(published,0,'Applying repair published content');
  await page.locator('.repairHistory summary').first().click();await page.locator('[data-repair-diff] summary').first().click();await page.waitForFunction(()=>document.querySelector('[data-repair-diff] .repairSavedDiff')?.textContent.includes('2 + 2 = 4'));await page.locator('[data-repair-undo]').click();
  await page.waitForFunction(()=>document.querySelector('#notice')?.textContent.includes('Đã hoàn tác'));
  assert.equal(await page.isDisabled('#publish-imported'),true);
  assert.equal((await draft()).payload.questions[2].explanation_en,'2 + 2 = 5');
  assert.equal((await draft()).payload.questions[0].explanation_en,'2 + 2 = 4');
  for(const theme of ['light','dark']){
    await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);await page.setViewportSize({width:390,height:844});
    const accessibility=await new AxeBuilder({page}).include('#import-repair-panel').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(accessibility.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,html:n.html,summary:n.failureSummary}))})),[],theme);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'Repair layout overflows mobile');
  }
  await page.setViewportSize({width:320,height:740});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'320px overflow');
  await page.screenshot({path:'/tmp/lms-repair-'+(process.env.BROWSER||'chromium')+'.png',fullPage:false});
  const latest=await draft(),changed=structuredClone(latest.payload);changed.questions[0].prompt='A concurrent edit in another tab';
  await rpc('save_import_revision',{p_draft_id:id,p_expected_updated_at:latest.updated_at,p_payload:changed});
  await page.locator('[data-i="0"][data-k="prompt"]').fill('Old tab tries to overwrite');await page.click('#save-reviewed-import');
  await page.waitForFunction(()=>document.querySelector('#notice')?.textContent.includes('thay đổi ở nơi khác'));
  assert.equal((await draft()).payload.questions[0].prompt,'A concurrent edit in another tab');
  for(let i=0;repairs<1&&i<50;i++)await new Promise(r=>setTimeout(r,50));assert.equal(repairs,1);assert.equal(published,0);assert.deepEqual(errors,[]);
  console.log('PASS admin repair '+(process.env.BROWSER||'chromium')+': real Postgres history, 17-question preservation, six translations, reload without another AI call, proposal review, undo, concurrent-edit safety and mobile light/dark accessibility.');
}finally{release();await browser.close();await db.close()}
