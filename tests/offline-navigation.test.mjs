import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../sw.js',import.meta.url),'utf8');
const origin='https://lms.example.test';
async function scenario({url='/index.html?exercise=ex1',mode='navigate',network='offline',cached=true}={}){
  const listeners={},entries=new Map();let timeout=0,requestCount=0;
  if(cached)entries.set(origin+'/index.html',new Response('quiz shell'));
  entries.set(origin+'/home.html',new Response('home shell'));
  const key=value=>new URL(typeof value==='string'?value:value.url,origin+'/').href;
  const cache={put:async(request,response)=>entries.set(key(request),response)};
  const caches={open:async()=>cache,match:async(request,options={})=>{
    const target=new URL(key(request));if(options.ignoreSearch)target.search='';
    return entries.get(target.href)?.clone();
  }};
  const fetch=async()=>{requestCount++;if(network==='offline')throw new TypeError('offline');if(network==='stalled')return new Promise(()=>{});return new Response('fresh shell',{status:network==='server-error'?503:200});};
  vm.runInNewContext(source,{self:{addEventListener:(name,fn)=>listeners[name]=fn},caches,fetch,location:{origin},URL,Response,
    setTimeout:(fn,ms)=>{timeout=ms;return setTimeout(fn,1);},clearTimeout});
  const waiting=[];let result;
  listeners.fetch({request:{url:new URL(url,origin).href,mode,method:'GET'},waitUntil:p=>waiting.push(p),respondWith:p=>{result=p;}});
  if(!result)return {requestCount};
  const response=await result;if(network!=='stalled')await Promise.all(waiting);
  return {body:await response.text(),requestCount,timeout,stored:entries};
}
assert.equal((await scenario()).body,'quiz shell','Offline exercise URL must load the quiz shell instead of home');
assert.equal((await scenario({url:'/history.html?chapter=ch1',cached:false})).body,'home shell','Uncached navigation must have a fallback');
assert.equal((await scenario({network:'stalled'})).body,'quiz shell','Cached navigation must not hang on stalled networking');
assert.equal((await scenario({network:'stalled'})).timeout,3000);
assert.equal((await scenario({network:'server-error'})).body,'quiz shell','Temporary server error should use the cached app');
assert.equal((await scenario({network:'ok'})).body,'fresh shell','Healthy network should still update the page');
assert.equal((await scenario({url:'https://backend.example.test/rest/v1/user_progress'})).requestCount,0,'Private API traffic must bypass the app cache');
console.log('PASS offline exercise URLs, bounded cache fallback, fresh navigation and private API isolation');
