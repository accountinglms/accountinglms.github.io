import { chromium, webkit } from 'playwright';

const browserName = process.env.BROWSER || 'chromium';
const engine = browserName === 'webkit' ? webkit : chromium;
const baseURL = process.env.TEST_BASE_URL || 'https://127.0.0.1:4173';
const AUTH_KEY = 'icaew-lms-auth-v2';

const user = {
  id:'11111111-1111-4111-8111-111111111111',
  email:'routing.test@example.com',
  email_confirmed_at:'2026-10-09T00:00:00Z',
  confirmed_at:'2026-10-09T00:00:00Z',
  user_metadata:{display_name:'Routing Test'},
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
    'access-control-allow-headers':'authorization,apikey,content-type,prefer,x-upsert',
    'access-control-expose-headers':'*'
  };
}
function json(route, body, status=200){
  return route.fulfill({status,contentType:'application/json',headers:headers(),body:JSON.stringify(body)});
}
function assert(condition,message){ if(!condition) throw new Error(message); }

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
      return json(route,[{id:'management_accounting',title:'Management Accounting',sort_order:0,is_active:true}]);
    }
    if(path==='/rest/v1/chapters'){
      return json(route,[{id:'ma_standard_costing',subject_id:'management_accounting',title:'Standard Costing',sort_order:0,is_active:true}]);
    }
    if(path==='/rest/v1/exercises'){
      return json(route,[{id:'ma_standard_costing_practice',chapter_id:'ma_standard_costing',title:'Practice Questions',sort_order:0,is_active:true,question_count:0}]);
    }
    if(path==='/rest/v1/questions' || path==='/rest/v1/lessons' || path==='/rest/v1/content_audit_log' || path==='/rest/v1/content_snapshots'){
      return json(route,[]);
    }
    if(path.startsWith('/storage/v1/object/content-imports/')){
      return json(route,{Key:path});
    }
    if(path==='/functions/v1/icaew-ai-route'){
      return json(route,{
        confidence:.96,
        mixed_subjects:false,
        detected_topics:['standard costing','variance analysis'],
        subject:{match_id:'management_accounting',match_title:'Management Accounting',create_new:false,suggested_title:null,reason:'Course-level match'},
        chapter:{match_id:'ma_standard_costing',match_title:'Standard Costing',create_new:false,suggested_title:null,reason:'Chapter match'},
        exercise:{match_id:'ma_standard_costing_practice',match_title:'Practice Questions',create_new:false,suggested_title:null,reason:'Question set'},
        warnings:[],
        target_type:'questions',
        model_name:'mock-route'
      });
    }
    if(path.startsWith('/rest/v1/')){
      if(req.method()==='GET') return json(route,[]);
      return json(route,[{}],201);
    }
    return json(route,{});
  });
}

const browser=await engine.launch({headless:true});
try{
  const context=await browser.newContext({
    serviceWorkers:'block',
    ignoreHTTPSErrors:true,
    viewport:{width:1280,height:900}
  });
  await installMock(context);
  const page=await context.newPage();
  await page.addInitScript(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:AUTH_KEY,value:session});
  await page.goto(baseURL+'/admin.html',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#app:not(.hidden)');
  await page.waitForFunction(()=>document.querySelector('#subject')?.options?.length>1);

  let state=await page.evaluate(()=>({
    subject:document.querySelector('#subject')?.value,
    chapter:document.querySelector('#chapter')?.value,
    exercise:document.querySelector('#exercise')?.value,
    generateDisabled:document.querySelector('#ai-generate')?.disabled
  }));
  assert(!state.subject && !state.chapter && !state.exercise,'Destination was selected implicitly before routing');
  assert(state.generateDisabled===true,'Generate Draft is enabled before confirmation');

  await page.setInputFiles('#import-file',{
    name:'standard-costing.txt',
    mimeType:'text/plain',
    buffer:Buffer.from('Standard costing and variance analysis practice questions.')
  });
  await page.click('#ai-route');
  await page.waitForSelector('#route-suggestion:not(.hidden)');
  const suggestionText=await page.textContent('#route-suggestion');
  assert(/Management Accounting/.test(suggestionText),'AI Subject suggestion did not render');
  assert(/Standard Costing/.test(suggestionText),'AI Chapter suggestion did not render');

  await page.click('#route-apply');
  await page.waitForFunction(()=>document.querySelector('#destination-status')?.classList.contains('confirmed'));

  state=await page.evaluate(()=>({
    subject:document.querySelector('#subject')?.value,
    chapter:document.querySelector('#chapter')?.value,
    exercise:document.querySelector('#exercise')?.value,
    generateDisabled:document.querySelector('#ai-generate')?.disabled,
    status:document.querySelector('#destination-status')?.textContent||''
  }));
  assert(state.subject==='management_accounting','Suggested Subject was not applied');
  assert(state.chapter==='ma_standard_costing','Suggested Chapter was not applied');
  assert(state.exercise==='ma_standard_costing_practice','Suggested Exercise was not applied');
  assert(state.generateDisabled===false,'Generate Draft did not unlock after confirmed AI routing');
  assert(/Đã xác nhận/.test(state.status),'Confirmed destination status missing');

  await page.selectOption('#import-target','lesson');
  state=await page.evaluate(()=>({
    exerciseHidden:document.querySelector('#exercise-destination-row')?.classList.contains('hidden'),
    generateDisabled:document.querySelector('#ai-generate')?.disabled,
    status:document.querySelector('#destination-status')?.textContent||''
  }));
  assert(state.exerciseHidden===true,'Exercise destination should hide for Lesson / Notes');
  assert(state.generateDisabled===true,'Changing target type must invalidate destination confirmation');

  await page.selectOption('#subject','management_accounting');
  await page.selectOption('#chapter','ma_standard_costing');
  await page.click('#confirm-destination');
  state=await page.evaluate(()=>({
    generateDisabled:document.querySelector('#ai-generate')?.disabled,
    exercise:document.querySelector('#exercise')?.value,
    overflow:document.documentElement.scrollWidth>window.innerWidth+1
  }));
  assert(state.generateDisabled===false,'Lesson destination did not confirm with Subject + Chapter');
  assert(!state.exercise,'Lesson target retained an Exercise value');
  assert(!state.overflow,'AI routing UI caused horizontal overflow');

  console.log(`PASS ${browserName}: AI content routing and destination confirmation`);
  await context.close();
} finally {
  await browser.close();
}
