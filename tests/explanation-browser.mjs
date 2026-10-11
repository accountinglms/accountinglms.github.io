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
      },{
        id:'question_2',
        exercise_id:'exercise_1',
        sort_order:2,
        question_type:'single',
        prompt:'Should routine servicing be capitalised?',
        options:['No','Yes'],
        correct_answer:0,
        required_selections:1,
        explanation_en:'Routine servicing is an expense.',
        explanation_vi:'Bảo dưỡng định kỳ được ghi nhận là chi phí.',
        practical_example_en:'An annual oil change is charged to expenses.',
        practical_example_vi:null,
        status:'published',
        metadata:{}
      },{
        id:'question_3',
        exercise_id:'exercise_1',
        sort_order:3,
        question_type:'single',
        prompt:'Is a machine held for use a non-current asset?',
        options:['Yes','No'],
        correct_answer:0,
        required_selections:1,
        explanation_en:'A machine held for use is a non-current asset.',
        explanation_vi:'Máy móc dùng cho hoạt động là tài sản dài hạn.',
        practical_example_en:null,
        practical_example_vi:null,
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
  for(const {theme,width} of ['light','dark'].flatMap(theme=>[320,390].map(width=>({theme,width})))){
  const context=await browser.newContext({
    serviceWorkers:'block',
    ignoreHTTPSErrors:true,
    viewport:{width,height:844},
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
  await page.evaluate(theme=>{document.documentElement.dataset.theme=theme;},theme);
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
  assert(result.exampleEnHidden===true,'English example should start collapsed');
  assert(result.exampleViHidden===true,'Vietnamese example should start collapsed');
  assert(result.referenceHidden===false,'Standard reference is hidden');
  assert(!result.overflow,'Explanation/example layout overflows the phone viewport');

  const toggle=page.locator('#explanation-example-toggle');
  assert(await toggle.isVisible(),'Question with examples is missing its example button');
  assert(await toggle.textContent()==='Ví dụ','Collapsed example button has the wrong label');
  assert(await toggle.getAttribute('aria-expanded')==='false','Example button should start collapsed');
  assert(!(await page.locator('#eng-example-card').isVisible()),'English example is visible before opening');
  assert(!(await page.locator('#vie-example-card').isVisible()),'Vietnamese example is visible before opening');
  const toolbar=await page.evaluate(()=>{
    const button=document.querySelector('#explanation-example-toggle');
    const language=document.querySelector('.explanation-lang');
    const rect=button.getBoundingClientRect();
    return {adjacent:language.nextElementSibling===button,width:rect.width,height:rect.height};
  });
  assert(toolbar.adjacent,'Example button is not beside the language controls');
  assert(toolbar.width>=44 && toolbar.height>=44,'Example button is too small for touch');

  await toggle.focus();
  await page.keyboard.press('Enter');
  assert(await toggle.getAttribute('aria-expanded')==='true','Keyboard did not open examples');
  assert(await page.locator('#eng-example-card').isVisible(),'English example did not open');
  assert(await page.locator('#vie-example-card').isVisible(),'Vietnamese example did not open');

  await page.click('.lang-btn[data-lang="eng"]');
  assert(await page.locator('#eng-example-card').isVisible(),'English example disappeared in EN mode');
  assert(!(await page.locator('#vie-example-card').isVisible()),'Vietnamese example is visible in EN mode');
  await page.click('.lang-btn[data-lang="vie"]');
  assert(!(await page.locator('#eng-example-card').isVisible()),'English example is visible in VI mode');
  assert(await page.locator('#vie-example-card').isVisible(),'Vietnamese example disappeared in VI mode');
  await page.click('.lang-btn[data-lang="both"]');
  assert(await page.locator('#eng-example-card').isVisible(),'English example did not return in bilingual mode');
  assert(await page.locator('#vie-example-card').isVisible(),'Vietnamese example did not return in bilingual mode');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'Open examples overflow the phone viewport');

  await toggle.focus();
  await page.keyboard.press('Space');
  assert(await toggle.getAttribute('aria-expanded')==='false','Keyboard did not collapse examples');
  assert(!(await page.locator('#eng-example-card').isVisible()),'English example did not collapse');
  assert(!(await page.locator('#vie-example-card').isVisible()),'Vietnamese example did not collapse');
  assert(await page.locator('#eng-exp').isVisible(),'Collapsing examples hid the explanation');
  assert(await page.locator('#standard-reference').isVisible(),'Collapsing examples hid the reference');

  await toggle.click();
  await page.click('#next-btn');
  await page.click('#options-container .option:nth-child(2)');
  await page.click('#submit-btn');
  assert(await page.locator('.explanation-result').textContent()==='Chưa chính xác','Incorrect answer explanation did not render');
  assert(await toggle.getAttribute('aria-expanded')==='false','Example visibility leaked into the next question');
  await toggle.click();
  assert(await page.locator('#eng-example-card').isVisible(),'English-only example did not open');
  assert(!(await page.locator('#vie-example-card').isVisible()),'Missing Vietnamese example rendered an empty card');
  await page.click('.lang-btn[data-lang="vie"]');
  assert(!(await toggle.isVisible()),'Example button is visible for a language without an example');
  assert(await page.locator('#vie-exp').isVisible(),'Missing example hid the Vietnamese explanation');
  await page.click('.lang-btn[data-lang="eng"]');
  assert(await toggle.isVisible(),'Example button did not return when selecting its language');
  assert(await toggle.getAttribute('aria-expanded')==='false','Unavailable-language switch retained stale example state');
  await toggle.click();

  await page.click('#next-btn');
  await page.click('#options-container .option:nth-child(1)');
  await page.click('#submit-btn');
  assert(!(await toggle.isVisible()),'Question without examples has an empty example button');
  assert(!(await page.locator('#eng-example-card').isVisible()),'Question without examples has an English card');
  assert(!(await page.locator('#vie-example-card').isVisible()),'Question without examples has a Vietnamese card');
  await page.click('#prev-btn');
  await page.click('#prev-btn');
  assert(await toggle.getAttribute('aria-expanded')==='false','Returning to an answered question reopened examples');
  assert(!(await page.locator('#eng-example-card').isVisible()),'Returning to a question leaked expanded examples');

  console.log(`PASS ${browserName} ${theme} ${width}px: collapsed examples, keyboard toggle, languages, navigation, missing examples and reference`);
  await context.close();
  }
} finally {
  await browser.close();
}
