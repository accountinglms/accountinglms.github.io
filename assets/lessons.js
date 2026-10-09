import { ensureSession, restGet, callUniversalTranslate } from './common.js';

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
      restGet('subjects','select=*&is_active=eq.true&order=sort_order.asc'),
      restGet('chapters','select=*&is_active=eq.true&order=sort_order.asc'),
      restGet('lessons','select=*&status=eq.published&order=sort_order.asc')
    ]);

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

    renderReader(lessons[0].id);
  } catch (error) {
    document.querySelector('#sidebar').innerHTML = '<div class="empty">Bạn cần đăng nhập ở trang chính trước.</div>';
  }
})();
