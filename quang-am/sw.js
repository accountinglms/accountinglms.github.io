/* App-shell cache scoped to /quang-am only; does not cache LMS or copyrighted story. */
const NAME='quang-am-github-v3';
const SHELL=['./','./index.html','./styles.css','./app.js','./manifest.webmanifest','./icon.svg','./titles.json'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(NAME).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('quang-am-github-')&&k!==NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
  const req=event.request,url=new URL(req.url),base=new URL(self.registration.scope);
  if(req.method!=='GET'||url.origin!==base.origin||!url.pathname.startsWith(base.pathname))return;
  event.respondWith((async()=>{
    try{const response=await fetch(req);if(response.ok){const clone=response.clone();event.waitUntil(caches.open(NAME).then(c=>c.put(req,clone)));}return response;}
    catch{const stored=await caches.match(req,{ignoreSearch:req.mode==='navigate'});if(stored)return stored;return req.mode==='navigate'?(await caches.match(new URL('./index.html',base).href))||Response.error():Response.error();}
  })());
});