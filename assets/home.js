import {
  ensureSession,
  getMyAccess,
  restGet,
  restInsert,
  restPatch,
  createRealtimeClient
} from './common.js';

const $=s=>document.querySelector(s);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtPct=value=>Number.isFinite(Number(value))?`${Math.round(Number(value))}%`:'—';
const fmtDate=value=>value?new Date(value).toLocaleString('vi-VN',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'—';
const initials=value=>String(value||'U').trim().split(/\s+/).filter(Boolean).map(x=>x[0]).slice(0,2).join('').toUpperCase()||'U';

let session=null;
let access=null;
let subjects=[],chapters=[],lessons=[],exercises=[],attempts=[],progress=[],announcements=[],announcementReads=[];
let groups=[],memberships=[],chatReads=[],messages=[],profiles=[];
let realtime=null;

function setText(id,value){const el=$(id);if(el)el.textContent=value;}
function currentName(){
  const profile=profiles.find(p=>p.id===session?.user?.id);
  return profile?.display_name || session?.user?.user_metadata?.display_name || session?.user?.email?.split('@')[0] || 'Thành viên';
}
function passMarkFor(level){
  return level==='advanced'?50:55;
}
function safeTargetFor(level){
  const pass=passMarkFor(level);
  return pass+10;
}
function averageRecent(rows,count=5){
  const list=rows.slice(0,count).map(r=>Number(r.accuracy ?? (Number(r.total_questions)>0?Number(r.score)*100/Number(r.total_questions):NaN))).filter(Number.isFinite);
  return list.length?list.reduce((a,b)=>a+b,0)/list.length:null;
}
function unreadState(){
  const readAnnouncements=new Set(announcementReads.map(r=>r.announcement_id));
  const unreadAnnouncements=announcements.filter(a=>!readAnnouncements.has(a.id)).length;
  const readByGroup=new Map(chatReads.map(r=>[r.group_id,Date.parse(r.last_read_at||0)||0]));
  const joined=new Set(memberships.map(m=>m.group_id));
  const unreadByGroup=new Map();
  for(const m of messages){
    if(!joined.has(m.group_id) || m.sender_id===session.user.id) continue;
    const readAt=readByGroup.get(m.group_id)||0;
    if((Date.parse(m.created_at||0)||0)>readAt) unreadByGroup.set(m.group_id,(unreadByGroup.get(m.group_id)||0)+1);
  }
  const chatUnread=[...unreadByGroup.values()].reduce((a,b)=>a+b,0);
  return {unreadAnnouncements,chatUnread,total:unreadAnnouncements+chatUnread,unreadByGroup};
}
function renderHeader(){
  const name=currentName();
  setText('#portal-user-name',name);
  setText('#portal-avatar',initials(name));
  setText('#welcome-title',`Chào ${name}`);
}
function renderMetrics(){
  const avg=averageRecent(attempts);
  const starred=progress.reduce((sum,row)=>sum+(Array.isArray(row.bookmarks)?row.bookmarks.filter(Boolean).length:0),0);
  const unread=unreadState();
  setText('#metric-attempts',String(attempts.length));
  setText('#metric-average',avg==null?'—':fmtPct(avg));
  setText('#metric-starred',String(starred));
  setText('#metric-notifications',String(unread.total));
  const badge=$('#global-notification-count');
  if(badge){badge.hidden=!unread.total;badge.textContent=unread.total>99?'99+':String(unread.total);}
  if(!attempts.length){
    setText('#home-focus-copy','Hãy làm một bài đầu tiên để hệ thống bắt đầu xây lộ trình từ dữ liệu thật của bạn.');
    setText('#home-readiness','Chưa đủ dữ liệu');
    setText('#home-readiness-copy','Readiness chỉ được tính từ các lượt làm đã nộp.');
    return;
  }
  const latest=attempts[0];
  const level=subjects.find(s=>s.id===latest.context_snapshot?.subject_id)?.exam_level || 'certificate';
  const pass=passMarkFor(level),safe=safeTargetFor(level);
  if(avg>=safe){
    setText('#home-focus-copy',`Điểm gần đây đang ở vùng ổn định (${fmtPct(avg)}). Ưu tiên bài timed practice và duy trì độ chính xác.`);
    setText('#home-readiness','Đang ở vùng an toàn');
    setText('#home-readiness-copy',`Mức nội bộ ≥ ${safe}% tạo khoảng đệm trên pass mark chính thức ${pass}%.`);
  }else if(avg>=pass){
    setText('#home-focus-copy',`Bạn đang trên pass mark nhưng khoảng đệm còn mỏng. Ôn lại các chương sai nhiều trước khi tăng độ khó.`);
    setText('#home-readiness','Đạt ngưỡng pass, chưa ổn định');
    setText('#home-readiness-copy',`Điểm gần đây ${fmtPct(avg)}; mục tiêu nội bộ nên hướng tới khoảng ${safe}%.`);
  }else{
    setText('#home-focus-copy',`Điểm gần đây ${fmtPct(avg)} còn dưới pass mark. Ưu tiên sửa lỗ hổng theo chương trước khi làm thêm đề dài.`);
    setText('#home-readiness','Cần củng cố');
    setText('#home-readiness-copy',`Pass mark tham chiếu là ${pass}%. Mở Progress Plan để xem phần yếu và thứ tự ôn.`);
  }
}
function renderCatalog(){
  const root=$('#subject-catalog');
  if(!subjects.length){root.innerHTML='<div class="empty-compact">Chưa có môn học.</div>';return;}
  root.innerHTML=subjects.map(subject=>{
    const chs=chapters.filter(c=>c.subject_id===subject.id);
    const lessonCount=chs.reduce((n,c)=>n+lessons.filter(l=>l.chapter_id===c.id).length,0);
    const exerciseCount=chs.reduce((n,c)=>n+exercises.filter(e=>e.chapter_id===c.id).length,0);
    return `<details class="subject-row">
      <summary><strong>${esc(subject.title)}</strong><span>${chs.length} chương · ${lessonCount} tài liệu · ${exerciseCount} bài tập</span></summary>
      <div class="subject-content">
        ${chs.length?chs.map(ch=>{
          const ls=lessons.filter(l=>l.chapter_id===ch.id);
          const exs=exercises.filter(e=>e.chapter_id===ch.id);
          return `<div class="chapter-row"><div class="chapter-title">${esc(ch.title)}</div><div class="chapter-links">
            ${ls.length?`<a class="mini-link" href="lessons.html?chapter=${encodeURIComponent(ch.id)}">Tài liệu (${ls.length})</a>`:''}
            ${exs.length?`<a class="mini-link" href="index.html?exercise=${encodeURIComponent(exs[0].id)}">Bài tập (${exs.length})</a>`:''}
            ${!ls.length&&!exs.length?'<span class="mini-link">Chưa có nội dung</span>':''}
          </div></div>`;
        }).join(''):'<div class="empty-compact">Chưa có chương.</div>'}
      </div>
    </details>`;
  }).join('');
}
function kindLabel(kind){
  return ({update:'Update',maintenance:'Bảo trì',exam:'Kỳ thi',resource:'Tài liệu',general:'Thông báo'})[kind]||kind;
}
function renderAnnouncements(){
  const root=$('#announcement-list');
  if(!announcements.length){root.innerHTML='<div class="empty-compact">Chưa có thông báo mới.</div>';return;}
  const readSet=new Set(announcementReads.map(r=>r.announcement_id));
  root.innerHTML=announcements.slice(0,8).map(a=>`<article class="notice-row" data-announcement="${a.id}">
    <div class="notice-row-top"><span class="notice-kind">${esc(kindLabel(a.kind))}${readSet.has(a.id)?'':' · Mới'}</span><time>${esc(fmtDate(a.published_at||a.created_at))}</time></div>
    <h3>${esc(a.title)}</h3><p>${esc(a.body)}</p>
    ${readSet.has(a.id)?'':`<div style="margin-top:8px"><button class="btn mark-announcement-read" type="button" data-id="${a.id}">Đã đọc</button></div>`}
  </article>`).join('');
}
function renderChatPreview(){
  const root=$('#chat-preview');
  const unread=unreadState().unreadByGroup;
  const joinedIds=new Set(memberships.map(m=>m.group_id));
  const list=groups.filter(g=>joinedIds.has(g.id)).slice(0,6);
  if(!list.length){root.innerHTML='<div class="empty-compact">Bạn chưa tham gia nhóm chat nào.</div>';return;}
  root.innerHTML=list.map(g=>{
    const last=messages.find(m=>m.group_id===g.id);
    const count=unread.get(g.id)||0;
    return `<a class="notice-row" href="community.html?group=${encodeURIComponent(g.id)}">
      <div class="notice-row-top"><span class="notice-kind"># ${esc(g.name)}</span>${count?`<span class="chat-unread">${count>99?'99+':count}</span>`:''}</div>
      <p style="margin-top:6px">${last?esc(last.body||last.attachment_name||'Đã gửi một file'):'Chưa có tin nhắn.'}</p>
    </a>`;
  }).join('');
}
function renderMyFeedback(rows){
  const root=$('#my-feedback');
  if(!rows.length){root.innerHTML='<div class="empty-compact">Bạn chưa gửi góp ý nào.</div>';return;}
  root.innerHTML=rows.slice(0,6).map(f=>`<div class="feedback-row">
    <strong>${esc(f.subject)}</strong><small>${esc(f.category)} · ${esc(fmtDate(f.created_at))} · ${esc(f.status)}</small>
    <p>${esc(f.message)}</p>
    ${f.admin_reply?`<div class="admin-reply"><strong>Phản hồi từ admin</strong><p>${esc(f.admin_reply)}</p></div>`:''}
  </div>`).join('');
}
async function loadFeedback(){
  const rows=await restGet('feedback',`select=*&user_id=eq.${encodeURIComponent(session.user.id)}&order=created_at.desc&limit=20`);
  renderMyFeedback(rows);
}
async function markAnnouncementRead(id){
  if(announcementReads.some(r=>r.announcement_id===id))return;
  await restInsert('announcement_reads',{announcement_id:id,user_id:session.user.id});
  announcementReads.push({announcement_id:id,user_id:session.user.id,read_at:new Date().toISOString()});
  renderAnnouncements();renderMetrics();
}
function renderAdminFeedback(rows){
  const root=$('#admin-feedback');
  if(!rows.length){root.innerHTML='<div class="empty-compact">Không có góp ý nào.</div>';return;}
  const profileMap=new Map(profiles.map(p=>[p.id,p.display_name||'Member']));
  root.innerHTML=rows.map(f=>`<div class="feedback-row" data-feedback-id="${f.id}">
    <strong>${esc(f.subject)}</strong><small>${esc(profileMap.get(f.user_id)||f.user_id.slice(0,8))} · ${esc(f.category)} · ${esc(f.status)} · ${esc(fmtDate(f.created_at))}</small>
    <p>${esc(f.message)}</p>
    <label class="field" style="margin-top:9px"><span>Phản hồi</span><textarea class="admin-reply-input" maxlength="5000" placeholder="Nhập phản hồi cho thành viên…">${esc(f.admin_reply||'')}</textarea></label>
    <div class="form-actions"><button class="btn admin-feedback-save" type="button" data-id="${f.id}">Lưu phản hồi</button><button class="btn primary admin-feedback-resolve" type="button" data-id="${f.id}">Đánh dấu đã xử lý</button></div>
  </div>`).join('');
}
async function loadAdminFeedback(){
  if(!access?.editor)return;
  const rows=await restGet('feedback','select=*&order=created_at.desc&limit=50');
  renderAdminFeedback(rows);
}
function renderSubjectLevelAdmin(){
  const root=$('#subject-level-admin');
  if(!root)return;
  root.innerHTML=subjects.map(subject=>`<div class="feedback-row" style="display:flex;align-items:center;justify-content:space-between;gap:12px">
    <div><strong>${esc(subject.title)}</strong><small>ICAEW exam level</small></div>
    <select class="subject-level-select" data-subject="${esc(subject.id)}" style="min-height:34px;border:1px solid var(--portal-line);border-radius:7px;background:var(--portal-bg);color:var(--portal-ink);padding:0 8px">
      <option value="certificate" ${subject.exam_level==='certificate'?'selected':''}>Certificate</option>
      <option value="professional" ${subject.exam_level==='professional'?'selected':''}>Professional</option>
      <option value="advanced" ${subject.exam_level==='advanced'?'selected':''}>Advanced</option>
    </select>
  </div>`).join('');
}

async function bootstrap(){
  try{
    session=await ensureSession();
    access=await getMyAccess(session,true);
  }catch{
    location.replace('index.html');
    return;
  }
  try{
    [
      subjects,chapters,lessons,exercises,attempts,progress,announcements,announcementReads,
      groups,memberships,chatReads,messages,profiles
    ]=await Promise.all([
      restGet('subjects','select=*&is_active=eq.true&order=sort_order.asc'),
      restGet('chapters','select=*&is_active=eq.true&order=sort_order.asc'),
      restGet('lessons','select=id,chapter_id,title,summary,status,sort_order&status=eq.published&order=sort_order.asc'),
      restGet('exercises','select=id,chapter_id,title,question_count,sort_order&is_active=eq.true&order=sort_order.asc'),
      restGet('exercise_attempts',`select=score,total_questions,accuracy,completed_at,bookmarked_count,context_snapshot&user_id=eq.${encodeURIComponent(session.user.id)}&order=completed_at.desc&limit=100`),
      restGet('user_progress',`select=exercise_id,bookmarks&user_id=eq.${encodeURIComponent(session.user.id)}`),
      restGet('announcements','select=*&status=eq.published&order=published_at.desc.nullslast,created_at.desc&limit=20'),
      restGet('announcement_reads',`select=announcement_id,read_at&user_id=eq.${encodeURIComponent(session.user.id)}`),
      restGet('chat_groups','select=*&order=is_official.desc,updated_at.desc'),
      restGet('chat_group_members',`select=group_id,user_id,role&user_id=eq.${encodeURIComponent(session.user.id)}`),
      restGet('chat_reads',`select=group_id,last_read_at&user_id=eq.${encodeURIComponent(session.user.id)}`),
      restGet('chat_messages','select=id,group_id,sender_id,body,attachment_name,created_at&order=created_at.desc&limit=250'),
      restGet('profiles','select=id,display_name')
    ]);
  }catch(error){
    console.error(error);
  }
  renderHeader();renderCatalog();renderAnnouncements();renderChatPreview();renderMetrics();
  await loadFeedback().catch(console.error);
  if(access?.editor){
    $('#admin-home-panel').hidden=false;
    renderSubjectLevelAdmin();
    await loadAdminFeedback().catch(console.error);
  }
  realtime=createRealtimeClient(session,[
    {table:'chat_messages',event:'INSERT'},
    {table:'announcements',event:'*'},
    {table:'feedback',event:'*'}
  ],async payload=>{
    const table=payload?.data?.table || payload?.table;
    if(table==='chat_messages'){
      messages=await restGet('chat_messages','select=id,group_id,sender_id,body,attachment_name,created_at&order=created_at.desc&limit=250').catch(()=>messages);
      renderChatPreview();renderMetrics();
    }else if(table==='announcements'){
      announcements=await restGet('announcements','select=*&status=eq.published&order=published_at.desc.nullslast,created_at.desc&limit=20').catch(()=>announcements);
      renderAnnouncements();renderMetrics();
    }else if(table==='feedback'){
      await loadFeedback().catch(()=>{});
      if(access?.editor)await loadAdminFeedback().catch(()=>{});
    }
  });
}
$('#announcement-list').addEventListener('click',event=>{
  const btn=event.target.closest('.mark-announcement-read');
  if(btn)markAnnouncementRead(btn.dataset.id).catch(console.error);
});
$('#feedback-form').addEventListener('submit',async event=>{
  event.preventDefault();
  const status=$('#feedback-status');
  status.textContent='Đang gửi…';
  try{
    await restInsert('feedback',{
      user_id:session.user.id,
      category:$('#feedback-category').value,
      subject:$('#feedback-subject').value.trim(),
      message:$('#feedback-message').value.trim()
    });
    event.currentTarget.reset();
    status.textContent='Đã gửi tới admin.';
    await loadFeedback();
  }catch(error){status.textContent='Không gửi được: '+(error.message||'Lỗi');}
});
$('#announcement-form').addEventListener('submit',async event=>{
  event.preventDefault();
  const status=$('#announcement-status');
  status.textContent='Đang đăng…';
  try{
    await restInsert('announcements',{
      title:$('#announcement-title').value.trim(),
      body:$('#announcement-body').value.trim(),
      kind:$('#announcement-kind').value,
      status:'published',
      audience:'members',
      published_at:new Date().toISOString(),
      created_by:session.user.id,
      updated_by:session.user.id
    });
    event.currentTarget.reset();
    status.textContent='Đã gửi thông báo tới members.';
    announcements=await restGet('announcements','select=*&status=eq.published&order=published_at.desc.nullslast,created_at.desc&limit=20');
    renderAnnouncements();renderMetrics();
  }catch(error){status.textContent='Không đăng được: '+(error.message||'Lỗi');}
});
$('#subject-level-admin').addEventListener('change',async event=>{
  const select=event.target.closest('.subject-level-select');
  if(!select)return;
  select.disabled=true;
  try{
    await restPatch('subjects',`id=eq.${encodeURIComponent(select.dataset.subject)}`,{exam_level:select.value});
    const subject=subjects.find(item=>item.id===select.dataset.subject);
    if(subject)subject.exam_level=select.value;
    renderMetrics();
  }catch(error){
    alert(error.message||'Không cập nhật được cấp thi.');
  }finally{select.disabled=false;}
});

$('#admin-feedback').addEventListener('click',async event=>{
  const btn=event.target.closest('.admin-feedback-save,.admin-feedback-resolve');
  if(!btn)return;
  const row=btn.closest('[data-feedback-id]');
  const reply=row.querySelector('.admin-reply-input').value.trim();
  btn.disabled=true;
  try{
    await restPatch('feedback',`id=eq.${encodeURIComponent(btn.dataset.id)}`,{
      admin_reply:reply||null,
      status:btn.classList.contains('admin-feedback-resolve')?'resolved':'reviewing',
      replied_by:session.user.id,
      replied_at:reply?new Date().toISOString():null
    });
    await loadAdminFeedback();
  }catch(error){alert(error.message||'Không cập nhật được góp ý.');}
  finally{btn.disabled=false;}
});
window.addEventListener('beforeunload',()=>realtime?.stop());
bootstrap();
