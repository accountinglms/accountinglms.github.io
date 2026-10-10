import { ensureSession, ensureEditorSession, restGet, restInsert, restPatch, uploadImportFile, downloadImportFile, callAiImport, callAiRoute } from './common.js';
import {subjectCoverDataURL,subjectCoverLabel} from './subject-cover.js';

const $ = s => document.querySelector(s);
let subjects=[], chapters=[], exercises=[], questions=[], lessons=[], audits=[], snapshots=[];
let importedQuestions=[], importedLesson=null, importSourceId=null, importDraftId=null;
let preparedImport=null, routeSuggestion=null, destinationConfirmed=false, destinationSignature='';
let savedImports=[], selectedImportFiles=[], importBusy=false, activeDraft=null, manualImportContext=null;
let aiRetryAt=0, retryTimer=null;

function notice(text, kind='info'){const n=$('#notice');n.textContent=text;n.className='notice '+(kind==='info'?'':kind)}
function slugify(v){return v.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,48)}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function selected(sel){return $(sel)?.value||''}
const MAX_IMPORT_FILES=20, MAX_IMPORT_FILE_BYTES=4*1024*1024, MAX_IMPORT_TOTAL_BYTES=12*1024*1024;
const IMPORT_MIMES=new Set(['image/png','image/jpeg','image/webp','application/pdf','text/plain']);
function importFileKey(file){return file?JSON.stringify([file.name,file.size,file.type]):''}
function currentImportFiles(){return selectedImportFiles}
function currentImportFile(){return currentImportFiles()[0]}
function validateImportFiles(files){
  if(!files.length)throw new Error('Hãy chọn một hoặc nhiều tệp trước.');
  if(files.length>MAX_IMPORT_FILES)throw new Error('Tối đa 20 tệp mỗi lần. Hãy chia thành các nhóm nhỏ hơn.');
  if(files.some(f=>!IMPORT_MIMES.has(f.type)))throw new Error('Chỉ hỗ trợ ảnh PNG, JPG, WEBP, PDF và TXT.');
  if(files.some(f=>f.size>MAX_IMPORT_FILE_BYTES))throw new Error('Tối đa 4 MB mỗi tệp.');
  if(files.reduce((n,f)=>n+f.size,0)>MAX_IMPORT_TOTAL_BYTES)throw new Error('Tổng dung lượng tối đa 12 MB mỗi lần.');
  if(new Set(files.map(importFileKey)).size!==files.length)throw new Error('Có tệp trùng tên và dung lượng. Hãy chọn mỗi tệp một lần hoặc đổi tên trước.');
}
function ensurePreparedBatch(){
  const files=currentImportFiles(), key=JSON.stringify(files.map(importFileKey));
  if(preparedImport?.key===key)return preparedImport;
  const previous=new Map((preparedImport?.files||[]).map(f=>[f.key,f]));
  preparedImport={key,files:files.map(f=>previous.get(importFileKey(f))||{key:importFileKey(f),name:f.name,mimeType:f.type,size:f.size,lastModified:f.lastModified||0,storagePath:null,sourceId:null})};
  return preparedImport;
}
function importManifest(){return (preparedImport?.files||[]).map(f=>({...f}))}
function aiSourceInput(){
  const files=preparedImport.files.map(f=>({storagePath:f.storagePath,fileName:f.name,mimeType:f.mimeType}));
  return files.length===1?files[0]:{files};
}
function setImportProgress(text){$('#import-progress').textContent=text;renderImportFiles()}
function renderImportFiles(){
  const files=currentImportFiles(),entries=preparedImport?.files||[];
  $('#import-file-name').textContent=files.length>1?files.length+' tệp đã chọn':files[0]?.name||'Chọn một hoặc nhiều ảnh, PDF, TXT';
  $('#import-file-meta').textContent=files.length?(files.reduce((n,f)=>n+f.size,0)/1024/1024).toFixed(2)+' MB · AI đọc tất cả tệp theo thứ tự bên dưới':'Tối đa 20 tệp · 4 MB mỗi tệp · 12 MB cả lượt';
  $('#import-file-list').innerHTML=files.map((file,i)=>{
    const entry=entries.find(f=>f.key===importFileKey(file));
    const saved=Boolean(entry?.storagePath&&entry?.sourceId);
    const state=saved?'Đã lưu nguồn':entry?.storagePath?'Đã tải lên':typeof file.arrayBuffer==='function'?'Chờ lưu':'Cần chọn lại tệp này';
    const ready=saved&&activeDraft?.payload?.processing?.state==='ready';
    return `<div class="importFile"><div class="importFileName">${i+1}. ${esc(file.name)}<small>${ready?'Đã tạo bản nháp':state}</small></div>${saved?`<button type="button" class="ghost" data-download-source="${i}" aria-label="Tải ${esc(file.name)}">Tải</button>`:''}${!activeDraft?`<button type="button" class="ghost" data-move-source="${i}" data-direction="-1" aria-label="Đưa ${esc(file.name)} lên" ${importBusy||i===0?'disabled':''}>↑</button><button type="button" class="ghost" data-move-source="${i}" data-direction="1" aria-label="Đưa ${esc(file.name)} xuống" ${importBusy||i===files.length-1?'disabled':''}>↓</button>`:''}</div>`;
  }).join('');
}
function importFilesAvailable(){return currentImportFiles().every(f=>preparedImport?.files?.find(e=>e.key===importFileKey(f))?.storagePath||typeof f.arrayBuffer==='function')}

function currentTargetType(){return selected('#import-target')||'questions'}
function currentDestinationSignature(){
  return [currentTargetType(),selected('#subject'),selected('#chapter'),currentTargetType()==='questions'?selected('#exercise'):''].join('|')
}
function destinationComplete(){
  return Boolean(selected('#subject')&&selected('#chapter')&&(currentTargetType()==='lesson'||selected('#exercise')))
}
function destinationLabel(){
  const subject=subjects.find(x=>x.id===selected('#subject'));
  const chapter=chapters.find(x=>x.id===selected('#chapter'));
  const exercise=exercises.find(x=>x.id===selected('#exercise'));
  return [subject?.title,chapter?.title,currentTargetType()==='questions'?exercise?.title:null].filter(Boolean).join(' → ')
}
function updateImportTargetUI(){
  const lesson=currentTargetType()==='lesson';
  $('#exercise-destination-row')?.classList.toggle('hidden',lesson);
  if(lesson&&$('#exercise'))$('#exercise').value='';
  updateGenerateState();
}
function updateDestinationStatus(message='',kind=''){
  const el=$('#destination-status');
  if(!el)return;
  el.className='destinationStatus'+(kind?' '+kind:'');
  if(message){el.textContent=message;return}
  if(destinationConfirmed&&destinationSignature===currentDestinationSignature()){
    el.classList.add('confirmed');
    el.textContent='✓ Đã xác nhận: '+destinationLabel();
  }else{
    el.textContent='Chưa xác nhận. AI sẽ không tạo Draft cho đến khi bạn chọn đúng nơi lưu.';
  }
}
function invalidateDestination(message=''){
  destinationConfirmed=false;
  destinationSignature='';
  updateDestinationStatus(message||'',message?'warning':'');
  updateGenerateState();
}
function updateGenerateState(){
  const file=currentImportFile();
  const valid=Boolean(file&&importFilesAvailable()&&destinationComplete()&&destinationConfirmed&&destinationSignature===currentDestinationSignature());
  const btn=$('#ai-generate');
  const remaining=Math.max(0,Math.ceil((aiRetryAt-Date.now())/1000));
  if(btn){btn.disabled=importBusy||!valid||remaining>0;if(!importBusy)btn.textContent=remaining?'Thử AI lại sau '+remaining+' giây':'Tạo bản nháp bằng AI'}
  const save=$('#save-import');
  if(save)save.disabled=importBusy||!valid;
  const route=$('#ai-route');
  if(route)route.disabled=importBusy||!file||!importFilesAvailable()||remaining>0;
  for(const selector of ['#import-file','#import-target','#subject','#chapter','#exercise','#confirm-destination']){
    if($(selector))$(selector).disabled=importBusy;
  }
  document.querySelectorAll('[data-resume-import],[data-move-source]').forEach(btn=>{if(importBusy)btn.disabled=true;else if(btn.hasAttribute('data-resume-import'))btn.disabled=false});
  $('#continue-manual-import').disabled=importBusy;
  clearTimeout(retryTimer);
  if(remaining)retryTimer=setTimeout(updateGenerateState,Math.min(1000*remaining,60000));
}
function clearRouteSuggestion(){
  routeSuggestion=null;
  const box=$('#route-suggestion');
  if(box){box.classList.add('hidden');box.innerHTML=''}
}
async function ensurePreparedUpload(file){
  const prepared=ensurePreparedBatch();
  const entry=prepared.files.find(f=>f.key===importFileKey(file));
  if(entry.storagePath)return entry;
  if(typeof file.arrayBuffer!=='function')throw new Error('Hãy chọn lại tệp chưa được lưu: '+file.name);
  const up=await uploadImportFile(file);
  entry.storagePath=up.storagePath;
  renderImportFiles();
  return entry;
}

async function reload(){
  const session=await ensureSession();
  const data=await Promise.all([
    restGet('subjects','select=*&order=sort_order.asc'),restGet('chapters','select=*&order=sort_order.asc'),restGet('exercises','select=*&order=sort_order.asc'),restGet('questions','select=*&order=sort_order.asc'),restGet('lessons','select=*&order=sort_order.asc'),restGet('content_audit_log','select=*&order=changed_at.desc&limit=30'),restGet('content_snapshots','select=id,label,created_at,created_by&order=created_at.desc&limit=10'),restGet('import_drafts','select=*,content_sources(id,file_name,mime_type,storage_key)&status=eq.draft&created_by=eq.'+encodeURIComponent(session.user.id)+'&order=created_at.desc&limit=20')
  ]);
  [subjects,chapters,exercises,questions,lessons,audits,snapshots,savedImports]=data;
  renderStructure(); renderQuestions(); renderActivity(); renderSnapshotMeta(); renderSavedImports(); notice('Đã tải dữ liệu quản trị từ Supabase.','ok');
}

function rememberImport(draft){
  activeDraft=draft;
  const source=draft.content_sources||{id:importSourceId,file_name:currentImportFile()?.name,mime_type:currentImportFile()?.type,storage_key:preparedImport?.files?.[0]?.storagePath};
  const row={...draft,content_sources:source};
  savedImports=[row,...savedImports.filter(x=>x.id!==draft.id)].slice(0,20);
  renderSavedImports();
}
function renderSavedImports(){
  const list=$('#saved-import-list');
  $('#saved-imports').classList.toggle('hidden',!savedImports.length);
  list.innerHTML=savedImports.map(d=>`<div class="savedImport"><div><strong>${esc(d.title)}</strong><small>${esc(d.payload?.destination?.subject_title||'')} · ${d.payload?.files?.length||1} tệp · ${d.payload?.processing?.state==='ready'?'Sẵn sàng kiểm tra':'Đã lưu nguồn · chưa xử lý xong'}</small></div><button type="button" class="ghost" data-resume-import="${esc(d.id)}">Tiếp tục</button></div>`).join('');
  updateGenerateState();
}
function renderImportRecovery(){
  const box=$('#import-recovery');
  box.classList.toggle('hidden',!activeDraft);
  renderImportFiles();
  if(!activeDraft)return;
  const pending=activeDraft.payload?.processing?.state!=='ready';
  const count=preparedImport?.files?.filter(f=>f.sourceId).length||0;
  const total=currentImportFiles().length;
  $('#import-recovery-text').textContent=pending?`Đã lưu bản nháp và ${count}/${total} tệp nguồn. ${count<total?'Chọn lại các tệp còn thiếu để tiếp tục.':'Bạn có thể thử AI lại hoặc nhập nội dung thủ công.'}`:'Bản nháp đã được lưu. Hãy kiểm tra nội dung trước khi xuất bản.';
  $('#continue-manual-import').classList.toggle('hidden',!pending);
  $('#download-import-source').classList.toggle('hidden',total!==1);
  $('#manual-source-row').classList.toggle('hidden',!pending||total<2);
  const old=$('#manual-import-source').value;
  $('#manual-import-source').innerHTML=(preparedImport?.files||[]).map((f,i)=>f.sourceId?`<option value="${i}">${esc(f.name)}</option>`:'').join('');
  if([...$('#manual-import-source').options].some(o=>o.value===old))$('#manual-import-source').value=old;
}

async function persistImportSource(files,subject,chapter,exercise){
  const prepared=ensurePreparedBatch();
  const session=await ensureSession();
  const destination={target_type:currentTargetType(),subject_id:subject.id,subject_title:subject.title,chapter_id:chapter.id,chapter_title:chapter.title,exercise_id:exercise?.id||null,exercise_title:exercise?.title||null};
  const signature=currentDestinationSignature();
  for(let i=0;i<files.length;i++){
    const file=files[i];
    setImportProgress(`Đang lưu tệp ${i+1}/${files.length}: ${file.name}`);
    const entry=await ensurePreparedUpload(file);
    if(!entry.sourceId){
      const source=(await restInsert('content_sources',{
        source_type:file.type==='application/pdf'?'pdf':file.type==='text/plain'?'text':'image',
        file_name:file.name,mime_type:file.type,storage_key:entry.storagePath,page_count:null,
        metadata:{routed:true,destination,file_index:i+1,file_count:files.length,route_confidence:routeSuggestion?.confidence??null,mixed_subjects:routeSuggestion?.mixed_subjects??false},created_by:session.user.id
      }))[0];
      if(!source?.id)throw new Error('Chưa lưu được thông tin tệp nguồn. Hãy thử lại.');
      entry.sourceId=source.id;
    }
    importSourceId=prepared.files[0].sourceId;
    if(!activeDraft||prepared.draftSignature!==signature){
      const draft=(await restInsert('import_drafts',{
        title:files.length>1?files[0].name+' + '+(files.length-1)+' tệp':files[0].name,
        source_id:importSourceId,target_type:currentTargetType(),
        payload:{files:importManifest(),questions:[],lesson:null,warnings:[],destination,routing:routeSuggestion||null,processing:{state:'pending'}},
        status:'draft',model_name:null,created_by:session.user.id,updated_by:session.user.id
      }))[0];
      if(!draft?.id)throw new Error('Chưa lưu được bản nháp. Hãy thử lại.');
      prepared.draftSignature=signature;importDraftId=draft.id;
      importedQuestions=[];importedLesson=null;manualImportContext=null;
      $('#review-area').classList.add('hidden');$('#import-warning').classList.add('hidden');
      rememberImport(draft);
    }else if(JSON.stringify(activeDraft.payload?.files)!==JSON.stringify(importManifest())){
      await patchActiveImport({payload:{...activeDraft.payload,files:importManifest()}});
    }
    renderImportRecovery();
  }
  setImportProgress(`Đã lưu ${files.length}/${files.length} tệp nguồn.`);
  return prepared;
}

$('#saved-import-list').addEventListener('click',e=>{
  const id=e.target.closest('[data-resume-import]')?.dataset.resumeImport;
  const draft=savedImports.find(x=>x.id===id);
  if(!draft||importBusy)return;
  const source=draft.content_sources, destination=draft.payload?.destination;
  const manifest=draft.payload?.files?.length?draft.payload.files:source?.storage_key?[{name:source.file_name||draft.title,mimeType:source.mime_type,size:0,lastModified:0,storagePath:source.storage_key,sourceId:source.id||draft.source_id}]:[];
  if(!manifest.length||!destination)return notice('Bản nháp này chưa có tệp nguồn hoặc nơi lưu. Hãy chọn lại tệp.','error');
  $('#import-file').value='';
  selectedImportFiles=manifest.map(f=>({name:f.name,type:f.mimeType,size:f.size||0,lastModified:f.lastModified||0}));
  preparedImport={key:JSON.stringify(selectedImportFiles.map(importFileKey)),files:manifest.map((f,i)=>({...f,key:importFileKey(selectedImportFiles[i])}))};
  importSourceId=preparedImport.files[0].sourceId;importDraftId=draft.id;activeDraft=draft;manualImportContext=null;
  $('#import-target').value=draft.target_type;
  $('#subject').value=destination.subject_id;renderStructure();
  $('#chapter').value=destination.chapter_id;renderStructure();
  $('#exercise').value=destination.exercise_id||'';
  preparedImport.draftSignature=currentDestinationSignature();
  clearRouteSuggestion();
  destinationConfirmed=destinationComplete();destinationSignature=destinationConfirmed?currentDestinationSignature():'';
  aiRetryAt=Number(draft.payload?.processing?.retry_at)||0;
  setImportProgress('Đã mở lại bộ tệp nguồn đã lưu.');
  importedQuestions=draft.payload?.questions||[];importedLesson=draft.payload?.lesson||null;
  $('#review-area').classList.add('hidden');
  $('#import-warning').classList.add('hidden');
  if(importedQuestions.length||importedLesson)renderReview(draft.payload?.warnings||[]);
  updateDestinationStatus();renderImportRecovery();updateGenerateState();
  $('#import-recovery').scrollIntoView({behavior:'smooth',block:'center'});
  notice('Đã mở lại bản nháp và tệp nguồn.','ok');
});

async function downloadSource(index){
  try{
    const source=preparedImport?.files?.[index];
    if(!source?.storagePath)return;
    const blob=await downloadImportFile(source.storagePath);
    const url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download=source.name;link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch(err){notice(err.message,'error')}
}
$('#download-import-source').addEventListener('click',()=>downloadSource(0));
$('#import-file-list').addEventListener('click',e=>{
  const download=e.target.closest('[data-download-source]');
  if(download)return downloadSource(Number(download.dataset.downloadSource));
  const move=e.target.closest('[data-move-source]');
  if(!move||move.disabled||importBusy||activeDraft)return;
  const from=Number(move.dataset.moveSource),to=from+Number(move.dataset.direction);
  if(to<0||to>=selectedImportFiles.length)return;
  [selectedImportFiles[from],selectedImportFiles[to]]=[selectedImportFiles[to],selectedImportFiles[from]];
  ensurePreparedBatch();clearRouteSuggestion();invalidateDestination();renderImportFiles();
});
$('#continue-manual-import').addEventListener('click',async()=>{
  if(!activeDraft||!destinationConfirmed||preparedImport?.draftSignature!==currentDestinationSignature())return notice('Hãy xác nhận lại nơi lưu của bản nháp trước.','error');
  const sourceIndex=Number($('#manual-import-source').value)||0;
  const source=preparedImport.files[sourceIndex],file=currentImportFiles()[sourceIndex];
  manualImportContext={draftId:importDraftId,sourceId:source.sourceId,signature:currentDestinationSignature(),target:currentTargetType()};
  const form=currentTargetType()==='lesson'?$('#lesson-form'):$('#question-form');
  form.closest('details').open=true;
  if(currentTargetType()==='lesson'){
    $('#manual-lesson-title').value=activeDraft.title;
    $('#manual-lesson-status').value='draft';
    if(file?.type==='text/plain'){
      try{$('#manual-lesson-content').value=typeof file.text==='function'?await file.text():await (await downloadImportFile(source.storagePath)).text()}catch(err){notice(err.message,'error')}
    }
  }else $('#q-status').value='draft';
  form.scrollIntoView({behavior:'smooth',block:'start'});
  notice('Nhập nội dung từ tệp nguồn rồi lưu. Nội dung sẽ được giữ ở trạng thái bản nháp.');
});
function manualSourceContext(target){return manualImportContext?.target===target&&manualImportContext.signature===currentDestinationSignature()?manualImportContext:null}
function assertImportReviewDestination(){
  if(!destinationConfirmed||destinationSignature!==currentDestinationSignature()||preparedImport?.draftSignature!==currentDestinationSignature())throw new Error('Nơi lưu đã thay đổi. Hãy mở lại bản nháp và xác nhận đúng nơi lưu trước khi xuất bản.');
}
function renderStructure(){
  const s=$('#subject'),c=$('#chapter'),e=$('#exercise'); const oldS=s.value,oldC=c.value,oldE=e.value;
  s.innerHTML='<option value="">— Chọn môn học —</option>'+subjects.map(x=>`<option value="${esc(x.id)}">${esc(x.title)}${x.is_active?'':' · Ẩn'}</option>`).join('');
  s.value=subjects.some(x=>x.id===oldS)?oldS:'';
  const cs=chapters.filter(x=>x.subject_id===s.value);
  c.innerHTML='<option value="">— Chọn chương —</option>'+cs.map(x=>`<option value="${esc(x.id)}">${esc(x.title)}${x.is_active?'':' · Ẩn'}</option>`).join('');
  c.value=cs.some(x=>x.id===oldC)?oldC:'';
  const es=exercises.filter(x=>x.chapter_id===c.value);
  e.innerHTML='<option value="">— Chọn bài tập —</option>'+es.map(x=>`<option value="${esc(x.id)}">${esc(x.title)} · ${Number(x.question_count||0)} câu${x.is_active?'':' · Ẩn'}</option>`).join('');
  e.value=es.some(x=>x.id===oldE)?oldE:'';
  const sv=subjects.find(x=>x.id===s.value),cv=chapters.find(x=>x.id===c.value),ev=exercises.find(x=>x.id===e.value);
  const bs=$('#toggle-subject'),bc=$('#toggle-chapter'),be=$('#toggle-exercise');
  bs.disabled=!sv;bc.disabled=!cv;be.disabled=!ev;
  bs.textContent=sv?.is_active?'Ẩn môn':'Hiện môn';
  bc.textContent=cv?.is_active?'Ẩn chapter':'Hiện chapter';
  be.textContent=ev?.is_active?'Ẩn exercise':'Hiện exercise';
  updateImportTargetUI();
}
function renderQuestions(){const id=selected('#exercise');const list=$('#question-list');const qs=questions.filter(q=>q.exercise_id===id).sort((a,b)=>a.sort_order-b.sort_order);if(!id){list.className='empty';list.textContent='Chọn bài tập để xem ngân hàng câu hỏi.';return}if(!qs.length){list.className='empty';list.textContent='Bài tập này chưa có câu hỏi.';return}list.className='';list.innerHTML=qs.map((q,i)=>`<article class="questionCard"><div class="meta"><span>Q${i+1}</span><span class="badge">${esc(q.question_type)}</span><span class="badge ${q.status==='published'?'published':'draft'}">${esc(q.status)}</span><span class="badge ${q.verification_status==='verified'?'published':'draft'}">${esc(q.verification_status||'unreviewed')}</span>${q.metadata?.legacy_migrated===true?'<span class="badge">legacy→DB</span>':''}</div><p>${esc(q.prompt)}</p><button class="statusBtn" data-qid="${q.id}" data-status="${q.status}">${q.status==='published'?'Đưa về bản nháp':'Xuất bản'}</button></article>`).join('')}
function renderActivity(){const el=$('#audit-list');if(!el)return;if(!audits.length){el.innerHTML='<div class="empty">Chưa có thay đổi mới kể từ khi bật lịch sử.</div>';return}el.innerHTML=audits.map(a=>{const n=a.new_data||{},o=a.old_data||{};const label=n.title||n.prompt||o.title||o.prompt||a.record_id||'';const when=a.changed_at?new Date(a.changed_at).toLocaleString('vi-VN'):'';return `<div class="auditItem"><span class="auditAction">${esc(a.action)}</span><span class="auditTable">${esc(a.table_name)}</span><span class="auditLabel" title="${esc(label)}">${esc(label)}</span><span class="auditMeta">${esc(a.changed_email||'system')}<br>${esc(when)}</span></div>`}).join('')}
function renderSnapshotMeta(){const el=$('#snapshot-meta');if(!el)return;const s=snapshots[0];if(!s){el.innerHTML='<span>Backup gần nhất</span><code>Chưa có</code>';return}const when=s.created_at?new Date(s.created_at).toLocaleString('vi-VN'):'';el.innerHTML=`<span>Backup gần nhất</span><code>${esc(s.label)} · ${esc(when)}</code>`}
function parseAnswer(type,raw,opts){if(type==='single'){const n=Number(raw.trim());if(!Number.isInteger(n)||n<1||n>opts.length)throw new Error('Single: nhập số thứ tự đáp án đúng, ví dụ 3.');return n-1}if(type==='multiple'){const v=raw.split(',').map(x=>Number(x.trim()));if(!v.length||v.some(n=>!Number.isInteger(n)||n<1||n>opts.length))throw new Error('Multiple: dùng dạng 1,3.');return [...new Set(v.map(n=>n-1))].sort((a,b)=>a-b)}const v=raw.split(',').map(x=>x.trim().toLowerCase()).filter(Boolean).map(x=>['true','t','đúng','dung'].includes(x)?true:['false','f','sai'].includes(x)?false:null);if(v.length!==opts.length||v.includes(null))throw new Error('T/F: dùng dạng true,false,true đủ số nhận định.');return v}

$('#create-snapshot').addEventListener('click',async()=>{try{const session=await ensureSession();const now=new Date();const label='Manual content backup · '+now.toLocaleString('vi-VN');await restInsert('content_snapshots',{label,snapshot:{subjects,chapters,exercises,lessons,questions},schema_version:1,created_by:session.user.id});await reload();notice('Đã tạo backup nội dung trong Supabase.','ok')}catch(err){notice(err.message,'error')}});
async function toggleActive(table,id,item,label){if(!item)return;const next=!item.is_active;if(!confirm((next?'Hiện ':'Ẩn ')+label+' trên trang học?'))return;await restPatch(table,'id=eq.'+encodeURIComponent(id),{is_active:next});await reload();notice((next?'Đã hiện ':'Đã ẩn ')+label+'.','ok')}
$('#toggle-subject').addEventListener('click',()=>{const id=selected('#subject');return toggleActive('subjects',id,subjects.find(x=>x.id===id),'môn')});
$('#toggle-chapter').addEventListener('click',()=>{const id=selected('#chapter');return toggleActive('chapters',id,chapters.find(x=>x.id===id),'chapter')});
$('#toggle-exercise').addEventListener('click',()=>{const id=selected('#exercise');return toggleActive('exercises',id,exercises.find(x=>x.id===id),'exercise')});
$('#subject').addEventListener('change',()=>{renderStructure();renderQuestions();invalidateDestination()});
$('#chapter').addEventListener('change',()=>{renderStructure();renderQuestions();invalidateDestination()});
$('#exercise').addEventListener('change',()=>{renderQuestions();invalidateDestination()});
$('#import-target').addEventListener('change',()=>{clearRouteSuggestion();invalidateDestination();updateImportTargetUI()});
$('#refresh').addEventListener('click',()=>reload().then(()=>invalidateDestination()).catch(e=>notice(e.message,'error')));

// Cover previews are local-only: no AI image API call, no uploaded assets.
function renderSubjectCoverPreview(inputId,imageId,labelId,rootId){
  const name=$(inputId)?.value.trim()||'Accounting Fundamental';
  const draft={id:slugify(name)||'accounting',title:name};
  const image=$(imageId),label=$(labelId),root=$(rootId);
  if(!image||!label||!root)return;
  image.src=subjectCoverDataURL(draft);
  label.textContent=subjectCoverLabel(draft)+' · tạo ngay trên thiết bị, không tốn phí';
  if(rootId==='#subject-cover-preview-quick')
    root.hidden=!$('#quick-subject-form')?.classList.contains('show');
}
function refreshCoverPreviews(){
  renderSubjectCoverPreview('#subject-new','#subject-cover-image-main','#subject-cover-label-main','#subject-cover-preview-main');
  renderSubjectCoverPreview('#quick-subject-title','#subject-cover-image-quick','#subject-cover-label-quick','#subject-cover-preview-quick');
}
$('#subject-new').addEventListener('input',refreshCoverPreviews);
$('#quick-subject-title').addEventListener('input',refreshCoverPreviews);
$('#quick-add-subject').addEventListener('click',refreshCoverPreviews);
refreshCoverPreviews();

$('#subject-form').addEventListener('submit',async e=>{e.preventDefault();const title=$('#subject-new').value.trim();if(!title)return;const base=slugify(title)||'subject';const id=subjects.some(x=>x.id===base)?base+'_'+Date.now().toString().slice(-5):base;await restInsert('subjects',{id,title,sort_order:subjects.length,is_active:true});$('#subject-new').value='';refreshCoverPreviews();await reload();$('#subject').value=id;renderStructure();invalidateDestination()});
$('#chapter-form').addEventListener('submit',async e=>{e.preventDefault();const title=$('#chapter-new').value.trim(),sid=selected('#subject');if(!title||!sid)return;const id=sid+'__'+(slugify(title)||'chapter')+'_'+Date.now().toString().slice(-4);await restInsert('chapters',{id,subject_id:sid,title,sort_order:chapters.filter(x=>x.subject_id===sid).length,is_active:true});$('#chapter-new').value='';await reload();$('#subject').value=sid;renderStructure();$('#chapter').value=id;renderStructure();invalidateDestination()});
$('#exercise-form').addEventListener('submit',async e=>{e.preventDefault();const title=$('#exercise-new').value.trim(),cid=selected('#chapter'),sid=selected('#subject');if(!title||!cid)return;const id=cid+'__'+(slugify(title)||'exercise')+'_'+Date.now().toString().slice(-4);await restInsert('exercises',{id,chapter_id:cid,title,sort_order:exercises.filter(x=>x.chapter_id===cid).length,is_active:true,question_count:0});$('#exercise-new').value='';await reload();$('#subject').value=sid;renderStructure();$('#chapter').value=cid;renderStructure();$('#exercise').value=id;renderQuestions();invalidateDestination()});

$('#quick-add-subject').addEventListener('click',()=>$('#quick-subject-form').classList.toggle('show'));
$('#quick-add-chapter').addEventListener('click',()=>$('#quick-chapter-form').classList.toggle('show'));
$('#quick-add-exercise').addEventListener('click',()=>$('#quick-exercise-form').classList.toggle('show'));

$('#quick-subject-form').addEventListener('submit',async e=>{e.preventDefault();try{const title=$('#quick-subject-title').value.trim();if(!title)throw new Error('Nhập tên Subject mới.');const base=slugify(title)||'subject';const id=subjects.some(x=>x.id===base)?base+'_'+Date.now().toString().slice(-5):base;await restInsert('subjects',{id,title,sort_order:subjects.length,is_active:true});$('#quick-subject-title').value='';$('#quick-subject-form').classList.remove('show');refreshCoverPreviews();await reload();$('#subject').value=id;renderStructure();invalidateDestination('Đã tạo Subject mới. Hãy chọn/tạo Chapter rồi xác nhận nơi lưu.')}catch(err){notice(err.message,'error')}});
$('#quick-chapter-form').addEventListener('submit',async e=>{e.preventDefault();try{const sid=selected('#subject'),title=$('#quick-chapter-title').value.trim();if(!sid)throw new Error('Hãy chọn Subject trước khi tạo Chapter.');if(!title)throw new Error('Nhập tên Chapter mới.');const id=sid+'__'+(slugify(title)||'chapter')+'_'+Date.now().toString().slice(-4);await restInsert('chapters',{id,subject_id:sid,title,sort_order:chapters.filter(x=>x.subject_id===sid).length,is_active:true});$('#quick-chapter-title').value='';$('#quick-chapter-form').classList.remove('show');await reload();$('#subject').value=sid;renderStructure();$('#chapter').value=id;renderStructure();invalidateDestination('Đã tạo Chapter mới. Hãy chọn/tạo Exercise nếu cần rồi xác nhận nơi lưu.')}catch(err){notice(err.message,'error')}});
$('#quick-exercise-form').addEventListener('submit',async e=>{e.preventDefault();try{const sid=selected('#subject'),cid=selected('#chapter'),title=$('#quick-exercise-title').value.trim();if(!cid)throw new Error('Hãy chọn Chapter trước khi tạo Exercise.');if(!title)throw new Error('Nhập tên Exercise mới.');const id=cid+'__'+(slugify(title)||'exercise')+'_'+Date.now().toString().slice(-4);await restInsert('exercises',{id,chapter_id:cid,title,sort_order:exercises.filter(x=>x.chapter_id===cid).length,is_active:true,question_count:0});$('#quick-exercise-title').value='';$('#quick-exercise-form').classList.remove('show');await reload();$('#subject').value=sid;renderStructure();$('#chapter').value=cid;renderStructure();$('#exercise').value=id;renderQuestions();invalidateDestination('Đã tạo Exercise mới. Hãy xác nhận nơi lưu.')}catch(err){notice(err.message,'error')}});

$('#confirm-destination').addEventListener('click',()=>{
  if(!destinationComplete()){
    const needed=currentTargetType()==='lesson'?'Subject và Chapter':'Subject, Chapter và Exercise';
    return updateDestinationStatus('Thiếu đích lưu. Hãy chọn '+needed+'.','warning');
  }
  destinationConfirmed=true;
  destinationSignature=currentDestinationSignature();
  updateDestinationStatus();
  updateGenerateState();
});

function renderRouteSuggestion(result){
  routeSuggestion=result;
  const box=$('#route-suggestion');
  const confidence=Math.round(Number(result?.confidence||0)*100);
  const node=(label,item)=>{
    if(!item)return '';
    const title=item.match_title||item.suggested_title||'Chưa xác định';
    return `<div class="routeNode"><div><span>${esc(label)}</span><strong>${esc(title)}</strong></div><em>${item.match_id?'Đã có':'Đề xuất mới'}</em></div>`;
  };
  const mixed=result?.mixed_subjects===true;
  const hasNew=Boolean(result?.subject?.create_new||result?.chapter?.create_new||(currentTargetType()==='questions'&&result?.exercise?.create_new));
  const topics=(result?.detected_topics||[]).filter(Boolean);
  box.classList.remove('hidden');
  box.innerHTML=`<div class="routeSuggestionHead"><div><strong>${mixed?'Tài liệu có nhiều nhóm nội dung':'Gợi ý nơi lưu'}</strong></div><span class="routeConfidence">${confidence}%</span></div>
    <div class="routePath">${node('Subject',result?.subject)}${node('Chapter',result?.chapter)}${currentTargetType()==='questions'?node('Exercise',result?.exercise):''}</div>
    ${topics.length?`<div class="routeTopics"><b>Nhận diện:</b> ${topics.map(esc).join(' · ')}</div>`:''}
    ${mixed?'<div class="warning">AI phát hiện file có thể chứa nhiều môn/chủ đề. Không tự áp dụng gợi ý; hãy tách file hoặc chọn đích thủ công trước khi xác nhận.</div>':''}
    <div class="routeSuggestionActions">
      <button id="route-apply" class="routeApply" type="button" ${mixed?'disabled':''}>${hasNew?'＋ Tạo mục còn thiếu & áp dụng':'✓ Áp dụng gợi ý'}</button>
      <button id="route-dismiss" class="routeDismiss" type="button">Chọn thủ công</button>
    </div>`;
}

async function applyRouteSuggestion(){
  if(!routeSuggestion||routeSuggestion.mixed_subjects)throw new Error('File có nhiều nhóm nội dung; hãy chọn nơi lưu thủ công.');
  let subjectId=routeSuggestion.subject?.match_id||'';
  if(!subjectId){
    const title=routeSuggestion.subject?.suggested_title?.trim();
    if(!title)throw new Error('AI chưa đưa ra tên Subject hợp lệ.');
    const base=slugify(title)||'subject';
    subjectId=subjects.some(x=>x.id===base)?base+'_'+Date.now().toString().slice(-5):base;
    await restInsert('subjects',{id:subjectId,title,sort_order:subjects.length,is_active:true});
  }

  let chapterId=routeSuggestion.chapter?.match_id||'';
  if(chapterId){
    const existing=chapters.find(x=>x.id===chapterId);
    if(!existing||existing.subject_id!==subjectId)chapterId='';
  }
  if(!chapterId){
    const title=routeSuggestion.chapter?.suggested_title?.trim();
    if(!title)throw new Error('AI chưa đưa ra tên Chapter hợp lệ.');
    chapterId=subjectId+'__'+(slugify(title)||'chapter')+'_'+Date.now().toString().slice(-4);
    await restInsert('chapters',{id:chapterId,subject_id:subjectId,title,sort_order:chapters.filter(x=>x.subject_id===subjectId).length,is_active:true});
  }

  let exerciseId='';
  if(currentTargetType()==='questions'){
    exerciseId=routeSuggestion.exercise?.match_id||'';
    if(exerciseId){
      const existing=exercises.find(x=>x.id===exerciseId);
      if(!existing||existing.chapter_id!==chapterId)exerciseId='';
    }
    if(!exerciseId){
      const title=routeSuggestion.exercise?.suggested_title?.trim()||'Practice Questions';
      exerciseId=chapterId+'__'+(slugify(title)||'exercise')+'_'+Date.now().toString().slice(-4);
      await restInsert('exercises',{id:exerciseId,chapter_id:chapterId,title,sort_order:exercises.filter(x=>x.chapter_id===chapterId).length,is_active:true,question_count:0});
    }
  }

  await reload();
  $('#subject').value=subjectId;renderStructure();
  $('#chapter').value=chapterId;renderStructure();
  if(exerciseId){$('#exercise').value=exerciseId;renderQuestions()}
  destinationConfirmed=true;
  destinationSignature=currentDestinationSignature();
  updateDestinationStatus();
  updateGenerateState();
  notice('Đã áp dụng nơi lưu do AI gợi ý. Bạn vẫn có thể đổi thủ công trước khi Generate Draft.','ok');
}

$('#route-suggestion').addEventListener('click',async e=>{
  if(e.target.id==='route-dismiss'){clearRouteSuggestion();return}
  if(e.target.id!=='route-apply')return;
  const btn=e.target;
  if(btn.disabled)return;
  btn.disabled=true;
  try{await applyRouteSuggestion()}catch(err){notice(err.message,'error');btn.disabled=false}
});

$('#ai-route').addEventListener('click',async()=>{
  const btn=$('#ai-route');
  if(btn.disabled)return;
  const label=btn.textContent;
  btn.disabled=true;
  btn.textContent='Đang phân loại…';
  importBusy=true;updateGenerateState();
  try{
    const files=currentImportFiles();validateImportFiles(files);
    notice('Đang đọc tài liệu và đối chiếu với cấu trúc khóa học hiện có…');
    for(let i=0;i<files.length;i++){setImportProgress(`Đang tải tệp ${i+1}/${files.length} để gợi ý nơi lưu…`);await ensurePreparedUpload(files[i])}
    const result=await callAiRoute({...aiSourceInput(),targetType:currentTargetType()});
    setImportProgress('Đã đọc '+files.length+' tệp để gợi ý nơi lưu.');
    renderRouteSuggestion(result);
    invalidateDestination(result.mixed_subjects?'AI phát hiện nhiều nhóm nội dung. Hãy chọn đích thủ công.':'AI đã gợi ý nơi lưu. Hãy áp dụng hoặc chọn thủ công rồi xác nhận.');
    notice(result.mixed_subjects?'AI phát hiện file có thể chứa nhiều môn/chủ đề.':'AI đã phân loại xong. Hãy xác nhận nơi lưu trước khi Generate Draft.',result.mixed_subjects?'error':'ok');
  }catch(err){
    if(err.retryAfterSeconds)aiRetryAt=Date.now()+err.retryAfterSeconds*1000;
    notice(err.message+' Bạn có thể chọn nơi lưu thủ công và bấm “Xác nhận nơi lưu”.','error');
  }
  finally{importBusy=false;btn.textContent=label;renderImportFiles();updateGenerateState()}
});

$('#question-form').addEventListener('submit',async e=>{e.preventDefault();try{const exercise_id=selected('#exercise');if(!exercise_id)throw new Error('Hãy chọn Exercise trước.');const type=selected('#q-type');const options=$('#q-options').value.split('\n').map(v=>v.trim()).filter(Boolean);if(options.length<2)throw new Error('Cần ít nhất 2 lựa chọn.');const answer=parseAnswer(type,$('#q-answer').value,options);const qs=questions.filter(q=>q.exercise_id===exercise_id);const sort_order=qs.length?Math.max(...qs.map(q=>q.sort_order))+1:0;await restInsert('questions',{exercise_id,question_type:type,prompt:$('#q-prompt').value.trim(),options,correct_answer:answer,required_selections:type==='multiple'?answer.length:type==='tf'?options.length:1,explanation_en:$('#q-en').value.trim()||null,explanation_vi:$('#q-vi').value.trim()||null,practical_example_en:$('#q-example-en').value.trim()||null,practical_example_vi:$('#q-example-vi').value.trim()||null,standard_reference:$('#q-standard-ref').value.trim()||null,verification_status:'unreviewed',verification_note:'Câu hỏi tạo thủ công; chưa chạy kiểm định tự động.',status:selected('#q-status'),sort_order,source_page:null,source_id:manualSourceContext('questions')?.sourceId||null,metadata:{manual_created:true,import_draft_id:manualSourceContext('questions')?.draftId||null}});e.target.reset();$('#q-options').value='A. \nB. \nC. \nD. ';await reload();notice('Đã lưu câu hỏi.','ok')}catch(err){notice(err.message,'error')}});
$('#question-list').addEventListener('click',async e=>{const b=e.target.closest('[data-qid]');if(!b)return;const next=b.dataset.status==='published'?'draft':'published';const label=next==='draft'?'ẩn câu này khỏi người học':'publish câu này cho người học';if(!confirm('Xác nhận '+label+'?'))return;await restPatch('questions','id=eq.'+encodeURIComponent(b.dataset.qid),{status:next});await reload()});

$('#lesson-form').addEventListener('submit',async e=>{e.preventDefault();try{const chapter_id=selected('#chapter');if(!chapter_id)throw new Error('Hãy chọn Chapter trước.');const title=$('#manual-lesson-title').value.trim();const content_markdown=$('#manual-lesson-content').value.trim();if(!title||!content_markdown)throw new Error('Lesson cần Title và Content.');const session=await ensureSession();const ls=lessons.filter(x=>x.chapter_id===chapter_id);const sort_order=ls.length?Math.max(...ls.map(x=>x.sort_order))+1:0;await restInsert('lessons',{chapter_id,title,summary:$('#manual-lesson-summary').value.trim()||null,content_markdown,content_json:{manual_created:true,import_draft_id:manualSourceContext('lesson')?.draftId||null},source_id:manualSourceContext('lesson')?.sourceId||null,status:selected('#manual-lesson-status')||'published',sort_order,created_by:session.user.id,updated_by:session.user.id});e.target.reset();$('#manual-lesson-status').value='published';await reload();notice('Đã lưu bài học. Mở Thư viện bài học để kiểm tra.','ok')}catch(err){notice(err.message,'error')}});

$('#import-file').addEventListener('change',e=>{
  const picked=Array.from(e.target.files||[]);
  if(picked.length){try{validateImportFiles(picked)}catch(err){e.target.value='';notice(err.message,'error');return}}
  // A resumed upload may be missing only the files that never reached Storage.
  const missing=preparedImport?.files?.filter(f=>!f.storagePath)||[];
  if(activeDraft&&missing.length&&picked.length){
    if(picked.some(f=>!missing.some(m=>m.key===importFileKey(f)))){
      e.target.value='';return notice('Đang tiếp tục bản nháp. Hãy chọn đúng các tệp còn thiếu trong danh sách; mở lại trang để bắt đầu bộ tệp khác.','error');
    }
    selectedImportFiles=selectedImportFiles.map(f=>picked.find(p=>importFileKey(p)===importFileKey(f))||f);
    renderImportRecovery();updateGenerateState();notice('Đã nhận lại tệp còn thiếu. Bấm tạo bản nháp để tiếp tục.','ok');return;
  }
  selectedImportFiles=picked;preparedImport=null;activeDraft=null;manualImportContext=null;
  importSourceId=null;importDraftId=null;importedQuestions=[];importedLesson=null;
  clearRouteSuggestion();renderImportRecovery();setImportProgress('');
  $('#review-area').classList.add('hidden');$('#import-warning').classList.add('hidden');
  invalidateDestination(picked.length?'Đã chọn '+picked.length+' tệp. Hãy để AI gợi ý hoặc chọn nơi lưu thủ công.':'');
  updateGenerateState();
});
async function patchActiveImport(patch){
  const rows=await restPatch('import_drafts','id=eq.'+encodeURIComponent(importDraftId),patch);
  if(!rows[0]?.id)throw new Error('Chưa cập nhật được bản nháp. Hãy thử lại.');
  rememberImport({...activeDraft,...patch,...rows[0]});
}
async function runImport(useAI){
  const btn=useAI?$('#ai-generate'):$('#save-import');
  if(btn.disabled||importBusy)return;
  importBusy=true;
  btn.textContent=useAI?'Đang xử lý…':'Đang lưu…';
  updateGenerateState();
  let workingDraft=null;
  try{
    const files=currentImportFiles();validateImportFiles(files);const f=files[0];
    if(!destinationComplete())throw new Error(currentTargetType()==='lesson'?'Hãy chọn Subject và Chapter đích.':'Hãy chọn Subject, Chapter và Exercise đích.');
    if(!destinationConfirmed||destinationSignature!==currentDestinationSignature())throw new Error('Nơi lưu chưa được xác nhận hoặc vừa thay đổi. Hãy bấm “Xác nhận nơi lưu”.');
    const subject=subjects.find(x=>x.id===selected('#subject'));
    const chapter=chapters.find(x=>x.id===selected('#chapter'));
    const exercise=currentTargetType()==='questions'?exercises.find(x=>x.id===selected('#exercise')):null;
    if(!subject||!chapter||(currentTargetType()==='questions'&&!exercise))throw new Error('Đích lưu không còn hợp lệ. Hãy chọn lại.');
    notice('Đang lưu tệp nguồn và bản nháp…');
    const prepared=await persistImportSource(files,subject,chapter,exercise);
    workingDraft=activeDraft.id;
    if(!useAI){
      notice('Đã lưu bản nháp và tệp nguồn. Bấm “Nhập thủ công” để tiếp tục mà không cần AI.','ok');
      return;
    }
    if(activeDraft.payload?.processing?.state==='ready'){
      importedQuestions=activeDraft.payload.questions||[];importedLesson=activeDraft.payload.lesson||null;
      renderReview(activeDraft.payload.warnings||[]);
      notice('Đã mở bản nháp AI đã lưu. Hãy kiểm tra trước khi xuất bản.','ok');
      return;
    }
    await patchActiveImport({payload:{...activeDraft.payload,processing:{state:'processing',started_at:Date.now()}}});
    setImportProgress('AI đang đọc cả '+files.length+' tệp và ghép thành một bản nháp…');
    notice('Bản nháp và tệp nguồn đã lưu. AI đang chuyển đổi nội dung…');
    const resultKey=workingDraft+'|'+currentDestinationSignature();
    const ai=prepared.resultKey===resultKey&&prepared.result?prepared.result:await callAiImport({
      ...aiSourceInput(),targetType:currentTargetType(),
      subjectTitle:subject.title,chapterTitle:chapter.title,exerciseTitle:exercise?.title||''
    });
    // Keep a successful response if saving it fails, so retrying does not use AI quota again.
    prepared.result=ai;prepared.resultKey=resultKey;
    await patchActiveImport({title:ai.title||f.name,model_name:ai.model_name||'configured-provider',payload:{
      ...activeDraft.payload,questions:ai.questions||[],lesson:ai.lesson||null,warnings:ai.warnings||[],processing:{state:'ready'}
    }});
    importedQuestions=ai.questions||[];importedLesson=ai.lesson||null;
    setImportProgress(`Hoàn tất ${files.length} tệp · ${importedQuestions.length} câu hỏi${importedLesson?' · 1 bài học':''}.`);
    renderReview(ai.warnings||[]);renderImportRecovery();
    notice('AI đã tạo và lưu bản nháp. Hãy kiểm tra trước khi xuất bản.','ok');
  }catch(err){
    if(err.retryAfterSeconds)aiRetryAt=Date.now()+err.retryAfterSeconds*1000;
    if(activeDraft&&preparedImport?.draftSignature===currentDestinationSignature()&&(!workingDraft||activeDraft.id===workingDraft)){
      setImportProgress('Xử lý chưa hoàn tất. Các tệp đã lưu được giữ trong bản nháp.');
      try{
        await patchActiveImport({payload:{...activeDraft.payload,files:importManifest(),processing:{state:'failed',error_code:err.code||'IMPORT_FAILED',message:err.message,retry_at:aiRetryAt||null}}});
      }catch(saveError){console.error('Could not update import retry state',saveError)}
      renderImportRecovery();
      notice(err.message+' Bản nháp và tệp nguồn đã được giữ lại.','error');
    }else notice(err.message,'error');
  }finally{
    importBusy=false;$('#save-import').textContent='Lưu bản nháp không dùng AI';renderImportFiles();updateGenerateState();
  }
}
$('#ai-generate').addEventListener('click',()=>runImport(true));
$('#save-import').addEventListener('click',()=>runImport(false));
function renderReview(warnings){const w=$('#import-warning');w.classList.toggle('hidden',!warnings.length);w.textContent=warnings.join(' · ');const area=$('#review-area');area.classList.remove('hidden');let html='';if(importedQuestions.length){const mismatch=warnings.includes('SOURCE_CONTEXT_MISMATCH');html+=`<div class="reviewHead"><div><strong>Question Draft</strong><div style="color:#748a9c;font-size:.75rem">${importedQuestions.length} câu · chưa publish</div></div><button id="publish-imported" class="primary" ${mismatch?'disabled title="Nguồn không khớp môn/chapter/exercise đang chọn"':''}>${mismatch?'Không thể publish · sai ngữ cảnh':'Publish toàn bộ câu đã review'}</button></div>`+importedQuestions.map((q,i)=>`<article class="importCard"><div class="meta"><span>Q${i+1}</span><span class="badge">${esc(preparedImport?.files?.[(q.source_file||1)-1]?.name||'')}</span><span class="badge">${esc(q.question_type)}</span><span class="badge ${Number(q.confidence||0)>=.8?'published':'draft'}">${Math.round(Number(q.confidence||0)*100)}% confidence</span><span class="badge ${q.verification_status==='verified'?'published':'draft'}">${esc(q.verification_status||'needs_review')}</span></div><label class="field"><span>Question</span><textarea data-i="${i}" data-k="prompt" rows="3">${esc(q.prompt)}</textarea></label><label class="field"><span>Options</span><textarea data-i="${i}" data-k="options" rows="5">${esc((q.options||[]).join('\n'))}</textarea></label><div class="answer"><span>Đáp án AI</span><code>${esc(JSON.stringify(q.correct_answer))}</code></div><div class="grid2"><label class="field"><span>Explanation EN</span><textarea data-i="${i}" data-k="explanation_en" rows="4">${esc(q.explanation_en||'')}</textarea></label><label class="field"><span>Explanation VI</span><textarea data-i="${i}" data-k="explanation_vi" rows="4">${esc(q.explanation_vi||'')}</textarea></label></div><div class="grid2"><label class="field"><span>Practical Example EN</span><textarea data-i="${i}" data-k="practical_example_en" rows="4">${esc(q.practical_example_en||'')}</textarea></label><label class="field"><span>Ví dụ thực tế VI</span><textarea data-i="${i}" data-k="practical_example_vi" rows="4">${esc(q.practical_example_vi||'')}</textarea></label></div><label class="field"><span>Standard reference</span><input data-i="${i}" data-k="standard_reference" value="${esc(q.standard_reference||'')}"></label>${q.verification_note?`<div class="warning"><strong>Verification:</strong> ${esc(q.verification_note)}</div>`:''}${q.review_note?`<div class="warning"><strong>AI note:</strong> ${esc(q.review_note)}</div>`:''}</article>`).join('')}
if(importedLesson){html+=`<div class="reviewHead"><div><strong>Lesson Draft</strong></div><button id="publish-lesson" class="primary">Publish Lesson</button></div><label class="field"><span>Title</span><input id="lesson-title" value="${esc(importedLesson.title||'')}"></label><label class="field"><span>Summary</span><textarea id="lesson-summary" rows="3">${esc(importedLesson.summary||'')}</textarea></label><label class="field"><span>Original / source content</span><textarea id="lesson-content" rows="14">${esc(importedLesson.content_markdown||'')}</textarea></label><label class="field"><span>Nội dung VI</span><textarea id="lesson-content-vi" rows="14">${esc(importedLesson.content_markdown_vi||'')}</textarea></label>${importedLesson.verification_note?`<div class="warning"><strong>Verification:</strong> ${esc(importedLesson.verification_note)}</div>`:''}`}area.innerHTML=html}
$('#review-area').addEventListener('input',e=>{const el=e.target;if(el.dataset?.i==null)return;const i=Number(el.dataset.i),k=el.dataset.k;if(k==='options')importedQuestions[i].options=el.value.split('\n').map(v=>v.trim()).filter(Boolean);else importedQuestions[i][k]=el.value});
$('#review-area').addEventListener('click',async e=>{if(e.target.id==='publish-imported'){const btn=e.target;if(btn.disabled)return;btn.disabled=true;try{assertImportReviewDestination();const exercise_id=selected('#exercise');if(!exercise_id)throw new Error('Hãy chọn Exercise đích.');const existing=questions.filter(q=>q.exercise_id===exercise_id);const start=existing.length?Math.max(...existing.map(q=>q.sort_order))+1:0;const rows=importedQuestions.map((q,i)=>({exercise_id,question_type:q.question_type,prompt:q.prompt,options:q.options,correct_answer:q.correct_answer,required_selections:q.required_selections,explanation_en:q.explanation_en||null,explanation_vi:q.explanation_vi||null,practical_example_en:q.practical_example_en||null,practical_example_vi:q.practical_example_vi||null,standard_reference:q.standard_reference||null,verification_status:q.verification_status||'needs_review',verification_note:q.verification_note||null,verified_at:q.verification_status==='verified'?new Date().toISOString():null,status:['needs_review','conflict'].includes(q.verification_status)?'draft':'published',sort_order:start+i,source_page:q.source_page||null,source_id:preparedImport?.files?.[(q.source_file||1)-1]?.sourceId||importSourceId,metadata:{ai_imported:true,source_ids:(q.source_files||[q.source_file||1]).map(n=>preparedImport?.files?.[n-1]?.sourceId).filter(Boolean),confidence:q.confidence,review_note:q.review_note,import_draft_id:importDraftId,draft_index:i}}));await restInsert('questions',rows);if(importDraftId)await restPatch('import_drafts','id=eq.'+encodeURIComponent(importDraftId),{status:'published',payload:{...activeDraft.payload,questions:importedQuestions,published_to_exercise:exercise_id}});importedQuestions=[];await reload();if(importedLesson)renderReview([]);else $('#review-area').classList.add('hidden');notice('Đã publish AI question draft.','ok')}catch(err){btn.disabled=false;notice(err.message,'error')}}if(e.target.id==='publish-lesson'){const btn=e.target;if(btn.disabled)return;btn.disabled=true;try{assertImportReviewDestination();const chapter_id=selected('#chapter');if(!chapter_id)throw new Error('Hãy chọn Chapter đích.');const session=await ensureSession();const ls=lessons.filter(x=>x.chapter_id===chapter_id);const sort_order=ls.length?Math.max(...ls.map(x=>x.sort_order))+1:0;await restInsert('lessons',{chapter_id,title:$('#lesson-title').value.trim()||'Imported lesson',summary:$('#lesson-summary').value.trim()||null,content_markdown:$('#lesson-content').value,content_markdown_vi:$('#lesson-content-vi')?.value||null,content_json:{ai_imported:true,import_draft_id:importDraftId,source_ids:preparedImport?.files?.map(f=>f.sourceId)||[]},standard_references:importedLesson.standard_references||[],verification_status:importedLesson.verification_status||'needs_review',verification_note:importedLesson.verification_note||null,verified_at:importedLesson.verification_status==='verified'?new Date().toISOString():null,source_id:importSourceId,status:['needs_review','conflict'].includes(importedLesson.verification_status)?'draft':'published',sort_order,created_by:session.user.id,updated_by:session.user.id});if(importDraftId)await restPatch('import_drafts','id=eq.'+encodeURIComponent(importDraftId),{status:'published',payload:{...activeDraft.payload,lesson:importedLesson,published_to_chapter:chapter_id}});importedLesson=null;await reload();if(importedQuestions.length)renderReview([]);else $('#review-area').classList.add('hidden');notice('Đã publish Lesson.','ok')}catch(err){btn.disabled=false;notice(err.message,'error')}}});

(async()=>{try{const s=await ensureEditorSession();$('#admin-user').textContent='Quản lý nội dung · '+s.user.email;$('#app').classList.remove('hidden');await reload()}catch(err){$('#auth-block').classList.remove('hidden')}})();
