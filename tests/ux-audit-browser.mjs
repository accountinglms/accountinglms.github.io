import {chromium,webkit} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {user,session,installFakeWebSocket,installMock} from './helpers/portal-fixtures.mjs';

const browserName=process.env.BROWSER||'chromium';
const baseURL=process.env.TEST_BASE_URL||'https://127.0.0.1:4173';
const enforce=process.env.UX_AUDIT_ENFORCE==='1';
const browser=await (browserName==='webkit'?webkit:chromium).launch({headless:true});
const report=[];
const cors={'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS',
  'access-control-allow-headers':'authorization,apikey,content-type,prefer'};
const scenarios=[
  ['login','index.html','#auth-gate:not(.hidden)',false],
  ['home','home.html','#subject-catalog .subject-row',true],
  ['quiz','index.html?exercise=ex1','#quiz-container',true],
  ['lessons','lessons.html?lesson=lesson-1','#lesson-reader-title',true],
  ['history','history.html','#timeline .attempt',true],
  ['community','community.html','.chat-group',true],
  ['progress','progress.html','#progress-content:not([hidden])',true],
  ['account','account.html','#profile-form',true],
  ['admin','admin.html','#app:not(.hidden)',true],
  ['diagnostics','diagnostics.html','#app:not(.hidden)',true]
];

try{
  for(const [width,theme] of [[320,'light'],[390,'dark'],[820,'light'],[1440,'dark']]){
    for(const [name,url,ready,signedIn] of scenarios){
      const context=await browser.newContext({ignoreHTTPSErrors:true,serviceWorkers:'block',viewport:{width,height:900}});
      await installFakeWebSocket(context);
      const data=await installMock(context);
      data.exercises[0].content_mode='database';data.exercises[0].question_count=1;
      data.lessons[0].content_markdown='Assets = Liabilities + Equity.\n\nThe accounting equation must stay in balance.';
      await context.route(/\/rest\/v1\/questions\?/,route=>route.fulfill({status:200,contentType:'application/json',headers:cors,
        body:JSON.stringify([{id:'ux-q1',exercise_id:'ex1',question_type:'single',prompt:'Assets = Liabilities + Equity. Which account is an asset?',
          options:['Cash','Sales revenue'],correct_answer:0,required_selections:1,status:'published',verification_status:'verified',metadata:{legacy_migrated:true},sort_order:0}])}));
      await context.route('**/rest/v1/rpc/get_my_content_access',route=>route.fulfill({status:200,contentType:'application/json',headers:cors,body:'{"content_owner":true}'}));
      await context.addInitScript(({theme,session,signedIn})=>{
        localStorage.setItem('icaewLMSTheme_v1',theme);
        if(signedIn)localStorage.setItem('icaew-lms-auth-v2',JSON.stringify(session));
        window.__uxMetrics={cls:0,lcp:null};
        try{new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)window.__uxMetrics.cls+=e.value;}).observe({type:'layout-shift',buffered:true});}catch{}
        try{new PerformanceObserver(list=>{window.__uxMetrics.lcp=list.getEntries().at(-1)?.startTime||null;}).observe({type:'largest-contentful-paint',buffered:true});}catch{}
      },{theme,session,signedIn});
      const page=await context.newPage(),errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      const started=Date.now();
      let result={name,width,theme,errors};
      try{
        await page.goto(baseURL+'/'+url,{waitUntil:'domcontentloaded'});
        await page.waitForSelector(ready,{timeout:12000});
        if(signedIn&&name==='account')await page.waitForFunction(()=>document.querySelector('#display-name').value.length>0);
        if(name==='community')await page.waitForSelector('#message-input');
        result.readyMs=Date.now()-started;
        await page.evaluate(()=>document.fonts.ready);
        result.layout=await page.evaluate(()=>{
          const visible=el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden'&&!el.closest('[inert]');
          return {viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,
            offenders:[...document.querySelectorAll('body *')].filter(visible).filter(el=>el.getBoundingClientRect().right>innerWidth+2)
              .map(el=>({tag:el.tagName,id:el.id,class:String(el.className)})).slice(0,8),
            smallTargets:[...document.querySelectorAll('button,a,input[type=checkbox]')].filter(visible)
              .filter(el=>{const r=el.getBoundingClientRect();return r.width<24||r.height<24;})
              .map(el=>({id:el.id,text:(el.getAttribute('aria-label')||el.textContent).trim().slice(0,50)})).slice(0,10),
            theme:document.documentElement.dataset.theme,
            metrics:window.__uxMetrics};
        });
        const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
        result.violations=axe.violations.map(v=>({id:v.id,impact:v.impact,count:v.nodes.length,
          nodes:v.nodes.slice(0,8).map(n=>({target:n.target,summary:n.failureSummary,
            data:n.any.map(c=>c.data).filter(Boolean)}))}));
        if(browserName==='chromium'&&((name==='home'&&width===320)||(name==='community'&&width===390)||(name==='login'&&width===320))){
          const shot=await page.screenshot({type:'jpeg',quality:48,fullPage:false});
          console.log('UX_SCREENSHOT '+name+'-'+width+'-'+theme+' '+shot.toString('base64'));
        }
      }catch(error){result.failure=error.message;}
      report.push(result);
      console.log('UX_AUDIT '+JSON.stringify(result));
      await context.close();
    }
  }
}finally{await browser.close();}
const failures=report.filter(r=>r.failure||r.errors.length||r.layout?.scrollWidth>r.width+1||
  r.violations?.some(v=>v.impact==='critical'||v.impact==='serious'));
console.log('UX_SUMMARY '+JSON.stringify({browser:browserName,cases:report.length,failures:failures.length}));
if(enforce&&failures.length)throw new Error('UX audit found '+failures.length+' failing page states.');
