import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../assets/common.js',import.meta.url),'utf8');
const key='icaew-lms-auth-v2';
const originalFetch=globalThis.fetch,originalStorage=globalThis.localStorage;
const user={id:'member-a',email:'member@example.test'};
const fresh={access_token:'access-a',refresh_token:'refresh-a',expires_at:Math.floor(Date.now()/1000)+3600,user};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status});
let cases=0;
async function setup(session=fresh){
  const values=new Map();
  globalThis.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
  const api=await import('data:text/javascript;base64,'+Buffer.from(source+'\n// case '+cases++).toString('base64'));
  api.saveSession(session);
  return api;
}
try{
  for(const status of [429,500,503]){
    const api=await setup();let calls=0;
    globalThis.fetch=async()=>{calls++;return json({message:'temporary'},status);};
    await assert.rejects(api.ensureSession(),e=>e.code==='NETWORK_ERROR'&&e.retryable);
    assert.equal(api.loadSession().access_token,fresh.access_token);
    assert.equal(calls,1,'A server outage must not trigger token rotation');
  }
  {
    const api=await setup();globalThis.fetch=async()=>{throw new TypeError('offline');};
    await assert.rejects(api.ensureSession(),e=>e.retryable);
    assert.equal(api.loadSession().refresh_token,fresh.refresh_token);
  }
  {
    const api=await setup({...fresh,expires_at:0});
    globalThis.fetch=async()=>json({message:'busy'},500);
    await assert.rejects(api.ensureSession(),e=>e.retryable);
    assert.equal(api.loadSession().refresh_token,fresh.refresh_token,'Failed refresh preserves credentials');
  }
  {
    const api=await setup();
    globalThis.fetch=async url=>json({message:String(url).includes('/token')?'Invalid Refresh Token: Refresh Token Not Found':'expired'},String(url).includes('/token')?400:401);
    await assert.rejects(api.ensureSession(),e=>e.code==='SESSION_EXPIRED');
    assert.equal(api.loadSession(),null,'Revoked credentials must be cleared');
  }
  {
    const api=await setup({...fresh,expires_at:0});const counts={refresh:0,user:0,access:0};
    globalThis.fetch=async url=>{
      await new Promise(resolve=>setTimeout(resolve,3));
      if(String(url).includes('/token')){counts.refresh++;return json({...fresh,access_token:'next',refresh_token:'next-refresh'});}
      if(String(url).includes('/auth/v1/user')){counts.user++;return json(user);}
      counts.access++;return json({allowed:true,editor:false,mfa_required:false});
    };
    const sessions=await Promise.all(Array.from({length:20},()=>api.ensureSession()));
    assert(sessions.every(s=>s.access_token==='next'));
    assert.deepEqual(counts,{refresh:1,user:1,access:1},'Concurrent reads share auth and access requests');
  }
  for(const operation of ['validate','refresh']){
    const api=await setup(operation==='refresh'?{...fresh,expires_at:0}:fresh);let reply;
    globalThis.fetch=()=>new Promise(resolve=>{reply=resolve;});
    const pending=api.ensureBaseSession();
    api.saveSession(null);
    reply(json(operation==='refresh'?{...fresh,access_token:'new'}:user));
    await assert.rejects(pending,e=>e.code==='SESSION_CHANGED');
    assert.equal(api.loadSession(),null,'Late '+operation+' must not undo logout');
  }
  {
    const api=await setup();let reply;
    globalThis.fetch=()=>new Promise(resolve=>{reply=resolve;});
    const pending=api.getMyAccess(fresh);
    api.saveSession({...fresh,access_token:'access-b',user:{id:'member-b'}});
    reply(json({allowed:true,editor:true}));
    await assert.rejects(pending,e=>e.code==='SESSION_CHANGED');
    assert.equal(api.loadSession().user.id,'member-b','Old rights cannot overwrite the next account');
  }
  {
    const api=await setup();globalThis.fetch=async url=>String(url).includes('/auth/v1/user')?json(user):json({allowed:true,mfa_required:true,mfa_satisfied:false});
    await assert.rejects(api.ensureSession(),e=>e.code==='MFA_REQUIRED');
    assert.equal(api.loadSession().user.id,user.id);
  }
  {
    const api=await setup();globalThis.fetch=(_,init)=>new Promise((resolve,reject)=>init.signal.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError')),{once:true}));
    await assert.rejects(api.fetchWithTimeout('https://example.test',{},5),e=>e.retryable);
    assert.equal(api.loadSession().access_token,fresh.access_token,'Timeout does not clear auth');
  }
  {
    const api=await setup();globalThis.fetch=async()=>json({id:'wrong-member'});
    await assert.rejects(api.ensureSession(),e=>e.code==='SESSION_EXPIRED');
    assert.equal(api.loadSession(),null,'User identity must match the saved session');
  }
  assert.equal(globalThis.localStorage.getItem(key),null);
  console.log('PASS auth network failures, revocation, request deduplication, MFA and account races ('+cases+' cases)');
}finally{globalThis.fetch=originalFetch;globalThis.localStorage=originalStorage;}
