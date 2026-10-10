import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';
import { hasUnsafeMarkup } from '../supabase/functions/_shared/text-safety.js';
import { geminiFailure } from '../supabase/functions/_shared/gemini-errors.js';

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
    hasUnsafeMarkup,geminiFailure,console:{error(){}},setTimeout:fn=>{fn();return 0},
    Deno:{env:{get:name=>({SUPABASE_URL:'https://test.supabase.co',SUPABASE_ANON_KEY:'public',GEMINI_API_KEY:'server-key'})[name]},serve:fn=>serve=fn},
    fetch:async(url,init)=>{
      if(url.includes('/auth/v1/user'))return json({id:userId});
      if(url.includes('/rpc/get_my_access'))return json({editor:options.editor!==false});
      if(url.includes('/rest/v1/'))return json([]);
      if(url.includes('/storage/v1/'))return new Response('Revenue = GBP 4,000.');
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
console.log('PASS: free-tier request, quota classification, bounded retry, verification honesty, ownership and output validation.');
