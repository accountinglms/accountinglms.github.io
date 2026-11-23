/* Tủ Đọc Quang Âm · GitHub Pages · no Floot runtime */
(() => {
'use strict';
const K={chapter:'qa-reader.v1.chapter',max:'qa-reader.v1.max',source:'qa-reader.v1.source',updated:'qa-reader.v1.updated'};
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
function formMsg(text,error){
 const n=e('form-message');n.textContent=text;n.classList.toggle('error',Boolean(error));
}
function notify(text){
 e('feedback').textContent=text;clearTimeout(notify.timer);
 notify.timer=setTimeout(()=>{e('feedback').textContent=''},4400);
}
function bookmark(next,chosen){
 if(!valid(next))return;
 chapter=next;highest=Math.max(highest,next);
 if(chosen&&S[chosen])source=chosen;
 write(K.chapter,chapter);write(K.max,highest);write(K.source,source);
 write(K.updated,new Date().toISOString());
 render();notify(persistent?'Đã lưu chương '+chapter+'.':'Bộ nhớ đang bị chặn: chưa thể lưu chương.');
}
function currentURL(n){return S[source].url(n)}
function link(a,n){a.href=currentURL(n);a.onclick=()=>{bookmark(n);return true}}
function render(){
 document.title='Đang đọc chương '+chapter+' · Tủ Đọc Quang Âm';
 e('chapter-number').textContent=String(chapter);
 e('chapter-title').textContent=T[chapter]||'Tiếp tục hành trình của Hứa Thanh';
 e('source-name').textContent=S[source].label;
 e('read-now-number').textContent=String(chapter);
 e('dock-title').textContent='Đọc tiếp chương '+chapter;
 e('chapter-input').value=String(chapter);
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
 for(let n=first;n<=Math.min(MAX,first+6);n++){
  const a=document.createElement('a');a.className='chapter-row'+(n===chapter?' current':'');a.href=currentURL(n);
  a.target='_blank';a.rel='noopener noreferrer';
  const number=document.createElement('span');number.className='row-number';number.textContent=String(n);
  const title=document.createElement('span');title.className='row-title';title.textContent=T[n]||'Chương '+n;
  a.append(number,title);
  if(n===chapter){const tag=document.createElement('span');tag.className='row-status';tag.textContent='Đang đọc';a.append(tag)}
  const arrow=document.createElement('span');arrow.className='row-arrow';arrow.setAttribute('aria-hidden','true');arrow.textContent='↗';a.append(arrow);
  a.onclick=()=>{bookmark(n);return true};frag.append(a);
 }
 e('chapters').replaceChildren(frag);
}
e('update-form').addEventListener('submit',event=>{
 event.preventDefault();const result=parse(e('chapter-input').value);
 if(!result){formMsg('Số chương hoặc liên kết không hợp lệ.',true);return}
 bookmark(result.chapter,result.source);formMsg(persistent?'Đã lưu chương '+result.chapter+'.':'Không lưu được; hãy kiểm tra cài đặt trình duyệt.',!persistent);
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
 highest=Math.max(highest,Number(read(K.max))||1);render();
}
window.addEventListener('storage',ev=>{if([K.chapter,K.source,K.max].includes(ev.key))resync()});
window.addEventListener('pageshow',resync);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')resync()});
render();
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