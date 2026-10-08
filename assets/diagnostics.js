import { ensureSession, restGet, restInsert } from './common.js';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>v?new Date(v).toLocaleString('vi-VN'):'—';
function row(label,value,status='pass',text='PASS'){return '<div class="row"><span class="label">'+esc(label)+'</span><span class="value">'+esc(value)+'</span><span class="status '+status+'">'+esc(text)+'</span></div>'}
function token(){const a=new Uint8Array(5);crypto.getRandomValues(a);return 'SYNC-'+[...a].map(x=>x.toString(16).padStart(2,'0')).join('').toUpperCase()}
async function swState(){if(!('serviceWorker'in navigator))return ['Không hỗ trợ','warn','WARN'];try{const r=await Promise.race([navigator.serviceWorker.ready,new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),1800))]);return [r?.active?'Active':'Registered','pass','PASS']}catch{return [navigator.serviceWorker.controller?'Active':'Chưa active','warn','CHECK']}}
async function load(){
  const session=await ensureSession();
  $('#who').textContent=session.user.email;
  const sw=await swState();
  $('#device-checks').innerHTML=row('Đăng nhập',session.user.email,'pass','PASS')+row('Online',navigator.onLine?'Có':'Không',navigator.onLine?'pass':'warn',navigator.onLine?'PASS':'OFFLINE')+row('Service Worker',sw[0],sw[1],sw[2])+row('Màn hình',window.innerWidth+' × '+window.innerHeight,'pass','INFO');
  const data=await Promise.all([
    restGet('user_progress','select=exercise_id,current_question,score,completed,updated_at&order=updated_at.desc'),
    restGet('user_preferences','select=last_exercise_id,updated_at&limit=1'),
    restGet('sync_probes','select=probe_token,created_at&order=created_at.desc&limit=1'),
    restGet('exercises','select=id,title,question_count,content_mode,is_active&order=sort_order.asc')
  ]);
  const progress=data[0],prefs=data[1],probes=data[2],exercises=data[3];
  const latest=progress[0]?.updated_at||null;
  const dbOk=exercises.length>0;
  $('#cloud-checks').innerHTML=row('Supabase Database',dbOk?'Kết nối thành công':'Không có dữ liệu',dbOk?'pass':'fail',dbOk?'PASS':'FAIL')+row('Progress rows',String(progress.length),'pass','PASS')+row('Progress cập nhật cuối',fmt(latest),latest?'pass':'warn',latest?'PASS':'EMPTY')+row('Last exercise',prefs[0]?.last_exercise_id||'—',prefs[0]?.last_exercise_id?'pass':'warn',prefs[0]?.last_exercise_id?'PASS':'EMPTY')+row('Question catalog',exercises.map(e=>e.id+': '+e.question_count).join(' · '),'pass','PASS');
  const p=probes[0];
  $('#probe-token').textContent=p?.probe_token||'—';
  $('#probe-meta').textContent=p?'Cloud time: '+fmt(p.created_at):'Chưa có probe.';
  $('#progress-list').innerHTML=progress.length?progress.map(x=>'<div class="progressItem"><strong>'+esc(x.exercise_id)+'</strong><span>Q '+(Number(x.current_question||0)+1)+'</span><span>Score '+Number(x.score||0)+'</span><span>'+(x.completed?'Completed':'In progress')+' · '+esc(fmt(x.updated_at))+'</span></div>').join(''):'<div class="muted">Chưa có progress trên cloud.</div>';
  $('#notice').textContent='Diagnostics hoàn tất. Nếu các mục chính đều PASS thì thiết bị này kết nối hệ thống bình thường.';
}
$('#refresh').addEventListener('click',()=>load().catch(e=>{$('#notice').textContent=e.message}));
$('#create-probe').addEventListener('click',async()=>{const b=$('#create-probe');if(b.disabled)return;b.disabled=true;try{const s=await ensureSession();const t=token();await restInsert('sync_probes',{user_id:s.user.id,probe_token:t});await load();$('#notice').textContent='Đã tạo '+t+'. Mở Diagnostics trên thiết bị còn lại để so sánh mã.'}catch(e){$('#notice').textContent=e.message}finally{b.disabled=false}});
(async()=>{try{await ensureSession();$('#app').classList.remove('hidden');await load()}catch(e){$('#auth').classList.remove('hidden')}})();