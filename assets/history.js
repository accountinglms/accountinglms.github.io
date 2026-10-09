import { ensureSession, restGet } from './common.js';

const SUPABASE_REF = 'uangiwgznukuicrfnohq';
const SUPABASE_KEY = 'sb_publishable_FRBwRP7TAmiu02eRF9l49g_tCa4DsGJ';

let session = null;
let subjects = [];
let chapters = [];
let exercises = [];
let attempts = [];
let socket = null;
let heartbeat = null;
let reconnectTimer = null;
let refreshTimer = null;

const $ = selector => document.querySelector(selector);

function text(value) {
  return String(value ?? '');
}

function fmtTime(value) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle:'medium',
      timeStyle:'short'
    }).format(new Date(value));
  } catch { return text(value); }
}

function fmtDuration(seconds) {
  const value = Math.max(0, Number(seconds || 0));
  if (!value) return '—';
  const mins = Math.floor(value / 60);
  const secs = value % 60;
  if (mins < 60) return mins ? `${mins}m ${secs}s` : `${secs}s`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m`;
}

function percent(attempt) {
  const total = Number(attempt?.total_questions || 0);
  return total ? Math.round(Number(attempt.score || 0) / total * 100) : 0;
}

function optionLabel(index) {
  if (!Number.isInteger(index) || index < 0) return '—';
  return String.fromCharCode(65 + index);
}

function answerText(question, answer) {
  if (answer == null) return 'Chưa trả lời';
  if (question?.type === 'tf') {
    if (!Array.isArray(answer)) return 'Chưa trả lời';
    return answer.map((value,index) => `${index + 1}: ${value === true ? 'True' : value === false ? 'False' : '—'}`).join(' · ');
  }
  if (Array.isArray(answer)) {
    if (!answer.length) return 'Chưa trả lời';
    return answer.map(index => {
      const option = question?.options?.[index];
      return option != null ? `${optionLabel(index)}. ${text(option)}` : optionLabel(index);
    }).join(' · ');
  }
  if (Number.isInteger(answer)) {
    const option = question?.options?.[answer];
    return option != null ? `${optionLabel(answer)}. ${text(option)}` : optionLabel(answer);
  }
  return text(answer);
}

function catalogContext(attempt) {
  const snap = attempt?.context_snapshot || {};
  const exercise = exercises.find(x => x.id === attempt.exercise_id);
  const chapter = chapters.find(x => x.id === (snap.chapter_id || exercise?.chapter_id));
  const subject = subjects.find(x => x.id === (snap.subject_id || chapter?.subject_id));
  return {
    subjectId: snap.subject_id || subject?.id || '',
    subjectTitle: snap.subject_title || subject?.title || 'Subject',
    chapterId: snap.chapter_id || chapter?.id || '',
    chapterTitle: snap.chapter_title || chapter?.title || 'Chapter',
    exerciseId: attempt.exercise_id,
    exerciseTitle: snap.exercise_title || exercise?.title || attempt.exercise_id
  };
}

function currentFilters() {
  return {
    subject: $('#filter-subject').value,
    chapter: $('#filter-chapter').value,
    exercise: $('#filter-exercise').value
  };
}

function fillSelect(select, rows, placeholder, valueKey='id', labelKey='title', preserve='') {
  select.replaceChildren();
  const blank = document.createElement('option');
  blank.value = '';
  blank.textContent = placeholder;
  select.appendChild(blank);
  rows.forEach(row => {
    const option = document.createElement('option');
    option.value = row[valueKey];
    option.textContent = row[labelKey];
    select.appendChild(option);
  });
  if (rows.some(row => String(row[valueKey]) === String(preserve))) select.value = preserve;
}

function renderFilters(initial=false) {
  const previous = currentFilters();
  fillSelect($('#filter-subject'), subjects, 'Tất cả Subject', 'id', 'title', previous.subject);

  const subjectId = $('#filter-subject').value;
  const chapterRows = subjectId ? chapters.filter(x => x.subject_id === subjectId) : chapters;
  fillSelect($('#filter-chapter'), chapterRows, 'Tất cả Chapter', 'id', 'title', previous.chapter);

  const chapterId = $('#filter-chapter').value;
  let exerciseRows = exercises;
  if (chapterId) exerciseRows = exercises.filter(x => x.chapter_id === chapterId);
  else if (subjectId) {
    const chapterIds = new Set(chapters.filter(x => x.subject_id === subjectId).map(x => x.id));
    exerciseRows = exercises.filter(x => chapterIds.has(x.chapter_id));
  }
  fillSelect($('#filter-exercise'), exerciseRows, 'Tất cả Exercise', 'id', 'title', previous.exercise);

  if (initial) {
    const requested = new URLSearchParams(location.search).get('exercise');
    if (requested && exercises.some(x => x.id === requested)) {
      const exercise = exercises.find(x => x.id === requested);
      const chapter = chapters.find(x => x.id === exercise.chapter_id);
      if (chapter) $('#filter-subject').value = chapter.subject_id;
      renderFilters(false);
      $('#filter-chapter').value = exercise.chapter_id;
      renderFilters(false);
      $('#filter-exercise').value = requested;
    }
  }
}

function filteredAttempts() {
  const {subject, chapter, exercise} = currentFilters();
  return attempts.filter(attempt => {
    const context = catalogContext(attempt);
    if (exercise && attempt.exercise_id !== exercise) return false;
    if (chapter && context.chapterId !== chapter) return false;
    if (subject && context.subjectId !== subject) return false;
    return true;
  });
}

function renderSummary(rows) {
  $('#metric-attempts').textContent = rows.length;
  if (!rows.length) {
    $('#metric-best').textContent = '—';
    $('#metric-latest').textContent = '—';
    $('#metric-time').textContent = '—';
    return;
  }
  const latest = rows.slice().sort((a,b) => Date.parse(b.completed_at || 0) - Date.parse(a.completed_at || 0))[0];
  const best = rows.slice().sort((a,b) => percent(b) - percent(a) || Date.parse(b.completed_at || 0) - Date.parse(a.completed_at || 0))[0];
  $('#metric-best').textContent = `${best.score}/${best.total_questions} · ${percent(best)}%`;
  $('#metric-latest').textContent = `${latest.score}/${latest.total_questions}`;
  const totalSeconds = rows.reduce((sum,row) => sum + Math.max(0,Number(row.duration_seconds || 0)),0);
  $('#metric-time').textContent = fmtDuration(totalSeconds);
}

function buildMini(label, value) {
  const node = document.createElement('div');
  node.className = 'mini';
  const b = document.createElement('b');
  b.textContent = value;
  const span = document.createElement('span');
  span.textContent = label;
  node.append(b, span);
  return node;
}

function buildQuestion(question, index) {
  const card = document.createElement('div');
  card.className = 'question';

  const head = document.createElement('div');
  head.className = 'qHead';
  const q = document.createElement('div');
  q.className = 'qText';
  q.textContent = `${index + 1}. ${text(question.prompt)}`;
  const status = document.createElement('span');
  const state = question.status || 'unanswered';
  status.className = 'qStatus ' + state;
  status.textContent = state === 'correct' ? 'Đúng' : state === 'wrong' ? 'Sai' : 'Chưa làm';
  head.append(q,status);

  const rows = document.createElement('div');
  rows.className = 'answerRows';

  const selected = document.createElement('div');
  const selectedLabel = document.createElement('span');
  selectedLabel.textContent = 'Bạn chọn';
  const selectedValue = document.createElement('strong');
  selectedValue.textContent = answerText(question, question.selected_answer);
  selected.append(selectedLabel, selectedValue);
  rows.appendChild(selected);

  if (state !== 'correct') {
    const correct = document.createElement('div');
    const correctLabel = document.createElement('span');
    correctLabel.textContent = 'Đáp án đúng';
    const correctValue = document.createElement('strong');
    correctValue.textContent = answerText(question, question.correct_answer);
    correct.append(correctLabel, correctValue);
    rows.appendChild(correct);
  }

  if (question.standard_reference) {
    const ref = document.createElement('div');
    const refLabel = document.createElement('span');
    refLabel.textContent = 'Tham chiếu';
    const refValue = document.createElement('strong');
    refValue.textContent = text(question.standard_reference);
    ref.append(refLabel, refValue);
    rows.appendChild(ref);
  }

  card.append(head,rows);
  return card;
}

function renderTimeline() {
  const rows = filteredAttempts();
  renderSummary(rows);
  $('#result-count').textContent = `${rows.length} attempt`;

  const timeline = $('#timeline');
  timeline.replaceChildren();

  if (!rows.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'Chưa có lịch sử phù hợp với bộ lọc này. Lịch sử được tạo mỗi khi bạn nộp một lượt làm bài.';
    timeline.appendChild(empty);
    return;
  }

  const latestId = rows.slice().sort((a,b) => Date.parse(b.completed_at || 0) - Date.parse(a.completed_at || 0))[0]?.id;
  const bestByExercise = new Map();
  rows.forEach(row => {
    const current = bestByExercise.get(row.exercise_id);
    if (!current || percent(row) > percent(current) || (percent(row) === percent(current) && Date.parse(row.completed_at || 0) < Date.parse(current.completed_at || 0))) {
      bestByExercise.set(row.exercise_id,row);
    }
  });

  rows.forEach(attempt => {
    const context = catalogContext(attempt);
    const detail = document.createElement('details');
    detail.className = 'attempt';

    const summary = document.createElement('summary');
    const main = document.createElement('div');
    main.className = 'attemptMain';

    const topline = document.createElement('div');
    topline.className = 'attemptTopline';
    const name = document.createElement('span');
    name.className = 'exerciseName';
    name.textContent = context.exerciseTitle;
    topline.appendChild(name);

    const number = document.createElement('span');
    number.className = 'chip';
    number.textContent = `Lần #${attempt.attempt_no || '?'}`;
    topline.appendChild(number);

    if (attempt.id === latestId) {
      const latest = document.createElement('span');
      latest.className = 'chip latest';
      latest.textContent = 'Gần nhất';
      topline.appendChild(latest);
    }
    if (bestByExercise.get(attempt.exercise_id)?.id === attempt.id) {
      const best = document.createElement('span');
      best.className = 'chip best';
      best.textContent = 'Tốt nhất';
      topline.appendChild(best);
    }

    const path = document.createElement('div');
    path.className = 'path';
    path.textContent = `${context.subjectTitle} · ${context.chapterTitle}`;

    const when = document.createElement('div');
    when.className = 'time';
    when.textContent = `${fmtTime(attempt.completed_at)} · ${fmtDuration(attempt.duration_seconds)}`;

    main.append(topline,path,when);

    const scoreBox = document.createElement('div');
    scoreBox.className = 'scoreBox';
    const score = document.createElement('div');
    score.className = 'score';
    score.textContent = `${attempt.score}/${attempt.total_questions}`;
    const pct = document.createElement('div');
    pct.className = 'percent';
    pct.textContent = `${percent(attempt)}%`;
    scoreBox.append(score,pct);
    summary.append(main,scoreBox);

    const body = document.createElement('div');
    body.className = 'attemptBody';
    const metrics = document.createElement('div');
    metrics.className = 'metrics';
    metrics.append(
      buildMini('Đúng', attempt.correct_count),
      buildMini('Sai', attempt.wrong_count),
      buildMini('Chưa làm', attempt.unanswered_count),
      buildMini('Đánh dấu', attempt.bookmarked_count),
      buildMini('Độ chính xác', `${Math.round(Number(attempt.accuracy || 0))}%`)
    );
    body.appendChild(metrics);

    const questions = document.createElement('div');
    questions.className = 'questions';
    const snapshot = Array.isArray(attempt.question_snapshot) ? attempt.question_snapshot : [];
    if (snapshot.length) {
      snapshot.forEach((question,index) => questions.appendChild(buildQuestion(question,index)));
    } else {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'Attempt này chưa có snapshot chi tiết câu hỏi.';
      questions.appendChild(empty);
    }
    body.appendChild(questions);
    detail.append(summary,body);
    timeline.appendChild(detail);
  });
}

async function loadAttempts({silent=false}={}) {
  try {
    if (!silent) $('#refresh-history').disabled = true;
    attempts = await restGet('exercise_attempts','select=*&order=completed_at.desc&limit=500');
    renderTimeline();
  } finally {
    $('#refresh-history').disabled = false;
  }
}

async function loadCatalog() {
  [subjects,chapters,exercises] = await Promise.all([
    restGet('subjects','select=id,title&order=sort_order.asc'),
    restGet('chapters','select=id,subject_id,title&order=sort_order.asc'),
    restGet('exercises','select=id,chapter_id,title&order=sort_order.asc')
  ]);
  renderFilters(true);
}

function setLiveStatus(mode, message) {
  const el = $('#live-status');
  el.classList.toggle('online', mode === 'online');
  el.querySelector('span').textContent = message;
}

function closeRealtime() {
  clearInterval(heartbeat);
  clearTimeout(reconnectTimer);
  heartbeat = null;
  reconnectTimer = null;
  if (socket) {
    try { socket.close(); } catch {}
    socket = null;
  }
}

function connectRealtime() {
  if (!session?.access_token || !session?.user?.id) return;
  closeRealtime();
  setLiveStatus('connecting','Đang kết nối realtime…');

  const topic = `realtime:attempt-history-${session.user.id}`;
  const url = `wss://${SUPABASE_REF}.supabase.co/realtime/v1/websocket?apikey=${encodeURIComponent(SUPABASE_KEY)}&vsn=1.0.0`;
  socket = new WebSocket(url);
  let ref = 1;

  const send = (event,payload,sendTopic=topic,joinRef='1') => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({
      topic:sendTopic,
      event,
      payload,
      ref:String(ref++),
      join_ref:joinRef
    }));
  };

  socket.addEventListener('open',() => {
    send('phx_join',{
      config:{
        broadcast:{ack:false,self:false},
        presence:{enabled:false},
        postgres_changes:[{
          event:'INSERT',
          schema:'public',
          table:'exercise_attempts',
          filter:`user_id=eq.${session.user.id}`
        }],
        private:false
      },
      access_token:session.access_token
    });
    heartbeat = setInterval(() => send('heartbeat',{},'phoenix',null),20000);
  });

  socket.addEventListener('message',event => {
    let message = null;
    try { message = JSON.parse(event.data); } catch { return; }
    if (message?.event === 'phx_reply' && message?.payload?.status === 'ok') {
      setLiveStatus('online','Realtime · đang đồng bộ');
    }
    if (message?.event === 'postgres_changes') {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => loadAttempts({silent:true}),150);
    }
    if (message?.event === 'phx_error') {
      setLiveStatus('connecting','Realtime · đang kết nối lại');
    }
  });

  socket.addEventListener('close',() => {
    clearInterval(heartbeat);
    heartbeat = null;
    setLiveStatus('connecting','Realtime · đang kết nối lại');
    reconnectTimer = setTimeout(connectRealtime,5000);
  });

  socket.addEventListener('error',() => {
    setLiveStatus('connecting','Realtime · tạm gián đoạn');
  });
}

function bindFilters() {
  $('#filter-subject').addEventListener('change',() => {
    $('#filter-chapter').value='';
    $('#filter-exercise').value='';
    renderFilters(false);
    renderTimeline();
  });
  $('#filter-chapter').addEventListener('change',() => {
    $('#filter-exercise').value='';
    renderFilters(false);
    renderTimeline();
  });
  $('#filter-exercise').addEventListener('change',renderTimeline);
  $('#refresh-history').addEventListener('click',() => loadAttempts());
}

(async() => {
  try {
    session = await ensureSession();
    await loadCatalog();
    await loadAttempts();
    bindFilters();
    $('#app').classList.remove('hidden');
    connectRealtime();

    const fallback = setInterval(() => {
      if (document.visibilityState === 'visible' && (!socket || socket.readyState !== WebSocket.OPEN)) {
        loadAttempts({silent:true});
      }
    },30000);

    document.addEventListener('visibilitychange',() => {
      if (document.visibilityState === 'visible') {
        loadAttempts({silent:true});
        if (!socket || socket.readyState === WebSocket.CLOSED) connectRealtime();
      }
    });
    window.addEventListener('beforeunload',() => {
      clearInterval(fallback);
      closeRealtime();
    });
  } catch (error) {
    const box = $('#history-error');
    box.classList.remove('hidden');
    box.textContent = 'Không mở được lịch sử làm bài: ' + (error?.message || 'Lỗi không xác định') + '. Hãy đăng nhập lại ở Trang học.';
    setLiveStatus('connecting','Không kết nối');
  }
})();