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
let session=null,room=null,category='Cảm xúc',pickerMode='emoji',query='',typingLast=0,typingTimer=null,notiTimer=null,searchTimer=null,toastId=0;
const recentKey=()=> 'lms-emoji-recent-'+(session?.user?.id||'guest');
function recents(){try{return JSON.parse(localStorage.getItem(recentKey())||'[]');}catch{return [];}}
function remember(e){try{localStorage.setItem(recentKey(),JSON.stringify([e,...recents().filter(v=>v!==e)].slice(0,35)));}catch{}}
function toast(message){const el=$('#community-toast');if(!el)return;el.textContent=message;el.hidden=false;const id=++toastId;setTimeout(()=>{if(id===toastId)el.hidden=true;},3200);}
function chooseEmoji(emoji){const el=$('#message-input');if(!el)return;el.setRangeText(emoji,el.selectionStart??el.value.length,el.selectionEnd??el.value.length,'end');el.focus();el.dispatchEvent(new Event('input',{bubbles:true}));remember(emoji);}
function pickerList(){
 if(pickerMode==='sticker')return '🥳 😭 😂 🥹 😡 😍 😎 😴 🤯 🤗 🤩 😈 💪 🙏 ❤️ 🔥 📚 🎓 🧠 📝 💯 ✅ 🎯 🏆 💡 🚀 👏 📈 🧮'.split(/\s+/);
 if(query.trim()){const q=query.trim().toLowerCase();return [...new Set([...Object.entries(aliases).filter(([k])=>k.includes(q)).flatMap(([,v])=>v.split(' ')),...Object.values(sets).flatMap(x=>x.split(/\s+/)).filter(x=>x.includes(q))])].filter(Boolean);}
 return category==='Gần đây'?recents():sets[category].split(/\s+/).filter(Boolean);
}
function renderPicker(){
 const root=$('#emoji-popover');if(!root)return;
 root.innerHTML='<div class="emoji-head"><strong>Biểu cảm</strong><button type="button" data-emoji-close>×</button></div><div class="emoji-modes"><button type="button" data-emoji-mode="emoji" class="'+(pickerMode==='emoji'?'active':'')+'">Emoji</button><button type="button" data-emoji-mode="sticker" class="'+(pickerMode==='sticker'?'active':'')+'">Sticker</button></div><input type="search" id="emoji-search" maxlength="32" placeholder="Tìm: vui, tim, học…" value="'+esc(query)+'">'+(pickerMode==='emoji'?'<div class="emoji-categories">'+Object.keys(sets).map((g,i)=>'<button type="button" data-emoji-cat="'+esc(g)+'" title="'+esc(g)+'" class="'+(category===g?'active':'')+'">'+['◷','😊','👋','❤️','🌸','🍕','📚','🎉'][i]+'</button>').join('')+'</div>':'')+'<div class="emoji-scroll"><div class="emoji-grid">'+pickerList().map(e=>'<button type="button" class="'+(pickerMode==='sticker'?'sticker-tile':'')+'" data-emoji-value="'+esc(e)+'">'+esc(e)+'</button>').join('')+'</div></div><p class="emoji-help">Vuốt hoặc cuộn để tìm thêm biểu tượng.</p>';
}
function initPicker(){
 const b=$('#emoji-btn'),root=$('#emoji-popover');if(!b||!root)return;
 b.addEventListener('click',()=>{root.hidden=!root.hidden;if(!root.hidden){query='';renderPicker();}});
 root.addEventListener('click',e=>{
  if(e.target.closest('[data-emoji-close]')){root.hidden=true;return;}
  const mode=e.target.closest('[data-emoji-mode]');if(mode){pickerMode=mode.dataset.emojiMode;query='';renderPicker();return;}
  const cat=e.target.closest('[data-emoji-cat]');if(cat){category=cat.dataset.emojiCat;query='';renderPicker();return;}
  const pick=e.target.closest('[data-emoji-value]');if(pick){const emoji=pick.dataset.emojiValue;remember(emoji);if(pickerMode==='sticker'){document.dispatchEvent(new CustomEvent('lms:send-sticker',{detail:{emoji}}));root.hidden=true;}else chooseEmoji(emoji);}
 });
 root.addEventListener('input',e=>{if(e.target.id!=='emoji-search')return;query=e.target.value;const at=e.target.selectionStart;renderPicker();const next=$('#emoji-search');next.focus();next.setSelectionRange(at,at);});
 document.addEventListener('pointerdown',e=>{if(!root.hidden&&!root.contains(e.target)&&!b.contains(e.target))root.hidden=true;});
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
 document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#room-search-btn')?.click();}if(e.key==='Escape'){$('#chat-search-panel').hidden=true;$('#emoji-popover').hidden=true;}});
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
async function openProfile(uid){
 if(!session||!uid)return;
 try{
  const rows=await restGet('profiles','select=id,display_name,bio,avatar_color&id=eq.'+encodeURIComponent(uid)+'&limit=1'),p=rows[0];if(!p)return;
  const mine=uid===session.user.id,d=$('#community-profile-dialog');d.hidden=false;d.dataset.user=uid;d.dataset.color=p.avatar_color||'#36548a';
  $('#profile-title').textContent=mine?'Hồ sơ của tôi':(p.display_name||'Thành viên');
  $('#profile-name').value=p.display_name||'';$('#profile-name').disabled=!mine;
  $('#profile-bio').value=p.bio||'';$('#profile-bio').disabled=!mine;
  $('#profile-avatar').textContent=(p.display_name||'M').trim().split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase();
  $('#profile-avatar').style.backgroundColor=d.dataset.color;
  $('#profile-colors').hidden=!mine;$('#profile-save').hidden=!mine;$('#profile-report').hidden=mine;$('#profile-block').hidden=mine;
 }catch(error){toast('Không thể mở hồ sơ.');}
}
function initProfiles(){
 $('#profile-close')?.addEventListener('click',()=>$('#community-profile-dialog').hidden=true);
 $('#profile-save')?.addEventListener('click',async()=>{
  const name=$('#profile-name').value.normalize('NFC').trim(),bio=$('#profile-bio').value.normalize('NFC').trim();
  if(name.length<2||name.length>70){toast('Tên dài từ 2 đến 70 ký tự.');return;}
  try{await restPatch('profiles','id=eq.'+encodeURIComponent(session.user.id),{display_name:name,bio:bio.slice(0,180),avatar_color:$('#community-profile-dialog').dataset.color||'#36548a'});
    $('#community-profile-dialog').hidden=true;toast('Đã lưu hồ sơ.');document.dispatchEvent(new CustomEvent('lms:refresh-chat'));
  }catch(e){toast('Không lưu được hồ sơ.');}
 });
 $('#profile-colors')?.addEventListener('click',e=>{const b=e.target.closest('[data-avatar-color]');if(b){$('#community-profile-dialog').dataset.color=b.dataset.avatarColor;$('#profile-avatar').style.backgroundColor=b.dataset.avatarColor;}});
 $('#profile-report')?.addEventListener('click',async()=>{const reason=prompt('Lý do: spam, harassment, privacy hoặc other','spam');if(!reason)return;
  if(!['spam','harassment','privacy','other'].includes(reason)){toast('Lý do không hợp lệ.');return;}
  try{await restInsert('social_reports',{reporter_id:session.user.id,subject_id:$('#community-profile-dialog').dataset.user,reason});toast('Đã gửi báo cáo.');}catch{toast('Không gửi được báo cáo.');}
 });
 $('#profile-block')?.addEventListener('click',async()=>{if(!confirm('Chặn và huỷ kết bạn với thành viên này?'))return;
 try{await restRpc('set_member_block',{p_member:$('#community-profile-dialog').dataset.user,p_block:true});toast('Đã chặn tài khoản.');$('#community-profile-dialog').hidden=true;}catch{toast('Không thể chặn tài khoản.');}
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
async function init(){
 session=await ensureSession();
 initPicker();initSearch();initFiles();initProfiles();initNotifications();
 $('#message-input')?.addEventListener('input',()=>typing());
 typingTimer=setInterval(pollTyping,3600);
 $('#community-mobile-close')?.addEventListener('click',()=>$('#chat-sidebar').classList.remove('open'));
 $('#community-mobile-info')?.addEventListener('click',()=>$('#community-info').classList.toggle('open'));
 $('#community-info-close')?.addEventListener('click',()=>$('#community-info').classList.remove('open'));
 // Older history is loaded explicitly to avoid scroll/re-render race conditions.
 await notifications();
}
init().catch(console.warn);
