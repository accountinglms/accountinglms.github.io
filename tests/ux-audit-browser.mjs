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
  ['diagnostics','diagnostics.html','#app:not(.hidden)',true],
  ['home-expanded','home.html','#subject-catalog .subject-row',true],
  ['admin-expanded','admin.html','#app:not(.hidden)',true],
  ['community-group','community.html','.chat-group',true],
  ['community-profile','community.html','.chat-group',true],
  ['quiz-menu','index.html?exercise=ex1','#quiz-container',true],
  ['community-info','community.html','.chat-group',true]
];

try{
  for(const [width,theme] of [320,390,820,1440].flatMap(width=>['light','dark'].map(theme=>[width,theme]))){
    for(const [name,url,ready,signedIn] of scenarios){
      if(name==='quiz-menu'&&width>900||name==='community-info'&&width>1130)continue;
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
        window.__uxMetrics={cls:0,lcp:null,shifts:[]};
        try{new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput){window.__uxMetrics.cls+=e.value;if(window.__uxMetrics.shifts.length<5)window.__uxMetrics.shifts.push({value:e.value,sources:e.sources?.map(s=>({node:s.node?.id||s.node?.getAttribute?.('class')||s.node?.tagName,from:{x:s.previousRect.x,y:s.previousRect.y,width:s.previousRect.width,height:s.previousRect.height},to:{x:s.currentRect.x,y:s.currentRect.y,width:s.currentRect.width,height:s.currentRect.height}}))});}}).observe({type:'layout-shift',buffered:true});}catch{}
        try{new PerformanceObserver(list=>{window.__uxMetrics.lcp=list.getEntries().at(-1)?.startTime||null;}).observe({type:'largest-contentful-paint',buffered:true});}catch{}
      },{theme,session,signedIn});
      const page=await context.newPage(),errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      const started=Date.now();
      let result={name,width,theme,errors};
      try{
        await page.goto(baseURL+'/'+url,{waitUntil:'domcontentloaded'});
        await page.waitForSelector(ready,{timeout:12000});
        if(signedIn&&url.startsWith('index.html'))await page.waitForFunction(()=>!document.body.classList.contains('auth-pending')&&document.querySelector('#auth-gate').classList.contains('hidden'));
        if(signedIn&&name==='account')await page.waitForFunction(()=>document.querySelector('#display-name').value.length>0);
        if(name.startsWith('community'))await page.waitForSelector('#message-input');
        if(name==='home-expanded'||name==='admin-expanded')await page.evaluate(()=>document.querySelectorAll('details').forEach(el=>el.open=true));
        if(name==='community-group'){
          if(width<=700)await page.locator('#mobile-chat-menu').click();
          await page.locator('#create-group-btn').click();
          await page.waitForSelector('#group-modal:not([hidden])');
        }
        if(name==='community-profile'){
          if(await page.locator('#community-profile-open').isVisible())await page.locator('#community-profile-open').click();
          else{
            if(width<=700)await page.locator('#mobile-chat-menu').click();
            await page.locator('[data-social-tab="people"]').click();
            await page.locator('#social-people-list [data-profile-user]').first().click();
          }
          await page.waitForFunction(()=>document.querySelector('#community-profile-dialog').contains(document.activeElement));
        }
        if(name==='community-info'){
          await page.locator('#chat-more-btn').click();
          await page.locator('[data-chat-menu="info"]').click();
          await page.waitForFunction(()=>document.querySelector('#community-info').contains(document.activeElement));
        }
        if(name==='quiz-menu')await page.locator('#mobile-menu-btn').click();
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
          nodes:v.nodes.slice(0,20).map(n=>({target:n.target,summary:n.failureSummary,
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
  r.violations?.length);
console.log('UX_SUMMARY '+JSON.stringify({browser:browserName,cases:report.length,failures:failures.length}));
if(enforce&&failures.length)throw new Error('UX audit found '+failures.length+' failing page states.');
