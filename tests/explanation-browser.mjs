import { chromium, webkit } from 'playwright';

const browserName = process.env.BROWSER || 'chromium';
const engine = browserName === 'webkit' ? webkit : chromium;
const baseURL = process.env.TEST_BASE_URL || 'https://127.0.0.1:4173';
const AUTH_KEY = 'icaew-lms-auth-v2';

const user = {
  id:'11111111-1111-4111-8111-111111111111',
  email:'audit.test@example.com',
  email_confirmed_at:'2026-10-09T00:00:00Z',
  user_metadata:{display_name:'Audit Test'},
  factors:[]
};

const session = {
  access_token:'token-aal2',
  refresh_token:'refresh-aal2',
  expires_at:Math.floor(Date.now()/1000)+3600,
  token_type:'bearer',
  user
};

function corsHeaders(){
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
    headers:corsHeaders(),
    body:JSON.stringify(body)
  });
}

async function installMock(context){
  await context.route('https://uangiwgznukuicrfnohq.supabase.co/**', async route => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;

    if(req.method()==='OPTIONS'){
      return route.fulfill({status:204,headers:corsHeaders(),body:''});
    }

    if(path==='/auth/v1/user') return json(route,user);

    if(path==='/rest/v1/rpc/get_my_access'){
      return json(route,{
        allowed:true,
        editor:true,
        role:'owner',
        mfa_required:false,
        mfa_satisfied:true,
        aal:'aal2'
      });
    }

    if(path==='/rest/v1/subjects'){
      return json(route,[{
        id:'accounting_fundamental',
        title:'Accounting Fundamental',
        sort_order:0,
        is_active:true
      }]);
    }

    if(path==='/rest/v1/chapters'){
      return json(route,[{
        id:'chapter_1',
        subject_id:'accounting_fundamental',
        title:'Chapter 1',
        sort_order:0,
        is_active:true
      }]);
    }

    if(path==='/rest/v1/exercises'){
      return json(route,[{
        id:'exercise_1',
        chapter_id:'chapter_1',
        title:'Practice Questions',
        sort_order:0,
        is_active:true,
        content_mode:'database'
      }]);
    }

    if(path==='/rest/v1/questions'){
      return json(route,[{
        id:'question_1',
        exercise_id:'exercise_1',
        sort_order:1,
        question_type:'single',
        prompt:'Which cost should be capitalised as part of a new machine?',
        options:['Direct delivery cost','Routine annual servicing'],
        correct_answer:0,
        required_selections:1,
        explanation_en:'Direct delivery is directly attributable to bringing the machine to the location necessary for use.',
        explanation_vi:'Chi phí vận chuyển trực tiếp được tính vào nguyên giá khi cần thiết để đưa máy đến địa điểm sử dụng.',
        practical_example_en:'A factory pays £60,000 for a machine and £2,000 to deliver it to the factory. The delivery is included in the machine cost.',
        practical_example_vi:'Nhà máy mua máy £60.000 và trả £2.000 vận chuyển đến nhà máy. Chi phí vận chuyển được cộng vào nguyên giá máy.',
        standard_reference:'IAS 16.17 — directly attributable costs',
        status:'published',
        metadata:{}
      }]);
    }

    if(path==='/rest/v1/user_progress' || path==='/rest/v1/user_preferences'){
      if(req.method()==='GET') return json(route,[]);
      return route.fulfill({status:204,headers:corsHeaders(),body:''});
    }

    if(path.startsWith('/rest/v1/')){
      if(req.method()==='GET') return json(route,[]);
      return route.fulfill({status:204,headers:corsHeaders(),body:''});
    }

    return json(route,{});
  });
}

function assert(condition,message){
  if(!condition) throw new Error(message);
}

const browser=await engine.launch({headless:true});
try{
  const context=await browser.newContext({
    serviceWorkers:'block',
    ignoreHTTPSErrors:true,
    viewport:{width:390,height:844},
    isMobile:true,
    hasTouch:true
  });
  await installMock(context);

  const page=await context.newPage();
  await page.addInitScript(({key,value})=>{
    localStorage.setItem(key,JSON.stringify(value));
  },{key:AUTH_KEY,value:session});

  await page.goto(baseURL+'/index.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#auth-gate')?.classList.contains('hidden')===true);
  await page.waitForSelector('#menu-exercise_1');

  await page.click('#mobile-menu-btn');
  await page.click('#menu-exercise_1');
  await page.waitForSelector('#options-container .option');

  await page.click('#options-container .option:nth-child(1)');
  await page.click('#submit-btn');
  await page.waitForSelector('#explanation.show');

  const result=await page.evaluate(()=>({
    explanationEn:document.querySelector('#eng-exp')?.textContent||'',
    explanationVi:document.querySelector('#vie-exp')?.textContent||'',
    exampleEn:document.querySelector('#eng-example')?.textContent||'',
    exampleVi:document.querySelector('#vie-example')?.textContent||'',
    reference:document.querySelector('#standard-reference-text')?.textContent||'',
    exampleEnHidden:document.querySelector('#eng-example-card')?.hidden,
    exampleViHidden:document.querySelector('#vie-example-card')?.hidden,
    referenceHidden:document.querySelector('#standard-reference')?.hidden,
    overflow:document.documentElement.scrollWidth>window.innerWidth+1
  }));

  assert(/Direct delivery/.test(result.explanationEn),'English explanation did not render');
  assert(/Chi phí vận chuyển/.test(result.explanationVi),'Vietnamese explanation did not render');
  assert(/factory pays £60,000/i.test(result.exampleEn),'English practical example did not render');
  assert(/Nhà máy mua máy/.test(result.exampleVi),'Vietnamese practical example did not render');
  assert(/IAS 16\.17/.test(result.reference),'Standard reference did not render');
  assert(result.exampleEnHidden===false,'English example card is hidden');
  assert(result.exampleViHidden===false,'Vietnamese example card is hidden');
  assert(result.referenceHidden===false,'Standard reference is hidden');
  assert(!result.overflow,'Explanation/example layout overflows the phone viewport');

  console.log(`PASS ${browserName}: audited explanation + practical example + reference`);
  await context.close();
} finally {
  await browser.close();
}
