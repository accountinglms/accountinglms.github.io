import {ensureSession,restGet,restRpc,createRealtimeClient} from './common.js';

// Friendship requests and 1-to-1 rooms are authoritative in Supabase.
// No friendship/contact state is stored in the browser.
const $ = s => document.querySelector(s);
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const initials = name => String(name || 'M').trim().split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase();
let session=null,people=[],friends=[],directRooms=[],view='groups',search='',loading=false;
let socialRealtime=null,refreshTimer=null;
const nameOf = uid => people.find(p=>p.id===uid)?.display_name || 'Thành viên LMS';
const otherId = room => room.direct_low===session?.user?.id?room.direct_high:room.direct_low;
const relation = uid => friends.find(x=>x.requester_id===uid||x.recipient_id===uid);
const otherFriendId = f => f.requester_id===session.user.id?f.recipient_id:f.requester_id;

function switchTab(tab){
  view=['groups','direct','people'].includes(tab)?tab:'groups';
  document.querySelectorAll('[data-social-tab]').forEach(btn=>{
    const active=btn.dataset.socialTab===view;
    btn.classList.toggle('active',active);
    btn.setAttribute('aria-selected',String(active));
  });
  $('#chat-groups').hidden=view!=='groups';
  $('#social-direct-list').hidden=view!=='direct';
  $('#social-people-list').hidden=view!=='people';
  render();
}
function renderDirect(){
  const root=$('#social-direct-list');
  if(!root)return;
  root.innerHTML=directRooms.length?directRooms.map(r=>{
    const other=otherId(r),name=nameOf(other);
    return '<button type="button" class="chat-group social-direct-room'+
      (new URLSearchParams(location.search).get('group')===r.id?' active':'')+
      '" data-social-room="'+esc(r.id)+'"><span class="chat-group-icon">'+esc(initials(name))+
      '</span><span class="chat-group-main"><strong>'+esc(name)+
      '</strong><span>Cuộc trò chuyện riêng tư</span></span></button>';
  }).join(''):'<div class="social-empty">Chưa có tin nhắn riêng. Vào Bạn bè để bắt đầu.</div>';
}
function renderPeople(){
  const root=$('#social-people-list');if(!root)return;
  const pending=friends.filter(f=>f.status==='pending'&&f.recipient_id===session.user.id);
  const mine=friends.filter(f=>f.status==='accepted');
  const other=people.filter(p=>p.id!==session.user.id&&
    (p.display_name||'Member').toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')));
  const renderPerson=p=>{
    const f=relation(p.id);const display=nameOf(p.id);
    let buttons='';
    if(f?.status==='accepted'){
      buttons='<button class="social-action primary" data-social-action="chat" data-user="'+esc(p.id)+'">Nhắn tin</button>'+
        '<button class="social-action" data-social-action="remove" data-user="'+esc(p.id)+'" title="Huỷ kết bạn">Huỷ bạn</button>';
    }else if(f?.status==='pending'&&f.recipient_id===session.user.id){
      buttons='<button class="social-action primary" data-social-action="accept" data-request="'+esc(f.id)+'">Đồng ý</button>'+
      '<button class="social-action" data-social-action="decline" data-request="'+esc(f.id)+'">Từ chối</button>';
    }else if(f?.status==='pending'){
      buttons='<span class="social-request-state">Đã gửi lời mời</span>';
    }else{
      buttons='<button class="social-action" data-social-action="add" data-user="'+esc(p.id)+'">+ Kết bạn</button>';
    }
    return '<article class="social-person"><span class="social-avatar">'+esc(initials(display))+'</span><div class="social-person-main"><strong>'+esc(display)+
      '</strong><div class="social-actions">'+buttons+'</div></div></article>';
  };
  const selected=new Set([...pending.map(otherFriendId),...mine.map(otherFriendId)]);
  const priority=[...other].sort((a,b)=>{
    const ax=selected.has(a.id)?0:1,bx=selected.has(b.id)?0:1;
    return ax-bx||nameOf(a.id).localeCompare(nameOf(b.id),'vi');
  });
  root.innerHTML='<div class="social-people-search"><input id="social-user-search" aria-label="Tìm thành viên LMS" placeholder="Tìm tên thành viên…" maxlength="80" value="'+esc(search)+'"></div>'+
    (pending.length?'<div class="social-section-caption">Lời mời đang chờ · '+pending.length+'</div>':'')+
    (priority.length?priority.map(renderPerson).join(''):'<div class="social-empty">Không tìm thấy thành viên phù hợp.</div>');
}
function render(){
  const notice=$('#social-pending-count');
  const count=friends.filter(f=>f.status==='pending'&&f.recipient_id===session?.user?.id).length;
  if(notice){notice.hidden=!count;notice.textContent=count>9?'9+':String(count);}
  if(view==='people')renderPeople();
  if(view==='direct')renderDirect();
}
async function refresh(){
  if(!session||loading)return;
  loading=true;
  try{
    const data=await Promise.all([
      restGet('social_friendships','select=*&order=created_at.desc&limit=500'),
      restGet('chat_groups','select=id,kind,direct_low,direct_high,updated_at&kind=eq.direct&order=updated_at.desc&limit=100'),
      restGet('profiles','select=id,display_name&order=display_name.asc&limit=500')
    ]);
    friends=data[0];directRooms=data[1];people=data[2];
    render();
  }catch(error){console.warn('Social inbox:',error);}
  finally{loading=false;}
}
function scheduleRefresh(){
  clearTimeout(refreshTimer);
  refreshTimer=setTimeout(()=>refresh().catch(console.warn),450);
}
async function performAction(btn){
  if(btn.disabled)return;
  const op=btn.dataset.socialAction;const uid=btn.dataset.user;const id=btn.dataset.request;
  if(op==='remove'&&!confirm('Huỷ kết bạn với thành viên này?'))return;
  btn.disabled=true;
  try{
    if(op==='add')await restRpc('request_friend',{p_recipient:uid});
    if(op==='accept'||op==='decline')await restRpc('respond_friend',{p_request:id,p_accept:op==='accept'});
    if(op==='remove')await restRpc('remove_friend',{p_friend:uid});
    if(op==='chat'){
      const group=await restRpc('start_direct_chat',{p_friend:uid});
      if(typeof group!=='string'||!group)throw new Error('Không tạo được cuộc trò chuyện.');
      location.href='community.html?group='+encodeURIComponent(group);
      return;
    }
    await refresh();
  }catch(error){alert(error.message||'Thao tác chưa thành công. Vui lòng thử lại.');}
  finally{btn.disabled=false;}
}
async function init(){
  session=await ensureSession();
  const panel=$('#social-tabs');
  if(!panel)return;
  const requested=new URLSearchParams(location.search).get('group');
  view=requested?'direct':'groups';
  panel.innerHTML='<button type="button" data-social-tab="groups" role="tab">Nhóm</button>'+
    '<button type="button" data-social-tab="direct" role="tab">Tin nhắn</button>'+
    '<button type="button" data-social-tab="people" role="tab">Bạn bè<span id="social-pending-count" hidden></span></button>';
  panel.addEventListener('click',e=>{const b=e.target.closest('[data-social-tab]');if(b)switchTab(b.dataset.socialTab);});
  $('#social-people-list').addEventListener('input',e=>{
    if(e.target.id!=='social-user-search')return;
    search=e.target.value;
    const pos=e.target.selectionStart;
    renderPeople();
    const input=$('#social-user-search');input.focus();input.setSelectionRange(pos,pos);
  });
  $('#social-people-list').addEventListener('click',e=>{
    const btn=e.target.closest('[data-social-action]');if(btn)performAction(btn).catch(console.error);
  });
  $('#social-direct-list').addEventListener('click',e=>{
    const room=e.target.closest('[data-social-room]');if(room)location.href='community.html?group='+encodeURIComponent(room.dataset.socialRoom);
  });
  await refresh();
  if(requested){
    switchTab(directRooms.some(r=>r.id===requested)?'direct':'groups');
  }else switchTab('groups');
  socialRealtime=createRealtimeClient(session,[
    {table:'social_friendships',event:'*'},
    {table:'chat_groups',event:'*'}
  ],scheduleRefresh);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')scheduleRefresh();});
  window.addEventListener('beforeunload',()=>{socialRealtime?.stop();clearTimeout(refreshTimer);});
}
init().catch(error=>console.warn('Social contacts unavailable:',error));
