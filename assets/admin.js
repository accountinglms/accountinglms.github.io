import { ensureSession, ensureEditorSession, restGet, restInsert, restPatch, uploadImportFile, callAiImport, callAiRoute } from './common.js';

const $ = s => document.querySelector(s);
let subjects=[], chapters=[], exercises=[], questions=[], lessons=[], audits=[], snapshots=[];
let importedQuestions=[], importedLesson=null, importSourceId=null, importDraftId=null;
let preparedImport=null, routeSuggestion=null, destinationConfirmed=false, destinationSignature='';

function notice(text, kind='info'){const n=$('#notice');n.textContent=text;n.className='notice '+(kind==='info'?'':kind)}
function slugify(v){return v.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,48)}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function selected(sel){return $(sel)?.value||''}
function importFileKey(file){return file?[file.name,file.size,file.lastModified,file.type].join('|'):''}
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
  const file=$('#import-file')?.files?.[0];
  const valid=Boolean(file&&destinationComplete()&&destinationConfirmed&&destinationSignature===currentDestinationSignature());
  const btn=$('#ai-generate');
  if(btn)btn.disabled=!valid;
  const route=$('#ai-route');
  if(route)route.disabled=!file;
}
function clearRouteSuggestion(){
  routeSuggestion=null;
  const box=$('#route-suggestion');
  if(box){box.classList.add('hidden');box.innerHTML=''}
}
async function ensurePreparedUpload(file){
  const key=importFileKey(file);
  if(preparedImport?.key===key&&preparedImport.storagePath)return preparedImport;
  const up=await uploadImportFile(file);
  preparedImport={key,storagePath:up.storagePath,sourceId:null};
  return preparedImport;
}

async function reload(){
  const data=await Promise.all([
    restGet('subjects','select=*&order=sort_order.asc'),restGet('chapters','select=*&order=sort_order.asc'),restGet('exercises','select=*&order=sort_order.asc'),restGet('questions','select=*&order=sort_order.asc'),restGet('lessons','select=*&order=sort_order.asc'),restGet('content_audit_log','select=*&order=changed_at.desc&limit=30'),restGet('content_snapshots','select=id,label,created_at,created_by&order=created_at.desc&limit=10')
  ]);
  [subjects,chapters,exercises,questions,lessons,audits,snapshots]=data;
  renderStructure(); renderQuestions(); renderActivity(); renderSnapshotMeta(); notice('Đã tải dữ liệu quản trị từ Supabase.','ok');
}
function renderStructure(){
  const s=$('#subject'),c=$('#chapter'),e=$('#exercise'); const oldS=s.value,oldC=c.value,oldE=e.value;
  s.innerHTML='<option value="">— Chọn Subject —</option>'+subjects.map(x=>`<option value="${esc(x.id)}">${esc(x.title)}${x.is_active?'':' · Ẩn'}</option>`).join('');
  s.value=subjects.some(x=>x.id===oldS)?oldS:'';
  const cs=chapters.filter(x=>x.subject_id===s.value);
  c.innerHTML='<option value="">— Chọn Chapter —</option>'+cs.map(x=>`<option value="${esc(x.id)}">${esc(x.title)}${x.is_active?'':' · Ẩn'}</option>`).join('');
  c.value=cs.some(x=>x.id===oldC)?oldC:'';
  const es=exercises.filter(x=>x.chapter_id===c.value);
  e.innerHTML='<option value="">— Chọn Exercise —</option>'+es.map(x=>`<option value="${esc(x.id)}">${esc(x.title)} · ${Number(x.question_count||0)} published${x.is_active?'':' · Ẩn'}</option>`).join('');
  e.value=es.some(x=>x.id===oldE)?oldE:'';
  const sv=subjects.find(x=>x.id===s.value),cv=chapters.find(x=>x.id===c.value),ev=exercises.find(x=>x.id===e.value);
  const bs=$('#toggle-subject'),bc=$('#toggle-chapter'),be=$('#toggle-exercise');
  bs.disabled=!sv;bc.disabled=!cv;be.disabled=!ev;
  bs.textContent=sv?.is_active?'Ẩn môn':'Hiện môn';
  bc.textContent=cv?.is_active?'Ẩn chapter':'Hiện chapter';
  be.textContent=ev?.is_active?'Ẩn exercise':'Hiện exercise';
  updateImportTargetUI();
}
function renderQuestions(){const id=selected('#exercise');const list=$('#question-list');const qs=questions.filter(q=>q.exercise_id===id).sort((a,b)=>a.sort_order-b.sort_order);if(!id){list.className='empty';list.textContent='Chọn Exercise để xem question bank.';return}if(!qs.length){list.className='empty';list.textContent='Exercise này chưa có câu hỏi trong database.';return}list.className='';list.innerHTML=qs.map((q,i)=>`<article class="questionCard"><div class="meta"><span>Q${i+1}</span><span class="badge">${esc(q.question_type)}</span><span class="badge ${q.status==='published'?'published':'draft'}">${esc(q.status)}</span><span class="badge ${q.verification_status==='verified'?'published':'draft'}">${esc(q.verification_status||'unreviewed')}</span>${q.metadata?.legacy_migrated===true?'<span class="badge">legacy→DB</span>':''}</div><p>${esc(q.prompt)}</p><button class="statusBtn" data-qid="${q.id}" data-status="${q.status}">${q.status==='published'?'Chuyển về Draft':'Publish'}</button></article>`).join('')}
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

$('#subject-form').addEventListener('submit',async e=>{e.preventDefault();const title=$('#subject-new').value.trim();if(!title)return;const base=slugify(title)||'subject';const id=subjects.some(x=>x.id===base)?base+'_'+Date.now().toString().slice(-5):base;await restInsert('subjects',{id,title,sort_order:subjects.length,is_active:true});$('#subject-new').value='';await reload();$('#subject').value=id;renderStructure();invalidateDestination()});
$('#chapter-form').addEventListener('submit',async e=>{e.preventDefault();const title=$('#chapter-new').value.trim(),sid=selected('#subject');if(!title||!sid)return;const id=sid+'__'+(slugify(title)||'chapter')+'_'+Date.now().toString().slice(-4);await restInsert('chapters',{id,subject_id:sid,title,sort_order:chapters.filter(x=>x.subject_id===sid).length,is_active:true});$('#chapter-new').value='';await reload();$('#subject').value=sid;renderStructure();$('#chapter').value=id;renderStructure();invalidateDestination()});
$('#exercise-form').addEventListener('submit',async e=>{e.preventDefault();const title=$('#exercise-new').value.trim(),cid=selected('#chapter'),sid=selected('#subject');if(!title||!cid)return;const id=cid+'__'+(slugify(title)||'exercise')+'_'+Date.now().toString().slice(-4);await restInsert('exercises',{id,chapter_id:cid,title,sort_order:exercises.filter(x=>x.chapter_id===cid).length,is_active:true,question_count:0});$('#exercise-new').value='';await reload();$('#subject').value=sid;renderStructure();$('#chapter').value=cid;renderStructure();$('#exercise').value=id;renderQuestions();invalidateDestination()});

$('#quick-add-subject').addEventListener('click',()=>$('#quick-subject-form').classList.toggle('show'));
$('#quick-add-chapter').addEventListener('click',()=>$('#quick-chapter-form').classList.toggle('show'));
$('#quick-add-exercise').addEventListener('click',()=>$('#quick-exercise-form').classList.toggle('show'));

$('#quick-subject-form').addEventListener('submit',async e=>{e.preventDefault();try{const title=$('#quick-subject-title').value.trim();if(!title)throw new Error('Nhập tên Subject mới.');const base=slugify(title)||'subject';const id=subjects.some(x=>x.id===base)?base+'_'+Date.now().toString().slice(-5):base;await restInsert('subjects',{id,title,sort_order:subjects.length,is_active:true});$('#quick-subject-title').value='';$('#quick-subject-form').classList.remove('show');await reload();$('#subject').value=id;renderStructure();invalidateDestination('Đã tạo Subject mới. Hãy chọn/tạo Chapter rồi xác nhận nơi lưu.')}catch(err){notice(err.message,'error')}});
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
  box.innerHTML=`<div class="routeSuggestionHead"><div><strong>${mixed?'⚠ File có nhiều nhóm nội dung':'✨ AI gợi ý nơi lưu'}</strong></div><span class="routeConfidence">${confidence}%</span></div>
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
  btn.textContent='✨ Đang phân loại…';
  try{
    const file=$('#import-file').files?.[0];
    if(!file)throw new Error('Hãy chọn file trước.');
    if(file.size>4*1024*1024)throw new Error('File vượt quá 4 MB.');
    notice('Đang đọc file và so khớp với Subject / Chapter hiện có…');
    const prepared=await ensurePreparedUpload(file);
    const result=await callAiRoute({storagePath:prepared.storagePath,fileName:file.name,mimeType:file.type,targetType:currentTargetType()});
    renderRouteSuggestion(result);
    invalidateDestination(result.mixed_subjects?'AI phát hiện nhiều nhóm nội dung. Hãy chọn đích thủ công.':'AI đã gợi ý nơi lưu. Hãy áp dụng hoặc chọn thủ công rồi xác nhận.');
    notice(result.mixed_subjects?'AI phát hiện file có thể chứa nhiều môn/chủ đề.':'AI đã phân loại xong. Hãy xác nhận nơi lưu trước khi Generate Draft.',result.mixed_subjects?'error':'ok');
  }catch(err){notice(err.message,'error')}
  finally{btn.textContent=label;updateGenerateState()}
});

$('#question-form').addEventListener('submit',async e=>{e.preventDefault();try{const exercise_id=selected('#exercise');if(!exercise_id)throw new Error('Hãy chọn Exercise trước.');const type=selected('#q-type');const options=$('#q-options').value.split('\n').map(v=>v.trim()).filter(Boolean);if(options.length<2)throw new Error('Cần ít nhất 2 lựa chọn.');const answer=parseAnswer(type,$('#q-answer').value,options);const qs=questions.filter(q=>q.exercise_id===exercise_id);const sort_order=qs.length?Math.max(...qs.map(q=>q.sort_order))+1:0;await restInsert('questions',{exercise_id,question_type:type,prompt:$('#q-prompt').value.trim(),options,correct_answer:answer,required_selections:type==='multiple'?answer.length:type==='tf'?options.length:1,explanation_en:$('#q-en').value.trim()||null,explanation_vi:$('#q-vi').value.trim()||null,practical_example_en:$('#q-example-en').value.trim()||null,practical_example_vi:$('#q-example-vi').value.trim()||null,standard_reference:$('#q-standard-ref').value.trim()||null,verification_status:'unreviewed',verification_note:'Câu hỏi tạo thủ công; chưa chạy kiểm định tự động.',status:selected('#q-status'),sort_order,source_page:null,metadata:{manual_created:true}});e.target.reset();$('#q-options').value='A. \nB. \nC. \nD. ';await reload();notice('Đã lưu question.','ok')}catch(err){notice(err.message,'error')}});
$('#question-list').addEventListener('click',async e=>{const b=e.target.closest('[data-qid]');if(!b)return;const next=b.dataset.status==='published'?'draft':'published';const label=next==='draft'?'ẩn câu này khỏi người học':'publish câu này cho người học';if(!confirm('Xác nhận '+label+'?'))return;await restPatch('questions','id=eq.'+encodeURIComponent(b.dataset.qid),{status:next});await reload()});

$('#lesson-form').addEventListener('submit',async e=>{e.preventDefault();try{const chapter_id=selected('#chapter');if(!chapter_id)throw new Error('Hãy chọn Chapter trước.');const title=$('#manual-lesson-title').value.trim();const content_markdown=$('#manual-lesson-content').value.trim();if(!title||!content_markdown)throw new Error('Lesson cần Title và Content.');const session=await ensureSession();const ls=lessons.filter(x=>x.chapter_id===chapter_id);const sort_order=ls.length?Math.max(...ls.map(x=>x.sort_order))+1:0;await restInsert('lessons',{chapter_id,title,summary:$('#manual-lesson-summary').value.trim()||null,content_markdown,content_json:{},source_id:null,status:selected('#manual-lesson-status')||'published',sort_order,created_by:session.user.id,updated_by:session.user.id});e.target.reset();$('#manual-lesson-status').value='published';await reload();notice('Đã lưu Lesson. Mở Thư viện lý thuyết để kiểm tra.','ok')}catch(err){notice(err.message,'error')}});

$('#import-file').addEventListener('change',e=>{
  const f=e.target.files?.[0];
  $('#import-file-name').textContent=f?f.name:'Chọn ảnh, PDF hoặc TXT';
  $('#import-file-meta').textContent=f?(f.size/1024/1024).toFixed(2)+' MB':'Tối đa 4 MB mỗi file';
  preparedImport=null;
  importSourceId=null;
  importDraftId=null;
  importedQuestions=[];
  importedLesson=null;
  clearRouteSuggestion();
  $('#review-area').classList.add('hidden');
  $('#import-warning').classList.add('hidden');
  invalidateDestination(f?'File mới đã chọn. Hãy để AI gợi ý hoặc chọn nơi lưu thủ công.':'');
  updateGenerateState();
});
$('#ai-generate').addEventListener('click',async()=>{
  const btn=$('#ai-generate');
  if(btn.disabled)return;
  const label=btn.textContent;
  btn.disabled=true;
  btn.textContent='✦ Đang xử lý…';
  try{
    const f=$('#import-file').files?.[0];
    if(!f)throw new Error('Hãy chọn file trước.');
    if(f.size>4*1024*1024)throw new Error('File vượt quá 4 MB.');
    if(!destinationComplete())throw new Error(currentTargetType()==='lesson'?'Hãy chọn Subject và Chapter đích.':'Hãy chọn Subject, Chapter và Exercise đích.');
    if(!destinationConfirmed||destinationSignature!==currentDestinationSignature())throw new Error('Nơi lưu chưa được xác nhận hoặc vừa thay đổi. Hãy bấm “Xác nhận nơi lưu”.');

    const subject=subjects.find(x=>x.id===selected('#subject'));
    const chapter=chapters.find(x=>x.id===selected('#chapter'));
    const exercise=currentTargetType()==='questions'?exercises.find(x=>x.id===selected('#exercise')):null;
    if(!subject||!chapter||(currentTargetType()==='questions'&&!exercise))throw new Error('Đích lưu không còn hợp lệ. Hãy chọn lại.');

    notice('Đang xử lý AI theo nơi lưu đã xác nhận…');
    const prepared=await ensurePreparedUpload(f);
    const session=await ensureSession();

    let sourceId=prepared.sourceId;
    if(!sourceId){
      const source=(await restInsert('content_sources',{
        source_type:f.type==='application/pdf'?'pdf':f.type==='text/plain'?'text':'image',
        file_name:f.name,
        mime_type:f.type,
        storage_key:prepared.storagePath,
        page_count:null,
        metadata:{
          routed:true,
          destination:{
            target_type:currentTargetType(),
            subject_id:subject.id,
            chapter_id:chapter.id,
            exercise_id:exercise?.id||null
          },
          route_confidence:routeSuggestion?.confidence??null,
          mixed_subjects:routeSuggestion?.mixed_subjects??false
        },
        created_by:session.user.id
      }))[0];
      sourceId=source.id;
      prepared.sourceId=sourceId;
    }

    const ai=await callAiImport({
      storagePath:prepared.storagePath,
      fileName:f.name,
      mimeType:f.type,
      targetType:currentTargetType(),
      subjectTitle:subject.title,
      chapterTitle:chapter.title,
      exerciseTitle:exercise?.title||''
    });

    const destination={
      target_type:currentTargetType(),
      subject_id:subject.id,
      subject_title:subject.title,
      chapter_id:chapter.id,
      chapter_title:chapter.title,
      exercise_id:exercise?.id||null,
      exercise_title:exercise?.title||null
    };
    const draft=(await restInsert('import_drafts',{
      title:ai.title||f.name,
      source_id:sourceId,
      target_type:currentTargetType(),
      payload:{
        questions:ai.questions||[],
        lesson:ai.lesson||null,
        warnings:ai.warnings||[],
        destination,
        routing:routeSuggestion||null
      },
      status:'draft',
      model_name:ai.model_name||'configured-provider',
      created_by:session.user.id,
      updated_by:session.user.id
    }))[0];

    importSourceId=sourceId;
    importDraftId=draft.id;
    importedQuestions=ai.questions||[];
    importedLesson=ai.lesson||null;
    renderReview(ai.warnings||[]);
    notice('AI đã tạo draft theo nơi lưu đã xác nhận. Hãy review trước khi publish.','ok');
  }catch(err){notice(err.message,'error')}
  finally{btn.textContent=label;updateGenerateState()}
});
function renderReview(warnings){const w=$('#import-warning');w.classList.toggle('hidden',!warnings.length);w.textContent=warnings.join(' · ');const area=$('#review-area');area.classList.remove('hidden');let html='';if(importedQuestions.length){const mismatch=warnings.includes('SOURCE_CONTEXT_MISMATCH');html+=`<div class="reviewHead"><div><strong>Question Draft</strong><div style="color:#748a9c;font-size:.75rem">${importedQuestions.length} câu · chưa publish</div></div><button id="publish-imported" class="primary" ${mismatch?'disabled title="Nguồn không khớp môn/chapter/exercise đang chọn"':''}>${mismatch?'Không thể publish · sai ngữ cảnh':'Publish toàn bộ câu đã review'}</button></div>`+importedQuestions.map((q,i)=>`<article class="importCard"><div class="meta"><span>Q${i+1}</span><span class="badge">${esc(q.question_type)}</span><span class="badge ${Number(q.confidence||0)>=.8?'published':'draft'}">${Math.round(Number(q.confidence||0)*100)}% confidence</span><span class="badge ${q.verification_status==='verified'?'published':'draft'}">${esc(q.verification_status||'needs_review')}</span></div><label class="field"><span>Question</span><textarea data-i="${i}" data-k="prompt" rows="3">${esc(q.prompt)}</textarea></label><label class="field"><span>Options</span><textarea data-i="${i}" data-k="options" rows="5">${esc((q.options||[]).join('\n'))}</textarea></label><div class="answer"><span>Đáp án AI</span><code>${esc(JSON.stringify(q.correct_answer))}</code></div><div class="grid2"><label class="field"><span>Explanation EN</span><textarea data-i="${i}" data-k="explanation_en" rows="4">${esc(q.explanation_en||'')}</textarea></label><label class="field"><span>Explanation VI</span><textarea data-i="${i}" data-k="explanation_vi" rows="4">${esc(q.explanation_vi||'')}</textarea></label></div><div class="grid2"><label class="field"><span>Practical Example EN</span><textarea data-i="${i}" data-k="practical_example_en" rows="4">${esc(q.practical_example_en||'')}</textarea></label><label class="field"><span>Ví dụ thực tế VI</span><textarea data-i="${i}" data-k="practical_example_vi" rows="4">${esc(q.practical_example_vi||'')}</textarea></label></div><label class="field"><span>Standard reference</span><input data-i="${i}" data-k="standard_reference" value="${esc(q.standard_reference||'')}"></label>${q.verification_note?`<div class="warning"><strong>Verification:</strong> ${esc(q.verification_note)}</div>`:''}${q.review_note?`<div class="warning"><strong>AI note:</strong> ${esc(q.review_note)}</div>`:''}</article>`).join('')}
if(importedLesson){html+=`<div class="reviewHead"><div><strong>Lesson Draft</strong></div><button id="publish-lesson" class="primary">Publish Lesson</button></div><label class="field"><span>Title</span><input id="lesson-title" value="${esc(importedLesson.title||'')}"></label><label class="field"><span>Summary</span><textarea id="lesson-summary" rows="3">${esc(importedLesson.summary||'')}</textarea></label><label class="field"><span>Original / source content</span><textarea id="lesson-content" rows="14">${esc(importedLesson.content_markdown||'')}</textarea></label><label class="field"><span>Nội dung VI</span><textarea id="lesson-content-vi" rows="14">${esc(importedLesson.content_markdown_vi||'')}</textarea></label>${importedLesson.verification_note?`<div class="warning"><strong>Verification:</strong> ${esc(importedLesson.verification_note)}</div>`:''}`}area.innerHTML=html}
$('#review-area').addEventListener('input',e=>{const el=e.target;if(el.dataset?.i==null)return;const i=Number(el.dataset.i),k=el.dataset.k;if(k==='options')importedQuestions[i].options=el.value.split('\n').map(v=>v.trim()).filter(Boolean);else importedQuestions[i][k]=el.value});
$('#review-area').addEventListener('click',async e=>{if(e.target.id==='publish-imported'){const btn=e.target;if(btn.disabled)return;btn.disabled=true;try{const exercise_id=selected('#exercise');if(!exercise_id)throw new Error('Hãy chọn Exercise đích.');const existing=questions.filter(q=>q.exercise_id===exercise_id);const start=existing.length?Math.max(...existing.map(q=>q.sort_order))+1:0;const rows=importedQuestions.map((q,i)=>({exercise_id,question_type:q.question_type,prompt:q.prompt,options:q.options,correct_answer:q.correct_answer,required_selections:q.required_selections,explanation_en:q.explanation_en||null,explanation_vi:q.explanation_vi||null,practical_example_en:q.practical_example_en||null,practical_example_vi:q.practical_example_vi||null,standard_reference:q.standard_reference||null,verification_status:q.verification_status||'needs_review',verification_note:q.verification_note||null,verified_at:q.verification_status==='verified'?new Date().toISOString():null,status:['needs_review','conflict'].includes(q.verification_status)?'draft':'published',sort_order:start+i,source_page:q.source_page||null,source_id:importSourceId,metadata:{ai_imported:true,confidence:q.confidence,review_note:q.review_note,import_draft_id:importDraftId,draft_index:i}}));await restInsert('questions',rows);if(importDraftId)await restPatch('import_drafts','id=eq.'+encodeURIComponent(importDraftId),{status:'published',payload:{questions:importedQuestions,published_to_exercise:exercise_id}});importedQuestions=[];await reload();if(importedLesson)renderReview([]);else $('#review-area').classList.add('hidden');notice('Đã publish AI question draft.','ok')}catch(err){btn.disabled=false;notice(err.message,'error')}}if(e.target.id==='publish-lesson'){const btn=e.target;if(btn.disabled)return;btn.disabled=true;try{const chapter_id=selected('#chapter');if(!chapter_id)throw new Error('Hãy chọn Chapter đích.');const session=await ensureSession();const ls=lessons.filter(x=>x.chapter_id===chapter_id);const sort_order=ls.length?Math.max(...ls.map(x=>x.sort_order))+1:0;await restInsert('lessons',{chapter_id,title:$('#lesson-title').value.trim()||'Imported lesson',summary:$('#lesson-summary').value.trim()||null,content_markdown:$('#lesson-content').value,content_markdown_vi:$('#lesson-content-vi')?.value||null,content_json:{ai_imported:true,import_draft_id:importDraftId},standard_references:importedLesson.standard_references||[],verification_status:importedLesson.verification_status||'needs_review',verification_note:importedLesson.verification_note||null,verified_at:importedLesson.verification_status==='verified'?new Date().toISOString():null,source_id:importSourceId,status:['needs_review','conflict'].includes(importedLesson.verification_status)?'draft':'published',sort_order,created_by:session.user.id,updated_by:session.user.id});if(importDraftId)await restPatch('import_drafts','id=eq.'+encodeURIComponent(importDraftId),{status:'published',payload:{lesson:importedLesson,published_to_chapter:chapter_id}});importedLesson=null;await reload();if(importedQuestions.length)renderReview([]);else $('#review-area').classList.add('hidden');notice('Đã publish Lesson.','ok')}catch(err){btn.disabled=false;notice(err.message,'error')}}});

(async()=>{try{const s=await ensureEditorSession();$('#admin-user').textContent='Quản lý nội dung · '+s.user.email;$('#app').classList.remove('hidden');await reload()}catch(err){$('#auth-block').classList.remove('hidden')}})();