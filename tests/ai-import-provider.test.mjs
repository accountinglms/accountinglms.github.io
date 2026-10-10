import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';
import { hasUnsafeMarkup } from '../supabase/functions/_shared/text-safety.js';
import { geminiFailure } from '../supabase/functions/_shared/gemini-errors.js';
import { loadImportSources, ImportSourceError } from '../supabase/functions/_shared/import-sources.js';

const origin = 'https://accountinglms.github.io';
const userId = '11111111-1111-4111-8111-111111111111';
const input = {storagePath:userId+'/fixture.txt',fileName:'fixture.txt',mimeType:'text/plain',
  targetType:'questions',subjectTitle:'Accounting',chapterTitle:'Revenue',exerciseTitle:'Practice'};
const question = {question_type:'single',prompt:'Revenue after 2 of 6 months?',
  options:['GBP 12,000','GBP 4,000'],correct_answer:1,confidence:1,
  explanation_en:'(GBP 12,000 / 6 months) * 2 months = GBP 4,000.',verification_status:'verified',
  verification_note:'Verified against current standards.'};
const output = {title:'Revenue',questions:[question],lesson:null,warnings:[]};
const providerSuccess = data => ({candidates:[{content:{parts:[{text:JSON.stringify(data)}]}}]});
const json = (data,status=200) => new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});

function handlerFor(slug, responses, options={}) {
  const requests=[];
  let serve;
  const context=vm.createContext({Response,Request,Headers,TextDecoder,Uint8Array,btoa,
    hasUnsafeMarkup,geminiFailure,loadImportSources,ImportSourceError,console:{error(){}},setTimeout:fn=>{fn();return 0},
    Deno:{env:{get:name=>({SUPABASE_URL:'https://test.supabase.co',SUPABASE_ANON_KEY:'public',GEMINI_API_KEY:'server-key'})[name]},serve:fn=>serve=fn},
    fetch:async(url,init)=>{
      if(url.includes('/auth/v1/user'))return json({id:userId});
      if(url.includes('/rpc/get_my_access'))return json({editor:options.editor!==false});
      if(url.includes('/rest/v1/'))return json([]);
      if(url.includes('/storage/v1/'))return options.storage?options.storage(url,init):new Response('Revenue = GBP 4,000.');
      assert.match(url,/^https:\/\/generativelanguage.googleapis.com\/v1beta\/models\/gemini-3\.5-flash-lite:generateContent$/);
      requests.push(JSON.parse(init.body));
      const next=responses.shift();
      assert.ok(next,'Unexpected extra Gemini request');
      return json(next.body,next.status);
    }
  });
  const source=fs.readFileSync(`supabase/functions/${slug}/index.ts`,'utf8').replace(/^import[^\n]*\n/gm,'');
  vm.runInContext(stripTypeScriptTypes(source),context);
  return {requests,call:body=>serve(new Request(origin+'/functions/v1/'+slug,{method:'POST',headers:{origin,authorization:'Bearer editor-token','content-type':'application/json'},body:JSON.stringify(body)}))};
}

const quota=(metric,delay)=>({error:{code:429,status:'RESOURCE_EXHAUSTED',message:'Quota exceeded',details:[
  {'@type':'type.googleapis.com/google.rpc.QuotaFailure',violations:[{quotaId:metric}]},
  ...(delay?[{'@type':'type.googleapis.com/google.rpc.RetryInfo',retryDelay:delay}]:[])
]}});
for(const slug of ['icaew-ai-import','icaew-ai-route']){
  const daily=handlerFor(slug,[{status:429,body:quota('GenerateRequestsPerDayPerProjectPerModel-FreeTier','1s')}]);
  const response=await daily.call(input),data=await response.json();
  assert.equal(response.status,429);assert.equal(data.code,'AI_QUOTA_EXCEEDED');
  assert.equal(data.quota_scope,'daily');assert.equal(data.retryable,false);assert.equal(data.retry_after_seconds,null);
  assert.equal(daily.requests.length,1,'Daily quota was retried');
  const minute=handlerFor(slug,[{status:429,body:quota('GenerateRequestsPerMinutePerProjectPerModel-FreeTier','2.3s')}]);
  const minuteResponse=await minute.call(input),minuteData=await minuteResponse.json();
  assert.equal(minuteResponse.status,429);assert.equal(minuteData.retry_after_seconds,3);assert.equal(minuteData.quota_scope,'minute');
  assert.equal(minute.requests.length,1);
  const denied=handlerFor(slug,[],{editor:false});
  assert.equal((await denied.call(input)).status,403);assert.equal(denied.requests.length,0);
  const otherOwner=handlerFor(slug,[]);
  assert.equal((await otherOwner.call({...input,storagePath:'another-user/fixture.txt'})).status,403);
  assert.equal(otherOwner.requests.length,0);
}
assert.equal(geminiFailure(429,{error:{message:'Quota exceeded'}}).body.quota_scope,'unknown');
assert.equal(geminiFailure(429,{}).body.retry_after_seconds,null);
assert.equal(geminiFailure(429,{},'9').body.retry_after_seconds,9);

const success=handlerFor('icaew-ai-import',[{status:200,body:providerSuccess({...output,questions:[question,
  {...question,verification_status:'needs_review',verification_note:'Answer inferred from source.'},
  {...question,verification_status:'conflict',verification_note:'The source answer is inconsistent.'},
  {...question,verification_status:'source_only',verification_note:'Answer key explicitly in source.'}]})}]);
const successResponse=await success.call(input),data=await successResponse.json();
assert.equal(successResponse.status,200);assert.equal(success.requests.length,1);
assert.equal(success.requests[0].tools,undefined,'Free-tier import attempted Google Search');
assert.equal(data.questions[0].verification_status,'needs_review','Ungrounded output claimed verified');
assert.match(data.questions[1].verification_note,/Answer inferred/);
assert.match(data.questions[2].verification_note,/inconsistent/);
assert.equal(data.questions[3].verification_status,'source_only');
assert.match(data.questions[0].explanation_en,/2 months = GBP 4,000/);
assert.ok(data.warnings.some(x=>x.includes('không tra cứu web')));

const lesson=handlerFor('icaew-ai-import',[{status:200,body:providerSuccess({...output,questions:[],lesson:{
  title:'Revenue',content_markdown:'Revenue = GBP 4,000.',verification_status:'verified'
}})}]);
const lessonData=await (await lesson.call({...input,targetType:'lesson'})).json();
assert.equal(lessonData.lesson.verification_status,'needs_review');

const unavailable=handlerFor('icaew-ai-import',[
  {status:503,body:{error:{message:'Unavailable'}}},
  {status:200,body:providerSuccess(output)}
]);
assert.equal((await unavailable.call(input)).status,200);assert.equal(unavailable.requests.length,2);
const invalid=handlerFor('icaew-ai-import',[{status:200,body:providerSuccess({...output,questions:[{...question,prompt:'<img src=x onerror=alert(1)>'}]})}]);
const invalidResponse=await invalid.call(input);
assert.equal(invalidResponse.status,502);assert.equal((await invalidResponse.json()).error,'AI_OUTPUT_VALIDATION_FAILED');

// Read every image in one provider request, including a question split across two pages.
const imageFiles=['page-1.png','page-2.png','page-3.png'].map(fileName=>({storagePath:userId+'/'+fileName,fileName,mimeType:'image/png'}));
const png=Uint8Array.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,1]);
const downloads=[];
const storage=(url,init)=>{downloads.push(url);assert.equal(init.headers.Authorization,'Bearer editor-token');return new Response(png)};
const batchOutput={...output,processed_files:[1,2,3],questions:[
  {...question,source_file:1,source_files:[1,2],source_page:1},
  {...question,prompt:'Question on page 3',source_file:3,source_files:[3],source_page:1}
]};
const batch=handlerFor('icaew-ai-import',[{status:200,body:providerSuccess(batchOutput)}],{storage});
const batchResponse=await batch.call({...input,files:imageFiles}),batchData=await batchResponse.json();
assert.equal(batchResponse.status,200);assert.equal(downloads.length,3);assert.equal(batch.requests.length,1);
const parts=batch.requests[0].contents[0].parts;
assert.equal(parts.filter(p=>p.inlineData).length,3,'Only the first image reached Gemini');
assert.deepEqual(parts.filter(p=>p.text?.startsWith('SOURCE_FILE')).map(p=>p.text.match(/^SOURCE_FILE (\d)/)[1]),['1','2','3']);
assert.deepEqual(batchData.questions[0].source_files,[1,2]);assert.equal(batchData.questions[1].source_file,3);
for(const invalidOutput of [
  {...batchOutput,processed_files:[1]},
  {...batchOutput,questions:[{...question,source_file:4}]},
  {...batchOutput,questions:[{...question,source_file:1,source_files:[1,4]}]},
  {...batchOutput,questions:[question]}
]){
  const invalidBatch=handlerFor('icaew-ai-import',[{status:200,body:providerSuccess(invalidOutput)}],{storage});
  assert.equal((await invalidBatch.call({...input,files:imageFiles})).status,502,'Skipped file or invalid source association accepted');
}
const truncated=handlerFor('icaew-ai-import',[{status:200,body:{candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:JSON.stringify(batchOutput)}]}}]}}],{storage});
assert.equal((await (await truncated.call({...input,files:imageFiles})).json()).code,'AI_OUTPUT_TRUNCATED');

for(const slug of ['icaew-ai-import','icaew-ai-route']){
  for(const [files,status] of [
    [[],400],[Array.from({length:21},(_,i)=>({...imageFiles[0],storagePath:userId+'/'+i+'.png'})),400],
    [[imageFiles[0],{...imageFiles[1],storagePath:'other-user/page.png'}],403],
    [[imageFiles[0],{...imageFiles[1],storagePath:userId+'/../other/page.png'}],403],
    [[imageFiles[0],imageFiles[0]],400],
    [[{...imageFiles[0],mimeType:'image/svg+xml'}],415]
  ]){
    let reads=0;
    const deniedBatch=handlerFor(slug,[],{storage:()=>{reads++;return new Response(png)}});
    assert.equal((await deniedBatch.call({...input,files})).status,status);
    assert.equal(reads,0,'Part of an invalid manifest was read before all ownership checks');assert.equal(deniedBatch.requests.length,0);
  }
  const wrongSignature=handlerFor(slug,[],{storage:()=>new Response('This is not an image')});
  assert.equal((await wrongSignature.call({...input,files:imageFiles})).status,415);
  const oversized=handlerFor(slug,[],{storage:()=>new Response('x',{headers:{'content-length':String(4*1024*1024+1)}})});
  assert.equal((await oversized.call({...input,files:imageFiles})).status,413);
  const fourMB=new Uint8Array(4*1024*1024);fourMB.set(png);
  const totalLimit=handlerFor(slug,[],{storage:()=>new Response(fourMB)});
  assert.equal((await totalLimit.call({...input,files:[...imageFiles,{...imageFiles[0],storagePath:userId+'/page-4.png'}]})).status,413);
  assert.equal(totalLimit.requests.length,0,'Oversized batch used Google quota');
}
const routeBatch=handlerFor('icaew-ai-route',[{status:429,body:quota('GenerateRequestsPerMinutePerProjectPerModel-FreeTier','2s')}],{storage});
assert.equal((await routeBatch.call({...input,files:imageFiles})).status,429);
assert.equal(routeBatch.requests[0].contents[0].parts.filter(p=>p.inlineData).length,3,'Routing ignored later images');
console.log('PASS: multi-image import/routing, combined questions, source provenance, size/ownership guards, free-tier requests and retry recovery.');
