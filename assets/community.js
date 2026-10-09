import {
  ensureSession,getMyAccess,restGet,restInsert,restDelete,restUpsert,
  uploadChatFile,downloadChatFile,createRealtimeClient
} from './common.js';

const $=s=>document.querySelector(s);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const initials=value=>String(value||'U').trim().split(/\s+/).filter(Boolean).map(x=>x[0]).slice(0,2).join('').toUpperCase()||'U';
const fmtTime=value=>new Date(value).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'});
const fmtSize=n=>{n=Number(n||0);if(n<1024)return n+' B';if(n<1024**2)return (n/1024).toFixed(1)+' KB';return (n/1024**2).toFixed(1)+' MB';};

let session=null,access=null;
let groups=[],memberships=[],reads=[],profiles=[],recentMessages=[],announcements=[],announcementReads=[];
let currentGroupId=null,currentMessages=[],currentReactions=[];
let pendingFile=null;
let realtime=null;
let reloadTimer=null;

function profileMap(){return new Map(profiles.map(p=>[p.id,p]));}
function myMembership(groupId){return memberships.find(m=>m.group_id===groupId&&m.user_id===session.user.id)||null;}
function currentGroup(){return groups.find(g=>g.id===currentGroupId)||null;}
function canManage(groupId){
  const m=myMembership(groupId);
  return access?.editor===true || ['owner','admin'].includes(m?.role);
}
function unreadInfo(){
  const joined=new Set(memberships.filter(m=>m.user_id===session.user.id).map(m=>m.group_id));
  const readMap=new Map(reads.map(r=>[r.group_id,Date.parse(r.last_read_at||0)||0]));
  const byGroup=new Map();
  for(const msg of recentMessages){
    if(!joined.has(msg.group_id)||msg.sender_id===session.user.id)continue;
    if((Date.parse(msg.created_at||0)||0)>(readMap.get(msg.group_id)||0)) byGroup.set(msg.group_id,(byGroup.get(msg.group_id)||0)+1);
  }
  const chat=[...byGroup.values()].reduce((a,b)=>a+b,0);
  const readAnnouncements=new Set(announcementReads.map(r=>r.announcement_id));
  const admin=announcements.filter(a=>!readAnnouncements.has(a.id)).length;
  return {byGroup,chat,admin,total:chat+admin};
}
function renderHeader(){
  const me=profiles.find(p=>p.id===session.user.id);
  const name=me?.display_name||session.user.user_metadata?.display_name||session.user.email?.split('@')[0]||'Member';
  $('#portal-user-name').textContent=name;
  $('#portal-avatar').textContent=initials(name);
  const u=unreadInfo();
  const badge=$('#global-notification-count');
  badge.hidden=!u.total;badge.textContent=u.total>99?'99+':String(u.total);
}
function renderGroups(){
  const root=$('#chat-groups');
  const unread=unreadInfo().byGroup;
  if(!groups.length){root.innerHTML='<div class="empty-compact">Chưa có nhóm nào.</div>';return;}
  root.innerHTML=groups.map(g=>{
    const joined=Boolean(myMembership(g.id));
    const last=recentMessages.find(m=>m.group_id===g.id);
    const count=unread.get(g.id)||0;
    return `<button class="chat-group ${g.id===currentGroupId?'active':''}" type="button" data-group="${g.id}">
      <span class="chat-group-icon">${g.is_official?'◆':'#'}</span>
      <span class="chat-group-main"><strong>${esc(g.name)}</strong><span>${last?esc(last.body||last.attachment_name||'Đã gửi file'):(joined?'Chưa có tin nhắn':g.is_public?'Nhóm công khai':'Nhóm riêng')}</span></span>
      ${count?`<span class="chat-unread">${count>99?'99+':count}</span>`:''}
    </button>`;
  }).join('');
}
function renderMembers(){
  const root=$('#member-list');
  const pmap=profileMap();
  const rows=memberships.filter(m=>m.group_id===currentGroupId);
  root.innerHTML=rows.map(m=>{
    const p=pmap.get(m.user_id);const name=p?.display_name||m.user_id.slice(0,8);
    return `<div class="member"><span class="portal-avatar">${esc(initials(name))}</span><div><strong>${esc(name)}</strong><span>${esc(m.role)}</span></div></div>`;
  }).join('')||'<div class="empty-compact">Chưa có thành viên.</div>';
  $('#group-manage-tools').hidden=!canManage(currentGroupId);
}
function aggregateReactions(){
  const map=new Map();
  for(const r of currentReactions){
    const key=`${r.message_id}:${r.emoji}`;
    if(!map.has(key))map.set(key,{message_id:r.message_id,emoji:r.emoji,count:0,mine:false});
    const item=map.get(key);item.count++;if(r.user_id===session.user.id)item.mine=true;
  }
  return map;
}
function renderMessages(){
  const root=$('#message-stream');
  if(!currentGroupId){root.innerHTML='<div class="empty-compact">Chọn một nhóm để bắt đầu.</div>';return;}
  if(!currentMessages.length){root.innerHTML='<div class="empty-compact">Chưa có tin nhắn. Hãy bắt đầu cuộc trò chuyện.</div>';return;}
  const pmap=profileMap(),agg=aggregateReactions();
  root.innerHTML=currentMessages.map(msg=>{
    const p=pmap.get(msg.sender_id);const name=p?.display_name||(msg.sender_id===session.user.id?'Bạn':'Member');
    const reactions=[...agg.values()].filter(x=>x.message_id===msg.id);
    const deleted=Boolean(msg.deleted_at);
    return `<article class="message-row" data-message-id="${msg.id}">
      <span class="message-avatar">${esc(initials(name))}</span>
      <div class="message-main">
        <div class="message-meta"><strong>${esc(name)}</strong><time>${esc(fmtTime(msg.created_at))}</time>${msg.message_type==='assignment'?'<span class="notice-kind">Bài tập</span>':''}</div>
        <div class="message-body">${deleted?'<em style="color:var(--portal-muted)">Tin nhắn đã xoá</em>':esc(msg.body)}</div>
        ${!deleted&&msg.attachment_path?`<button class="message-attachment" type="button" data-download="${esc(msg.attachment_path)}" data-name="${esc(msg.attachment_name||'file')}"><span>▣</span><span><strong>${esc(msg.attachment_name||'Tệp đính kèm')}</strong><br>${esc(fmtSize(msg.attachment_size))}</span></button>`:''}
        ${!deleted?`<div class="reaction-row">${reactions.map(r=>`<button class="reaction ${r.mine?'mine':''}" data-react="${esc(r.emoji)}" type="button">${esc(r.emoji)} ${r.count}</button>`).join('')}</div>
        <div class="message-actions"><button type="button" data-add-reaction="👍">+ 👍</button><button type="button" data-add-reaction="❤️">+ ❤️</button>${msg.sender_id===session.user.id||canManage(currentGroupId)?'<button type="button" data-delete-message>Xoá</button>':''}</div>`:''}
      </div>
    </article>`;
  }).join('');
  requestAnimationFrame(()=>{root.scrollTop=root.scrollHeight;});
}
function setComposerState(){
  const joined=Boolean(myMembership(currentGroupId));
  $('#join-card').hidden=!currentGroupId||joined||!currentGroup()?.is_public;
  $('#composer-active').hidden=!joined;
}
async function markCurrentRead(){
  if(!currentGroupId)return;
  const now=new Date().toISOString();
  await restUpsert('chat_reads',{group_id:currentGroupId,user_id:session.user.id,last_read_at:now,updated_at:now},'group_id,user_id');
  const existing=reads.find(r=>r.group_id===currentGroupId);
  if(existing)existing.last_read_at=now;else reads.push({group_id:currentGroupId,user_id:session.user.id,last_read_at:now});
  renderGroups();renderHeader();
}
async function loadCurrentMessages(){
  if(!currentGroupId){currentMessages=[];currentReactions=[];renderMessages();return;}
  currentMessages=await restGet('chat_messages',`select=*&group_id=eq.${encodeURIComponent(currentGroupId)}&order=created_at.asc&limit=300`);
  const ids=currentMessages.map(m=>m.id);
  currentReactions=ids.length?await restGet('chat_message_reactions',`select=*&message_id=in.(${ids.join(',')})`):[];
  renderMessages();
  if(document.visibilityState==='visible')await markCurrentRead().catch(()=>{});
}
async function selectGroup(id){
  currentGroupId=id;
  const g=currentGroup();
  if(!g)return;
  const url=new URL(location.href);url.searchParams.set('group',id);history.replaceState(null,'',url);
  $('#room-title').textContent='# '+g.name;
  $('#room-subtitle').textContent=g.description|| (g.is_public?'Nhóm công khai':'Nhóm riêng');
  $('#info-title').textContent=g.name;
  $('#info-description').textContent=g.description||'Không có mô tả.';
  renderGroups();renderMembers();setComposerState();
  await loadCurrentMessages();
  $('#chat-sidebar').classList.remove('open');
}
async function refreshCore({keepCurrent=true}={}){
  const [
    nextGroups,nextMembers,nextReads,nextRecent,nextProfiles,nextAnnouncements,nextAnnouncementReads
  ]=await Promise.all([
    restGet('chat_groups','select=*&order=is_official.desc,updated_at.desc'),
    restGet('chat_group_members','select=group_id,user_id,role,joined_at'),
    restGet('chat_reads',`select=*&user_id=eq.${encodeURIComponent(session.user.id)}`),
    restGet('chat_messages','select=id,group_id,sender_id,body,attachment_name,created_at&order=created_at.desc&limit=500'),
    restGet('profiles','select=id,display_name'),
    restGet('announcements','select=id,status,published_at,created_at&status=eq.published&order=published_at.desc.nullslast&limit=50'),
    restGet('announcement_reads',`select=announcement_id,read_at&user_id=eq.${encodeURIComponent(session.user.id)}`)
  ]);
  groups=nextGroups;memberships=nextMembers;reads=nextReads;recentMessages=nextRecent;profiles=nextProfiles;announcements=nextAnnouncements;announcementReads=nextAnnouncementReads;
  renderHeader();renderGroups();
  if(keepCurrent&&currentGroupId&&groups.some(g=>g.id===currentGroupId)){renderMembers();setComposerState();}
}
function scheduleRefresh(){
  clearTimeout(reloadTimer);
  reloadTimer=setTimeout(async()=>{
    try{
      await refreshCore();
      if(currentGroupId)await loadCurrentMessages();
      $('#connection-state').textContent='Realtime · đã đồng bộ';
      $('#connection-state').classList.add('live');
    }catch(error){
      console.error(error);
      $('#connection-state').textContent='Đang thử kết nối lại…';
      $('#connection-state').classList.remove('live');
    }
  },180);
}
async function sendMessage(){
  if(!currentGroupId||!myMembership(currentGroupId))return;
  const input=$('#message-input'),body=input.value.trim();
  if(!body&&!pendingFile)return;
  const btn=$('#send-btn');btn.disabled=true;
  try{
    let uploaded=null;
    if(pendingFile)uploaded=await uploadChatFile(currentGroupId,pendingFile);
    await restInsert('chat_messages',{
      group_id:currentGroupId,
      sender_id:session.user.id,
      body,
      message_type:$('#message-type').value,
      attachment_path:uploaded?.storagePath||null,
      attachment_name:uploaded?.name||null,
      attachment_mime:uploaded?.mime||null,
      attachment_size:uploaded?.size||null
    });
    input.value='';
    pendingFile=null;
    $('#pending-file').hidden=true;
    $('#file-input').value='';
    await loadCurrentMessages();
    await refreshCore();
  }catch(error){alert(error.message||'Không gửi được tin nhắn.');}
  finally{btn.disabled=false;}
}
async function toggleReaction(messageId,emoji){
  const mine=currentReactions.find(r=>String(r.message_id)===String(messageId)&&r.user_id===session.user.id&&r.emoji===emoji);
  if(mine)await restDelete('chat_message_reactions',`message_id=eq.${messageId}&user_id=eq.${encodeURIComponent(session.user.id)}&emoji=eq.${encodeURIComponent(emoji)}`);
  else await restInsert('chat_message_reactions',{message_id:Number(messageId),user_id:session.user.id,emoji});
  await loadCurrentMessages();
}
function openGroupModal(){ $('#group-modal').hidden=false; }
function closeModal(id){const el=document.getElementById(id);if(el)el.hidden=true;}
function renderInviteList(){
  const root=$('#invite-list');
  const members=new Set(memberships.filter(m=>m.group_id===currentGroupId).map(m=>m.user_id));
  const available=profiles.filter(p=>!members.has(p.id));
  root.innerHTML=available.length?available.map(p=>`<div class="member"><span class="portal-avatar">${esc(initials(p.display_name||'M'))}</span><div style="flex:1"><strong>${esc(p.display_name||'Member')}</strong><span>${esc(p.id.slice(0,8))}</span></div><button class="btn invite-user" type="button" data-user="${p.id}">Thêm</button></div>`).join(''):'<div class="empty-compact">Tất cả members đã ở trong nhóm.</div>';
}
async function bootstrap(){
  try{session=await ensureSession();access=await getMyAccess(session,true);}
  catch{location.replace('index.html');return;}
  await refreshCore({keepCurrent:false});
  const requested=new URLSearchParams(location.search).get('group');
  const myGroups=groups.filter(g=>myMembership(g.id));
  const first=(requested&&groups.some(g=>g.id===requested)?requested:null)||myGroups[0]?.id||groups[0]?.id||null;
  if(first)await selectGroup(first);
  realtime=createRealtimeClient(session,[
    {table:'chat_messages',event:'*'},
    {table:'chat_message_reactions',event:'*'},
    {table:'chat_groups',event:'*'},
    {table:'announcements',event:'*'}
  ],scheduleRefresh);
  $('#connection-state').textContent='Realtime · đang kết nối';
  setTimeout(()=>{$('#connection-state').textContent='Realtime · hoạt động';$('#connection-state').classList.add('live');},900);
}
$('#chat-groups').addEventListener('click',e=>{const b=e.target.closest('[data-group]');if(b)selectGroup(b.dataset.group).catch(console.error);});
$('#send-btn').addEventListener('click',sendMessage);
$('#message-input').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();}});
$('#file-input').addEventListener('change',e=>{
  pendingFile=e.target.files?.[0]||null;
  if(pendingFile&&pendingFile.size>20*1024*1024){alert('File tối đa 20 MB.');pendingFile=null;e.target.value='';}
  $('#pending-file').hidden=!pendingFile;$('#pending-file-name').textContent=pendingFile?`${pendingFile.name} · ${fmtSize(pendingFile.size)}`:'';
});
$('#remove-pending-file').addEventListener('click',()=>{pendingFile=null;$('#file-input').value='';$('#pending-file').hidden=true;});
const emojis=['😀','😂','🥹','😍','👍','👏','❤️','🔥','✅','❓','💡','📌','📚','🧠','🎯','💯','🙏','😅'];
$('#emoji-popover').innerHTML=emojis.map(x=>`<button type="button" data-emoji="${x}">${x}</button>`).join('');
$('#emoji-btn').addEventListener('click',()=>{$('#emoji-popover').hidden=!$('#emoji-popover').hidden;});
$('#emoji-popover').addEventListener('click',e=>{const b=e.target.closest('[data-emoji]');if(!b)return;$('#message-input').value+=b.dataset.emoji;$('#emoji-popover').hidden=true;$('#message-input').focus();});
$('#message-stream').addEventListener('click',async e=>{
  const download=e.target.closest('[data-download]');
  if(download){await downloadChatFile(download.dataset.download,download.dataset.name).catch(err=>alert(err.message));return;}
  const row=e.target.closest('[data-message-id]');if(!row)return;
  const reaction=e.target.closest('[data-react],[data-add-reaction]');
  if(reaction){await toggleReaction(row.dataset.messageId,reaction.dataset.react||reaction.dataset.addReaction).catch(err=>alert(err.message));return;}
  if(e.target.closest('[data-delete-message]')){
    if(!confirm('Xoá tin nhắn này?'))return;
    await restDelete('chat_messages',`id=eq.${row.dataset.messageId}`).catch(err=>alert(err.message));
    await loadCurrentMessages();await refreshCore();return;
  }
});
$('#join-group-btn').addEventListener('click',async()=>{
  if(!currentGroupId)return;
  await restInsert('chat_group_members',{group_id:currentGroupId,user_id:session.user.id,role:'member'}).catch(err=>alert(err.message));
  await refreshCore();renderMembers();setComposerState();await markCurrentRead().catch(()=>{});
});
$('#create-group-btn').addEventListener('click',openGroupModal);
document.querySelectorAll('[data-close-modal]').forEach(b=>b.addEventListener('click',()=>closeModal(b.dataset.closeModal)));
$('#group-form').addEventListener('submit',async e=>{
  e.preventDefault();
  try{
    const rows=await restInsert('chat_groups',{
      name:$('#group-name').value.trim(),description:$('#group-description').value.trim(),
      is_public:$('#group-public').checked,is_official:false,created_by:session.user.id
    });
    closeModal('group-modal');e.currentTarget.reset();$('#group-public').checked=true;
    await refreshCore({keepCurrent:false});
    if(rows?.[0]?.id)await selectGroup(rows[0].id);
  }catch(error){alert(error.message||'Không tạo được nhóm.');}
});
$('#invite-member-btn').addEventListener('click',()=>{renderInviteList();$('#invite-modal').hidden=false;});
$('#invite-list').addEventListener('click',async e=>{
  const b=e.target.closest('.invite-user');if(!b)return;b.disabled=true;
  try{await restInsert('chat_group_members',{group_id:currentGroupId,user_id:b.dataset.user,role:'member'});await refreshCore();renderMembers();renderInviteList();}
  catch(error){alert(error.message||'Không thêm được thành viên.');}
});
$('#mobile-chat-menu').addEventListener('click',()=>$('#chat-sidebar').classList.toggle('open'));
$('#notification-bell').addEventListener('click',()=>{location.href='home.html';});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&currentGroupId)markCurrentRead().catch(()=>{});});
window.addEventListener('beforeunload',()=>realtime?.stop());
bootstrap().catch(error=>{console.error(error);$('#message-stream').innerHTML='<div class="empty-compact">Không tải được Community.</div>';});
