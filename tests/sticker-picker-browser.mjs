import {chromium,webkit} from 'playwright';
import {assert,session,installFakeWebSocket,installMock} from './helpers/portal-fixtures.mjs';

const name=process.env.BROWSER||'chromium';
const engine=name==='webkit'?webkit:chromium;
const baseURL=process.env.TEST_BASE_URL||'https://127.0.0.1:4173';
const browser=await engine.launch({headless:true});
const context=await browser.newContext({
  serviceWorkers:'block',ignoreHTTPSErrors:true,isMobile:true,hasTouch:true,
  viewport:{width:390,height:844}
});
try{
  await installFakeWebSocket(context);
  const state=await installMock(context);
  await context.addInitScript(value=>localStorage.setItem('icaew-lms-auth-v2',JSON.stringify(value)),session);
  const page=await context.newPage(),errors=[],dialogs=[];
  page.on('pageerror',error=>errors.push(String(error)));
  page.on('dialog',async dialog=>{dialogs.push(dialog.message());await dialog.dismiss();});
  await page.goto(baseURL+'/community.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#room-title')?.textContent?.includes('General'));
  await page.waitForFunction(()=>document.querySelector('#emoji-btn')?.getAttribute('aria-controls')==='emoji-popover');

  // Hit-testing is essential: a DOM-visible picker can still be clipped or behind Home.
  for(const [width,height] of [[320,568],[375,667],[390,844],[430,932],[667,375],[390,430]]){
    await page.setViewportSize({width,height});
    await page.locator('#emoji-btn').tap();
    await page.waitForSelector('#emoji-popover:not([hidden]) .emoji-grid button');
    const geometry=await page.evaluate(()=>{
      const root=document.querySelector('#emoji-popover'),r=root.getBoundingClientRect();
      const viewport=window.visualViewport;
      const tiles=[...root.querySelectorAll('.emoji-grid button')].filter(button=>{
        const b=button.getBoundingClientRect(),scroll=root.querySelector('.emoji-scroll').getBoundingClientRect();
        return b.top>=scroll.top&&b.bottom<=scroll.bottom;
      });
      return {
        parent:root.parentElement.tagName,position:getComputedStyle(root).position,
        left:r.left,top:r.top,right:r.right,bottom:r.bottom,
        viewport:{left:viewport?.offsetLeft||0,top:viewport?.offsetTop||0,width:viewport?.width||innerWidth,height:viewport?.height||innerHeight},
        scroll:document.documentElement.scrollWidth,width:document.documentElement.clientWidth,
        searchSize:parseFloat(getComputedStyle(root.querySelector('input')).fontSize),
        tiles:tiles.map(button=>{
          const b=button.getBoundingClientRect(),hit=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);
          return {width:b.width,height:b.height,hit:button===hit||button.contains(hit)};
        })
      };
    });
    const v=geometry.viewport;
    assert(geometry.parent==='BODY'&&geometry.position==='fixed','Picker remains inside a clipping/stacking context');
    assert(geometry.left>=v.left-1&&geometry.top>=v.top-1&&geometry.right<=v.left+v.width+1&&geometry.bottom<=v.top+v.height+1,
      'Picker escapes visible viewport at '+width+'x'+height+': '+JSON.stringify(geometry));
    assert(geometry.tiles.length>0&&geometry.tiles.every(tile=>tile.hit&&tile.width>=43&&tile.height>=43),
      'Sticker/emoji taps reach content behind the picker: '+JSON.stringify(geometry));
    assert(geometry.scroll<=geometry.width+1&&geometry.searchSize>=16,'Picker causes overflow or iOS search zoom');
    assert(await page.locator('#emoji-btn').getAttribute('aria-expanded')==='true','Launcher state must follow visibility');
    await page.locator('[data-emoji-close]').tap();
    assert(await page.locator('#emoji-btn').getAttribute('aria-expanded')==='false','Close must reset launcher state');
  }

  await page.setViewportSize({width:390,height:844});
  for(const theme of ['light','dark']){
    await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
    await page.locator('#emoji-btn').tap();
    await page.locator('#emoji-search').pressSequentially('vui');
    assert(await page.locator('#emoji-search').inputValue()==='vui','Search lost typed characters');
    assert(await page.locator('#emoji-search').evaluate(el=>document.activeElement===el),'Search lost focus while filtering');
    await page.fill('#emoji-search','no-such-emoji');
    assert(await page.locator('#emoji-empty').isVisible(),'Empty search needs readable feedback');
    await page.fill('#emoji-search','học');
    await page.locator('[data-emoji-value="📚"]').tap();
    assert((await page.inputValue('#message-input')).includes('📚'),'Touch emoji selection failed');
    assert(await page.locator('#emoji-popover').evaluate(el=>el.hidden),'Picking an emoji must dismiss the overlay');
  }

  await page.locator('#emoji-btn').tap();
  const callouts=await page.evaluate(()=>{
    const button=document.querySelector('#emoji-btn'),tile=document.querySelector('[data-emoji-value]');
    const blocked=el=>!el.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true}));
    const supported=CSS.supports('-webkit-touch-callout','none');
    return {button:blocked(button),tile:blocked(tile),supported,
      styles:[button,tile,document.querySelector('.portal-brand'),document.querySelector('.portal-mobile-nav a')]
        .map(el=>getComputedStyle(el).getPropertyValue('-webkit-touch-callout'))};
  });
  assert(callouts.button&&callouts.tile,'Holding picker controls must not open the native context menu');
  if(callouts.supported)assert(callouts.styles.every(value=>value==='none'),'iOS link previews remain enabled on app controls');
  await page.keyboard.press('Escape');
  assert(await page.locator('#emoji-popover').evaluate(el=>el.hidden),'Escape must dismiss the picker');
  await page.locator('#emoji-btn').tap();
  await page.locator('#room-title').tap();
  assert(await page.locator('#emoji-popover').evaluate(el=>el.hidden),'Outside tap must dismiss the picker');
  assert(new URL(page.url()).pathname==='/community.html','Picker interaction navigated away from Community');

  // Delay the write to reproduce rapid taps/Enter while a sticker is being sent.
  let release,posted,requests=0,failNext=false;
  const gate=new Promise(resolve=>{release=resolve;});
  const firstPost=new Promise(resolve=>{posted=resolve;});
  await page.route('**/rest/v1/chat_messages*',async route=>{
    if(route.request().method()!=='POST')return route.fallback();
    requests++;
    if(requests===1){posted();await gate;}
    if(failNext){
      failNext=false;
      return route.fulfill({status:503,headers:{'content-type':'application/json','access-control-allow-origin':'*'},body:JSON.stringify({message:'Fixture network failure'})});
    }
    return route.fallback();
  });
  const draft='Nội dung đang soạn phải được giữ lại';
  await page.fill('#message-input',draft);
  await page.setInputFiles('#file-input',{name:'draft.txt',mimeType:'text/plain',buffer:Buffer.from('pending attachment')});
  await page.locator('#emoji-btn').tap();
  await page.locator('[data-emoji-mode="sticker"]').tap();
  await page.locator('#emoji-search').pressSequentially('vui');
  await page.locator('[data-emoji-value="🥳"]').tap();
  await firstPost;
  await page.waitForFunction(()=>document.querySelector('#send-btn').disabled&&document.querySelector('#emoji-btn').disabled);
  await page.evaluate(()=>{
    for(let i=0;i<5;i++){
      document.dispatchEvent(new CustomEvent('lms:send-sticker',{detail:{emoji:'🥳'}}));
      document.querySelector('#message-input').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
    }
  });
  await page.waitForTimeout(100);
  assert(requests===1,'Rapid input created duplicate message requests');
  release();
  await page.waitForFunction(()=>!document.querySelector('#send-btn').disabled);
  assert(state.mutations.message===1&&state.messages.at(-1).message_type==='sticker','Sticker was not persisted exactly once');
  assert(state.mutations.file===0&&!state.messages.at(-1).attachment_path,'Sticker unexpectedly sent the draft attachment');
  assert(await page.inputValue('#message-input')===draft&&await page.locator('#pending-file').isVisible(),'Sending a sticker destroyed the draft');

  failNext=true;
  await page.locator('#emoji-btn').tap();
  await page.locator('[data-emoji-value="🥳"]').tap();
  await page.waitForFunction(()=>document.querySelector('#composer-status').textContent.includes('Chưa gửi được.')&&!document.querySelector('#send-btn').disabled);
  assert(dialogs.length===0,'Failed sticker send must not spam native alerts: '+dialogs.join('; '));
  assert(state.mutations.message===1&&await page.inputValue('#message-input')===draft,'Failed send persisted or removed the draft');
  await page.locator('#emoji-btn').tap();
  await page.locator('[data-emoji-value="🥳"]').tap();
  await page.waitForFunction(()=>!document.querySelector('#send-btn').disabled&&document.querySelectorAll('.message-row.own .is-sticker').length===2);
  assert(state.mutations.message===2,'Picker did not recover after a failed send');
  assert(errors.length===0,'Picker threw browser errors: '+errors.join('; '));
  assert(new URL(page.url()).pathname==='/community.html','Sticker send navigated to Home');
  console.log(`PASS ${name}: touch picker hit targets, viewport bounds, search focus, callout prevention, duplicate-send guard and recovery`);
}finally{
  await context.close();await browser.close();
}
