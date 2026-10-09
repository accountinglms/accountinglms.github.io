import { chromium, webkit } from 'playwright';

const browserName = process.env.BROWSER || 'chromium';
const engine = browserName === 'webkit' ? webkit : chromium;
const baseURL = process.env.TEST_BASE_URL || 'https://127.0.0.1:4173';
const AUTH_KEY = 'icaew-lms-auth-v2';

const user = {
  id:'11111111-1111-4111-8111-111111111111',
  email:'admin.layout@example.com',
  email_confirmed_at:'2026-10-09T00:00:00Z',
  confirmed_at:'2026-10-09T00:00:00Z',
  user_metadata:{display_name:'Admin Layout'},
  factors:[]
};

const session = {
  access_token:'token-aal2',
  refresh_token:'refresh-aal2',
  expires_at:Math.floor(Date.now()/1000)+3600,
  token_type:'bearer',
  user
};

function headers(){
  return {
    'access-control-allow-origin':'*',
    'access-control-allow-methods':'GET,POST,PATCH,PUT,DELETE,OPTIONS',
    'access-control-allow-headers':'authorization,apikey,content-type,prefer',
    'access-control-expose-headers':'*'
  };
}

function json(route, body, status=200){
  return route.fulfill({
    status,
    contentType:'application/json',
    headers:headers(),
    body:JSON.stringify(body)
  });
}

async function installMock(context){
  await context.route('https://uangiwgznukuicrfnohq.supabase.co/**', async route => {
    const req=route.request();
    const url=new URL(req.url());
    const path=url.pathname;

    if(req.method()==='OPTIONS') return route.fulfill({status:204,headers:headers(),body:''});
    if(path==='/auth/v1/user') return json(route,user);
    if(path==='/rest/v1/rpc/get_my_access'){
      return json(route,{allowed:true,editor:true,role:'owner',mfa_required:false,mfa_satisfied:true,aal:'aal2'});
    }
    if(path==='/rest/v1/subjects'){
      return json(route,[{id:'accounting_fundamental',title:'Accounting Fundamental',sort_order:0,is_active:true}]);
    }
    if(path==='/rest/v1/chapters'){
      return json(route,[{id:'c1',subject_id:'accounting_fundamental',title:'Chapter 1: Introduction to accounting',sort_order:0,is_active:true}]);
    }
    if(path==='/rest/v1/exercises'){
      return json(route,[{id:'c1_s1',chapter_id:'c1',title:'Practice Questions (1-28)',sort_order:0,is_active:true,question_count:1}]);
    }
    if(path==='/rest/v1/questions'){
      return json(route,[{
        id:'q1',exercise_id:'c1_s1',sort_order:0,question_type:'single',
        prompt:'Which item is capital expenditure?',options:['New machine','Annual servicing'],
        correct_answer:0,status:'published',verification_status:'verified',metadata:{legacy_migrated:true}
      }]);
    }
    if(path==='/rest/v1/lessons') return json(route,[]);
    if(path==='/rest/v1/content_audit_log') return json(route,[]);
    if(path==='/rest/v1/content_snapshots') return json(route,[]);
    if(path.startsWith('/rest/v1/')){
      if(req.method()==='GET') return json(route,[]);
      return route.fulfill({status:204,headers:headers(),body:''});
    }
    return json(route,{});
  });
}

function assert(condition,message){
  if(!condition) throw new Error(message);
}

for(const viewport of [
  {name:'desktop',width:1440,height:900,isMobile:false},
  {name:'phone',width:390,height:844,isMobile:true}
]){
  const browser=await engine.launch({headless:true});
  try{
    const context=await browser.newContext({
      serviceWorkers:'block',
      ignoreHTTPSErrors:true,
      viewport:{width:viewport.width,height:viewport.height},
      isMobile:viewport.isMobile,
      hasTouch:viewport.isMobile
    });
    await installMock(context);
    const page=await context.newPage();
    await page.addInitScript(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:AUTH_KEY,value:session});
    await page.goto(baseURL+'/admin.html',{waitUntil:'domcontentloaded'});
    await page.waitForSelector('#app:not(.hidden)');
    await page.waitForFunction(()=>document.querySelector('#subject')?.options?.length>1);

    const result=await page.evaluate(()=> {
      const hero=document.querySelector('.aiHero');
      const library=document.querySelector('#question-list')?.closest('.sectionCard');
      const details=[...document.querySelectorAll('.toolDetails')];
      const importFile=document.querySelector('#import-file');
      const subject=document.querySelector('#subject');
      const chapter=document.querySelector('#chapter');
      const exercise=document.querySelector('#exercise');
      const qEditor=document.querySelector('#question-form');
      const lessonEditor=document.querySelector('#lesson-form');
      const audit=document.querySelector('#audit-list');
      return {
        heroTop:hero?.getBoundingClientRect().top ?? 99999,
        libraryTop:library?.getBoundingClientRect().top ?? 0,
        detailsOpen:details.map(d=>d.open),
        aiVisible:!!importFile,
        targetVisible:!!document.querySelector('#import-target'),
        generateVisible:!!document.querySelector('#ai-generate'),
        destinationReady:Boolean(subject?.value && chapter?.value && exercise?.value),
        manualEditorsPresent:Boolean(qEditor && lessonEditor),
        safetyPresent:Boolean(audit),
        overflow:document.documentElement.scrollWidth>window.innerWidth+1
      };
    });

    assert(result.aiVisible && result.targetVisible && result.generateVisible, `${viewport.name}: AI Import controls missing`);
    assert(result.heroTop < result.libraryTop, `${viewport.name}: AI Import is not above Question Library`);
    assert(result.destinationReady, `${viewport.name}: destination selectors did not load`);
    assert(result.detailsOpen.every(v=>v===false), `${viewport.name}: secondary tools are not collapsed by default`);
    assert(result.manualEditorsPresent, `${viewport.name}: manual editors were removed`);
    assert(result.safetyPresent, `${viewport.name}: Activity & Safety was removed`);
    assert(!result.overflow, `${viewport.name}: Admin page has horizontal overflow`);

    console.log(`PASS ${browserName} ${viewport.name}: AI-first Admin layout`);
    await context.close();
  } finally {
    await browser.close();
  }
}
