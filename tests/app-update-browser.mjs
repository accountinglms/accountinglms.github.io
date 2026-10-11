import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';

const browserName=process.env.BROWSER||'chromium';
const engine=browserName==='webkit'?webkit:chromium;
const baseURL=process.env.TEST_BASE_URL||'https://127.0.0.1:4173';

async function installHomeSession(context){
  const user={id:'11111111-1111-4111-8111-111111111111',email:'pwa.test@example.com',
    email_confirmed_at:'2026-10-09T00:00:00Z',user_metadata:{display_name:'PWA Test'},factors:[]};
  await context.route('https://uangiwgznukuicrfnohq.supabase.co/**',async route=>{
    const path=new URL(route.request().url()).pathname;
    const headers={'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,PATCH,OPTIONS',
      'access-control-allow-headers':'authorization,apikey,content-type,prefer'};
    if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers,body:''});
    const data=path==='/auth/v1/user'?user:path==='/rest/v1/rpc/get_my_access'
      ?{allowed:true,editor:false,role:'member',mfa_required:false,mfa_satisfied:true,aal:'aal1'}:[];
    return route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify(data)});
  });
  await context.addInitScript(user=>{
    localStorage.setItem('icaew-lms-auth-v2',JSON.stringify({user,access_token:'pwa-test-token',
      refresh_token:'pwa-test-refresh',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer'}));
  },user);
}

async function installLifecycle(context,firstInstall){
  await context.addInitScript(({firstInstall})=>{
    let now=Date.now(),visible='visible',online=true,pending=null;
    Date.now=()=>now;
    const calls={registrations:[],updates:0};
    const workers=new EventTarget();
    workers.controller=firstInstall?null:{state:'activated',scriptURL:location.origin+'/sw.js'};
    const registration={update:async()=>{
      calls.updates++;
      if(pending) await pending.promise;
    }};
    workers.register=async(url,options)=>{
      calls.registrations.push({url,options});
      return registration;
    };
    Object.defineProperty(navigator,'serviceWorker',{configurable:true,value:workers});
    Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>online});
    Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>visible});
    window.pwaTest={calls,
      advance:ms=>{now+=ms;},
      setOnline:value=>{online=value;},
      setVisible:value=>{visible=value;document.dispatchEvent(new Event('visibilitychange'));},
      changeController:()=>{
        workers.controller={state:'activated',scriptURL:location.origin+'/sw.js'};
        workers.dispatchEvent(new Event('controllerchange'));
      },
      stall:()=>{
        pending={};pending.promise=new Promise(resolve=>{pending.resolve=resolve;});
      },
      finish:()=>{pending.resolve();pending=null;}
    };
  },{firstInstall});
}

const browser=await engine.launch({headless:true});
try{
  for(const {theme,width} of ['light','dark'].flatMap(theme=>[320,390].map(width=>({theme,width})))){
    const firstInstall=theme==='light'&&width===320;
    const context=await browser.newContext({
      serviceWorkers:'block',ignoreHTTPSErrors:true,
      viewport:{width,height:844},isMobile:true,hasTouch:true
    });
    await installLifecycle(context,firstInstall);
    const route=width===390?'home.html':'index.html';
    if(route==='home.html')await installHomeSession(context);
    const page=await context.newPage();
    await page.goto(baseURL+'/'+route,{waitUntil:'load'});
    assert.equal(new URL(page.url()).pathname,'/'+route,'Update test did not stay on its intended launch page');
    await page.evaluate(theme=>{document.documentElement.dataset.theme=theme;},theme);
    await page.waitForFunction(()=>window.pwaTest.calls.registrations.length===1);
    const registration=await page.evaluate(()=>window.pwaTest.calls.registrations[0]);
    assert.equal(registration.options.updateViaCache,'none','Worker update consulted the HTTP cache');
    assert.equal(registration.options.scope,'./');
    assert(!(await page.locator('#app-update-banner').isVisible()),'A normal launch showed an update prompt');

    await page.evaluate(()=>{
      window.dispatchEvent(new Event('pageshow'));
      window.pwaTest.setVisible('visible');
    });
    assert.equal(await page.evaluate(()=>window.pwaTest.calls.updates),0,'Repeated resume events caused duplicate update requests');
    await page.evaluate(()=>{
      window.pwaTest.setVisible('hidden');
      window.pwaTest.setVisible('visible');
    });
    await page.waitForFunction(()=>window.pwaTest.calls.updates===1);

    await page.evaluate(()=>{
      window.pwaTest.advance(61_000);
      window.pwaTest.setOnline(false);
      window.dispatchEvent(new Event('pageshow'));
    });
    assert.equal(await page.evaluate(()=>window.pwaTest.calls.updates),1,'Offline resume requested an update');
    await page.evaluate(()=>{
      window.pwaTest.setOnline(true);
      window.dispatchEvent(new Event('online'));
    });
    await page.waitForFunction(()=>window.pwaTest.calls.updates===2);
    await page.evaluate(()=>{
      window.pwaTest.advance(61_000);
      window.pwaTest.stall();
      window.dispatchEvent(new Event('pageshow'));
      window.dispatchEvent(new Event('online'));
    });
    await page.waitForFunction(()=>window.pwaTest.calls.updates===3);
    assert.equal(await page.evaluate(()=>window.pwaTest.calls.updates),3,'Concurrent update checks duplicated a stalled request');
    await page.evaluate(()=>window.pwaTest.finish());

    await page.evaluate(()=>{
      const form=document.createElement('textarea');
      form.id='unsaved-pwa-form';form.value='Nội dung đang soạn';
      document.body.appendChild(form);
      localStorage.setItem('pwa-preserved-test','progress-and-session');
      window.pwaTest.changeController();
    });
    if(firstInstall){
      assert(!(await page.locator('#app-update-banner').isVisible()),'First worker installation requested an unnecessary reload');
      await page.evaluate(()=>window.pwaTest.changeController());
    }
    const banner=page.locator('#app-update-banner');
    await banner.waitFor({state:'visible'});
    assert.equal(await page.locator('#unsaved-pwa-form').inputValue(),'Nội dung đang soạn','Background update reloaded an unfinished form');
    const layout=await banner.evaluate(element=>({
      right:element.getBoundingClientRect().right,
      bottom:element.getBoundingClientRect().bottom,
      width:innerWidth,height:innerHeight,
      buttons:[...element.querySelectorAll('button')].map(button=>button.getBoundingClientRect().height)
    }));
    assert(layout.right<=layout.width && layout.bottom<=layout.height,'Update notice is outside the phone viewport');
    assert(layout.buttons.every(height=>height>=44),'Update notice has undersized touch targets');
    await banner.locator('.app-update-later').click();
    assert(!(await banner.isVisible()),'Defer button did not dismiss the update');
    await page.evaluate(()=>window.dispatchEvent(new Event('pageshow')));
    assert(!(await banner.isVisible()),'Resume redisplayed a deferred update');
    await page.evaluate(()=>window.pwaTest.changeController());
    assert(await banner.isVisible(),'A subsequent update did not restore the notice');
    await Promise.all([
      page.waitForNavigation({waitUntil:'load'}),
      banner.locator('.app-update-apply').click()
    ]);
    assert.equal(await page.evaluate(()=>localStorage.getItem('pwa-preserved-test')),'progress-and-session','Applying an update cleared stored data');
    assert(!(await page.locator('#app-update-banner').isVisible()),'Reload left a stale update notice');
    console.log(`PASS ${browserName} ${theme} ${width}px: foreground checks, offline recovery, update prompt and explicit reload`);
    await context.close();
  }
}finally{
  await browser.close();
}
