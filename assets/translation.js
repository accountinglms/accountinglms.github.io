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

function guessSourceLanguage(text) {
  const value = String(text || '');
  if (/[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i.test(value)) return 'vi';
  const sample = ' ' + value.toLowerCase().replace(/[^a-zà-ỹ\s]/g, ' ') + ' ';
  const viWords = [' và ',' là ',' của ',' trong ',' với ',' được ',' không ',' một ',' các ',' cho '];
  return viWords.some(word => sample.includes(word)) ? 'vi' : 'en';
}

function targetForSource(source) {
  const sample = [source?.question, ...(source?.options || [])].filter(Boolean).join('\n');
  return guessSourceLanguage(sample) === 'vi' ? 'en' : 'vi';
}

function sourceKey(source, target) {
  return JSON.stringify({
    sectionId: source.sectionId,
    questionIndex: source.questionIndex,
    question: source.question,
    options: source.options,
    target
  });
}

function renderTranslationButton(mode, target='vi') {
  if (!button) return;
  const isTranslated = mode === 'original';
  const isLoading = mode === 'loading';

  let icon = '🌐';
  let full = target === 'vi' ? 'Dịch sang VI' : 'Translate to EN';
  let short = target === 'vi' ? 'VI' : 'EN';

  if (isTranslated) {
    icon = '↩';
    full = target === 'vi' ? 'Xem bản gốc EN' : 'Xem bản gốc VI';
    short = target === 'vi' ? 'EN' : 'VI';
  } else if (isLoading) {
    icon = '…';
    full = target === 'vi' ? 'Đang dịch' : 'Translating';
    short = '…';
  }

  button.innerHTML = `<span class="tool-icon" aria-hidden="true">${icon}</span><span class="tool-label-full">${full}</span><span class="tool-label-short">${short}</span>`;
  button.setAttribute('aria-label', full);
  button.title = full;
}

function setOriginalButtonLabel() {
  const source = window.getQuestionTranslationSource?.();
  const target = source ? targetForSource(source) : 'vi';
  renderTranslationButton('translate', target);
}

function resetView() {
  requestToken += 1;
  translatedView = false;
  button.disabled = false;
  setOriginalButtonLabel();
  button.setAttribute('aria-pressed', 'false');
  setStatus('');
}

async function showTranslation() {
  const source = window.getQuestionTranslationSource?.();
  if (!source) return;
  const target = targetForSource(source);
  const key = sourceKey(source, target);
  const token = ++requestToken;

  button.disabled = true;
  renderTranslationButton('loading', target);
  setStatus('Đang dịch theo ngữ cảnh kế toán…');

  try {
    let translated = memoryCache.get(key);
    if (!translated) {
      translated = await callQuestionTranslate({
        question: source.question,
        options: source.options,
        target_language: target,
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
    renderTranslationButton('original', target);
    button.setAttribute('aria-pressed', 'true');
    setStatus(translated.cached ? 'Bản dịch kế toán · đã lưu' : 'Bản dịch kế toán');
  } catch (error) {
    if (token !== requestToken) return;
    translatedView = false;
    setOriginalButtonLabel();
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
  setOriginalButtonLabel();
  button.setAttribute('aria-pressed', 'false');
  setStatus('Đang xem bản gốc');
}

button?.addEventListener('click', () => {
  if (translatedView) showOriginal();
  else showTranslation();
});

window.addEventListener('lms:question-changed', resetView);
resetView();
