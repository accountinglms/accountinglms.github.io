import { chromium, webkit } from 'playwright';

const browserName=process.env.BROWSER||'chromium';
const engine=browserName==='webkit'?webkit:chromium;
const baseURL=process.env.TEST_BASE_URL||'https://127.0.0.1:4173';
const AUTH_KEY='icaew-lms-auth-v2';

import {assert,user,peer,session,installFakeWebSocket,installMock} from './helpers/portal-fixtures.mjs';

async function newPortalPage(browser,stateSetup=true){
  const context=await browser.newContext({serviceWorkers:'block',ignoreHTTPSErrors:true,viewport:{width:1280,height:850}});
  await installFakeWebSocket(context);
  const state=stateSetup?await installMock(context):null;
  const page=await context.newPage();
  await page.addInitScript(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:AUTH_KEY,value:session});
  return {context,page,state};
}

async function testHome(browser){
  const {context,page,state}=await newPortalPage(browser);
  await page.goto(baseURL+'/home.html',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#admin-home-panel:not([hidden])');
  await page.waitForFunction(()=>document.querySelector('#metric-attempts')?.textContent==='3');
  assert((await page.textContent('#welcome-title')).includes('Portal Owner'),'Home did not render member identity');
  assert((await page.textContent('#metric-starred'))==='3','Home starred count is wrong');
  assert((await page.textContent('#global-notification-count'))==='2','Home notification badge should combine chat + admin unread');
  assert((await page.locator('#subject-catalog .subject-row').count())===1,'Home subject catalog did not render');
  assert((await page.locator('#subject-catalog .chapter-row').count())===2,'Home chapter TOC did not render');
  assert((await page.locator('.subject-cover-art.has-generated-cover img').count())===1,'Automatic accounting cover did not render');
  assert((await page.locator('#home-mini-trend svg').count())===1,'Home score sparkline did not render');
  const heroArt=await page.evaluate(()=>getComputedStyle(document.body,'::before').backgroundImage);
  assert(heroArt.includes('Starry_Night.webp'),'Home is missing the Van Gogh artwork background');
  const continueHref=await page.locator('[data-continue-exercise]').getAttribute('href');
  assert(continueHref?.includes('exercise=ex1'),'Home should resume the latest specific exercise, not an empty learner page');
  const heroRadius=await page.locator('.hero-card').evaluate(el=>getComputedStyle(el).borderRadius);
  assert(heroRadius==='10px','Final visual system should use restrained card radii');

  await page.fill('#feedback-subject','Need another mock');
  await page.fill('#feedback-message','Please add a timed mock for adjustments.');
  await page.click('#feedback-form button[type="submit"]');
  await page.waitForTimeout(350);
  const feedbackStatus=await page.textContent('#feedback-status');
  assert(feedbackStatus?.includes('Đã gửi'), `Feedback flow failed: status=${feedbackStatus} mutations=${state.mutations.feedback}`);
  assert(state.mutations.feedback===1,'Member feedback was not sent to admin backend');

  await page.fill('#announcement-title','Update tối nay');
  await page.fill('#announcement-body','Sửa phần lịch sử và thêm tài liệu.');
  await page.click('#announcement-form button[type="submit"]');
  await page.waitForTimeout(350);
  const announcementStatus=await page.textContent('#announcement-status');
  assert(announcementStatus?.includes('Đã gửi'), `Announcement flow failed: status=${announcementStatus} mutations=${state.mutations.announcement}`);
  assert(state.mutations.announcement===1,'Admin announcement was not published');

  await page.selectOption('.subject-level-select','professional');
  await page.waitForTimeout(30);
  assert(state.mutations.subjectPatch===1 && state.subjects[0].exam_level==='professional','Admin subject exam-level update failed');

  await context.close();
}

async function testAutomaticSubjectCovers(browser){
  const {context,page,state}=await newPortalPage(browser);
  await page.goto(baseURL+'/admin.html',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#app:not(.hidden)');
  await page.locator('details:has(#subject-form)').evaluate(el=>{el.open=true;});
  await page.fill('#subject-new','Corporate Finance');
  await page.waitForFunction(()=>document.querySelector('#subject-cover-label-main')?.textContent?.includes('Tài chính'));
  const preview=await page.locator('#subject-cover-image-main').getAttribute('src');
  assert(preview?.startsWith('data:image/svg+xml;charset=utf-8,'),'Admin preview did not generate an image locally');
  await page.locator('#subject-form button').click();
  await page.waitForFunction(()=>Array.from(document.querySelector('#subject').options).some(el=>el.textContent==='Corporate Finance'));
  assert(state.subjects.length===2,'Admin new-subject creation did not reach Supabase');

  await page.goto(baseURL+'/home.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelectorAll('#subject-catalog .subject-row').length===2);
  const financeRow=page.locator('.subject-row').filter({hasText:'Corporate Finance'});
  assert(await financeRow.locator('img').count()===1,'New subject lacks an automatic cover on Home');
  const persisted=await financeRow.locator('img').getAttribute('src');
  assert(persisted===preview,'Admin preview and Home cover must be identical for the same subject');
  assert((await financeRow.textContent()).includes('Tài chính'),'Finance subject should receive a finance-themed illustration');
  await financeRow.locator('img').scrollIntoViewIfNeeded();
  const financeImage=await financeRow.locator('img').evaluate(async img=>{
    try{await img.decode();return {ok:img.complete&&img.naturalWidth>0,width:img.naturalWidth,complete:img.complete};}
    catch(error){return {ok:false,width:img.naturalWidth,complete:img.complete,reason:String(error)};}
  });
  assert(financeImage.ok,'Finance SVG image cannot be decoded in the browser: '+JSON.stringify(financeImage));

  const accounting=await page.locator('.subject-row').filter({hasText:'Accounting'}).locator('img').getAttribute('src');
  assert(accounting!==persisted,'Different domains must not share the same cover');

  // Simulate another course arriving from an external import or admin route.
  state.subjects.push({id:'audit_course',title:'Auditing and Assurance',is_active:true,sort_order:2,exam_level:'certificate'});
  state.subjects.push({id:'costs_course',title:'Cost Accounting',is_active:true,sort_order:3,exam_level:'certificate'});
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelectorAll('#subject-catalog .subject-row').length===4);
  const coverImages=page.locator('.subject-row img');
  for(let i=0;i<await coverImages.count();i++)await coverImages.nth(i).scrollIntoViewIfNeeded();
  const covers=await coverImages.evaluateAll(async imgs=>await Promise.all(imgs.map(async img=>{
    try{await img.decode();return {src:img.getAttribute('src'),width:img.naturalWidth};}
    catch(error){return {src:img.getAttribute('src'),width:img.naturalWidth,reason:String(error)};}
  })));
  assert(covers.every(c=>c.width>0),'All future subjects need decodable covers');
  assert(new Set(covers.map(c=>c.src)).size===4,'Every subject should have deterministic individual art');
  assert((await page.locator('.subject-row').filter({hasText:'Auditing'}).textContent()).includes('Kiểm toán'),
    'Auditing course incorrectly classified');

  await context.close();
}

async function testCommunity(browser){
  const {context,page,state}=await newPortalPage(browser);
  await page.goto(baseURL+'/community.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#room-title')?.textContent?.includes('General'));
  await page.waitForFunction(()=>document.querySelector('#global-notification-count')?.textContent==='1');
  assert((await page.textContent('#global-notification-count'))==='1','Opening the active chat should clear its unread count while preserving admin notifications');
  assert((await page.textContent('#message-stream')).includes('Ai đang ôn adjustments?'),'Existing group message is missing');
  await page.click('#emoji-btn');
  await page.waitForSelector('#emoji-popover:not([hidden]) .emoji-grid');
  await page.click('[data-emoji-cat="Học tập"]');
  assert((await page.locator('.emoji-grid button').count())>15,'Scrollable emoji picker is missing its categories');
  await page.click('[data-emoji-value="📚"]');
  assert((await page.inputValue('#message-input')).includes('📚'),'Emoji selection must insert into the composer');
  await page.click('#room-search-btn');
  await page.fill('#chat-search-input','adjustments');
  await page.waitForSelector('[data-jump-id="1"]');
  await page.click('[data-jump-id="1"]');
  assert(await page.locator('#chat-search-panel').evaluate(el=>el.hidden),'Search should return to the conversation on selection');

  await page.fill('#message-input','Mình đang ôn phần này.');
  await page.click('#send-btn');
  await page.waitForFunction(()=>document.querySelector('#message-stream')?.textContent?.includes('Mình đang ôn phần này.'));
  assert(state.mutations.message===1,'Chat text message was not persisted');
  const ownRow=page.locator('.message-row.own').filter({hasText:'Mình đang ôn phần này.'});
  await ownRow.locator('[data-edit-message]').click();
  await page.fill('#message-input','Mình đang ôn phần này và adjustments.');
  await page.click('#send-btn');
  await page.waitForFunction(()=>document.querySelector('#message-stream')?.textContent?.includes('và adjustments.'));
  assert(state.messages.some(m=>m.sender_id===user.id&&m.edited_at),'Editing must persist to the cloud');

  const peerMessage=page.locator('[data-message-id="1"]');
  await peerMessage.locator('[data-add-reaction="👍"]').click();
  await page.waitForFunction(()=>document.querySelector('[data-message-id="1"] .reaction')?.textContent?.includes('1'));
  assert(state.mutations.reaction===1,'Message reaction was not persisted');
  await peerMessage.locator('[data-reply-message]').click();
  assert(!(await page.locator('#compose-context').evaluate(el=>el.hidden)),'Reply composer banner must be visible');
  await page.fill('#message-input','Mình đã xem bài của bạn.');
  await page.click('#send-btn');
  await page.waitForFunction(()=>document.querySelector('#message-stream')?.textContent?.includes('Mình đã xem bài của bạn.'));
  assert(state.messages.some(m=>m.reply_to===1),'Message reply must persist the original message id');

  await page.setInputFiles('#file-input',{name:'exercise.pdf',mimeType:'application/pdf',buffer:Buffer.from('pdf')});
  await page.fill('#message-input','Bài tập tuần này');
  await page.selectOption('#message-type','assignment');
  await page.click('#send-btn');
  await page.waitForFunction(()=>document.querySelector('#message-stream')?.textContent?.includes('exercise.pdf'));
  assert(state.mutations.file===1,'Chat attachment was not uploaded');
  assert(state.mutations.message===3,'Attachment message was not persisted');

  await page.click('#create-group-btn');
  await page.fill('#group-name','Exam Week');
  await page.fill('#group-description','Ôn trước kỳ thi');
  await page.click('#group-form button[type="submit"]');
  await page.waitForFunction(()=>document.querySelector('#room-title')?.textContent?.includes('Exam Week'));
  assert(state.groups.some(g=>g.name==='Exam Week'),'Group creation failed');

  await page.click('[data-social-tab="people"]');
  await page.waitForSelector('[data-social-action="accept"]');
  await page.click('[data-social-action="accept"]');
  await page.waitForSelector('[data-social-action="chat"]');
  await page.click('[data-social-action="chat"]');
  await page.waitForFunction(()=>document.querySelector('#room-title')?.textContent?.includes('Study Partner'));
  await page.fill('#message-input','Chào bạn! Đây là tin nhắn riêng.');
  await page.click('#send-btn');
  await page.waitForFunction(()=>document.querySelector('#message-stream')?.textContent?.includes('Đây là tin nhắn riêng.'));
  assert(state.messages.some(x=>x.group_id==='44444444-4444-4444-8444-444444444444'),'Direct message was not persisted');

  await context.close();
}

async function testChatPagination(browser){
  const {context,page,state}=await newPortalPage(browser);
  const groupId=state.groups[0].id;
  for(let i=2;i<=125;i++){
    state.messages.push({
      id:i,group_id:groupId,sender_id:peer.id,body:'Message '+i,
      message_type:'text',attachment_path:null,attachment_name:null,attachment_size:null,
      created_at:new Date(Date.UTC(2026,9,9,12,Math.floor(i/60),i%60)).toISOString(),deleted_at:null
    });
  }
  await page.goto(baseURL+'/community.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#message-stream')?.textContent?.includes('Message 125'));
  assert((await page.locator('.message-body').filter({hasText:/^Message 2$/}).count())===0,
    'Latest messages must load first, not the oldest');
  await page.click('#load-older-messages');
  await page.waitForFunction(()=>[...document.querySelectorAll('#message-stream .message-body')].some(el=>el.textContent.trim()==='Message 2'));
  assert((await page.locator('#message-stream .message-row').count())===125,'Cursor pagination did not load complete 125-message history');
  await context.close();
}

async function testCommunityEmptyState(browser){
  const {context,page,state}=await newPortalPage(browser);
  state.messages=[];
  await page.goto(baseURL+'/community.html',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('.chat-empty-state');
  assert((await page.textContent('.chat-empty-state')).includes('Chào mừng'),'Community empty state should explain the space rather than show a blank screen');
  await page.click('[data-compose-focus]');
  assert(await page.locator('#message-input').evaluate(el=>document.activeElement===el),'Community onboarding CTA must focus the composer');
  await context.close();
}

async function testProgress(browser){
  const {context,page}=await newPortalPage(browser);
  await page.goto(baseURL+'/progress.html',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#progress-content:not([hidden])');
  assert((await page.textContent('#official-pass'))==='55%','Certificate official pass mark should be 55%');
  assert((await page.textContent('#safe-target'))==='65%','Internal safe target should be 65%');
  assert((await page.locator('#trend-chart svg').count())===1,'Progress line graph did not render');
  assert((await page.locator('#trend-chart .chart-dot').count())===3,'Trend graph should contain three attempts');
  assert((await page.locator('#weak-list .weak-row').count())===2,'Weakness analysis did not cover both chapters');
  assert((await page.locator('#plan-list .plan-step').count())>=2,'Action plan did not render');
  assert((await page.textContent('#standard-copy')).includes('không phải điểm thi'),'Readiness must be distinguished from real exam score');
  const chartStroke=await page.locator('#trend-chart .chart-line').evaluate(el=>getComputedStyle(el).stroke);
  assert(chartStroke && chartStroke!=='none','Progress chart lost its academic-theme data styling');
  await context.close();
}

async function testResponsivePortal(browser){
  const context=await browser.newContext({serviceWorkers:'block',ignoreHTTPSErrors:true,viewport:{width:390,height:844},isMobile:true});
  await installFakeWebSocket(context);
  const state=await installMock(context);
  const page=await context.newPage();
  await page.addInitScript(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:AUTH_KEY,value:session});

  for(const path of ['/home.html','/progress.html']){
    await page.goto(baseURL+path,{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(250);
    const geometry=await page.evaluate(()=>({
      scroll:document.documentElement.scrollWidth,
      viewport:window.innerWidth,
      vgLoaded:Array.from(document.styleSheets).some(s=>String(s.href||'').includes('vg-theme.css'))
    }));
    assert(geometry.scroll<=geometry.viewport+1,`${path} has horizontal overflow on 390px mobile: ${geometry.scroll} > ${geometry.viewport}`);
    assert(geometry.vgLoaded,`${path} did not load the final Van Gogh theme stylesheet`);
  }


  // iPhone-size destinations must be labeled and large enough to tap, not punctuation.
  for(const width of [320,375,390,430]){
    await page.setViewportSize({width,height:844});
    const nav=await page.evaluate(()=>{
      const root=document.querySelector('.portal-mobile-nav');
      const r=root?.getBoundingClientRect();
      return {
        visible:root&&getComputedStyle(root).display==='grid',
        topNavHidden:getComputedStyle(document.querySelector('.portal-topbar .portal-nav')).display==='none',
        bottom:r?.bottom,screen:innerHeight,
        items:[...root.querySelectorAll('a')].map(a=>{
          const b=a.getBoundingClientRect(),label=a.querySelector('span'),icon=a.querySelector('svg');
          return {width:b.width,height:b.height,label:label?.textContent?.trim(),
            labelVisible:label&&getComputedStyle(label).display!=='none',iconSize:icon?.getBoundingClientRect().width};
        })
      };
    });
    assert(nav.visible&&nav.topNavHidden,'Mobile navbar is not correctly relocated at '+width+'px');
    assert(Math.abs(nav.bottom-nav.screen)<2,'Mobile navbar must hug the bottom safe area at '+width+'px');
    assert(nav.items.length===5&&nav.items.every(a=>a.width>=48&&a.height>=44&&a.labelVisible&&a.label&&a.iconSize>=20),
      'Mobile navigation needs 5 named, usable tap targets at '+width+'px');
  }
  await page.setViewportSize({width:820,height:900});
  const tablet=await page.evaluate(()=>({
    mobileVisible:getComputedStyle(document.querySelector('.portal-mobile-nav')).display!=='none',
    labels:[...document.querySelectorAll('.portal-topbar .portal-nav a span')].map(x=>getComputedStyle(x).display)
  }));
  assert(!tablet.mobileVisible&&tablet.labels.length===5&&tablet.labels.every(x=>x!=='none'),
    'Tablet navigation should retain its text labels');
  await page.setViewportSize({width:390,height:844});

  // Regression: own image message + long filename must not crop off the right
  // edge, even if mobile Safari gives the attachment its intrinsic width.
  const ownPhoto=state.messages.push({
    id:991,group_id:state.groups[0].id,sender_id:user.id,
    body:'🥳',message_type:'sticker',
    attachment_path:'fixture/photo.jpg',attachment_name:'snapvideo--tom and jerry meme-6250509 extra-wide-name.jpeg',
    attachment_size:25300,attachment_mime:'image/jpeg',
    created_at:'2026-10-09T14:00:00Z',deleted_at:null
  });
  for(const width of [320,375,390,414,430]){
    await page.setViewportSize({width,height:844});
    await page.goto(baseURL+'/community.html',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.querySelector('[data-message-id="991"]'));
    await page.evaluate(()=>{
      const row=document.querySelector('[data-message-id="991"]');
      const img=row?.querySelector('.chat-image-preview');
      if(img){img.src='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="950"><rect width="1400" height="950" fill="#346899"/></svg>');img.hidden=false;}
    });
    const geometry=await page.evaluate(()=>{
      const names=['.chat-layout','.chat-center','#message-stream','.chat-composer','.composer-box','#send-btn','[data-message-id="991"]','[data-message-id="991"] .message-main','[data-message-id="991"] .chat-image-preview','[data-message-id="991"] .message-attachment','[data-message-id="991"] .message-meta'];
      const boxes=names.map(selector=>{
        const el=document.querySelector(selector),r=el?.getBoundingClientRect();
        return {selector,left:r?.left,right:r?.right,width:r?.width,scroll:el?.scrollWidth,client:el?.clientWidth};
      });
      return {viewport:document.documentElement.clientWidth,docScroll:document.documentElement.scrollWidth,bodyScroll:document.body.scrollWidth,
        boxes};
    });
    const off=geometry.boxes.filter(b=>Number.isFinite(b.right)&&
      (b.right>geometry.viewport+2||b.left< -2));
    assert(!off.length&&geometry.docScroll<=geometry.viewport+2&&geometry.bodyScroll<=geometry.viewport+2,
      'Mobile photo/long filename is clipped at '+width+'px: '+JSON.stringify(geometry));
  }
  await page.setViewportSize({width:390,height:844});

  await page.goto(baseURL+'/community.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#room-title')?.textContent?.includes('General'));
  let geo=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:window.innerWidth}));
  assert(geo.scroll<=geo.viewport+1,'Community has horizontal overflow on mobile');
  const actions=await page.evaluate(()=>{
    const selectors=['#mobile-chat-menu','#room-search-btn','#chat-more-btn'];
    return selectors.map(s=>{const el=document.querySelector(s),r=el.getBoundingClientRect();return {name:s,w:r.width,h:r.height};});
  });
  assert(actions.every(a=>a.w>=44&&a.h>=44),'Mobile chat header controls must have 44px tap targets');
  await page.click('#chat-more-btn');
  assert(await page.locator('#chat-more-menu').evaluate(el=>!el.hidden),'Chat overflow actions should open');
  await page.click('#chat-more-btn');
  await page.click('#mobile-chat-menu');
  assert(await page.locator('#chat-sidebar').evaluate(el=>el.classList.contains('open')),'Mobile community drawer did not open smoothly');

  await context.close();
}


async function testAvatarUpload(browser){
 const {context,page,state}=await newPortalPage(browser);
 await page.goto(baseURL+'/account.html',{waitUntil:'domcontentloaded'});
 await page.waitForSelector('#account-app:not(.hidden)');
 await page.waitForSelector('#avatar-editor-trigger');
 const imageBase64=await page.evaluate(()=>{
  const c=document.createElement('canvas');c.width=300;c.height=300;
  const ctx=c.getContext('2d');ctx.fillStyle='#2566aa';ctx.fillRect(0,0,300,300);
  ctx.fillStyle='#ffeecc';ctx.beginPath();ctx.arc(150,145,98,0,2*Math.PI);ctx.fill();
  return c.toDataURL('image/png').split(',')[1];
 });
 await page.setInputFiles('#avatar-source-input',{
   name:'portrait.png',mimeType:'image/png',buffer:Buffer.from(imageBase64,'base64')
 });
 await page.waitForSelector('#avatar-edit-dialog:not([hidden])');
 await page.locator('#avatar-zoom').fill('1.5');
 await page.click('#avatar-save-crop');
 await page.waitForFunction(()=>document.querySelector('#avatar-edit-dialog')?.hidden===true, null,{timeout:20000});
 assert(state.profiles[0].avatar_path?.startsWith(user.id+'/'),'Avatar must be stored in the account storage folder');
 assert(state.avatarFiles.size===1,'Avatar upload must reach private Supabase Storage');
 const assertAvatar=async (selector,where)=>{
   await page.waitForFunction(s=>{
     const host=document.querySelector(s),img=host?.querySelector('img.lms-avatar-photo');
     if(!host?.classList.contains('has-avatar-image')||!img?.complete||!img.naturalWidth)return false;
     const r=img.getBoundingClientRect(),p=host.getBoundingClientRect();
     return r.width>0&&r.height>0&&r.width<=p.width+1&&r.height<=p.height+1
       &&getComputedStyle(img).objectFit==='cover';
   },selector,{timeout:12000});
 };
 await assertAvatar('#profile-avatar','Account');
 for(const [pageName,where] of [['home.html','Home'],['progress.html','Progress'],['community.html','Community']]){
   await page.goto(baseURL+'/'+pageName,{waitUntil:'domcontentloaded'});
   await assertAvatar('#portal-avatar',where);
   if(where==='Community'){
     const preserved=await page.evaluate(uid=>{
       const node=document.querySelector('#portal-avatar');
       const original=node.querySelector('img.lms-avatar-photo');
       document.dispatchEvent(new CustomEvent('lms:profile-image',{detail:{profile:{id:uid,display_name:'Portal Owner'}}}));
       return original&&node.querySelector('img.lms-avatar-photo')===original;
     },user.id);
     assert(preserved,'Profile update must preserve the existing decoded header avatar');
     await assertAvatar('#portal-avatar','Community after profile update');
   }
 }
 await page.waitForFunction(()=>[...document.querySelectorAll('#member-list img.lms-avatar-photo')]
   .some(img=>img.complete&&img.naturalWidth>0),null,{timeout:12000});
 await context.close();
}

const browser=await engine.launch({headless:true});
try{
  await testHome(browser);
  await testAutomaticSubjectCovers(browser);
  await testCommunity(browser);
  await testCommunityEmptyState(browser);
  await testAvatarUpload(browser);
  await testChatPagination(browser);
  await testProgress(browser);
  await testResponsivePortal(browser);
  console.log(`PASS ${browserName}: Van Gogh member portal + community + progress + responsive geometry`);
}finally{
  await browser.close();
}
