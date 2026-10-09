const CACHE='icaew-lms-github-v43';
const APP=['./','./index.html','./home.html','./community.html','./progress.html','./account.html','./admin.html','./lessons.html','./diagnostics.html','./history.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./assets/learner.css','./assets/account.css','./assets/history.css','./assets/portal.css','./assets/vg-theme.css','./assets/calculator.css','./assets/theme-init.js','./assets/learner-core.js','./assets/cloud-sync.js','./assets/calculator.js','./assets/calculator-pro.js','./assets/translation.js','./assets/common.js','./assets/score-model.js','./assets/account.js','./assets/admin.js','./assets/lessons.js','./assets/diagnostics.js','./assets/history.js','./assets/home.js','./assets/community.js','./assets/progress.js']
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(APP)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==location.origin)return;
  event.respondWith(fetch(event.request).then(res=>{
    if(res.ok){const copy=res.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(event.request,copy)));}
    return res;
  }).catch(async()=>{
    const cached=await caches.match(event.request);
    if(cached)return cached;
    if(event.request.mode==='navigate')return (await caches.match('./home.html'))||(await caches.match('./index.html'))||Response.error();
    return Response.error();
  }));
});