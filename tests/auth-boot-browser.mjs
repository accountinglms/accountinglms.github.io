import { chromium, webkit } from 'playwright';

const browserName = process.env.BROWSER || 'chromium';
const engine = browserName === 'webkit' ? webkit : chromium;
const baseURL = process.env.TEST_BASE_URL || 'https://127.0.0.1:4173';
const AUTH_KEY = 'icaew-lms-auth-v2';

const user = {
  id:'11111111-1111-4111-8111-111111111111',
  email:'session.restore@example.com',
  email_confirmed_at:'2026-10-09T00:00:00Z',
  confirmed_at:'2026-10-09T00:00:00Z',
  user_metadata:{display_name:'Session Restore'},
  factors:[]
};

const session = {
  access_token:'token-aal2',
  refresh_token:'refresh-aal2',
  expires_at:Math.floor(Date.now()/1000)+3600,
  token_type:'bearer',
  user
};

function cors(){
  return {
    'access-control-allow-origin':'*',
    'access-control-allow-methods':'GET,POST,PATCH,PUT,DELETE,OPTIONS',
    'access-control-allow-headers':'authorization,apikey,content-type,prefer',
    'access-control-expose-headers':'*'
  };
}

function json(route,body,status=200){
  return route.fulfill({status,contentType:'application/json',headers:cors(),body:JSON.stringify(body)});
}

function assert(condition,message){
  if(!condition) throw new Error(message);
}

async function installMock(context,{delayAuth=0}={}){
  await context.route('https://uangiwgznukuicrfnohq.supabase.co/**', async route => {
    const req=route.request();
    const url=new URL(req.url());
    const path=url.pathname;

    if(req.method()==='OPTIONS') return route.fulfill({status:204,headers:cors(),body:''});

    if(path==='/auth/v1/user'){
      if(delayAuth) await new Promise(r=>setTimeout(r,delayAuth));
      return json(route,user);
    }

    if(path==='/rest/v1/rpc/get_my_access'){
      return json(route,{allowed:true,editor:true,role:'owner',mfa_required:false,mfa_satisfied:true,aal:'aal2'});
    }

    if(path==='/rest/v1/subjects' || path==='/rest/v1/chapters' || path==='/rest/v1/exercises' || path==='/rest/v1/questions'){
      return json(route,[]);
    }

    if(path==='/rest/v1/user_progress' || path==='/rest/v1/user_preferences' || path==='/rest/v1/profiles'){
      if(req.method()==='GET') return json(route,[]);
      return route.fulfill({status:204,headers:cors(),body:''});
    }

    if(path.startsWith('/rest/v1/')){
      if(req.method()==='GET') return json(route,[]);
      return route.fulfill({status:204,headers:cors(),body:''});
    }

    return json(route,{});
  });
}

const browser=await engine.launch({headless:true});
try{
  {
    const context=await browser.newContext({serviceWorkers:'block',ignoreHTTPSErrors:true,viewport:{width:390,height:844}});
    await installMock(context,{delayAuth:900});
    const page=await context.newPage();

    await page.addInitScript(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:AUTH_KEY,value:session});
    await page.goto(baseURL+'/',{waitUntil:'domcontentloaded'});

    await page.waitForTimeout(120);
    const during=await page.evaluate(()=>({
      bodyPending:document.body.classList.contains('auth-pending'),
      bootVisible:getComputedStyle(document.querySelector('#auth-boot')).display!=='none',
      gateVisible:getComputedStyle(document.querySelector('#auth-gate')).display!=='none',
      loginVisible:getComputedStyle(document.querySelector('#auth-login-view')).display!=='none'
    }));

    assert(during.bodyPending,'Saved-session boot state ended before auth validation completed');
    assert(during.bootVisible,'Neutral auth boot screen is not visible during session restore');
    assert(!during.gateVisible,'Login gate flashed while a saved session was being restored');

    await page.waitForFunction(()=>!document.body.classList.contains('auth-pending'));
    const after=await page.evaluate(()=>({
      bootVisible:getComputedStyle(document.querySelector('#auth-boot')).display!=='none',
      gateVisible:getComputedStyle(document.querySelector('#auth-gate')).display!=='none',
      accountVisible:document.querySelector('#cloud-account')?.hidden===false
    }));

    assert(!after.bootVisible,'Auth boot screen remained after valid session restore');
    assert(!after.gateVisible,'Login gate is visible after valid session restore');
    assert(after.accountVisible,'Workspace account area did not restore after valid session');

    await context.close();
  }

  {
    const context=await browser.newContext({serviceWorkers:'block',ignoreHTTPSErrors:true,viewport:{width:390,height:844}});
    await installMock(context);
    const page=await context.newPage();

    await page.goto(baseURL+'/',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>!document.body.classList.contains('auth-pending'));

    const loggedOut=await page.evaluate(()=>({
      bootVisible:getComputedStyle(document.querySelector('#auth-boot')).display!=='none',
      gateVisible:getComputedStyle(document.querySelector('#auth-gate')).display!=='none',
      loginHidden:document.querySelector('#auth-login-view')?.hidden===true
    }));

    assert(!loggedOut.bootVisible,'Boot screen remained for logged-out user');
    assert(loggedOut.gateVisible,'Login gate did not appear for user without a session');
    assert(!loggedOut.loginHidden,'Login view is hidden for user without a session');

    await context.close();
  }

  console.log(`PASS ${browserName}: no login flash during saved-session restore`);
} finally {
  await browser.close();
}
