/* Tủ Đọc Quang Âm · GitHub Pages · no Floot runtime */
(() => {
'use strict';
const K={chapter:'qa-reader.v1.chapter',max:'qa-reader.v1.max',source:'qa-reader.v1.source',updated:'qa-reader.v1.updated',previous:'qa-reader.v2.previous',recent:'qa-reader.v2.recent'};
const OLD={chapter:'quang-am-reader-v3-current',source:'quang-am-source'};
const DEFAULT=614, MAX=20000;
const S={
 truyenhay:{label:'TruyenHay',url:n=>'https://truyenhay.app/quang-am-chi-ngoai-truyen-chu/chuong-'+n,index:'https://truyenhay.app/quang-am-chi-ngoai-truyen-chu'},
 thuvien:{label:'Việt Nam Thư Quán',url:n=>'https://vietnamthuquan.eu/TacPham/quang-am-chi-ngoai-26684/chuong-'+n,index:'https://vietnamthuquan.eu/TacPham/quang-am-chi-ngoai-26684/chuong-614'}
};
const T={610:'Trên dưới đều âm (1)',611:'Trên dưới đều âm (2)',612:'Trấn áp Tư Mã Như! (1)',613:'Trấn áp Tư Mã Như! (2)',614:'Không phải đất lành (1)',615:'Không phải đất lành (2)',616:'Hung địa nhân gian (1)',617:'Hung địa nhân gian (2)',618:'Thất gia truyền pháp (1)',619:'Thất gia truyền pháp (2)',620:'Chấp kiếm giả (1)',621:'Chấp kiếm giả (2)',622:'Thanh niên dưới mặt nạ (1)',623:'Thanh niên dưới mặt nạ (2)',624:'Tử Huyền thượng tiên (1)',625:'Tử Huyền thượng tiên (2)',626:'Phong tình vạn chủng (1)',627:'Phong tình vạn chủng (2)',628:'Thế gian thê thảm (1)',629:'Thế gian thê thảm (2)',630:'Sự tình khác thường tất có yêu (1)',631:'Sự tình khác thường tất có yêu (2)',632:'Chủ... ta... ngoan (1)',633:'Chủ... ta... ngoan (2)',634:'Tự tìm đường chết (1)',635:'Tự tìm đường chết (2)',636:'Huyền U đại mộ (1)',637:'Huyền U đại mộ (2)',638:'Lại là một Huyền U Tông (1)',639:'Lại là một Huyền U Tông (2)',640:'Thiên đinh trấn yêu xà (1)',641:'Thiên đinh trấn yêu xà (2)',642:'Phong thư cuối cùng của Lý Tử Mai (1)',643:'Phong thư cuối cùng của Lý Tử Mai (2)',644:'Dụng tâm lương khổ (1)',645:'Dụng tâm lương khổ (2)'};
const e=id=>document.getElementById(id);
const valid=n=>Number.isInteger(n)&&n>=1&&n<=MAX;
let persistent=true;
const read=k=>{try{return localStorage.getItem(k)}catch{persistent=false;return null}};
const write=(k,v)=>{try{localStorage.setItem(k,String(v));return true}catch{persistent=false;return false}};
const parse=v=>{
 const t=String(v||'').trim();
 if(/^\d+$/.test(t)){const n=Number(t);return valid(n)?{chapter:n}:null;}
 try{
  const url=new URL(t);
  if(!['http:','https:'].includes(url.protocol))return null;
  let source;
  if(['truyenhay.app','www.truyenhay.app'].includes(url.hostname))source='truyenhay';
  if(['vietnamthuquan.eu','www.vietnamthuquan.eu'].includes(url.hostname))source='thuvien';
  if(!source)return null;
  const m=url.pathname.match(/\/chuong-(\d+)\/?$/i),chapter=m?Number(m[1]):NaN;
  return valid(chapter)?{chapter,source}:null;
 }catch{return null}
};
let chapter=Number(read(K.chapter));
if(!valid(chapter)){const old=Number(read(OLD.chapter));chapter=valid(old)?old:DEFAULT}
let highest=Number(read(K.max));if(!valid(highest))highest=chapter;
let source=read(K.source)||read(OLD.source)||'truyenhay';if(!S[source])source='truyenhay';
const query=new URLSearchParams(location.search);
const imported=parse(query.get('chapter')||'');
if(imported&&(query.get('import')==='1'||!read(K.chapter))){
 chapter=imported.chapter;highest=Math.max(highest,chapter);
 if(S[query.get('source')])source=query.get('source');
 try{history.replaceState(null,'',location.pathname+location.hash)}catch{}
}
write(K.chapter,chapter);write(K.max,highest);write(K.source,source);
// The main bookmark, furthest chapter and visit history are intentionally separate.
// A review of an older chapter must never destroy the main reading bookmark.
let previousBookmark=Number(read(K.previous));
if(!valid(previousBookmark))previousBookmark=0;
function loadRecent(){
 try{
  const data=JSON.parse(read(K.recent)||'[]');
  if(!Array.isArray(data))return [];
  const unique=new Set();
  return data.filter(item=>{
    if(!item||!valid(item.chapter)||!S[item.source]||!Number.isFinite(item.at))return false;
    const key=item.source+':'+item.chapter;
    if(unique.has(key))return false;
    unique.add(key);return true;
  }).slice(0,12);
 }catch{return []}
}
let recent=loadRecent();
if(!recent.length)recent=[{chapter,source,at:Date.now()}];
function recordVisit(n,visitSource){
 if(!valid(n))return;
 const src=S[visitSource]?visitSource:source,now=Date.now();
 recent=[{chapter:n,source:src,at:now},...recent.filter(item=>item.chapter!==n||item.source!==src)].slice(0,12);
 write(K.recent,JSON.stringify(recent));
}
function formMsg(text,error){
 const n=e('form-message');n.textContent=text;n.classList.toggle('error',Boolean(error));
}
function notify(text){
 e('feedback').textContent=text;clearTimeout(notify.timer);
 notify.timer=setTimeout(()=>{e('feedback').textContent=''},4400);
}
function bookmark(next,chosen){
 if(!valid(next))return;
 if(next!==chapter){
  previousBookmark=chapter;
  write(K.previous,previousBookmark);
 }
 chapter=next;
 highest=Math.max(highest,next);
 if(chosen&&S[chosen])source=chosen;
 e('chapter-input').value=String(chapter);
 write(K.chapter,chapter);write(K.max,highest);write(K.source,source);
 write(K.updated,new Date().toISOString());
 recordVisit(next,source);
 render();notify(persistent?'Đã lưu chương '+chapter+'.':'Bộ nhớ đang bị chặn: chưa thể lưu chương.');
}
function visit(n,visitSource){
 if(!valid(n))return;
 const src=S[visitSource]?visitSource:source;
 if(n>=chapter){
  bookmark(n,src);
 }else{
  recordVisit(n,src);
  render();
  notify('Mở lại chương '+n+'. Dấu trang chính vẫn ở chương '+chapter+'.');
 }
}
function currentURL(n){return S[source].url(n)}
function link(a,n){a.href=currentURL(n);a.onclick=()=>{visit(n);return true}}
function render(){
 document.title='Đang đọc chương '+chapter+' · Tủ Đọc Quang Âm';
 e('chapter-number').textContent=String(chapter);
 e('chapter-title').textContent=T[chapter]||'Tiếp tục hành trình của Hứa Thanh';
 e('source-name').textContent=S[source].label;
 const stamp=read(K.updated),date=stamp?new Date(stamp):null;
 e('last-updated').textContent=date&&Number.isFinite(date.getTime())?'Cập nhật '+new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(date):'Lưu riêng trên thiết bị';
 e('read-now-number').textContent=String(chapter);
 e('dock-title').textContent='Đọc tiếp chương '+chapter;
 if(document.activeElement!==e('chapter-input'))e('chapter-input').value=String(chapter);
 const indicator=e('saved-indicator');
 indicator.classList.toggle('warning',!persistent);
 indicator.querySelector('span:last-child').textContent=persistent?'Đã lưu trên thiết bị':'Bộ nhớ bị chặn';
 link(e('read-now'),chapter);link(e('dock-link'),chapter);
 const prev=e('previous'),next=e('next');
 prev.hidden=chapter<=1;next.hidden=chapter>=MAX;
 e('previous-number').textContent=String(Math.max(1,chapter-1));
 e('next-number').textContent=String(chapter+1);
 link(prev,Math.max(1,chapter-1));link(next,Math.min(MAX,chapter+1));
 e('full-index').href=S[source].index;
 for(const k of Object.keys(S)){const b=e('source-'+k),active=source===k;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))}
 e('source-note').hidden=source!=='truyenhay';
 const frag=document.createDocumentFragment(),first=Math.max(1,Math.min(chapter-3,MAX-6));
 e('chapter-range').textContent='Chương '+first+'–'+Math.min(MAX,first+6);
 e('highest-number').textContent=String(highest);
 e('restore-highest').hidden=highest<=chapter;
 const canUndo=valid(previousBookmark)&&previousBookmark!==chapter;
 e('restore-previous').hidden=!canUndo;
 e('previous-bookmark').textContent=canUndo?String(previousBookmark):'';
 e('history-count').textContent=recent.length+' mục';
 const historyNodes=document.createDocumentFragment();
 for(const item of recent.slice(0,10)){
  const row=document.createElement('a');
  row.className='history-item';
  row.href=S[item.source].url(item.chapter);
  row.target='_blank';row.rel='noopener noreferrer';
  const num=document.createElement('strong');num.textContent='Chương '+item.chapter;
  const detail=document.createElement('span');detail.textContent=S[item.source].label+' · '+new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(item.at));
  const icon=document.createElement('span');icon.setAttribute('aria-hidden','true');icon.textContent='↗';
  row.append(num,detail,icon);
  row.onclick=()=>{visit(item.chapter,item.source);return true};
  historyNodes.append(row);
 }
 e('history-list').replaceChildren(historyNodes);
 for(let n=first;n<=Math.min(MAX,first+6);n++){
  const a=document.createElement('a');a.className='chapter-row'+(n===chapter?' current':'');a.href=currentURL(n);
  a.target='_blank';a.rel='noopener noreferrer';
  const number=document.createElement('span');number.className='row-number';number.textContent=String(n);
  const title=document.createElement('span');title.className='row-title';title.textContent=T[n]||'Chương '+n;
  a.append(number,title);
  if(n===chapter){const tag=document.createElement('span');tag.className='row-status';tag.textContent='Đang đọc';a.append(tag)}
  const arrow=document.createElement('span');arrow.className='row-arrow';arrow.setAttribute('aria-hidden','true');arrow.textContent='↗';a.append(arrow);
  a.onclick=()=>{visit(n);return true};frag.append(a);
 }
 e('chapters').replaceChildren(frag);
}
e('update-form').addEventListener('submit',event=>{
 event.preventDefault();const result=parse(e('chapter-input').value);
 if(!result){formMsg('Số chương hoặc liên kết không hợp lệ.',true);return}
 bookmark(result.chapter,result.source);formMsg(persistent?'Đã lưu chương '+result.chapter+'.':'Không lưu được; hãy kiểm tra cài đặt trình duyệt.',!persistent);
});
e('restore-highest').addEventListener('click',()=>{bookmark(highest);formMsg('Đã khôi phục mốc xa nhất từng mở.');});
e('restore-previous').addEventListener('click',()=>{
 if(valid(previousBookmark)&&previousBookmark!==chapter){
  const destination=previousBookmark;
  bookmark(destination);
  formMsg('Đã khôi phục dấu trang trước đó: chương '+destination+'.');
 }
});
e('copy-progress').addEventListener('click',async()=>{
 const url=new URL(location.pathname,location.origin);
 url.searchParams.set('chapter',String(chapter));
 url.searchParams.set('source',source);
 url.searchParams.set('import','1');
 const status=e('portable-status');
 try{await navigator.clipboard.writeText(url.toString());status.textContent='Đã sao chép. Mở liên kết trên thiết bị khác để chuyển dấu trang.';}
 catch{status.textContent='Sao chép đường dẫn hiện trong hộp thoại để lưu hoặc gửi sang máy khác.';window.prompt('Sao chép liên kết dấu trang:',url.toString());}
});
e('paste-link').addEventListener('click',async()=>{
 try{
  const copied=await navigator.clipboard.readText(),result=parse(copied);
  if(!result){e('chapter-input').value=copied;formMsg('Chưa nhận diện được liên kết. Bạn có thể nhập số chương.',true);return}
  bookmark(result.chapter,result.source);formMsg('Đã lưu chương '+result.chapter+'.');
 }catch{formMsg('Nếu Safari chặn clipboard, hãy nhấn giữ ô nhập rồi chọn Dán.',true)}
});
for(const k of Object.keys(S)){
 e('source-'+k).addEventListener('click',()=>{source=k;write(K.source,source);render();formMsg('Đã chọn '+S[source].label+'.')});
}
function resync(){
 const n=Number(read(K.chapter)),s=read(K.source);
 if(valid(n))chapter=n;if(S[s])source=s;
 highest=Math.max(highest,Number(read(K.max))||1,chapter);
 const oldPrevious=Number(read(K.previous));
 if(valid(oldPrevious))previousBookmark=oldPrevious;
 recent=loadRecent();
 render();
}
window.addEventListener('storage',ev=>{if([K.chapter,K.source,K.max].includes(ev.key))resync()});
window.addEventListener('pageshow',resync);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')resync()});
let dockFrame=0;
const updateDock=()=>{
 const rect=e('read-now').getBoundingClientRect();
 const visible=window.scrollY>140 && (rect.bottom<=0||rect.top>=window.innerHeight);
 e('mobile-dock').dataset.visible=String(visible);
};
window.addEventListener('scroll',()=>{
 if(dockFrame)return;
 dockFrame=requestAnimationFrame(()=>{dockFrame=0;updateDock()});
},{passive:true});
window.addEventListener('resize',updateDock);
render();
updateDock();
// Read only a small static index: never fetch or store full copyrighted chapters.
// On offline visits, the shell's known titles remain available.
fetch('./titles.json',{cache:'force-cache'}).then(response=>{
 if(!response.ok)throw new Error('title-index-unavailable');
 return response.json();
}).then(data=>{
 if(!data||typeof data!=='object')return;
 for(const [key,title] of Object.entries(data)){
  const n=Number(key);
  if(valid(n)&&typeof title==='string'&&title.length<=180)T[n]=title;
 }
 render();
}).catch(()=>{});
if('serviceWorker' in navigator&&location.protocol==='https:'){
 window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{}),{once:true});
}
})();