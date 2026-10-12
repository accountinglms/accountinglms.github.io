import {activateFocusScope} from './focus-scope.js';
import {paintAvatar} from './avatar.js';
import {ensureSession,restGet,restRpc,restPatch,restUpsert,restInsert} from './common.js';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sets={
'Gần đây':'','Cảm xúc':'😀 😃 😄 😁 😆 😅 😂 🤣 🥲 ☺️ 😊 😇 🙂 🙃 😉 😍 🥰 😘 😋 😛 😜 🤪 🤗 🤭 🤫 🤔 😐 😑 😶 😏 😒 🙄 😬 😮 😯 😲 😳 🥺 🥹 😦 😧 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 😤 😡 😠 🤬 😈 👿 👻 🤖',
'Cử chỉ':'👋 🤚 🖐️ ✋ 👌 🤌 🤏 ✌️ 🤞 🫰 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ 🫵 👍 👎 ✊ 👊 🤜 👏 🙌 🫶 👐 🤲 🤝 🙏 💪 🧠 👀',
'Trái tim':'❤️ 🩷 🧡 💛 💚 💙 🩵 💜 🤎 🖤 🩶 🤍 💔 ❤️‍🔥 ❤️‍🩹 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 😻 🌹 🌷',
'Thiên nhiên':'🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🐔 🐧 🐦 🐤 🦆 🦅 🦉 🦋 🐝 🐢 🐬 🐙 🐠 🌸 🌼 🌻 🌺 🍀 🌿 🌵 🌴 🌈 ☀️ ⭐ 🌟 🌙 ☁️ ⚡ 🔥 🌊',
'Ẩm thực':'🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🥑 🍆 🥦 🥕 🌽 🍞 🥐 🥨 🥞 🧇 🧀 🍖 🍗 🍔 🍟 🍕 🌭 🥪 🌮 🍜 🍝 🍣 🍤 🥟 🍩 🍪 🎂 🍰 🍫 🍬 🍭 ☕ 🧋 🥤',
'Học tập':'📚 📖 📕 📗 📘 📙 📓 📝 ✏️ 🖊️ 📐 📏 🧮 💻 ⌨️ 🖥️ 🖨️ 📱 💾 📊 📈 📉 💹 💰 💵 💶 💳 🪙 🏦 🧾 📁 📂 📎 📌 📍 📋 📅 ⏰ 🎓 🏆 🥇 💡 🔍 ✅ ❌ ❗ ❓ 💯 🎯 🚀 🛠️',
'Giải trí':'🎉 🎊 🎁 🎈 🎂 ✨ 🎆 🎇 🎮 🕹️ 🎲 🎸 🎹 🎧 🎤 🎵 🎶 🎬 🍿 🎨 📷 📸 📺 🏀 ⚽ 🏸 🎾 🏓 🎳 🏋️ 🚴 🏃 🏊 🏔️ ✈️ 🚗 🚲'};
const aliases={love:'❤️ 🥰 😍',heart:'❤️ 💗',tim:'❤️ 💕',vui:'😊 😄 🥳',buon:'😢 😭',buồn:'😢 😭',cuoi:'😂 🤣',cười:'😂 🤣',hoc:'📚 🎓 📝',học:'📚 🎓 📝',tien:'💰 💵 💳',tiền:'💰 💵 💳',ok:'👍 ✅ 👌',good:'👍 ✅ 💯',fire:'🔥 ❤️‍🔥',thanks:'🙏 ❤️ 👏',study:'📚 🧠 🎓',cat:'🐱 😻'};
const stickers='🥳 😭 😂 🥹 😡 😍 😎 😴 🤯 🤗 🤩 😈 💪 🙏 ❤️ 🔥 📚 🎓 🧠 📝 💯 ✅ 🎯 🏆 💡 🚀 👏 📈 🧮'.split(/\s+/);
let session=null,room=null,category='Cảm xúc',pickerMode='emoji',query='',typingLast=0,typingTimer=null,notiTimer=null,searchTimer=null,toastId=0;
const recentKey=()=> 'lms-emoji-recent-'+(session?.user?.id||'guest');
function recents(){try{return JSON.parse(localStorage.getItem(recentKey())||'[]');}catch{return [];}}
function remember(e){try{localStorage.setItem(recentKey(),JSON.stringify([e,...recents().filter(v=>v!==e)].slice(0,35)));}catch{}}
function toast(message){const el=$('#community-toast');if(!el)return;el.textContent=message;el.hidden=false;const id=++toastId;setTimeout(()=>{if(id===toastId)el.hidden=true;},3200);}
function chooseEmoji(emoji){const el=$('#message-input');if(!el)return;el.setRangeText(emoji,el.selectionStart??el.value.length,el.selectionEnd??el.value.length,'end');el.focus();el.dispatchEvent(new Event('input',{bubbles:true}));remember(emoji);}
function pickerList(){
 if(query.trim()){
  const q=query.trim().toLowerCase(),source=pickerMode==='sticker'?stickers:Object.values(sets).flatMap(x=>x.split(/\s+/));
  const matches=[...new Set([...Object.entries(aliases).filter(([k])=>k.includes(q)).flatMap(([,v])=>v.split(' ')),...source.filter(x=>x.includes(q))])].filter(Boolean);
  return pickerMode==='sticker'?matches.filter(x=>stickers.includes(x)):matches;
 }
 if(pickerMode==='sticker')return stickers;
 return category==='Gần đây'?recents():sets[category].split(/\s+/).filter(Boolean);
}
function renderPickerResults(){
 const grid=$('#emoji-popover .emoji-grid');if(!grid)return;
 const list=pickerList();
 grid.innerHTML=list.map(e=>'<button type="button" class="'+(pickerMode==='sticker'?'sticker-tile':'')+'" data-emoji-value="'+esc(e)+'" aria-label="'+(pickerMode==='sticker'?'Gửi sticker ':'Chèn emoji ')+esc(e)+'">'+esc(e)+'</button>').join('');
 $('#emoji-empty').hidden=Boolean(list.length);
}
function renderPicker(){
 const root=$('#emoji-popover');if(!root)return;
 root.innerHTML='<div class="emoji-head"><strong>Biểu cảm</strong><button type="button" data-emoji-close aria-label="Đóng bảng emoji và sticker">×</button></div><div class="emoji-modes"><button type="button" data-emoji-mode="emoji" aria-pressed="'+(pickerMode==='emoji')+'" class="'+(pickerMode==='emoji'?'active':'')+'">Emoji</button><button type="button" data-emoji-mode="sticker" aria-pressed="'+(pickerMode==='sticker')+'" class="'+(pickerMode==='sticker'?'active':'')+'">Sticker</button></div><input type="search" id="emoji-search" aria-label="Tìm emoji hoặc sticker" maxlength="32" placeholder="Tìm: vui, tim, học…" value="'+esc(query)+'">'+(pickerMode==='emoji'?'<div class="emoji-categories">'+Object.keys(sets).map((g,i)=>'<button type="button" data-emoji-cat="'+esc(g)+'" title="'+esc(g)+'" aria-label="'+esc(g)+'" aria-pressed="'+(category===g)+'" class="'+(category===g?'active':'')+'">'+['◷','😊','👋','❤️','🌸','🍕','📚','🎉'][i]+'</button>').join('')+'</div>':'')+'<div class="emoji-scroll"><div class="emoji-grid"></div><p id="emoji-empty" hidden>Không tìm thấy biểu tượng.</p></div><p class="emoji-help">Chọn sticker để gửi ngay. Emoji được chèn vào tin nhắn.</p>';
 renderPickerResults();
}
function closePicker(returnFocus=false){
 const root=$('#emoji-popover'),button=$('#emoji-btn');if(!root||!button)return;
 root.hidden=true;button.setAttribute('aria-expanded','false');
 if(returnFocus)button.focus({preventScroll:true});
}
function positionPicker(){
 const root=$('#emoji-popover'),button=$('#emoji-btn');if(!root||root.hidden||!button)return;
 const viewport=window.visualViewport,x=viewport?.offsetLeft||0,y=viewport?.offsetTop||0;
 const width=viewport?.width||innerWidth,height=viewport?.height||innerHeight,margin=12,gap=8;
 const anchor=button.getBoundingClientRect(),panelWidth=Math.max(0,Math.min(390,width-margin*2));
 const above=anchor.top-y-margin-gap,panelHeight=Math.max(0,Math.min(435,height-margin*2,Math.max(240,above)));
 // Fixed coordinates stay within the visible viewport when the iPhone keyboard opens.
 root.style.width=panelWidth+'px';root.style.height=panelHeight+'px';
 root.style.left=Math.max(x+margin,Math.min(anchor.left,x+width-panelWidth-margin))+'px';
 root.style.top=Math.max(y+margin,Math.min(anchor.top-panelHeight-gap,y+height-panelHeight-margin))+'px';
}
function initPicker(){
 const b=$('#emoji-btn'),root=$('#emoji-popover');if(!b||!root)return;
 // Escape both the composer/grid clipping and the sticky navigation stacking contexts.
 document.body.append(root);
 b.addEventListener('click',e=>{
  e.preventDefault();e.stopPropagation();
  if(!root.hidden){closePicker();return;}
  query='';renderPicker();root.hidden=false;b.setAttribute('aria-expanded','true');positionPicker();
  if(e.detail===0)root.querySelector('[data-emoji-close]')?.focus({preventScroll:true});
 });
 b.addEventListener('contextmenu',e=>e.preventDefault());
 root.addEventListener('contextmenu',e=>{if(!e.target.closest('input'))e.preventDefault();});
 root.addEventListener('click',e=>{
  e.stopPropagation();if(root.hidden)return;
  if(e.target.closest('[data-emoji-close]')){closePicker(true);return;}
  const mode=e.target.closest('[data-emoji-mode]');if(mode){pickerMode=mode.dataset.emojiMode;query='';renderPicker();root.querySelector('[data-emoji-mode="'+pickerMode+'"]')?.focus({preventScroll:true});return;}
  const cat=e.target.closest('[data-emoji-cat]');if(cat){category=cat.dataset.emojiCat;query='';renderPicker();root.querySelector('[data-emoji-cat="'+category+'"]')?.focus({preventScroll:true});return;}
  const pick=e.target.closest('[data-emoji-value]');if(pick){
   if(b.disabled)return;
   const emoji=pick.dataset.emojiValue;
   closePicker(pickerMode==='sticker');remember(emoji);
   if(pickerMode==='sticker')document.dispatchEvent(new CustomEvent('lms:send-sticker',{detail:{emoji}}));
   else chooseEmoji(emoji);
  }
 });
 // Keep the search field intact: replacing it on every keystroke loses focus on Safari.
 root.addEventListener('input',e=>{if(e.target.id!=='emoji-search')return;query=e.target.value;renderPickerResults();});
 document.addEventListener('pointerdown',e=>{if(!root.hidden&&!root.contains(e.target)&&!b.contains(e.target))closePicker();});
 document.addEventListener('click',e=>{if(!root.hidden&&!root.contains(e.target)&&!b.contains(e.target))closePicker();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!root.hidden){e.preventDefault();closePicker(true);}});
 window.addEventListener('resize',positionPicker);
 window.addEventListener('scroll',positionPicker,{passive:true});
 window.visualViewport?.addEventListener('resize',positionPicker);
 window.visualViewport?.addEventListener('scroll',positionPicker);
 document.addEventListener('lms:room',()=>closePicker());
}
async function typing(){
 if(!session||!room?.groupId||Date.now()-typingLast<3000)return;typingLast=Date.now();
 await restUpsert('chat_typing',{group_id:room.groupId,user_id:session.user.id,updated_at:new Date().toISOString()},'group_id,user_id').catch(()=>{});
}
async function pollTyping(){
 if(!session||!room?.groupId||document.hidden)return;
 const selected=room.groupId;
 try{const rows=await restGet('chat_typing','select=user_id,updated_at&group_id=eq.'+encodeURIComponent(selected)+'&updated_at=gte.'+encodeURIComponent(new Date(Date.now()-7000).toISOString()));
 if(selected!==room?.groupId)return;
 const count=rows.filter(x=>x.user_id!==session.user.id).length,b=$('#typing-indicator');
 if(b){b.hidden=!count;b.textContent=room.kind==='direct'?'Đang nhập tin nhắn…':count+' người đang nhập…';}
 }catch{}
}
async function searchMessages(){
 const value=$('#chat-search-input').value.trim(),target=$('#chat-search-results');
 if(value.length<2){target.innerHTML='<p>Nhập tối thiểu 2 ký tự.</p>';return;}
 target.textContent='Đang tìm…';
 const selected=room?.groupId;
 try{const list=await restRpc('search_chat_messages',{p_group:selected,p_query:value});if(selected!==room?.groupId)return;
 target.innerHTML=list.length?list.map(m=>'<button type="button" class="chat-search-hit" data-jump-id="'+m.id+'"><span>'+esc(String(m.body).slice(0,125))+'</span><small>'+new Date(m.created_at).toLocaleDateString('vi-VN')+'</small></button>').join(''):'<p>Không tìm thấy tin nhắn.</p>';
 }catch{target.textContent='Chưa thể tìm kiếm.';}
}
function initSearch(){
 $('#room-search-btn')?.addEventListener('click',()=>{if(!room?.groupId)return;$('#chat-search-panel').hidden=false;$('#chat-search-input').focus();});
 $('#chat-search-close')?.addEventListener('click',()=>$('#chat-search-panel').hidden=true);
 $('#chat-search-input')?.addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(searchMessages,280);});
 $('#chat-search-results')?.addEventListener('click',e=>{const b=e.target.closest('[data-jump-id]');if(!b)return;$('#chat-search-panel').hidden=true;document.dispatchEvent(new CustomEvent('lms:jump-message',{detail:{id:Number(b.dataset.jumpId)}}));});
 document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#room-search-btn')?.click();}if(e.key==='Escape')$('#chat-search-panel').hidden=true;});
}
function initFiles(){
 const drop=$('.chat-center');if(!drop)return;let depth=0;
 const zone=$('#community-drop-zone');
 drop.addEventListener('dragenter',e=>{if(!e.dataTransfer?.types?.includes('Files'))return;e.preventDefault();depth++;zone.hidden=false;});
 drop.addEventListener('dragover',e=>{if(!e.dataTransfer?.types?.includes('Files'))return;e.preventDefault();});
 drop.addEventListener('dragleave',()=>{depth=Math.max(0,depth-1);if(!depth)zone.hidden=true;});
 drop.addEventListener('drop',e=>{e.preventDefault();depth=0;zone.hidden=true;const file=e.dataTransfer?.files?.[0];if(file)document.dispatchEvent(new CustomEvent('lms:attach-file',{detail:{file}}));});
 $('#message-input')?.addEventListener('paste',e=>{const f=[...(e.clipboardData?.files||[])].find(x=>x.type.startsWith('image/'));if(f){e.preventDefault();document.dispatchEvent(new CustomEvent('lms:attach-file',{detail:{file:f}}));}});
}
let profileScope=null;
function closeProfile(){ $('#community-profile-dialog').hidden=true;profileScope?.();profileScope=null; }
async function openProfile(uid){
 if(!session||!uid)return;
 try{
  const rows=await restGet('profiles','select=id,display_name,bio,avatar_color,avatar_path&id=eq.'+encodeURIComponent(uid)+'&limit=1'),p=rows[0];if(!p)return;
  const mine=uid===session.user.id,d=$('#community-profile-dialog');d.hidden=false;d.dataset.user=uid;d.dataset.color=p.avatar_color||'#36548a';
  $('#profile-title').textContent=mine?'Hồ sơ của tôi':(p.display_name||'Thành viên');
  $('#profile-name').value=p.display_name||'';$('#profile-name').disabled=!mine;
  $('#profile-bio').value=p.bio||'';$('#profile-bio').disabled=!mine;
  $('#profile-avatar').textContent=(p.display_name||'M').trim().split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase();
  $('#profile-avatar').style.backgroundColor=d.dataset.color;
  await paintAvatar($('#profile-avatar'),p,p.display_name||'');
  document.dispatchEvent(new CustomEvent('lms:open-member-profile',{detail:{userId:uid}}));
  $('#profile-colors').hidden=!mine;$('#profile-save').hidden=!mine;$('#profile-report').hidden=mine;$('#profile-block').hidden=mine;
  if(!profileScope)profileScope=activateFocusScope(d,{onEscape:closeProfile});
 }catch(error){toast('Không thể mở hồ sơ.');}
}
function initProfiles(){
 $('#profile-close')?.addEventListener('click',closeProfile);
 $('#profile-save')?.addEventListener('click',async()=>{
  const name=$('#profile-name').value.normalize('NFC').trim(),bio=$('#profile-bio').value.normalize('NFC').trim();
  if(name.length<2||name.length>70){toast('Tên dài từ 2 đến 70 ký tự.');return;}
  try{await restPatch('profiles','id=eq.'+encodeURIComponent(session.user.id),{display_name:name,bio:bio.slice(0,180),avatar_color:$('#community-profile-dialog').dataset.color||'#36548a'});
    closeProfile();toast('Đã lưu hồ sơ.');document.dispatchEvent(new CustomEvent('lms:refresh-chat'));
  }catch(e){toast('Không lưu được hồ sơ.');}
 });
 $('#profile-colors')?.addEventListener('click',e=>{const b=e.target.closest('[data-avatar-color]');if(b){$('#community-profile-dialog').dataset.color=b.dataset.avatarColor;$('#profile-avatar').style.backgroundColor=b.dataset.avatarColor;}});
 $('#profile-report')?.addEventListener('click',async()=>{const reason=prompt('Lý do: spam, harassment, privacy hoặc other','spam');if(!reason)return;
  if(!['spam','harassment','privacy','other'].includes(reason)){toast('Lý do không hợp lệ.');return;}
  try{await restInsert('social_reports',{reporter_id:session.user.id,subject_id:$('#community-profile-dialog').dataset.user,reason});toast('Đã gửi báo cáo.');}catch{toast('Không gửi được báo cáo.');}
 });
 $('#profile-block')?.addEventListener('click',async()=>{if(!confirm('Chặn và huỷ kết bạn với thành viên này?'))return;
 try{await restRpc('set_member_block',{p_member:$('#community-profile-dialog').dataset.user,p_block:true});toast('Đã chặn tài khoản.');closeProfile();}catch{toast('Không thể chặn tài khoản.');}
 });
 document.addEventListener('click',e=>{const b=e.target.closest('[data-profile-user]');if(b)openProfile(b.dataset.profileUser);});
 $('#community-profile-open')?.addEventListener('click',()=>openProfile(session.user.id));
 $('#community-room-profile')?.addEventListener('click',()=>openProfile(room?.peerId));
}
async function notifications(){
 if(!session)return;
 try{const [f,unread]=await Promise.all([restGet('social_friendships','select=id&recipient_id=eq.'+encodeURIComponent(session.user.id)+'&status=eq.pending'),restRpc('get_portal_unread_counts')]);
 const total=f.length+(unread||[]).reduce((x,v)=>x+Number(v.unread_count||0),0);
 const badge=$('#community-inbox-badge');if(badge){badge.hidden=!total;badge.textContent=total>99?'99+':String(total);}
 $('#community-notify-list').innerHTML='<p>'+f.length+' lời mời kết bạn</p><p>'+((unread||[]).reduce((x,v)=>x+Number(v.unread_count||0),0))+' tin nhắn chưa đọc</p><button type="button" id="open-friends-notify">Xem bạn bè →</button>';
 }catch{}
}
function initNotifications(){
 $('#notification-bell')?.addEventListener('click',()=>{const p=$('#community-notifications');p.hidden=!p.hidden;notifications();},true);
 $('#community-notify-list')?.addEventListener('click',e=>{if(e.target.closest('#open-friends-notify')){$('#community-notifications').hidden=true;document.querySelector('[data-social-tab=people]')?.click();}});
 notiTimer=setInterval(()=>{if(!document.hidden)notifications();},25000);
}
document.addEventListener('lms:room',e=>{room=e.detail;typingLast=0;$('#typing-indicator').hidden=true;$('#chat-search-panel').hidden=true;$('#room-search-btn').hidden=false;$('#community-room-profile').hidden=room?.kind!=='direct';pollTyping();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){pollTyping();notifications();}});
window.addEventListener('beforeunload',()=>{clearInterval(typingTimer);clearInterval(notiTimer);clearTimeout(searchTimer);});
const infoMobile=window.matchMedia('(max-width:1130px)');
let infoScope=null;
function closeInfoPanel(){
 const panel=$('#community-info');panel.classList.remove('open');
 infoScope?.();infoScope=null;
 panel.removeAttribute('role');panel.removeAttribute('aria-modal');panel.inert=infoMobile.matches;
 $('#community-mobile-info').setAttribute('aria-expanded','false');
}
function openInfoPanel(){
 const panel=$('#community-info');
 if(!infoMobile.matches)return;
 panel.inert=false;panel.classList.add('open');panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
 $('#community-mobile-info').setAttribute('aria-expanded','true');
 const moreButton=$('#chat-more-btn');
 const launcher=moreButton.getClientRects().length?moreButton:$('#community-mobile-info');
 infoScope=activateFocusScope(panel,{onEscape:closeInfoPanel,initialFocus:$('#community-info-close'),returnFocus:launcher});
}
infoMobile.addEventListener('change',closeInfoPanel);
$('#community-info').inert=infoMobile.matches;
async function init(){
 session=await ensureSession();
 initPicker();initSearch();initFiles();initProfiles();initNotifications();
 $('#message-input')?.addEventListener('input',()=>typing());
 typingTimer=setInterval(pollTyping,3600);
 $('#community-mobile-info')?.addEventListener('click',()=>infoScope?closeInfoPanel():openInfoPanel());
 $('#community-info-close')?.addEventListener('click',closeInfoPanel);
 // Older history is loaded explicitly to avoid scroll/re-render race conditions.
 await notifications();
}
init().catch(console.warn);
