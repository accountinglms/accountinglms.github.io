import { callQuestionTranslate } from './common.js';

const button = document.getElementById('translate-question-btn');
const status = document.getElementById('translation-status');

let translatedView = false;
let requestToken = 0;
const memoryCache = new Map();

function setStatus(message, error=false) {
  if (!status) return;
  status.textContent = message || '';
  status.classList.toggle('error', Boolean(error));
}

function sourceKey(source) {
  return JSON.stringify({
    sectionId: source.sectionId,
    questionIndex: source.questionIndex,
    question: source.question,
    options: source.options
  });
}

function resetView() {
  requestToken += 1;
  translatedView = false;
  button.disabled = false;
  button.textContent = '🌐 Dịch sang VI';
  button.setAttribute('aria-pressed', 'false');
  setStatus('');
}

async function showTranslation() {
  const source = window.getQuestionTranslationSource?.();
  if (!source) return;
  const key = sourceKey(source);
  const token = ++requestToken;

  button.disabled = true;
  button.textContent = 'Đang dịch…';
  setStatus('Đang dịch theo ngữ cảnh kế toán…');

  try {
    let translated = memoryCache.get(key);
    if (!translated) {
      translated = await callQuestionTranslate({
        question: source.question,
        options: source.options,
        target_language: 'vi',
        subject: source.subject
      });
      memoryCache.set(key, translated);
    }

    if (token !== requestToken) return;
    const applied = window.applyQuestionTranslationView?.({
      sectionId: source.sectionId,
      questionIndex: source.questionIndex,
      question_text: translated.question_text,
      options: translated.options
    });
    if (!applied) return;

    translatedView = true;
    button.textContent = '↩ Xem bản gốc EN';
    button.setAttribute('aria-pressed', 'true');
    setStatus(translated.cached ? 'Bản dịch kế toán · đã lưu' : 'Bản dịch kế toán');
  } catch (error) {
    if (token !== requestToken) return;
    translatedView = false;
    button.textContent = '🌐 Dịch sang VI';
    button.setAttribute('aria-pressed', 'false');
    setStatus('Chưa dịch được: ' + (error?.message || 'Lỗi không xác định'), true);
  } finally {
    if (token === requestToken) button.disabled = false;
  }
}

function showOriginal() {
  requestToken += 1;
  window.restoreQuestionOriginalView?.();
  translatedView = false;
  button.textContent = '🌐 Dịch sang VI';
  button.setAttribute('aria-pressed', 'false');
  setStatus('Đang xem bản gốc');
}

button?.addEventListener('click', () => {
  if (translatedView) showOriginal();
  else showTranslation();
});

window.addEventListener('lms:question-changed', resetView);
resetView();
