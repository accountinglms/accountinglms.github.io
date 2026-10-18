import { ensureSession, isRetryableError, restGet, callUniversalTranslate, downloadImportFile } from './common.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[char]));

let lessons = [];
let subjects = [];
let chapters = [];
let currentLessonId = null;
let translatedView = false;
let translationRequest = 0;
const memoryCache = new Map();
let currentSourceLoad = 0;
let activeSourceUrl = null;
function releaseSourceUrl(){
  currentSourceLoad++;
  if(activeSourceUrl){URL.revokeObjectURL(activeSourceUrl);activeSourceUrl=null;}
}
function sourceFilesForLesson(lesson){
  return lesson?.content_json?.source_fallback===true&&Array.isArray(lesson?.content_json?.source_files)
    ?lesson.content_json.source_files.filter(f=>f&&typeof f.storagePath==='string'&&
      ['application/pdf','image/png','image/jpeg','image/webp','text/plain'].includes(f.mimeType))
    :[];
}
async function showSavedSource(file,host){
  releaseSourceUrl();
  const request=currentSourceLoad;
  host.replaceChildren();
  const state=document.createElement('p');
  state.textContent='Đang tải tài liệu gốc an toàn từ thư viện…';
  host.append(state);
  try{
    const blob=await downloadImportFile(file.storagePath);
    if(request!==currentSourceLoad)return;
    // Enforce the declared media type; never interpret uploaded HTML.
    const content=new Blob([blob],{type:file.mimeType});
    const url=URL.createObjectURL(content);
    activeSourceUrl=url;
    host.replaceChildren();
    const actions=document.createElement('div');
    actions.className='sourceActions';
    const open=document.createElement('a');
    open.href=url;open.target='_blank';open.rel='noopener';
    open.textContent='Mở tệp gốc';
    const download=document.createElement('a');
    download.href=url;download.download=String(file.name||'source').replace(/[\\/]/g,'_');
    download.textContent='Tải xuống';
    actions.append(open,download);host.append(actions);
    if(file.mimeType==='application/pdf'){
      const frame=document.createElement('iframe');
      frame.src=url;frame.title='Tài liệu PDF: '+String(file.name||'');
      frame.className='sourcePdf';
      host.append(frame);
      const help=document.createElement('p');
      help.className='sourceHelp';
      help.textContent='Nếu Safari không hiển thị PDF trong khung, hãy chọn “Mở tệp gốc” hoặc “Tải xuống”.';
      host.append(help);
    }else if(file.mimeType.startsWith('image/')){
      const img=document.createElement('img');
      img.src=url;img.alt='Nội dung gốc: '+String(file.name||'Ảnh');
      img.className='sourceImage';host.append(img);
    }else{
      const pre=document.createElement('pre');pre.className='sourceText';
      pre.textContent=await content.text();
      if(request!==currentSourceLoad)return;
      host.append(pre);
    }
  }catch(error){
    if(request!==currentSourceLoad)return;
    state.textContent='Chưa mở được tệp gốc: '+(error?.message||'Lỗi tải tệp')+'. Bạn có thể thử lại.';
    host.replaceChildren(state);
    const retry=document.createElement('button');retry.type='button';retry.textContent='Thử tải lại';
    retry.addEventListener('click',()=>showSavedSource(file,host));host.append(retry);
  }
}
function renderSavedSourceLesson(lesson){
  releaseSourceUrl();
  const files=sourceFilesForLesson(lesson),reader=document.querySelector('#reader');
  reader.innerHTML=`
    <div class="readerMeta">TÀI LIỆU NGUỒN · ĐÃ XUẤT BẢN</div>
    <h2>${esc(lesson.title)}</h2>
    <p class="summary">${lesson.content_markdown ? 'Đã có nội dung AI; tài liệu gốc vẫn được lưu và có thể mở bất cứ lúc nào.' : 'Tệp gốc được giữ nguyên. Bạn có thể đọc ngay mà không cần chờ AI tạo câu hỏi.'}</p>
    <div class="sourceTabs" id="source-tabs"></div>
    <div id="source-viewer" class="sourceViewer" aria-live="polite"></div>
  `;
  const tabs=reader.querySelector('#source-tabs'),viewer=reader.querySelector('#source-viewer');
  const aiContent=String(lesson.content_markdown||'').trim();
  if(aiContent){
    const aiButton=document.createElement('button');
    aiButton.type='button';aiButton.textContent='Nội dung AI';
    aiButton.addEventListener('click',()=>{
      releaseSourceUrl();
      tabs.querySelectorAll('button').forEach(btn=>btn.setAttribute('aria-pressed',String(btn===aiButton)));
      const body=document.createElement('div');body.className='content';
      body.textContent=lesson.content_markdown;
      viewer.replaceChildren(body);
    });
    tabs.append(aiButton);
  }
  if(!files.length&&!aiContent){viewer.textContent='Bài học này chưa có tệp nguồn hợp lệ.';return;}
  files.forEach((file,i)=>{
    const button=document.createElement('button');button.type='button';
    button.textContent=(i+1)+'. '+String(file.name||'Tệp nguồn');
    button.addEventListener('click',()=>{
      tabs.querySelectorAll('button').forEach(btn=>btn.setAttribute('aria-pressed',String(btn===button)));
      void showSavedSource(file,viewer);
    });
    tabs.append(button);
  });
  tabs.querySelector('button')?.click();
}
window.addEventListener('pagehide',releaseSourceUrl);

function guessSourceLanguage(text) {
  const value = String(text || '');
  if (/[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i.test(value)) return 'vi';
  const sample = ' ' + value.toLowerCase().replace(/[^a-zà-ỹ\s]/g, ' ') + ' ';
  const viWords = [' và ',' là ',' của ',' trong ',' với ',' được ',' không ',' một ',' các ',' cho '];
  return viWords.some(word => sample.includes(word)) ? 'vi' : 'en';
}

function lessonContext(lesson) {
  const chapter = chapters.find(item => item.id === lesson.chapter_id);
  const subject = chapter ? subjects.find(item => item.id === chapter.subject_id) : null;
  return [subject?.title, chapter?.title, lesson.title].filter(Boolean).join(' · ');
}

function translationTarget(lesson) {
  const sample = [lesson.title, lesson.summary, lesson.content_markdown].filter(Boolean).join('\n');
  return guessSourceLanguage(sample) === 'vi' ? 'en' : 'vi';
}

function renderReaderBody(lesson, translated = null) {
  const reader = document.querySelector('#reader');
  if(lesson?.content_json?.source_fallback===true){renderSavedSourceLesson(lesson);return;}
  releaseSourceUrl();
  const target = translationTarget(lesson);
  const title = translated?.title ?? lesson.title;
  const summary = translated?.summary ?? lesson.summary;
  const body = translated?.content ?? lesson.content_markdown;

  reader.innerHTML = `
    <div class="readerMeta">BÀI HỌC</div>
    <h2 id="lesson-reader-title">${esc(title)}</h2>
    ${summary ? `<p class="summary" id="lesson-reader-summary">${esc(summary)}</p>` : '<p class="summary hidden" id="lesson-reader-summary"></p>'}
    <div class="readerTools">
      <button class="translateLessonBtn" id="lesson-translate-btn" type="button" aria-pressed="${translated ? 'true' : 'false'}">
        ${translated ? 'Xem bản gốc' : (target === 'vi' ? 'Dịch sang tiếng Việt' : 'Dịch sang tiếng Anh')}
      </button>
      <span class="translationState" id="lesson-translation-state" aria-live="polite">
        ${translated ? (translated.cached ? 'Bản dịch chuyên ngành · đã lưu' : 'Bản dịch chuyên ngành') : ''}
      </span>
    </div>
    <div class="divider"></div>
    <div class="content" id="lesson-reader-content">${esc(body)}</div>
  `;

  document.querySelector('#lesson-translate-btn')?.addEventListener('click', () => {
    if (translatedView) showOriginalLesson();
    else translateCurrentLesson();
  });
}

function renderReader(id) {
  const lesson = lessons.find(item => item.id === id);
  const reader = document.querySelector('#reader');
  translationRequest += 1;
  translatedView = false;
  currentLessonId = id || null;

  if (!lesson) {
    reader.innerHTML = '<div class="empty">Chọn một bài học để bắt đầu đọc.</div>';
    return;
  }

  renderReaderBody(lesson);
  document.querySelectorAll('.lessonBtn').forEach(button => {
    button.classList.toggle('active', button.dataset.id === id);
  });
}

function showOriginalLesson() {
  translationRequest += 1;
  translatedView = false;
  const lesson = lessons.find(item => item.id === currentLessonId);
  if (lesson) renderReaderBody(lesson);
}

async function translateCurrentLesson() {
  const lesson = lessons.find(item => item.id === currentLessonId);
  if (!lesson) return;

  const target = translationTarget(lesson);
  const key = JSON.stringify({
    id: lesson.id,
    updated_at: lesson.updated_at,
    target,
    title: lesson.title,
    summary: lesson.summary,
    content: lesson.content_markdown
  });
  const request = ++translationRequest;
  const button = document.querySelector('#lesson-translate-btn');
  const state = document.querySelector('#lesson-translation-state');

  if (button) {
    button.disabled = true;
    button.textContent = 'Đang dịch…';
  }
  if (state) {
    state.classList.remove('error');
    state.textContent = 'Đang dịch theo ngữ cảnh kế toán…';
  }

  try {
    let result = memoryCache.get(key);
    if (!result) {
      const segments = [{ id:'title', text:lesson.title }];
      if (lesson.summary) segments.push({ id:'summary', text:lesson.summary });
      segments.push({ id:'content', text:lesson.content_markdown });

      const translated = await callUniversalTranslate({
        content_type: 'lesson',
        target_language: target,
        context: lessonContext(lesson),
        segments
      });
      const byId = new Map(translated.segments.map(item => [item.id, item.text]));
      result = {
        title: byId.get('title') || lesson.title,
        summary: lesson.summary ? (byId.get('summary') || lesson.summary) : null,
        content: byId.get('content') || lesson.content_markdown,
        cached: translated.cached
      };
      memoryCache.set(key, result);
    }

    if (request !== translationRequest || currentLessonId !== lesson.id) return;
    translatedView = true;
    renderReaderBody(lesson, result);
  } catch (error) {
    if (request !== translationRequest) return;
    const currentButton = document.querySelector('#lesson-translate-btn');
    const currentState = document.querySelector('#lesson-translation-state');
    if (currentButton) {
      currentButton.disabled = false;
      currentButton.textContent = target === 'vi' ? 'Dịch sang tiếng Việt' : 'Dịch sang tiếng Anh';
    }
    if (currentState) {
      currentState.classList.add('error');
      currentState.textContent = 'Chưa dịch được: ' + (error?.message || 'Lỗi không xác định');
    }
  }
}

(async () => {
  try {
    await ensureSession();
    [subjects, chapters, lessons] = await Promise.all([
      restGet('subjects','select=*&is_active=eq.true&deleted_at=is.null&order=sort_order.asc'),
      restGet('chapters','select=*&is_active=eq.true&deleted_at=is.null&order=sort_order.asc'),
      restGet('lessons','select=*&status=eq.published&order=sort_order.asc')
    ]);

    const subjectIds=new Set(subjects.map(item=>item.id));
    chapters=chapters.filter(item=>subjectIds.has(item.subject_id));
    const chapterIds=new Set(chapters.map(item=>item.id));
    lessons=lessons.filter(item=>chapterIds.has(item.chapter_id));

    const sidebar = document.querySelector('#sidebar');
    if (!lessons.length) {
      sidebar.innerHTML = '<div class="empty">Chưa có bài học nào được xuất bản.</div>';
      return;
    }

    sidebar.innerHTML = subjects.map(subject => {
      const subjectChapters = chapters.filter(chapter => chapter.subject_id === subject.id);
      const blocks = subjectChapters.map(chapter => {
        const chapterLessons = lessons.filter(lesson => lesson.chapter_id === chapter.id);
        if (!chapterLessons.length) return '';
        return `<div>
          <div class="chapterTitle">${esc(chapter.title)}</div>
          ${chapterLessons.map((lesson,index) => `<button class="lessonBtn" data-id="${lesson.id}">
            <span>${index + 1}</span>
            <div>
              <strong>${esc(lesson.title)}</strong>
              ${lesson.summary ? `<small>${esc(lesson.summary)}</small>` : ''}
            </div>
          </button>`).join('')}
        </div>`;
      }).join('');
      return blocks ? `<section><div class="subjectTitle">${esc(subject.title)}</div>${blocks}</section>` : '';
    }).join('');

    sidebar.addEventListener('click', event => {
      const button = event.target.closest('.lessonBtn');
      if (button) renderReader(button.dataset.id);
    });

    const params = new URLSearchParams(location.search);
    const requestedLesson = params.get('lesson');
    const requestedChapter = params.get('chapter');
    const initialLesson =
      lessons.find(item => item.id === requestedLesson) ||
      lessons.find(item => item.chapter_id === requestedChapter) ||
      lessons[0];
    renderReader(initialLesson.id);
  } catch (error) {
    document.querySelector('#sidebar').innerHTML = isRetryableError(error)?'<div class="empty">'+esc(error.message)+' <button type="button" id="retry-lessons">Thử lại</button></div>':'<div class="empty">Bạn cần đăng nhập ở trang chính trước.</div>';
    document.querySelector('#retry-lessons')?.addEventListener('click',()=>location.reload());
  }
})();
