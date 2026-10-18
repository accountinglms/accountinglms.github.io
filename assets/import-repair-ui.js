import {restGet,restRpc,callAiRepair} from './common.js';
import {scanImportQuality,FIELD_LABELS,applyRepairSuggestion,importRevisionDiff} from './import-quality.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const display=value=>typeof value==='string'?value:JSON.stringify(value,null,2);
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const columns='id,draft_id,mode,state,applied,suggestions,issues,error,created_at,lease_expires_at,finished_at';
export function createImportRepairController({getDraft,getPayload,isDirty,savePayload,adoptDraft,setBusy,notify}){
  let runs=[],draftId=null,busy=false,loading=false,retryAt=0;
  const panel=()=>document.querySelector('#import-repair-panel');
  const issues=()=>{const p=getPayload();return scanImportQuality(p.questions||[],p.lesson)};
  const same=id=>getDraft()?.id===id;
  const editable=()=>getDraft()?.status==='draft'&&typeof getDraft()?.updated_at==='string';
  function render(){
    const node=panel();if(!node)return;
    if(draftId!==getDraft()?.id){runs=[];draftId=getDraft()?.id;retryAt=0;}
    const all=issues(),blocking=all.filter(x=>x.blocking),qnums=[...new Set(blocking.filter(x=>x.question_index>=0).map(x=>x.question_index+1))];
    const latest=runs.find(r=>r.mode==='auto'||r.mode==='manual');
    const pending=runs.find(r=>r.state==='running'&&Date.parse(r.lease_expires_at)>Date.now());
    const waiting=Date.now()<retryAt;
    const status=busy||pending?'Đang kiểm tra và sửa phần lỗi…':blocking.length?`Cần kiểm tra ${qnums.length?qnums.length+' câu':'nội dung bài học'} trước khi xuất bản.`:all.length?'Câu hỏi đã đủ nội dung. Ví dụ bổ sung chưa sửa được sẽ được ẩn.':'Đã kiểm tra định dạng và các dấu hiệu lỗi; bạn vẫn cần duyệt nội dung trước khi xuất bản.';
    const changes=(patch,heading)=>`<div class="repairChange"><strong>${esc(heading)}</strong>${Object.entries(patch.changes).map(([field,value])=>`<div class="repairDiff"><div><span>${esc(FIELD_LABELS[field]||field)} · Trước</span><pre>${esc(display(patch.before[field]))}</pre></div><div><span>Sau</span><pre>${esc(display(value))}</pre></div></div>`).join('')}<p>${esc(patch.reason)}</p>${patch.source_quote?`<p><strong>AI trích dẫn tệp ${esc(patch.source_file)}, trang ${esc(patch.source_page)} · cần đối chiếu:</strong></p><blockquote>${esc(patch.source_quote)}</blockquote>`:''}</div>`;
    const proposals=runs.filter(r=>r.state==='ready').flatMap(r=>(r.suggestions||[]).map((p,i)=>({r,p,i}))).filter(({p})=>{const current=p.question_index<0?getPayload().lesson:getPayload().questions?.[p.question_index];return current&&Object.entries(p.before).every(([k,v])=>JSON.stringify(current[k]??null)===JSON.stringify(v))});
    const hasUncovered=all.some(issue=>!proposals.some(({p})=>p.question_index===issue.question_index&&Object.hasOwn(p.changes,issue.field)));
    node.innerHTML=`<div class="repairTop"><div><strong>Kiểm tra bản nháp</strong><p role="status" aria-live="polite">${esc(status)}</p></div><button type="button" class="ghost" data-repair-start ${busy||loading||pending||waiting||!editable()||!hasUncovered?'disabled':''}>${waiting?'Chờ trước khi thử lại':all.length&&!hasUncovered?'Đã có đề xuất cần duyệt':'AI sửa phần lỗi'}</button></div>
      ${all.length?`<ul class="repairIssues">${all.map(i=>`<li><a href="#${i.question_index<0?'lesson-content':'import-question-'+i.question_index}">${i.question_index<0?'Bài học':'Câu '+(i.question_index+1)} · ${esc(i.message)}</a>${i.blocking?'':' <span>Ví dụ bổ sung</span>'}</li>`).join('')}</ul>`:''}
      ${latest?.state==='failed'?`<p class="warning">${esc(latest.error?.error||'Lượt sửa chưa hoàn tất; bản nháp vẫn được giữ.')} Bạn có thể sửa tay.</p>`:''}
      ${latest?.state==='conflict'?'<p class="warning">Bản nháp đã thay đổi trong lúc AI chạy. Kết quả cũ không ghi đè chỉnh sửa của bạn.</p>':''}
      ${proposals.map(({r,p,i})=>`<details class="repairProposal"><summary>Đề xuất sửa ${p.question_index<0?'bài học':'câu '+(p.question_index+1)} · cần bạn duyệt</summary>${changes(p,'Đối chiếu trước khi áp dụng')}<button class="ghost" type="button" data-repair-apply="${esc(r.id)}" data-proposal-index="${i}" ${busy?'disabled':''}>Áp dụng đề xuất vào bản nháp</button></details>`).join('')}
      ${runs.length?`<details class="repairHistory"><summary>Lịch sử chỉnh sửa · ${runs.length} lượt gần nhất</summary>${runs.slice(0,8).map((r,i)=>`<div class="repairRun"><p><strong>${esc({auto:'Tự động sửa',manual:'Sửa bằng AI',save:'Lưu chỉnh sửa',apply:'Áp dụng đề xuất'}[r.mode]||'Chỉnh sửa')}</strong> · ${esc(new Date(r.created_at).toLocaleString('vi-VN'))} · ${esc({running:'Đang xử lý',ready:'Đã lưu',failed:'Chưa hoàn tất',conflict:'Có chỉnh sửa mới',undone:'Đã hoàn tác'}[r.state]||r.state)}</p>${(r.applied||[]).map(p=>`<details><summary>Xem thay đổi câu ${p.question_index+1}</summary>${changes(p,'Bản dịch ví dụ')}</details>`).join('')}${['save','apply'].includes(r.mode)?`<details data-repair-diff="${esc(r.id)}"><summary>Xem nội dung trước và sau</summary><div class="repairSavedDiff"></div></details>`:''}${r.state==='ready'&&r.id===runs.find(x=>x.state==='ready')?.id?`<button class="ghost" type="button" data-repair-undo="${esc(r.id)}" ${busy?'disabled':''}>Hoàn tác lượt này</button>`:''}</div>`).join('')}</details>`:''}`;
  }
  async function readRuns(id){
    const data=await restGet('import_repair_runs',`select=${columns}&draft_id=eq.${encodeURIComponent(id)}&order=created_at.desc&limit=12`);
    if(same(id)){runs=data;draftId=id;render()}return data;
  }
  async function refreshDraft(id){
    const rows=await restGet('import_drafts','select=*&id=eq.'+encodeURIComponent(id)+'&created_by=eq.'+encodeURIComponent(getDraft().created_by));
    if(same(id)&&rows[0]){if(isDirty())throw Error('DRAFT_CHANGED');adoptDraft(rows[0]);}
  }
  async function waitForRun(id,runId){
    const until=Date.now()+115000;
    while(same(id)){
      const data=await readRuns(id),run=data.find(r=>r.id===runId);
      if(run&&run.state!=='running'){
        if(run.state==='ready')await refreshDraft(id);
        if(run.error?.retry_after_seconds)retryAt=Date.now()+run.error.retry_after_seconds*1000;
        if(run.state==='failed')notify(run.error?.error||'Chưa sửa được phần lỗi. Bản nháp được giữ nguyên.','error');
        else if(run.state==='ready')notify(`Đã lưu kết quả sửa: ${run.applied?.length||0} câu cập nhật ví dụ · ${run.suggestions?.length||0} đề xuất cần duyệt.`,'ok');
        return;
      }
      if(Date.now()>=until||(run&&Date.parse(run.lease_expires_at)<=Date.now()))break;
      await delay(1800);
    }
    notify('Lượt sửa đang bị gián đoạn. Bản nháp được giữ; hãy mở lại để xem trạng thái mới nhất.','error');
  }
  async function start(mode='manual'){
    if(busy||!editable()||!issues().length)return;
    const id=getDraft().id;busy=true;setBusy(true);render();
    try{
      if(isDirty())await savePayload(getPayload(),'save');
      const result=await callAiRepair({draftId:id,requestId:crypto.randomUUID(),expectedUpdatedAt:getDraft().updated_at,mode});
      await waitForRun(id,result.run_id);
    }catch(error){
      // A response can be lost after the server claims a run. Recover it by reading
      // persisted state rather than issuing another model request.
      try{const data=await readRuns(id),active=data.find(r=>r.state==='running'&&Date.parse(r.lease_expires_at)>Date.now());if(active){await waitForRun(id,active.id);return}}catch{/* retain original error */}
      if(error.retryAfterSeconds)retryAt=Date.now()+error.retryAfterSeconds*1000;
      notify(message(error), 'error');
    }finally{busy=false;setBusy(false);render();if(retryAt>Date.now())setTimeout(render,retryAt-Date.now()+20)}
  }
  async function load({auto=true}={}){
    if(loading||busy)return render();
    const d=getDraft();if(!d||!editable())return render();
    const id=d.id;if(draftId!==id){runs=[];draftId=id}loading=true;render();
    try{
      const data=await readRuns(id);if(!same(id))return;
      const active=data.find(r=>r.state==='running'&&Date.parse(r.lease_expires_at)>Date.now());
      if(active){busy=true;setBusy(true);try{await waitForRun(id,active.id)}finally{busy=false;setBusy(false)}}
      else if(auto&&issues().length&&!data.some(r=>r.mode==='auto')&&!isDirty()){loading=false;await start('auto')}
    }catch(error){notify('Chưa đọc được trạng thái sửa. Bạn vẫn có thể chỉnh sửa bản nháp. '+message(error),'error')}
    finally{loading=false;render();if(!same(id))void load()}
  }
  function message(error){return /DRAFT_CHANGED/.test(error.message)?'Bản nháp đã thay đổi. Hãy mở lại bản mới nhất để tránh ghi đè.':/REPAIR_BUSY/.test(error.message)?'AI đang sửa bản nháp. Hãy chờ lượt đó hoàn tất.':error.message}
  document.addEventListener('toggle',async event=>{
    const details=event.target;if(!details.matches?.('[data-repair-diff]')||!details.open||details.dataset.loaded)return;
    const box=details.querySelector('.repairSavedDiff');box.textContent='Đang tải lịch sử…';
    try{
      const rows=await restGet('import_repair_runs','select=base_payload,after_payload&id=eq.'+encodeURIComponent(details.dataset.repairDiff));
      if(!rows[0])throw Error('Không còn dữ liệu lịch sử.');
      const diff=importRevisionDiff(rows[0].base_payload,rows[0].after_payload);
      box.innerHTML=diff.map(p=>`<strong>${p.question_index<0?'Bài học':'Câu '+(p.question_index+1)}</strong>${Object.entries(p.changes).map(([f,v])=>`<div class="repairDiff"><div><span>${esc(FIELD_LABELS[f]||f)} · Trước</span><pre>${esc(display(p.before[f]))}</pre></div><div><span>Sau</span><pre>${esc(display(v))}</pre></div></div>`).join('')}`).join('')||'Không có thay đổi nội dung.';details.dataset.loaded='true';
    }catch(error){box.textContent=message(error)}
  },true);
  document.addEventListener('click',async event=>{
    const button=event.target.closest('[data-repair-start],[data-repair-apply],[data-repair-undo]');if(!button||button.disabled||busy||loading)return;
    if(button.hasAttribute('data-repair-start'))return start();
    busy=true;setBusy(true);render();
    try{
      if(button.dataset.repairApply){
        const run=runs.find(r=>r.id===button.dataset.repairApply),proposal=run?.suggestions?.[Number(button.dataset.proposalIndex)];if(!proposal)throw Error('Đề xuất không còn tồn tại.');
        await savePayload(applyRepairSuggestion(getPayload(),proposal),'apply');notify('Đã áp dụng đề xuất vào bản nháp. Hãy đối chiếu trước khi xuất bản.','ok');
      }else{
        if(isDirty())throw Error('Hãy lưu chỉnh sửa đang mở trước khi hoàn tác.');
        adoptDraft(await restRpc('undo_import_repair',{p_run_id:button.dataset.repairUndo,p_expected_updated_at:getDraft().updated_at}));notify('Đã hoàn tác và giữ lịch sử chỉnh sửa.','ok');
      }
      await readRuns(getDraft().id);
    }catch(error){notify(message(error),'error')}
    finally{busy=false;setBusy(false);render()}
  });
  return {render,load,start};
}
