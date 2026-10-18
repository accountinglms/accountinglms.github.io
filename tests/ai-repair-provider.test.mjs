import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import {parseImportJson} from '../supabase/functions/_shared/import-json.js';
import {loadImportSources} from '../supabase/functions/_shared/import-sources.js';
import {geminiFailure} from '../supabase/functions/_shared/gemini-errors.js';
import {buildRepairTargets,repairInstructions,validateRepairs} from '../supabase/functions/_shared/import-repair.js';

const owner='11111111-1111-4111-8111-111111111111',draftId='22222222-2222-4222-8222-222222222222',runId='33333333-3333-4333-8333-333333333333';
const question={question_type:'single',prompt:'Full original question.',options:['A','B'],correct_answer:0,source_file:1,source_page:1,verification_status:'source_only',practical_example_en:'A company receives £40.',practical_example_vi:'[UNREADABLE]'};
const payload={questions:[question],lesson:null,files:[{name:'source.txt',mimeType:'text/plain',storagePath:owner+'/source.txt'}],warnings:[]};
const input={draftId,requestId:runId,expectedUpdatedAt:'2026-10-17T03:51:12Z',mode:'auto'};
const google=value=>({candidates:[{content:{parts:[{text:JSON.stringify(value)}]}}]});
const successful=google({repairs:[{question_index:0,changes:{practical_example_vi:'Một công ty nhận £40.'},reason:'Faithful translation.'}]});
function handler(options={}){
  const calls=[],finished=[],tasks=[];let serve,runState='';
  const json=(body,status=200)=>new Response(JSON.stringify(body),{status});
  const context=vm.createContext({Response,Request,Headers,AbortSignal,TextDecoder,Uint8Array,btoa,console:{error(){}},parseImportJson,loadImportSources,geminiFailure,buildRepairTargets,repairInstructions,validateRepairs,
    EdgeRuntime:{waitUntil:p=>tasks.push(p)},
    Deno:{env:{get:n=>({SUPABASE_URL:'https://test.supabase.co',SUPABASE_ANON_KEY:'public',GEMINI_API_KEY:'test-only-key'})[n]},serve:fn=>serve=fn},
    fetch:async(url,init)=>{
      if(url.endsWith('/auth/v1/user'))return json({id:owner});
      if(url.endsWith('/rpc/get_my_access'))return json({editor:options.editor!==false,mfa_satisfied:options.mfa!==false});
      if(url.endsWith('/rpc/begin_import_repair')){
        if(runState)return json({state:runState,run_id:runId,already_attempted:true});
        runState='running';return json({state:'claimed',run_id:runId,draft:{id:draftId,created_by:owner,payload:structuredClone(options.payload||payload)}});
      }
      if(url.endsWith('/rpc/finish_import_repair')){const result=JSON.parse(init.body);finished.push(result);runState=result.p_error?'failed':'ready';return json({state:runState,run_id:runId})}
      if(url.includes('/storage/v1/')){assert.equal(init.headers.Authorization,'Bearer synthetic-editor');return new Response('Complete source solution: 2 + 2 = 4.')}
      assert.match(url,/models\/gemini-3\.5-flash-lite:generateContent$/);
      const body=JSON.parse(init.body);calls.push(body);assert.equal(body.tools,undefined);assert.equal(body.generationConfig.responseMimeType,'application/json');assert.equal(body.generationConfig.responseFormat,undefined);
      if(options.hold)await options.hold;
      return json(options.result||successful,options.status||200);
    }});
  const source=fs.readFileSync('supabase/functions/icaew-ai-repair/index.ts','utf8').replace(/^import[^\n]*\n/gm,'');
  vm.runInContext(stripTypeScriptTypes(source),context);
  return {calls,finished,tasks,request:body=>serve(new Request('https://test.supabase.co/functions/v1/icaew-ai-repair',{method:'POST',headers:{origin:'https://accountinglms.github.io',authorization:'Bearer synthetic-editor','content-type':'application/json'},body:JSON.stringify(body)}))};
}
let release;const held=new Promise(resolve=>release=resolve),h=handler({hold:held});
assert.equal((await h.request(input)).status,202,'Request waited for AI instead of persisting a background run');
assert.equal((await (await h.request({...input,requestId:'44444444-4444-4444-8444-444444444444'})).json()).state,'running');
release();await Promise.all(h.tasks);
assert.equal(h.calls.length,1);assert.equal(h.finished.length,1);
assert.equal(h.finished[0].p_result.payload.questions[0].practical_example_vi,'Một công ty nhận £40.');
assert.deepEqual(h.finished[0].p_result.payload.questions[0].options,question.options);
assert.equal(h.finished[0].p_result.payload.questions[0].correct_answer,0);
assert.equal((await (await h.request(input)).json()).state,'ready');assert.equal(h.calls.length,1,'Cached result used quota again');
for(const options of [{editor:false},{mfa:false}]){const denied=handler(options);assert.equal((await denied.request(input)).status,403);assert.equal(denied.calls.length,0)}
const quota=handler({status:429,result:{error:{code:429,status:'RESOURCE_EXHAUSTED',message:'Quota exceeded'}}});await quota.request(input);await Promise.all(quota.tasks);
assert.equal(quota.calls.length,1,'Quota error triggered another model call');assert.equal(quota.finished[0].p_error.code,'AI_QUOTA_EXCEEDED');
const malformed=handler({result:{candidates:[{content:{parts:[{text:'{"repairs":['}]}}]}});await malformed.request(input);await Promise.all(malformed.tasks);
assert.ok(malformed.finished[0].p_error);assert.equal(malformed.calls.length,1);
const core=structuredClone(payload);core.questions[0].explanation_en="Wait, let's check the source.";
const recheck=handler({payload:core,result:google({repairs:[{question_index:0,changes:{explanation_en:'2 + 2 = 4.',practical_example_vi:'Một công ty nhận £40.'},source_file:1,source_page:1,source_quote:'2 + 2 = 4.',reason:'Source working.'}]})});
await recheck.request(input);await Promise.all(recheck.tasks);
assert.equal(recheck.finished[0].p_result.applied.length,1);assert.equal(recheck.finished[0].p_result.suggestions.length,1);
assert.match(recheck.finished[0].p_result.payload.questions[0].explanation_en,/Wait/,'Source correction applied without review');
assert.ok(recheck.calls[0].contents[0].parts.some(p=>p.text?.includes('Complete source solution')),'Source recheck omitted the saved source');
assert.equal((await handler().request({...input,draftId:'not-an-id'})).status,400);
console.log('PASS AI repair worker: authenticated background state, one provider call, cached/double-click recovery, MFA, quota errors, source evidence and independent example fixes.');
