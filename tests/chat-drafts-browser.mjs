import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {session,user,installFakeWebSocket,installMock} from './helpers/portal-fixtures.mjs';
const name=process.env.BROWSER||'chromium',engine=name==='webkit'?webkit:chromium;
const baseURL=process.env.TEST_BASE_URL||'https://127.0.0.1:4173';
const roomA='00000000-0000-4000-8000-000000000001',roomB='00000000-0000-4000-8000-000000000002';
const browser=await engine.launch({headless:true});
try{
  for(const mobile of [false,true]){
    const context=await browser.newContext({serviceWorkers:'block',ignoreHTTPSErrors:true,isMobile:mobile,hasTouch:mobile,
      viewport:mobile?{width:390,height:844}:{width:1280,height:900}});
    await installFakeWebSocket(context);
    const state=await installMock(context);
    state.groups.push({...state.groups[0],id:roomB,name:'Second room',is_official:false});
    state.memberships.push({group_id:roomB,user_id:user.id,role:'member'});
    await context.addInitScript(value=>localStorage.setItem('icaew-lms-auth-v2',JSON.stringify(value)),session);
    const page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(String(error)));
    await page.goto(baseURL+'/community.html?group='+roomA,{waitUntil:'domcontentloaded'});
    await page.waitForSelector('[data-message-id="1"]');
    for(const theme of ['light','dark']){
      await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
      await page.waitForTimeout(180);
      const contrasts=await page.evaluate(()=>{
        const luminance=color=>{
          const rgb=color.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});
          return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
        };
        return [...document.querySelectorAll('.chat-room-actions .icon-button,.chat-room-head .mobile-chat-menu')]
          .filter(button=>button.getBoundingClientRect().width&&button.getBoundingClientRect().height)
          .map(button=>{
            const style=getComputedStyle(button),ink=luminance(style.color),paper=luminance(style.backgroundColor);
            return {id:button.id,ratio:(Math.max(ink,paper)+.05)/(Math.min(ink,paper)+.05)};
          });
      });
      assert.ok(contrasts.length>0&&contrasts.every(item=>item.ratio>=3),`${theme} chat icons lack contrast: ${JSON.stringify(contrasts)}`);
    }
    const switchRoom=async(id)=>{
      if(mobile)await page.click('#mobile-chat-menu');
      await page.click('[data-group="'+id+'"]');
      await page.waitForFunction(id=>new URL(location.href).searchParams.get('group')===id,id);
      if(mobile)await page.waitForFunction(()=>!document.querySelector('#chat-sidebar').classList.contains('open'));
    };
    await page.fill('#message-input','Bản nháp phòng A');
    await page.selectOption('#message-type','assignment');
    await page.setInputFiles('#file-input',{name:'room-a.txt',mimeType:'text/plain',buffer:Buffer.from('Room A attachment')});
    await page.click('[data-message-id="1"] [data-reply-message]');
    await switchRoom(roomB);
    assert.equal(await page.inputValue('#message-input'),'');
    assert.equal(await page.isVisible('#pending-file'),false);assert.equal(await page.isVisible('#compose-context'),false);
    assert.equal(await page.inputValue('#message-type'),'text');
    await page.fill('#message-input','Bản nháp phòng B');
    await switchRoom(roomA);
    assert.equal(await page.inputValue('#message-input'),'Bản nháp phòng A');
    assert.match(await page.locator('#pending-file-name').innerText(),/room-a.txt/);
    assert.equal(await page.isVisible('#compose-context'),true);assert.equal(await page.inputValue('#message-type'),'assignment');

    let release,posted;
    const gate=new Promise(resolve=>release=resolve),posting=new Promise(resolve=>posted=resolve);
    await page.route('**/rest/v1/chat_messages*',async route=>{
      if(route.request().method()!=='POST')return route.fallback();
      posted();await gate;return route.fallback();
    });
    await page.click('#send-btn');await posting;
    await switchRoom(roomB);await page.fill('#message-input','Nội dung mới phòng B');
    release();await page.waitForFunction(()=>!document.querySelector('#send-btn').disabled);
    const sent=state.messages.at(-1);
    assert.equal(sent.group_id,roomA);assert.equal(sent.body,'Bản nháp phòng A');assert.equal(sent.message_type,'assignment');
    assert.equal(sent.reply_to,1);assert.equal(sent.attachment_name,'room-a.txt');
    assert.equal(await page.inputValue('#message-input'),'Nội dung mới phòng B','Late send cleared another conversation');
    await switchRoom(roomA);
    assert.equal(await page.inputValue('#message-input'),'','Sent draft returned after a room switch');
    assert.equal(await page.isVisible('#pending-file'),false);assert.equal(await page.isVisible('#compose-context'),false);

    // An edit is restored only in its own room, alongside its text.
    await page.click('[data-message-id="'+sent.id+'"] [data-edit-message]');
    await page.fill('#message-input','Nội dung đang chỉnh sửa');
    await switchRoom(roomB);assert.equal(await page.isVisible('#compose-context'),false);
    await switchRoom(roomA);assert.match(await page.locator('#compose-context-label').innerText(),/Chỉnh sửa/);
    assert.equal(await page.inputValue('#message-input'),'Nội dung đang chỉnh sửa');
    await page.click('#compose-context-close');await page.fill('#message-input','');
    await switchRoom(roomB);
    await page.setInputFiles('#file-input',{name:'after-reload.txt',mimeType:'text/plain',buffer:Buffer.from('Reselect me')});
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.querySelector('#room-title').textContent.includes('Second room'));
    assert.equal(await page.inputValue('#message-input'),'Nội dung mới phòng B');
    assert.match(await page.locator('#pending-file-name').innerText(),/Chọn lại tệp/);
    const before=state.mutations.message;
    await page.click('#send-btn');assert.equal(state.mutations.message,before,'Reload silently sent without its expected attachment');
    assert.match(await page.locator('#composer-status').innerText(),/Chọn lại tệp/);
    await page.click('#remove-pending-file');await page.click('#send-btn');
    await page.waitForFunction(()=>!document.querySelector('#send-btn').disabled&&document.querySelector('#message-input').value==='');
    assert.equal(state.messages.at(-1).group_id,roomB);assert.equal(state.messages.at(-1).attachment_path,null);
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.querySelector('#room-title').textContent.includes('Second room'));
    assert.equal(await page.inputValue('#message-input'),'');assert.deepEqual(errors,[]);
    await context.close();
  }
  console.log(`PASS ${name}: desktop/mobile room drafts, attachments, reply/edit isolation, late send and reload recovery.`);
}finally{await browser.close();}
