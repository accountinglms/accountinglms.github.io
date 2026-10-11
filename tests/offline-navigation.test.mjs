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

const lifecycleListeners={};
let precached=[],activated=0,claimed=0;
const removed=[];
const currentCache=source.match(/const CACHE='([^']+)'/)[1];
const cacheNames=['icaew-lms-github-v1','icaew-lms-github-v2',currentCache,'other-app-cache'];
vm.runInNewContext(source,{
  self:{location:{href:origin+'/sw.js'},addEventListener:(name,fn)=>lifecycleListeners[name]=fn,
    skipWaiting:async()=>{activated++;},clients:{claim:async()=>{claimed++;}}},
  caches:{open:async()=>({addAll:async requests=>{precached=requests;}}),
    keys:async()=>cacheNames,delete:async name=>{removed.push(name);}},
  URL,Request
});
let completion;
lifecycleListeners.install({waitUntil:promise=>{completion=promise;}});
await completion;
assert(precached.length>10,'Installing an update did not cache the app shell');
assert(precached.every(request=>request.cache==='reload'),'New releases reused stale HTTP-cached assets');
assert(precached.every(request=>new URL(request.url).origin===origin),'Precache includes a third-party resource');
assert(precached.some(request=>request.url===origin+'/assets/app-update.js'),'Offline app cannot load the update checker');
assert.equal(activated,1,'Successfully cached update did not activate');
lifecycleListeners.activate({waitUntil:promise=>{completion=promise;}});
await completion;
assert.deepEqual(removed,['icaew-lms-github-v1','icaew-lms-github-v2'],'Update removed a current or unrelated cache');
assert.equal(claimed,1,'Activated update did not notify open clients');
console.log('PASS offline exercise URLs, fresh release assets, scoped cache cleanup and private API isolation');
