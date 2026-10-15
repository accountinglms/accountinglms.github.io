import {activateFocusScope} from './focus-scope.js';
import {createChatDrafts} from './chat-drafts.js';
import {planChatUpdate,createChatUpdateQueue} from './chat-updates.js';
import {createChatImagePreviews} from './chat-images.js';
import {paintAvatar,hydrateAvatars,avatarMark} from './avatar.js';
import {
  ensureSession,getMyAccess,restGet,restInsert,restDelete,restUpsert,restRpc,restPatch,
  uploadChatFile,downloadChatFile,getChatFileBlob,createRealtimeClient
} from './common.js';

const $=s=>document.querySelector(s);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const initials=value=>String(value||'U').trim().split(/\s+/).filter(Boolean).map(x=>x[0]).slice(0,2).join('').toUpperCase()||'U';
const fmtTime=value=>new Date(value).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'});
const fmtSize=n=>{n=Number(n||0);if(n<1024)return n+' B';if(n<1024**2)return (n/1024).toFixed(1)+' KB';return (n/1024**2).toFixed(1)+' MB';};

let session=null,access=null;
let groups=[],memberships=[],reads=[],profiles=[],recentMessages=[],announcements=[],announcementReads=[];
let currentGroupId=null,currentMessages=[],currentReactions=[];
let canLoadOlder=false,loadingOlder=false;
let messageLoadVersion=0;
let pendingFile=null;
let pendingAttachment=null,chatDrafts=null,draftTimer=null;
let sendingMessage=false;
let realtime=null;
let replyTo=null,editingId=null,lastTypingSent=0,peerReadAt=null;
const normalizeText=value=>String(value||'').normalize('NFC');
const safeImageMime=/^image\/(png|jpeg|webp|gif)$/i;
const readWrites=new Map(),messageMarkup=new WeakMap();
const imagePreviews=createChatImagePreviews($('#message-stream'),getChatFileBlob);
const chatUpdates=createChatUpdateQueue(refreshChatChanges,{
  isPaused:()=>document.hidden||loadingOlder,
  onError:error=>{console.error(error);$('#connection-state').textContent='Chưa đồng bộ · đang chờ kết nối';$('#connection-state').classList.remove('live');}
});

function composerDraft(){
  return {text:$('#message-input').value,type:$('#message-type').value,replyTo,editingId,file:pendingFile,attachment:pendingAttachment};
}
function rememberDraft({flush=false}={}){
  if(!chatDrafts||!currentGroupId)return;
  chatDrafts.put(currentGroupId,composerDraft());
  clearTimeout(draftTimer);
  if(flush)chatDrafts.flush();else draftTimer=setTimeout(()=>chatDrafts.flush(),300);
}
function renderPendingAttachment(){
  const attachment=pendingFile||pendingAttachment;
  $('#pending-file').hidden=!attachment;
  $('#pending-file-name').textContent=attachment?`${attachment.name} · ${fmtSize(attachment.size)}${pendingFile?'':' · Chọn lại tệp để gửi'}`:'';
  document.dispatchEvent(new CustomEvent('lms:composer-draft',{detail:{file:pendingFile}}));
}
function restoreDraft(room){
  const draft=chatDrafts?.get(room)||{text:'',type:'text'};
  $('#message-input').value=draft.text;$('#message-type').value=draft.type;
  pendingFile=draft.file||null;pendingAttachment=draft.attachment||null;
  replyTo=draft.replyTo||null;editingId=draft.editingId||null;
  $('#file-input').value='';renderPendingAttachment();updateComposeBanner();
}

function profileMap(){return new Map(profiles.map(p=>[p.id,p]));}
function myMembership(groupId){return memberships.find(m=>m.group_id===groupId&&m.user_id===session.user.id)||null;}
function currentGroup(){return groups.find(g=>g.id===currentGroupId)||null;}
function canManage(groupId){
  if(groups.find(g=>g.id===groupId)?.kind==='direct')return false;
  const m=myMembership(groupId);
  return access?.editor===true || ['owner','admin'].includes(m?.role);
}
let unreadCounts=[];
function unreadInfo(){
  const byGroup=new Map(unreadCounts.map(r=>[r.group_id,Number(r.unread_count)||0]));
  const chat=[...byGroup.values()].reduce((a,b)=>a+b,0);
  const readAnnouncements=new Set(announcementReads.map(r=>r.announcement_id));
  const admin=announcements.filter(a=>!readAnnouncements.has(a.id)).length;
  return {byGroup,chat,admin,total:chat+admin};
}
async function updateUnread(){
  unreadCounts=await restRpc('get_portal_unread_counts');
  renderGroups();renderHeader();
}
function renderHeader(){
  const me=profiles.find(p=>p.id===session.user.id);
  const name=me?.display_name||session.user.user_metadata?.display_name||session.user.email?.split('@')[0]||'Member';
  $('#portal-user-name').textContent=name;
  // Keep the existing image node when realtime updates the header.
  paintAvatar($('#portal-avatar'),me,name).catch(()=>{});
  const u=unreadInfo();
  const badge=$('#global-notification-count');
  badge.hidden=!u.total;badge.textContent=u.total>99?'99+':String(u.total);
}
function renderGroups(){
  const root=$('#chat-groups');
  const unread=unreadInfo().byGroup;
  const groupRooms=groups.filter(g=>g.kind!=='direct');
  if(!groupRooms.length){root.innerHTML='<div class="empty-compact">Chưa có nhóm nào.</div>';return;}
  root.innerHTML=groupRooms.map(g=>{
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
    return `<div class="member">${avatarMark(p,{className:'portal-avatar',name})}<div><strong>${esc(name)}</strong><span>${esc(m.role)}</span></div><button class="btn" type="button" data-profile-user="${esc(m.user_id)}" title="Xem hồ sơ">Hồ sơ</button></div>`;
  }).join('')||'<div class="empty-compact">Chưa có thành viên.</div>';
  $('#group-manage-tools').hidden=!canManage(currentGroupId);
  hydrateAvatars(root,profiles);
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
  if(!currentMessages.length){
    const group=currentGroup();
    const isDirect=group?.kind==='direct';
    const peerId=isDirect?(group.direct_low===session.user.id?group.direct_high:group.direct_low):null;
    const peerName=profiles.find(p=>p.id===peerId)?.display_name||'thành viên này';
    root.innerHTML=`<section class="chat-empty-state" aria-label="Bắt đầu cuộc trò chuyện">
      <div class="chat-empty-inner">
        <span class="chat-empty-symbol" aria-hidden="true">${isDirect?'✉':'#'}</span>
        <h2>${isDirect?'Bắt đầu trò chuyện với '+esc(peerName):'Chào mừng đến '+esc(group?.name||'nhóm học tập')}</h2>
        <p>${isDirect?'Đây là cuộc trò chuyện riêng giữa hai người.':'Đây là không gian để trao đổi kiến thức, hỏi bài và chia sẻ tài liệu.'} Cuộc trò chuyện sẽ xuất hiện ở đây khi có tin nhắn đầu tiên.</p>
        ${myMembership(currentGroupId)?'<button class="btn primary" type="button" data-compose-focus>Viết tin nhắn đầu tiên →</button>':'<p>Tham gia nhóm để bắt đầu trao đổi.</p>'}
      </div>
    </section>`;
    return;
  }
  const pmap=profileMap(),agg=aggregateReactions();
  const wasNearBottom=root.scrollHeight-root.scrollTop-root.clientHeight<160;
  const anchor=[...root.querySelectorAll('[data-message-id]')].find(row=>row.getBoundingClientRect().bottom>root.getBoundingClientRect().top);
  const anchorTop=anchor?.getBoundingClientRect().top;
  const direct=currentGroup()?.kind==='direct';
  const rendered=currentMessages.map(msg=>{
    const p=pmap.get(msg.sender_id);const name=p?.display_name||(msg.sender_id===session.user.id?'Bạn':'Member');
    const reactions=[...agg.values()].filter(x=>x.message_id===msg.id);
    const deleted=Boolean(msg.deleted_at);
    const original=msg.reply_to?currentMessages.find(m=>m.id===msg.reply_to):null;
    const replied=msg.reply_to?'<div class="chat-replied">↪ '+esc(original?.body?.slice(0,135)||'Tin nhắn được trả lời')+'</div>':'';
    return `<article class="message-row ${msg.sender_id===session.user.id?'own':''}" data-message-id="${msg.id}">
      ${avatarMark(p,{className:'message-avatar',name})}
      <div class="message-main">
        <div class="message-meta"><strong>${esc(name)}</strong><time>${esc(fmtTime(msg.created_at))}</time>${msg.message_type==='assignment'?'<span class="notice-kind">Bài tập</span>':''}</div>
        ${replied}
        <div class="message-body ${msg.message_type==='sticker'?'is-sticker':''}">${deleted?'<em style="color:var(--portal-muted)">Tin nhắn đã xoá</em>':esc(normalizeText(msg.body))}</div>
        ${msg.edited_at?'<span class="chat-edited">Đã chỉnh sửa</span>':''}
        ${direct&&msg.sender_id===session.user.id?'<span class="chat-delivery">✓ Đã gửi</span>':''}
        ${!deleted&&msg.attachment_path&&safeImageMime.test(msg.attachment_mime||'')?`<img class="chat-image-preview" data-preview-path="${esc(msg.attachment_path)}" data-preview-size="${Number(msg.attachment_size)||0}" alt="Ảnh từ ${esc(name)}" hidden>`:''}
         ${!deleted&&msg.attachment_path?`<button class="message-attachment" type="button" data-download="${esc(msg.attachment_path)}" data-name="${esc(msg.attachment_name||'file')}"><span>▣</span><span><strong>${esc(msg.attachment_name||'Tệp đính kèm')}</strong><br>${esc(fmtSize(msg.attachment_size))}</span></button>`:''}
        ${!deleted?`<div class="reaction-row">${reactions.map(r=>`<button class="reaction ${r.mine?'mine':''}" data-react="${esc(r.emoji)}" type="button">${esc(r.emoji)} ${r.count}</button>`).join('')}</div>
        <div class="message-actions"><button type="button" data-reply-message title="Trả lời">↪ Trả lời</button><button type="button" data-add-reaction="👍">👍</button><button type="button" data-add-reaction="❤️">❤️</button>${msg.sender_id===session.user.id?'<button type="button" data-edit-message>Sửa</button>':''}${msg.sender_id===session.user.id||canManage(currentGroupId)?'<button type="button" data-delete-message>Xoá</button>':''}</div>`:''}
      </div>
    </article>`;
  });
  const existing=new Map([...root.querySelectorAll(':scope > [data-message-id]')].map(row=>[row.dataset.messageId,row]));
  const retained=new Set(currentMessages.map(msg=>String(msg.id)));
  for(const child of [...root.children])if(!retained.has(child.dataset.messageId)&&child.id!=='older-messages-control')child.remove();
  let older=root.querySelector('#older-messages-control');
  if(canLoadOlder&&!older){older=document.createElement('div');older.id='older-messages-control';older.style.cssText='text-align:center;padding:8px';older.innerHTML='<button class="btn" id="load-older-messages" type="button">Tải tin nhắn cũ hơn</button>';root.prepend(older);}
  if(!canLoadOlder&&older){older.remove();older=null;}
  let cursor=older?older.nextElementSibling:root.firstElementChild;
  rendered.forEach((html,index)=>{
    let node=existing.get(String(currentMessages[index].id));
    if(!node||messageMarkup.get(node)!==html){
      const template=document.createElement('template');template.innerHTML=html.trim();
      const next=template.content.firstElementChild;messageMarkup.set(next,html);
      if(node){if(cursor===node)cursor=next;node.replaceWith(next);}
      node=next;hydrateAvatars(node,profiles);
    }
    if(node!==cursor)root.insertBefore(node,cursor);
    cursor=node.nextElementSibling;
  });
  renderReceipts();
  const renderRoom=currentGroupId;
  requestAnimationFrame(()=>{
    if(renderRoom!==currentGroupId)return;
    if(root.dataset.preserveScroll==='1')root.dataset.preserveScroll='';
    else if(wasNearBottom)root.scrollTop=root.scrollHeight;
    else if(anchor?.isConnected)root.scrollTop+=anchor.getBoundingClientRect().top-anchorTop;
    imagePreviews.attach();
  });
}
function renderReceipts(){
  const times=new Map(currentMessages.map(msg=>[String(msg.id),Date.parse(msg.created_at)]));
  for(const row of $('#message-stream').querySelectorAll('[data-message-id]')){
    const label=row.querySelector('.chat-delivery');
    if(label)label.textContent=peerReadAt&&times.get(row.dataset.messageId)<=Date.parse(peerReadAt)?'✓✓ Đã xem':'✓ Đã gửi';
  }
}

function setComposerState(){
  const joined=Boolean(myMembership(currentGroupId));
  $('#join-card').hidden=!currentGroupId||joined||!currentGroup()?.is_public;
  $('#composer-active').hidden=!joined;
}
async function markCurrentRead(){
  if(!currentGroupId||!myMembership(currentGroupId))return;
  const room=currentGroupId,last=currentMessages.at(-1)?.created_at;
  if(!last||Date.parse(reads.find(r=>r.group_id===room)?.last_read_at)>=Date.parse(last))return;
  if(readWrites.has(room)){await readWrites.get(room);if(currentGroupId===room)return markCurrentRead();return;}
  const task=(async()=>{
    await restUpsert('chat_reads',{group_id:room,user_id:session.user.id,last_read_at:last,updated_at:new Date().toISOString()},'group_id,user_id');
    const existing=reads.find(r=>r.group_id===room);
    if(existing){if(!(Date.parse(existing.last_read_at)>=Date.parse(last)))existing.last_read_at=last;}
    else reads.push({group_id:room,user_id:session.user.id,last_read_at:last});
    await updateUnread().catch(console.error);
  })();
  readWrites.set(room,task);
  try{await task;}finally{readWrites.delete(room);}
}
async function loadCurrentMessages({older=false}={}){
  if(!currentGroupId){currentMessages=[];currentReactions=[];renderMessages();return;}
  if(older&&(!canLoadOlder||loadingOlder))return;
  loadingOlder=true;
  const stream=$('#message-stream');
  const renderRoom=currentGroupId;
  const loadVersion=++messageLoadVersion;
  const stillCurrent=()=>renderRoom===currentGroupId&&loadVersion===messageLoadVersion;
  const heightBefore=stream.scrollHeight;
  const topBefore=stream.scrollTop;
  const oldest=older?currentMessages[0]?.id:null;
  try{
    const query=`select=*&group_id=eq.${encodeURIComponent(currentGroupId)}${oldest?`&id=lt.${encodeURIComponent(oldest)}`:''}&order=id.desc&limit=100`;
    const rows=await restGet('chat_messages',query);
    if(!stillCurrent())return;
    const ordered=[...rows].reverse();
    // If more than a page arrived while away, show a continuous latest page.
    const missedPage=!older&&rows.length===100&&currentMessages.length&&Number(ordered[0].id)>Number(currentMessages.at(-1).id);
    const retained=older?currentMessages:missedPage?[]:currentMessages.filter(msg=>rows.length&&Number(msg.id)<Number(ordered[0].id));
    const nextMessages=older?[...ordered,...retained]:[...retained,...ordered];
    const ids=ordered.map(m=>m.id),retainedIds=new Set(retained.map(m=>String(m.id)));
    const nextReactions=[...currentReactions.filter(row=>retainedIds.has(String(row.message_id))),
      ...(ids.length?await restGet('chat_message_reactions',`select=*&message_id=in.(${ids.join(',')})`):[])];
    if(!stillCurrent())return;
    let nextPeerReadAt=null;
    if(currentGroup()?.kind==='direct'){
      const rows=await restGet('chat_reads',`select=user_id,last_read_at&group_id=eq.${encodeURIComponent(renderRoom)}`);
      nextPeerReadAt=rows.find(r=>r.user_id!==session.user.id)?.last_read_at||null;
    }
    if(!stillCurrent())return;
    currentMessages=nextMessages;currentReactions=nextReactions;peerReadAt=nextPeerReadAt;
    if(older||!retained.length)canLoadOlder=rows.length===100;
    if(older)stream.dataset.preserveScroll='1';
    renderMessages();
    if(older)requestAnimationFrame(()=>{if(stillCurrent())stream.scrollTop=topBefore+stream.scrollHeight-heightBefore;});
    if(!older&&document.visibilityState==='visible')await markCurrentRead().catch(()=>{});
  }finally{if(stillCurrent())loadingOlder=false;chatUpdates.resume();}
}
async function selectGroup(id,{closeDrawer=true}={}){
  const g=groups.find(group=>group.id===id);
  if(!g)return;
  rememberDraft({flush:true});
  const changedRoom=id!==currentGroupId;
  if(changedRoom){imagePreviews.reset();currentMessages=[];currentReactions=[];peerReadAt=null;canLoadOlder=false;loadingOlder=false;$('#composer-status').textContent='';}
  currentGroupId=id;
  restoreDraft(id);
  const url=new URL(location.href);url.searchParams.set('group',id);history.replaceState(null,'',url);
  const direct=g.kind==='direct';
  const other=direct?(g.direct_low===session.user.id?g.direct_high:g.direct_low):null;
  const peer=other?profiles.find(p=>p.id===other):null;
  const roomName=direct?(peer?.display_name||'Thành viên LMS'):g.name;
  $('#room-title').textContent=direct?roomName:'# '+roomName;
  const badge=$('#chat-room-avatar');
  if(badge){
   if(direct&&peer){badge.dataset.avatarUser=peer.id;paintAvatar(badge,peer,roomName).catch(()=>{});}
   else{delete badge.dataset.avatarUser;badge.dataset.avatarToken='room';badge.style.backgroundImage='';badge.classList.remove('has-avatar-image');badge.textContent=g.is_official?'◆':'#';}
  }
  $('#room-subtitle').textContent=direct?'Trò chuyện riêng · chỉ hai người tham gia':(g.description|| (g.is_public?'Nhóm công khai':'Nhóm riêng'));
  $('#info-title').textContent=direct?'Người đang trò chuyện':g.name;
  $('#info-description').textContent=direct?'Tin nhắn riêng chỉ hiển thị với người tham gia.':(g.description||'Không có mô tả.');
  $('#message-input').placeholder=direct?'Nhắn tin riêng…':'Nhắn vào nhóm…';
  $('#message-type').hidden=direct;
  document.dispatchEvent(new CustomEvent('lms:room',{detail:{groupId:g.id,kind:g.kind,peerId:other}}));
  renderGroups();renderMembers();setComposerState();
  if(changedRoom)$('#message-stream').innerHTML='<div class="empty-compact" role="status">Đang tải hội thoại…</div>';
  await loadCurrentMessages();
  if(currentGroupId===id){updateComposeBanner();if(closeDrawer)closeChatDrawer();}
}
async function refreshCore({keepCurrent=true}={}){
  const [
    nextGroups,nextMembers,nextReads,nextRecent,nextProfiles,nextAnnouncements,nextAnnouncementReads,nextUnreadCounts
  ]=await Promise.all([
    restGet('chat_groups','select=*&order=is_official.desc,updated_at.desc'),
    restGet('chat_group_members','select=group_id,user_id,role,joined_at'),
    restGet('chat_reads',`select=*&user_id=eq.${encodeURIComponent(session.user.id)}`),
    restGet('chat_messages','select=id,group_id,sender_id,body,attachment_name,created_at&order=created_at.desc&limit=500'),
    restGet('profiles','select=id,display_name,avatar_path'),
    restGet('announcements','select=id,status,published_at,created_at&status=eq.published&order=published_at.desc.nullslast&limit=50'),
    restGet('announcement_reads',`select=announcement_id,read_at&user_id=eq.${encodeURIComponent(session.user.id)}`),
    restRpc('get_portal_unread_counts')
  ]);
  groups=nextGroups;memberships=nextMembers;reads=nextReads;recentMessages=nextRecent;profiles=nextProfiles;announcements=nextAnnouncements;announcementReads=nextAnnouncementReads;unreadCounts=nextUnreadCounts;
  renderHeader();renderGroups();
  if(keepCurrent&&currentGroupId&&groups.some(g=>g.id===currentGroupId)){renderMembers();setComposerState();}
}
async function refreshCurrentChanges({messageIds=[],reactionIds=[],reactions=false}={}){
  if(!currentGroupId)return;
  if(loadingOlder){chatUpdates.push({messageIds,reactionIds,reactions});return;}
  const room=currentGroupId,version=++messageLoadVersion;
  const stillCurrent=()=>{
    if(room!==currentGroupId)return false;
    if(version===messageLoadVersion)return true;
    chatUpdates.push({messageIds,reactionIds,reactions});return false;
  };
  let changed=[];
  // Bound URL size during a busy burst; each query still goes through RLS.
  for(let i=0;i<messageIds.length;i+=100)
    changed.push(...await restGet('chat_messages',`select=*&group_id=eq.${encodeURIComponent(room)}&id=in.(${messageIds.slice(i,i+100).join(',')})`));
  if(!stillCurrent())return;
  const touched=new Set(messageIds.map(String));
  const nextMessages=[...currentMessages.filter(msg=>!touched.has(String(msg.id))),...changed].sort((a,b)=>Number(a.id)-Number(b.id));
  const loadedIds=new Set(nextMessages.map(msg=>String(msg.id)));
  const ids=reactions?[...loadedIds]:[...new Set([...changed.map(msg=>String(msg.id)),...reactionIds.filter(id=>loadedIds.has(String(id)))])];
  const nextReactions=[];
  for(let i=0;i<ids.length;i+=100)
    nextReactions.push(...await restGet('chat_message_reactions',`select=*&message_id=in.(${ids.slice(i,i+100).join(',')})`));
  if(!stillCurrent())return;
  currentMessages=nextMessages;
  const reactionTouched=new Set([...ids.map(String),...touched]);
  currentReactions=reactions?nextReactions:[...currentReactions.filter(row=>!reactionTouched.has(String(row.message_id))),...nextReactions];
  renderMessages();updateComposeBanner();
  if(messageIds.length&&!document.hidden)await markCurrentRead().catch(console.warn);
}
async function refreshChatChanges(batch){
  if(batch.core)await refreshCore();
  if(batch.messages){
    await loadCurrentMessages();
    if(batch.messageIds.length||batch.reactionIds.length||batch.reactions)await refreshCurrentChanges(batch);
  }
  else if(batch.messageIds.length||batch.reactionIds.length||batch.reactions)await refreshCurrentChanges(batch);
  else if(batch.render)renderMessages();
  if(batch.summaries&&!batch.core){
    recentMessages=await restGet('chat_messages','select=id,group_id,sender_id,body,attachment_name,created_at&order=created_at.desc&limit=500');
    renderGroups();
  }
  if((batch.summaries||batch.unread)&&!batch.core)await updateUnread();
  $('#connection-state').textContent='Realtime · đã đồng bộ';
  $('#connection-state').classList.add('live');
}
function scheduleRefresh(payload){
  const plan=planChatUpdate(payload,{roomId:currentGroupId,messageIds:currentMessages.map(msg=>msg.id)});
  if(plan.read){
    const row=plan.read;
    if(row.user_id===session.user.id&&row.group_id){
      const existing=reads.find(read=>read.group_id===row.group_id);
      if(row.last_read_at&&!(Date.parse(existing?.last_read_at)>=Date.parse(row.last_read_at))){
        if(existing)existing.last_read_at=row.last_read_at;else reads.push(row);
        chatUpdates.push({unread:true});
      }
    }else if(row.group_id===currentGroupId&&currentGroup()?.kind==='direct'){
      if(plan.readDeleted)peerReadAt=null;
      else if(row.last_read_at&&!(Date.parse(peerReadAt)>=Date.parse(row.last_read_at)))peerReadAt=row.last_read_at;
      renderReceipts();
    }
    return;
  }
  chatUpdates.push(plan);
}
function updateComposeBanner(){
  const panel=$('#compose-context');
  if(!panel)return;
  const related=currentMessages.find(m=>m.id===(editingId||replyTo));
  panel.hidden=!(editingId||replyTo);
  if(editingId||replyTo){
    $('#compose-context-label').textContent=editingId?'Chỉnh sửa tin nhắn':'Trả lời tin nhắn';
    $('#compose-context-text').textContent=related?.body?.slice(0,145)||'Nội dung trước đó';
  }
  const send=$('#send-btn');if(send)send.textContent=editingId?'Lưu sửa':'Gửi';
}
async function sendMessage({sticker=null}={}){
  if(sendingMessage||!currentGroupId||!myMembership(currentGroupId))return;
  const input=$('#message-input'),body=normalizeText(sticker||input.value.trim());
  if(!sticker&&pendingAttachment&&!pendingFile){$('#composer-status').textContent='Chọn lại tệp đính kèm hoặc bỏ tệp trước khi gửi.';return;}
  if(!body&&!pendingFile)return;
  rememberDraft({flush:true});
  sendingMessage=true;
  const btn=$('#send-btn'),emojiButton=$('#emoji-btn');btn.disabled=true;emojiButton.disabled=true;
  const composingRoom=currentGroupId,composingDraft=composerDraft(),composingType=$('#message-type').value;
  const composingEdit=sticker?null:editingId,composingReply=editingId?null:replyTo,composingFile=sticker||editingId?null:pendingFile;
  $('#composer-status').textContent='Đang gửi…';
  try{
    let persisted=[];
    if(composingEdit){
      if(!body)throw new Error('Nội dung không được để trống.');
      persisted=await restPatch('chat_messages','id=eq.'+composingEdit+'&sender_id=eq.'+encodeURIComponent(session.user.id),{body});
    }else{
      let uploaded=null;
      if(composingFile)uploaded=await uploadChatFile(composingRoom,composingFile);
      const nonce=crypto.randomUUID();
      persisted=await restInsert('chat_messages',{
        group_id:composingRoom,sender_id:session.user.id,body,
        message_type:sticker?'sticker':composingType,
        reply_to:composingReply,client_nonce:nonce,
        attachment_path:uploaded?.storagePath||null,
        attachment_name:uploaded?.name||null,
        attachment_mime:uploaded?.mime||null,
        attachment_size:uploaded?.size||null
      });
    }
    if(composingRoom===currentGroupId)rememberDraft();
    chatDrafts?.consume(composingRoom,{...composingDraft,file:composingFile,replyTo:composingReply,editingId:composingEdit},{sticker:Boolean(sticker)});
    if(composingRoom===currentGroupId){
      restoreDraft(composingRoom);
      // Reuse the persisted representation; a later refresh failure must not invite a duplicate.
      if(persisted.length){
        // A response started before this write must not erase the new representation.
        messageLoadVersion++;
        if(loadingOlder){loadingOlder=false;chatUpdates.push({messages:true});}
        const ids=new Set(persisted.map(msg=>String(msg.id)));
        currentMessages=[...currentMessages.filter(msg=>!ids.has(String(msg.id))),...persisted].sort((a,b)=>Number(a.id)-Number(b.id));
        renderMessages();await markCurrentRead().catch(console.warn);
      }else await loadCurrentMessages().catch(console.warn);
    }
    chatUpdates.push({summaries:true});
    if(composingRoom===currentGroupId)$('#composer-status').textContent='';
  }catch(error){$('#composer-status').textContent='Chưa gửi được'+(composingRoom===currentGroupId?'':` trong ${groups.find(g=>g.id===composingRoom)?.name||'hội thoại trước'}`)+'. '+(error.message||'Vui lòng thử lại.');}
  finally{sendingMessage=false;btn.disabled=false;emojiButton.disabled=false;}
}
async function toggleReaction(messageId,emoji){
  const mine=currentReactions.find(r=>String(r.message_id)===String(messageId)&&r.user_id===session.user.id&&r.emoji===emoji);
  if(mine)await restDelete('chat_message_reactions',`message_id=eq.${messageId}&user_id=eq.${encodeURIComponent(session.user.id)}&emoji=eq.${encodeURIComponent(emoji)}`);
  else await restInsert('chat_message_reactions',{message_id:Number(messageId),user_id:session.user.id,emoji});
  await refreshCurrentChanges({reactionIds:[String(messageId)]});
}
const modalScopes=new Map();
function openModal(id){
  const el=document.getElementById(id);
  if(!el.hidden)return;
  el.hidden=false;
  modalScopes.set(id,activateFocusScope(el,{onEscape:()=>closeModal(id)}));
}
function openGroupModal(){openModal('group-modal');}
function closeModal(id){const el=document.getElementById(id);if(el)el.hidden=true;modalScopes.get(id)?.();modalScopes.delete(id);}
function renderInviteList(){
  const root=$('#invite-list');
  const members=new Set(memberships.filter(m=>m.group_id===currentGroupId).map(m=>m.user_id));
  const available=profiles.filter(p=>!members.has(p.id));
  root.innerHTML=available.length?available.map(p=>`<div class="member"><span class="portal-avatar">${esc(initials(p.display_name||'M'))}</span><div style="flex:1"><strong>${esc(p.display_name||'Member')}</strong><span>${esc(p.id.slice(0,8))}</span></div><button class="btn invite-user" type="button" data-user="${p.id}">Thêm</button></div>`).join(''):'<div class="empty-compact">Tất cả members đã ở trong nhóm.</div>';
}
async function bootstrap(){
  try{session=await ensureSession();access=await getMyAccess(session);}
  catch{location.replace('index.html?returnTo='+encodeURIComponent(location.pathname.split('/').pop()+location.search));return;}
  let draftStorage;try{draftStorage=localStorage;}catch{}
  chatDrafts=createChatDrafts(session.user.id,draftStorage);
  await refreshCore({keepCurrent:false});
  const requested=new URLSearchParams(location.search).get('group');
  const myGroups=groups.filter(g=>myMembership(g.id));
  const first=(requested&&groups.some(g=>g.id===requested)?requested:null)||myGroups[0]?.id||groups[0]?.id||null;
  if(first)await selectGroup(first,{closeDrawer:false});
  let connectedOnce=false;
  realtime=createRealtimeClient(session,[
    {table:'chat_messages',event:'*'},
    {table:'chat_message_reactions',event:'*'},
    {table:'chat_reads',event:'*'},
    {table:'chat_groups',event:'*'},
    {table:'chat_group_members',event:'*'},
    {table:'profiles',event:'UPDATE'},
    {table:'announcements',event:'*'}
  ],scheduleRefresh,status=>{
    const labels={connected:'Realtime · đã kết nối',connecting:'Đang kết nối…',disconnected:'Mất kết nối · đang thử lại','subscription-error':'Không thể đăng ký nhận tin','auth-error':'Phiên Realtime hết hạn'};
    $('#connection-state').textContent=labels[status]||'Đang kết nối…';
    $('#connection-state').classList.toggle('live',status==='connected');
    if(status==='connected'){if(connectedOnce)chatUpdates.push({core:true,messages:true});connectedOnce=true;}
  });
}
$('#chat-groups').addEventListener('click',e=>{const b=e.target.closest('[data-group]');if(b)selectGroup(b.dataset.group).catch(console.error);});
$('#send-btn').addEventListener('click',()=>sendMessage());
$('#message-input').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();sendMessage();}});
$('#message-input').addEventListener('input',()=>rememberDraft());
$('#message-type').addEventListener('change',()=>rememberDraft());
$('#file-input').addEventListener('change',e=>{
  pendingFile=e.target.files?.[0]||null;
  if(pendingFile&&pendingFile.size>20*1024*1024){alert('File tối đa 20 MB.');pendingFile=null;e.target.value='';}
  pendingAttachment=null;renderPendingAttachment();rememberDraft();
});
$('#remove-pending-file').addEventListener('click',()=>{pendingFile=null;pendingAttachment=null;$('#file-input').value='';renderPendingAttachment();rememberDraft();});
// Rich emoji and sticker picker is provided by community-experience.js.
$('#message-stream').addEventListener('click',async e=>{
  const preview=e.target.closest('.chat-image-preview');
  if(preview?.src){window.open(preview.src,'_blank','noopener');return;}
  if(e.target.closest('[data-compose-focus]')){
    $('#message-input')?.focus();
    return;
  }
  if(e.target.closest('#load-older-messages')){await loadCurrentMessages({older:true}).catch(err=>alert(err.message));return;}
  const download=e.target.closest('[data-download]');
  if(download){await downloadChatFile(download.dataset.download,download.dataset.name).catch(err=>alert(err.message));return;}
  const row=e.target.closest('[data-message-id]');if(!row)return;
  const msg=currentMessages.find(m=>String(m.id)===row.dataset.messageId);
  if(msg&&e.target.closest('[data-reply-message]')){
    replyTo=msg.id;editingId=null;updateComposeBanner();rememberDraft();$('#message-input').focus();return;
  }
  if(msg&&msg.sender_id===session.user.id&&e.target.closest('[data-edit-message]')){
    editingId=msg.id;replyTo=null;$('#message-input').value=msg.body||'';
    updateComposeBanner();rememberDraft();$('#message-input').focus();return;
  }
  const reaction=e.target.closest('[data-react],[data-add-reaction]');
  if(reaction){await toggleReaction(row.dataset.messageId,reaction.dataset.react||reaction.dataset.addReaction).catch(err=>alert(err.message));return;}
  if(e.target.closest('[data-delete-message]')){
    if(!confirm('Xoá tin nhắn này?'))return;
    await restDelete('chat_messages',`id=eq.${row.dataset.messageId}`).catch(err=>alert(err.message));
    await refreshCurrentChanges({messageIds:[row.dataset.messageId]});chatUpdates.push({summaries:true});return;
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
  const form=e.currentTarget;
  const button=form.querySelector('[type=submit]');
  if(button.disabled)return;button.disabled=true;
  try{
    const groupId=await restRpc('create_study_group',{
      p_name:$('#group-name').value.trim(),p_description:$('#group-description').value.trim(),
      p_public:$('#group-public').checked
    });
    closeModal('group-modal');form.reset();$('#group-public').checked=true;
    await refreshCore({keepCurrent:false});
    if(groupId)await selectGroup(groupId);
  }catch(error){alert(error.message||'Không tạo được nhóm.');}
  finally{button.disabled=false;}
});
$('#invite-member-btn').addEventListener('click',()=>{renderInviteList();openModal('invite-modal');});
$('#invite-list').addEventListener('click',async e=>{
  const b=e.target.closest('.invite-user');if(!b)return;b.disabled=true;
  try{await restInsert('chat_group_members',{group_id:currentGroupId,user_id:b.dataset.user,role:'member'});await refreshCore();renderMembers();renderInviteList();}
  catch(error){alert(error.message||'Không thêm được thành viên.');}
});
document.addEventListener('lms:open-room',async event=>{
  const id=event.detail?.id;if(!id)return;
  try{await refreshCore();await selectGroup(id);}catch(err){alert(err.message||'Không mở được cuộc trò chuyện.');}
});
document.addEventListener('lms:send-sticker',e=>{if(e.detail?.emoji)sendMessage({sticker:e.detail.emoji}).catch(console.warn);});
document.addEventListener('lms:refresh-chat',()=>chatUpdates.push({core:true,messages:true}));
document.addEventListener('lms:load-older',()=>{if(canLoadOlder&&!loadingOlder)loadCurrentMessages({older:true}).catch(console.warn);});
document.addEventListener('lms:jump-message',async e=>{
  const id=e.detail?.id;
  if(!Number.isSafeInteger(id)||!currentGroupId)return;
  let tries=0;
  while(!currentMessages.some(m=>m.id===id)&&canLoadOlder&&tries++<20)
    await loadCurrentMessages({older:true}).catch(()=>{});
  const item=document.querySelector('[data-message-id="'+id+'"]');
  if(item){item.scrollIntoView({block:'center',behavior:'smooth'});item.classList.add('highlight-message');setTimeout(()=>item.classList.remove('highlight-message'),2600);}
  else alert('Tin nhắn nằm ngoài phạm vi lịch sử đã tải.');
});
document.addEventListener('lms:attach-file',e=>{
  const file=e.detail?.file;if(!file)return;
  if(file.size>20*1024*1024){alert('Tệp tối đa 20 MB.');return;}
  pendingFile=file;
  pendingAttachment=null;renderPendingAttachment();rememberDraft();
});
$('#compose-context-close')?.addEventListener('click',()=>{editingId=null;replyTo=null;updateComposeBanner();rememberDraft();});
const chatMobile=window.matchMedia('(max-width:700px)');
let chatDrawerScope=null;
function closeChatDrawer(){
  const drawer=$('#chat-sidebar');drawer.classList.remove('open');
  chatDrawerScope?.();chatDrawerScope=null;
  drawer.removeAttribute('role');drawer.removeAttribute('aria-modal');
  drawer.inert=chatMobile.matches;
  $('#mobile-chat-menu').setAttribute('aria-expanded','false');
}
function openChatDrawer(){
  if(!chatMobile.matches||chatDrawerScope)return;
  const drawer=$('#chat-sidebar');drawer.inert=false;drawer.classList.add('open');
  drawer.setAttribute('role','dialog');drawer.setAttribute('aria-modal','true');
  $('#mobile-chat-menu').setAttribute('aria-expanded','true');
  chatDrawerScope=activateFocusScope(drawer,{onEscape:closeChatDrawer,initialFocus:$('#community-mobile-close')});
}
$('#mobile-chat-menu').addEventListener('click',()=>chatDrawerScope?closeChatDrawer():openChatDrawer());
$('#community-mobile-close').addEventListener('click',closeChatDrawer);
chatMobile.addEventListener('change',closeChatDrawer);
$('#chat-sidebar').inert=chatMobile.matches;
// Notification tray handled by community-experience.js.
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible'&&currentGroupId){
    chatUpdates.push({messages:true,summaries:true});chatUpdates.resume();
  }
});
window.addEventListener('pagehide',()=>rememberDraft({flush:true}));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')rememberDraft({flush:true});});
window.addEventListener('beforeunload',()=>{chatUpdates.stop();realtime?.stop();imagePreviews.reset();});
bootstrap().catch(error=>{console.error(error);$('#message-stream').innerHTML='<div class="empty-compact">Không tải được Community.</div>';});

document.addEventListener('lms:profile-image',e=>{const p=e.detail?.profile;if(!p)return;profiles=profiles.map(x=>x.id===p.id?{...x,...p}:x);renderHeader();renderMembers();renderMessages();});
