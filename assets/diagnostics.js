import { ensureSession, restGet, restInsert } from './common.js';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>v?new Date(v).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}):'—';
function row(label,value,status='pass',text='OK'){return '<div class="row"><span class="label">'+esc(label)+'</span><span class="value">'+esc(value)+'</span><span class="status '+status+'">'+esc(text)+'</span></div>'}
function token(){const a=new Uint8Array(5);crypto.getRandomValues(a);return 'SYNC-'+[...a].map(x=>x.toString(16).padStart(2,'0')).join('').toUpperCase()}
async function swState(){if(!('serviceWorker'in navigator))return ['Không hỗ trợ','warn','Cần kiểm tra'];try{const r=await Promise.race([navigator.serviceWorker.ready,new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),1800))]);return [r?.active?'Đang hoạt động':'Đã đăng ký','pass','OK']}catch{return [navigator.serviceWorker.controller?'Đang hoạt động':'Chưa hoạt động','warn','Cần kiểm tra']}}
async function load(){
  const session=await ensureSession();
  $('#who').textContent=session.user.email;
  const sw=await swState();
  $('#device-checks').innerHTML=row('Tài khoản',session.user.email,'pass','OK')+row('Kết nối mạng',navigator.onLine?'Đang online':'Đang offline',navigator.onLine?'pass':'warn',navigator.onLine?'OK':'Offline')+row('PWA / Service Worker',sw[0],sw[1],sw[2])+row('Kích thước màn hình',window.innerWidth+' × '+window.innerHeight,'pass','Thông tin');
  const data=await Promise.all([
    restGet('user_progress','select=exercise_id,current_question,score,completed,updated_at&order=updated_at.desc'),
    restGet('user_preferences','select=last_exercise_id,updated_at&limit=1'),
    restGet('sync_probes','select=probe_token,created_at&order=created_at.desc&limit=1'),
    restGet('exercises','select=id,title,question_count,content_mode,is_active&order=sort_order.asc')
  ]);
  const progress=data[0],prefs=data[1],probes=data[2],exercises=data[3];
  const latest=progress[0]?.updated_at||null;
  const dbOk=exercises.length>0;
  $('#cloud-checks').innerHTML=row('Cơ sở dữ liệu',dbOk?'Kết nối thành công':'Không có dữ liệu',dbOk?'pass':'fail',dbOk?'OK':'Lỗi')+row('Bản ghi tiến độ',String(progress.length),'pass','OK')+row('Cập nhật tiến độ gần nhất',fmt(latest),latest?'pass':'warn',latest?'OK':'Chưa có')+row('Bài tập gần nhất',prefs[0]?.last_exercise_id||'—',prefs[0]?.last_exercise_id?'pass':'warn',prefs[0]?.last_exercise_id?'OK':'Chưa có')+row('Danh mục câu hỏi',exercises.map(e=>e.id+': '+e.question_count).join(' · '),'pass','OK');
  const p=probes[0];
  $('#probe-token').textContent=p?.probe_token||'—';
  $('#probe-meta').textContent=p?'Đã tạo: '+fmt(p.created_at):'Chưa có mã kiểm tra.';
  $('#progress-list').innerHTML=progress.length?progress.map(x=>'<div class="progressItem"><strong>'+esc(x.exercise_id)+'</strong><span>Câu '+(Number(x.current_question||0)+1)+'</span><span>Điểm '+Number(x.score||0)+'</span><span>'+(x.completed?'Đã hoàn thành':'Đang làm')+' · '+esc(fmt(x.updated_at))+'</span></div>').join('') :'<div class="muted">Chưa có tiến độ nào trên cloud.</div>';
  $('#notice').textContent='Kiểm tra hoàn tất. Các mục hiển thị OK nghĩa là thiết bị đang kết nối hệ thống bình thường.';
}
$('#refresh').addEventListener('click',()=>load().catch(e=>{$('#notice').textContent=e.message}));
$('#create-probe').addEventListener('click',async()=>{const b=$('#create-probe');if(b.disabled)return;b.disabled=true;try{const s=await ensureSession();const t=token();await restInsert('sync_probes',{user_id:s.user.id,probe_token:t});await load();$('#notice').textContent='Đã tạo '+t+'. Mở trang Kiểm tra hệ thống trên thiết bị còn lại để so sánh mã.'}catch(e){$('#notice').textContent=e.message}finally{b.disabled=false}});
(async()=>{try{await ensureSession();$('#app').classList.remove('hidden');await load()}catch(e){$('#auth').classList.remove('hidden')}})();