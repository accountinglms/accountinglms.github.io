import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {session,user,peer,installMock} from './helpers/portal-fixtures.mjs';
const name=process.env.BROWSER||'chromium',engine=name==='webkit'?webkit:chromium;
const baseURL=process.env.TEST_BASE_URL||'https://127.0.0.1:4173';
const room='00000000-0000-4000-8000-000000000001';
const browser=await engine.launch({headless:true});
try{
  for(const mobile of [false,true]){
    const context=await browser.newContext({serviceWorkers:'block',ignoreHTTPSErrors:true,isMobile:mobile,hasTouch:mobile,
      viewport:mobile?{width:390,height:844}:{width:1280,height:900}});
    const state=await installMock(context);
    Object.assign(state.groups[0],{kind:'direct',direct_low:user.id,direct_high:peer.id});
    state.messages=Array.from({length:130},(_,i)=>({id:i+1,group_id:room,sender_id:i===129?user.id:peer.id,
      body:'Message '+(i+1)+' — conversation history must stay in place.',message_type:'text',
      attachment_path:'room/'+(i>=128?'shared':i)+'.webp',attachment_name:'study.webp',attachment_mime:'image/webp',attachment_size:64,
      created_at:new Date(Date.UTC(2026,9,9,11,0,i)).toISOString(),deleted_at:null}));
    await context.addInitScript(value=>{
      localStorage.setItem('icaew-lms-auth-v2',JSON.stringify(value));
      const sockets=[];
      class FakeWebSocket{
        static OPEN=1;static CONNECTING=0;static CLOSED=3;
        constructor(){this.readyState=0;this.handlers={};this.tables=[];sockets.push(this);setTimeout(()=>{this.readyState=1;this.emit('open',{});},5);}
        addEventListener(type,fn){(this.handlers[type]??=[]).push(fn);}
        emit(type,event){for(const fn of this.handlers[type]||[])fn(event);}
        send(raw){const msg=JSON.parse(raw);if(msg.event==='phx_join'){
          this.tables=msg.payload.config.postgres_changes.map(item=>item.table);
          setTimeout(()=>this.emit('message',{data:JSON.stringify({event:'phx_reply',ref:msg.ref,payload:{status:'ok'}})}),0);
        }}
        close(){this.readyState=3;this.emit('close',{});}
      }
      window.WebSocket=FakeWebSocket;
      window.emitChatChange=(table,record,type='UPDATE')=>{
        for(const socket of sockets)if(socket.tables.includes(table))socket.emit('message',{data:JSON.stringify({event:'postgres_changes',payload:{data:{schema:'public',table,type,[type==='DELETE'?'old_record':'record']:record}}})});
      };
    },session);
    const page=await context.newPage(),errors=[],requests={messages:0,reads:0,core:0},imageGets=new Map();
    let imageActive=0,imagePeak=0;
    page.on('pageerror',error=>errors.push(String(error)));
    page.on('request',request=>{
      const url=new URL(request.url());
      if(url.pathname==='/rest/v1/chat_messages'&&request.method()==='GET'&&url.searchParams.has('group_id'))requests.messages++;
      if(url.pathname==='/rest/v1/chat_reads'&&request.method()==='POST')requests.reads++;
      if(url.pathname==='/rest/v1/chat_group_members'&&request.method()==='GET')requests.core++;
    });
    await page.route('**/storage/v1/object/authenticated/chat-files/**',async route=>{
      const path=new URL(route.request().url()).pathname;
      imageGets.set(path,(imageGets.get(path)||0)+1);imagePeak=Math.max(imagePeak,++imageActive);
      await new Promise(resolve=>setTimeout(resolve,80));imageActive--;
      await route.fulfill({status:200,headers:{'access-control-allow-origin':'*','content-type':'image/webp'},
        body:Buffer.from('UklGRjYAAABXRUJQVlA4ICoAAACQAQCdASoQABAAAUAmJZgCdLoAA5gA/vLrf/xDnQ50OX/v+xZy2BYgAAA=','base64')});
    });
    await page.goto(baseURL+'/community.html?group='+room,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.querySelector('[data-message-id="130"] .chat-image-preview')?.naturalWidth>0);
    await page.waitForTimeout(400);
    assert.equal(await page.locator('[data-message-id]').count(),100);
    assert.ok(imagePeak<=2,'More than two previews downloaded concurrently');
    assert.ok(imageGets.size<30,'The entire offscreen image history was downloaded');
    assert.equal([...imageGets].find(([path])=>path.endsWith('/shared.webp'))?.[1],1,'Duplicate images downloaded twice');
    await page.evaluate(()=>{window.stableRow=document.querySelector('[data-message-id="130"]');window.stableImage=stableRow.querySelector('img.chat-image-preview');});
    const baseline={...requests},imagesBefore=[...imageGets.values()].reduce((a,b)=>a+b,0);
    await page.evaluate(({room,user,peer,last})=>{
      for(let i=0;i<60;i++){
        emitChatChange('chat_reads',{group_id:room,user_id:user,last_read_at:last});
        emitChatChange('chat_reads',{group_id:room,user_id:peer,last_read_at:last});
      }
    },{room,user:user.id,peer:peer.id,last:state.messages.at(-1).created_at});
    await page.waitForTimeout(450);
    assert.deepEqual(requests,baseline,'Read receipts triggered a message/core/read feedback loop');
    assert.match(await page.locator('[data-message-id="130"] .chat-delivery').innerText(),/Đã xem/);
    assert.equal(await page.evaluate(()=>stableRow===document.querySelector('[data-message-id="130"]')&&stableImage===stableRow.querySelector('img.chat-image-preview')),true);
    state.reactions.push({message_id:129,user_id:peer.id,emoji:'👍'});
    await page.evaluate(()=>emitChatChange('chat_message_reactions',{message_id:129,user_id:'peer',emoji:'👍'},'INSERT'));
    await page.waitForFunction(()=>document.querySelector('[data-message-id="129"] .reaction')?.textContent.includes('1'));
    assert.equal(requests.messages,baseline.messages,'A reaction refetched all messages');
    assert.equal([...imageGets.values()].reduce((a,b)=>a+b,0),imagesBefore,'An unchanged preview was downloaded again');
    const append=async(id)=>{
      const row={...state.messages[0],id,body:'Incoming '+id,attachment_path:null,created_at:new Date(Date.UTC(2026,9,15,12,0,id)).toISOString()};
      state.messages.push(row);
      await page.evaluate(row=>{for(let i=0;i<12;i++)emitChatChange('chat_messages',row,'INSERT');},row);
      await page.waitForSelector('[data-message-id="'+id+'"]');
    };
    await append(131);
    await page.waitForTimeout(300);
    assert.equal(requests.reads,baseline.reads+1,'One incoming message wrote repeated read receipts');
    assert.equal(requests.messages,baseline.messages+1,'A burst was not coalesced into one message fetch');
    await page.evaluate(()=>document.dispatchEvent(new CustomEvent('lms:load-older')));
    await page.waitForSelector('[data-message-id="1"]');
    assert.equal(await page.locator('[data-message-id]').count(),131);
    await page.evaluate(()=>{
      const stream=document.querySelector('#message-stream');stream.style.scrollBehavior='auto';stream.scrollTop=1800;
      const bounds=stream.getBoundingClientRect();window.anchor=[...stream.querySelectorAll('[data-message-id]')].find(row=>row.getBoundingClientRect().bottom>bounds.top);
      window.anchorTop=anchor.getBoundingClientRect().top;
    });
    await page.waitForTimeout(500);
    await page.evaluate(()=>window.anchorTop=anchor.getBoundingClientRect().top);
    await append(132);await page.waitForTimeout(300);
    assert.equal(await page.locator('[data-message-id="1"]').count(),1,'Realtime discarded loaded older history');
    assert.ok(await page.evaluate(()=>Math.abs(anchor.getBoundingClientRect().top-anchorTop)<3),'A new message moved the older message being read');
    state.messages[0].body='Edited old message';
    await page.evaluate(row=>emitChatChange('chat_messages',row),state.messages[0]);
    await page.waitForFunction(()=>document.querySelector('[data-message-id="1"] .message-body')?.textContent==='Edited old message');
    state.messages=state.messages.filter(row=>row.id!==1);
    await page.evaluate(()=>emitChatChange('chat_messages',{id:1},'DELETE'));
    await page.waitForFunction(()=>!document.querySelector('[data-message-id="1"]'));
    assert.equal(await page.locator('[data-message-id]').count(),131);

    const beforeHidden=requests.messages;
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'));});
    const row={...state.messages[0],id:133,body:'While hidden',attachment_path:null,created_at:'2026-10-15T12:05:00Z'};state.messages.push(row);
    await page.evaluate(row=>emitChatChange('chat_messages',row,'INSERT'),row);await page.waitForTimeout(450);
    assert.equal(requests.messages,beforeHidden,'Hidden chat performed a heavy message refresh');
    await page.evaluate(()=>{delete document.hidden;delete document.visibilityState;document.dispatchEvent(new Event('visibilitychange'));});
    await page.waitForSelector('[data-message-id="133"]');
    assert.equal(await page.locator('[data-message-id="2"]').count(),1,'Foreground catch-up discarded earlier history');
    // Leaving a room aborts active image work and drops queued downloads.
    await page.evaluate(async()=>{
      const {createChatImagePreviews}=await import('/assets/chat-images.js');
      const root=document.createElement('div');root.style.cssText='position:fixed;inset:0 auto auto 0;width:300px;height:200px;overflow:auto;z-index:100000';
      root.innerHTML=Array.from({length:20},(_,id)=>`<article data-message-id="${id}" style="height:80px">Preview<img data-preview-path="cancel/${id}" hidden></article>`).join('');document.body.append(root);
      window.cancelledImages=0;window.imageCalls=0;
      window.testPreviews=createChatImagePreviews(root,(_path,{signal})=>{
        imageCalls++;return new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>{cancelledImages++;reject(new DOMException('Cancelled','AbortError'));},{once:true}));
      });testPreviews.attach();window.testImageRoot=root;
    });
    await page.waitForFunction(()=>imageCalls===2);
    await page.evaluate(()=>{testPreviews.reset();testImageRoot.remove();});
    await page.waitForTimeout(100);
    assert.deepEqual(await page.evaluate(()=>({calls:imageCalls,cancelled:cancelledImages})),{calls:2,cancelled:2});
    assert.deepEqual(errors,[]);
    await context.close();
  }
  console.log(`PASS ${name}: desktop/mobile read storms, targeted updates, retained DOM/history/scroll, lazy deduplicated previews, hidden-tab catch-up.`);
}finally{await browser.close();}
