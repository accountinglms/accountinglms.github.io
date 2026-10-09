import { ensureSession,getMyAccess,restGet } from './common.js';

const $=s=>document.querySelector(s);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const initials=value=>String(value||'U').trim().split(/\s+/).filter(Boolean).map(x=>x[0]).slice(0,2).join('').toUpperCase()||'U';
const pct=value=>Number.isFinite(Number(value))?`${Math.round(Number(value))}%`:'—';
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));

let session=null,access=null;
let subjects=[],chapters=[],exercises=[],attempts=[],profiles=[];
let activeSubjectId=null;

function passMark(level){return level==='advanced'?50:55;}
function safeTarget(level){return passMark(level)+10;}
function attemptAccuracy(a){
  const explicit=Number(a.accuracy);
  if(Number.isFinite(explicit))return explicit;
  const total=Number(a.total_questions||0),score=Number(a.score||0);
  return total>0?score*100/total:NaN;
}
function attemptSubjectId(a){
  if(a.context_snapshot?.subject_id)return a.context_snapshot.subject_id;
  const ex=exercises.find(e=>e.id===a.exercise_id);
  const ch=ex&&chapters.find(c=>c.id===ex.chapter_id);
  return ch?.subject_id||null;
}
function subjectAttempts(subjectId){
  return attempts.filter(a=>attemptSubjectId(a)===subjectId);
}
function recentWeighted(rows,n=5){
  const list=rows.slice(-n).map(attemptAccuracy).filter(Number.isFinite);
  if(!list.length)return null;
  let num=0,den=0;
  list.forEach((v,i)=>{const w=i+1;num+=v*w;den+=w;});
  return num/den;
}
function stdDev(values){
  if(values.length<2)return 0;
  const mean=values.reduce((a,b)=>a+b,0)/values.length;
  return Math.sqrt(values.reduce((s,v)=>s+(v-mean)**2,0)/values.length);
}
function latestByExercise(rows){
  const map=new Map();
  [...rows].sort((a,b)=>Date.parse(a.completed_at)-Date.parse(b.completed_at)).forEach(a=>map.set(a.exercise_id,a));
  return map;
}
function readiness(subject,rows){
  const level=subject?.exam_level||'certificate';
  const pass=passMark(level);
  const recent=recentWeighted(rows);
  if(recent==null)return {score:null,recent:null,coverage:0,consistency:0,pass,safe:safeTarget(level)};
  const subjectExerciseIds=new Set(
    exercises.filter(e=>chapters.some(c=>c.id===e.chapter_id&&c.subject_id===subject.id)).map(e=>e.id)
  );
  const latest=latestByExercise(rows);
  const covered=[...subjectExerciseIds].filter(id=>latest.has(id)).length;
  const coverage=subjectExerciseIds.size?covered/subjectExerciseIds.size:Math.min(1,latest.size/3);
  const values=rows.slice(-6).map(attemptAccuracy).filter(Number.isFinite);
  const deviation=stdDev(values);
  const consistency=clamp(100-deviation*2.5,45,100);
  const score=clamp(recent*.72+coverage*100*.18+consistency*.10,0,100);
  return {score,recent,coverage:coverage*100,consistency,pass,safe:safeTarget(level)};
}
function chapterStats(subjectId,rows){
  const latest=latestByExercise(rows);
  const result=[];
  for(const ch of chapters.filter(c=>c.subject_id===subjectId)){
    const exIds=exercises.filter(e=>e.chapter_id===ch.id).map(e=>e.id);
    const latestRows=exIds.map(id=>latest.get(id)).filter(Boolean);
    if(!latestRows.length){result.push({chapter:ch,accuracy:null,wrong:0,attempted:0,totalExercises:exIds.length,repeatWrong:0,starred:0});continue;}
    let correct=0,answered=0,wrong=0,starred=0;
    for(const a of latestRows){
      correct+=Number(a.correct_count||a.score||0);
      wrong+=Number(a.wrong_count||0);
      answered+=Number(a.correct_count||0)+Number(a.wrong_count||0);
      starred+=Number(a.bookmarked_count||0);
    }
    const allForChapter=rows.filter(a=>exIds.includes(a.exercise_id));
    const repeatWrong=allForChapter.reduce((sum,a)=>sum+Number(a.wrong_count||0),0);
    result.push({
      chapter:ch,
      accuracy:answered?correct*100/answered:latestRows.map(attemptAccuracy).filter(Number.isFinite).reduce((a,b)=>a+b,0)/latestRows.length,
      wrong,attempted:latestRows.length,totalExercises:exIds.length,repeatWrong,starred
    });
  }
  return result;
}
function estimateStudy(stats,pass,safe){
  let minutes=0;
  for(const s of stats){
    if(s.accuracy==null){minutes+=75;continue;}
    if(s.accuracy<pass)minutes+=120+Math.min(60,s.repeatWrong*5);
    else if(s.accuracy<safe)minutes+=75+Math.min(30,s.wrong*5);
    else if(s.wrong>0)minutes+=35;
  }
  return Math.max(stats.length?45:0,Math.round(minutes/15)*15);
}
function renderSubjectSwitch(){
  const root=$('#subject-switch');
  root.innerHTML=subjects.map(s=>`<button type="button" data-subject="${s.id}" class="${s.id===activeSubjectId?'active':''}">${esc(s.title)}</button>`).join('');
}
function renderChart(rows,pass,safe){
  const root=$('#trend-chart');
  if(!rows.length){root.innerHTML='<div class="empty-compact">Chưa có lượt làm nào cho môn này.</div>';return;}
  const data=rows.slice(-16);
  const w=760,h=280,pad={l:42,r:18,t:18,b:34};
  const iw=w-pad.l-pad.r,ih=h-pad.t-pad.b;
  const x=i=>pad.l+(data.length===1?iw/2:i*iw/(data.length-1));
  const y=v=>pad.t+(100-clamp(v,0,100))*ih/100;
  const points=data.map((a,i)=>({x:x(i),y:y(attemptAccuracy(a)),v:attemptAccuracy(a),date:a.completed_at}));
  const line=points.map((p,i)=>`${i?'L':'M'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const area=`${line} L ${points.at(-1).x.toFixed(1)} ${(pad.t+ih).toFixed(1)} L ${points[0].x.toFixed(1)} ${(pad.t+ih).toFixed(1)} Z`;
  const grid=[0,25,50,75,100].map(v=>`<line class="chart-grid" x1="${pad.l}" x2="${w-pad.r}" y1="${y(v)}" y2="${y(v)}"/><text class="chart-label" x="4" y="${y(v)+3}">${v}</text>`).join('');
  const dots=points.map((p,i)=>`<circle class="chart-dot" cx="${p.x}" cy="${p.y}" r="4"><title>Lượt ${data.length-data.length+i+1}: ${Math.round(p.v)}%</title></circle>`).join('');
  const dateLabels=points.filter((_,i)=>i===0||i===points.length-1||i===Math.floor(points.length/2)).map(p=>`<text class="chart-label" x="${p.x}" y="${h-8}" text-anchor="middle">${new Date(p.date).toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit'})}</text>`).join('');
  root.innerHTML=`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Biểu đồ xu hướng điểm">
    ${grid}
    <line class="chart-pass" x1="${pad.l}" x2="${w-pad.r}" y1="${y(pass)}" y2="${y(pass)}"/><text class="chart-label" x="${w-pad.r-2}" y="${y(pass)-5}" text-anchor="end">Pass ${pass}%</text>
    <line class="chart-safe" x1="${pad.l}" x2="${w-pad.r}" y1="${y(safe)}" y2="${y(safe)}"/><text class="chart-label" x="${w-pad.r-2}" y="${y(safe)-5}" text-anchor="end">Safe ${safe}%</text>
    <path class="chart-area" d="${area}"/><path class="chart-line" d="${line}"/>${dots}${dateLabels}
  </svg>`;
}
function priorityFor(stat,pass,safe){
  if(stat.accuracy==null||stat.accuracy<pass)return 'high';
  if(stat.accuracy<safe||stat.repeatWrong>=4)return 'medium';
  return 'low';
}
function renderWeak(stats,pass,safe){
  const root=$('#weak-list');
  const ranked=[...stats].sort((a,b)=>{
    const av=a.accuracy==null?-1:a.accuracy,bv=b.accuracy==null?-1:b.accuracy;
    return av-bv || b.repeatWrong-a.repeatWrong;
  });
  if(!ranked.length){root.innerHTML='<div class="empty-compact">Chưa có chương để phân tích.</div>';return;}
  root.innerHTML=ranked.map(s=>{
    const p=priorityFor(s,pass,safe);
    const accuracy=s.accuracy==null?'Chưa làm':pct(s.accuracy);
    let advice;
    if(s.accuracy==null)advice='Chưa có dữ liệu. Làm một bài baseline trước khi quyết định mức độ ôn.';
    else if(s.accuracy<pass)advice='Ôn lại lý thuyết cốt lõi, sau đó làm lại câu sai theo từng cụm kiến thức trước khi chuyển sang mock.';
    else if(s.accuracy<safe)advice='Đã gần vùng ổn định. Tập trung câu từng sai và thêm một lượt timed practice.';
    else advice='Đang ổn. Chỉ cần spaced review và kiểm tra lại các câu đã đánh dấu sao.';
    return `<div class="weak-row">
      <div class="weak-head"><strong>${esc(s.chapter.title)}</strong><span class="priority ${p}">${p==='high'?'Ưu tiên cao':p==='medium'?'Ưu tiên vừa':'Duy trì'}</span></div>
      <p>${esc(advice)}</p>
      <footer><span>Accuracy: ${accuracy}</span><span>Sai tích luỹ: ${s.repeatWrong} · ★ ${s.starred}</span></footer>
    </div>`;
  }).join('');
}
function renderPlan(stats,readinessData){
  const root=$('#plan-list');
  const weak=stats.filter(s=>priorityFor(s,readinessData.pass,readinessData.safe)==='high');
  const medium=stats.filter(s=>priorityFor(s,readinessData.pass,readinessData.safe)==='medium');
  const steps=[];
  if(weak.length)steps.push(['Củng cố phần yếu',`Ôn lại ${weak.slice(0,2).map(s=>s.chapter.title).join(', ')}. Làm câu theo chapter, chưa cần full mock.`]);
  if(medium.length)steps.push(['Chuyển kiến thức thành điểm',`Làm lại các câu ★ và câu sai ở ${medium.slice(0,2).map(s=>s.chapter.title).join(', ')} trong điều kiện có giới hạn thời gian.`]);
  steps.push(['Timed practice',`Khi các chapter chính đạt ít nhất ${readinessData.pass}%, làm một lượt timed practice hoàn chỉnh và ghi lại lỗi theo nguyên nhân.`]);
  steps.push(['Ổn định trên safe target',`Mục tiêu LMS là đạt khoảng ${readinessData.safe}% trong ít nhất 3 lượt gần nhau; đây là biên an toàn nội bộ, không phải pass mark chính thức.`]);
  root.innerHTML=steps.map((s,i)=>`<div class="plan-step"><span class="plan-num">${i+1}</span><div><strong>${esc(s[0])}</strong><p>${esc(s[1])}</p></div></div>`).join('');
}
function renderAssessment(subject,rows,rd,stats){
  const level=subject.exam_level||'certificate';
  const levelLabel=level==='advanced'?'Advanced Level':level==='professional'?'Professional Level':'Certificate Level';
  $('#official-pass').textContent=pct(rd.pass);
  $('#safe-target').textContent=pct(rd.safe);
  $('#pass-scale').textContent=`Pass ${rd.pass}%`;
  $('#safe-scale').textContent=`Safe ${rd.safe}%`;
  $('#standard-level').textContent=`ICAEW · ${levelLabel}`;
  $('#standard-copy').textContent=`Pass mark chính thức: ${rd.pass}%. LMS dùng ${rd.safe}% làm safe target để tạo khoảng đệm khi luyện tập; ${rd.safe}% không phải yêu cầu chính thức của ICAEW.`;
  if(rd.score==null){
    $('#readiness-score').textContent='—';$('#readiness-label').textContent='Chưa đủ dữ liệu';$('#readiness-fill').style.width='0%';
    $('#recent-average').textContent='—';$('#coverage').textContent='0%';
    $('#assessment-title').textContent='Cần baseline';
    $('#assessment-copy').textContent='Hãy hoàn thành ít nhất một bài. Sau 3–5 lượt, xu hướng mới đủ hữu ích để đánh giá tính ổn định.';
    return;
  }
  $('#readiness-score').textContent=Math.round(rd.score);
  $('#readiness-fill').style.width=`${rd.score}%`;
  $('#recent-average').textContent=pct(rd.recent);
  $('#coverage').textContent=pct(rd.coverage);
  let label,title,copy;
  if(rd.recent>=rd.safe&&rd.consistency>=75){label='Ổn định';title='Đang ở vùng an toàn';copy=`Điểm gần đây ${pct(rd.recent)} và độ ổn định tốt. Duy trì timed practice, không cần học lại toàn bộ syllabus.`;}
  else if(rd.recent>=rd.pass){label='Pass zone';title='Đạt ngưỡng, biên an toàn còn mỏng';copy=`Bạn đang trên pass mark ${rd.pass}%, nhưng chưa nên coi là chắc chắn. Hãy đẩy các chapter yếu lên safe target và giữ điểm qua vài lượt liên tiếp.`;}
  else if(rd.recent>=rd.pass-10){label='Gần pass';title='Có nền tảng, cần chuyển sang luyện có mục tiêu';copy=`Điểm gần đây ${pct(rd.recent)}. Khoảng cách tới pass mark không lớn; ưu tiên lỗi lặp lại thay vì làm thêm nhiều câu ngẫu nhiên.`;}
  else{label='Cần củng cố';title='Chưa nên chuyển sang full mock';copy=`Điểm gần đây ${pct(rd.recent)}. Hãy xử lý chapter dưới pass mark trước, rồi mới tăng thời lượng đề tổng hợp.`;}
  $('#readiness-label').textContent=label;$('#assessment-title').textContent=title;$('#assessment-copy').textContent=copy;
  const minutes=estimateStudy(stats,rd.pass,rd.safe);
  $('#study-hours').textContent=minutes?`${(minutes/60).toFixed(minutes%60?1:0)}h`:'—';
  $('#study-sessions').textContent=minutes?String(Math.ceil(minutes/55)):'—';
  $('#time-copy').textContent=minutes?`Ước tính này cộng thời lượng review + targeted practice cho các chapter đang thiếu điểm. Hãy đánh giá lại sau mỗi 2–3 phiên học.`:'Chưa có dữ liệu để ước tính.';
}
function render(){
  const subject=subjects.find(s=>s.id===activeSubjectId)||subjects[0];
  if(!subject)return;
  const rows=subjectAttempts(subject.id).sort((a,b)=>Date.parse(a.completed_at)-Date.parse(b.completed_at));
  const rd=readiness(subject,rows);
  const stats=chapterStats(subject.id,rows);
  renderSubjectSwitch();
  renderAssessment(subject,rows,rd,stats);
  renderChart(rows,rd.pass,rd.safe);
  renderWeak(stats,rd.pass,rd.safe);
  renderPlan(stats,rd);
}
async function renderNotifications(){
  try{
    const [groups,memberships,reads,msgs,anns,annReads]=await Promise.all([
      restGet('chat_groups','select=id'),
      restGet('chat_group_members',`select=group_id,user_id&user_id=eq.${encodeURIComponent(session.user.id)}`),
      restGet('chat_reads',`select=group_id,last_read_at&user_id=eq.${encodeURIComponent(session.user.id)}`),
      restGet('chat_messages','select=group_id,sender_id,created_at&order=created_at.desc&limit=500'),
      restGet('announcements','select=id&status=eq.published'),
      restGet('announcement_reads',`select=announcement_id&user_id=eq.${encodeURIComponent(session.user.id)}`)
    ]);
    const joined=new Set(memberships.map(m=>m.group_id)),readMap=new Map(reads.map(r=>[r.group_id,Date.parse(r.last_read_at||0)||0]));
    const chat=msgs.filter(m=>joined.has(m.group_id)&&m.sender_id!==session.user.id&&(Date.parse(m.created_at||0)||0)>(readMap.get(m.group_id)||0)).length;
    const readAnn=new Set(annReads.map(r=>r.announcement_id));const admin=anns.filter(a=>!readAnn.has(a.id)).length;const total=chat+admin;
    const badge=$('#global-notification-count');badge.hidden=!total;badge.textContent=total>99?'99+':String(total);
  }catch{}
}
async function bootstrap(){
  try{session=await ensureSession();access=await getMyAccess(session,true);}
  catch{location.replace('index.html');return;}
  [subjects,chapters,exercises,attempts,profiles]=await Promise.all([
    restGet('subjects','select=*&is_active=eq.true&order=sort_order.asc'),
    restGet('chapters','select=*&is_active=eq.true&order=sort_order.asc'),
    restGet('exercises','select=id,chapter_id,title,question_count&is_active=eq.true'),
    restGet('exercise_attempts',`select=*&user_id=eq.${encodeURIComponent(session.user.id)}&order=completed_at.asc&limit=500`),
    restGet('profiles','select=id,display_name')
  ]);
  const me=profiles.find(p=>p.id===session.user.id);const name=me?.display_name||session.user.user_metadata?.display_name||session.user.email?.split('@')[0]||'Member';
  $('#portal-user-name').textContent=name;$('#portal-avatar').textContent=initials(name);
  activeSubjectId=new URLSearchParams(location.search).get('subject');
  if(!subjects.some(s=>s.id===activeSubjectId))activeSubjectId=subjects.find(s=>subjectAttempts(s.id).length)?.id||subjects[0]?.id||null;
  $('#progress-loading').hidden=true;$('#progress-content').hidden=false;
  render();renderNotifications();
}
$('#subject-switch').addEventListener('click',e=>{
  const b=e.target.closest('[data-subject]');if(!b)return;
  activeSubjectId=b.dataset.subject;
  const url=new URL(location.href);url.searchParams.set('subject',activeSubjectId);history.replaceState(null,'',url);
  render();
});
bootstrap().catch(error=>{$('#progress-loading').textContent='Không tải được dữ liệu tiến độ: '+(error.message||'Lỗi');});
