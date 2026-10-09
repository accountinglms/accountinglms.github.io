const SUPABASE_URL = 'https://uangiwgznukuicrfnohq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_FRBwRP7TAmiu02eRF9l49g_tCa4DsGJ';
const AUTH_KEY = 'icaew-lms-auth-v2';
let accessCache = { userId: null, checkedAt: 0, value: null };
let authValidation = { token: null, checkedAt: 0 };
const ACCESS_CACHE_MS = 60_000;
const AUTH_VALIDATION_MS = 5 * 60_000;

export function loadSession() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s?.access_token || !s?.user?.id) return null;
    return s;
  } catch { return null; }
}

export function saveSession(session) {
  if (!session) localStorage.removeItem(AUTH_KEY);
  else localStorage.setItem(AUTH_KEY, JSON.stringify(session));
}

function clearAccessCache() {
  accessCache = { userId: null, checkedAt: 0, value: null };
}

function clearAuthValidation() {
  authValidation = { token: null, checkedAt: 0 };
}

export function isStaleSessionError(error) {
  const raw = [
    error?.message || '',
    typeof error?.body === 'string' ? error.body : '',
    error?.body?.msg || '',
    error?.body?.message || '',
    error?.body?.error_description || '',
    error?.body?.error || ''
  ].join(' ').toLowerCase();
  return /session_id claim.*does not exist|session from session_id claim.*does not exist|invalid refresh token|refresh token.*not found|session.*does not exist/.test(raw);
}

function makeSessionExpiredError() {
  const error = new Error('Phiên đăng nhập trên thiết bị này đã hết hiệu lực. Hãy đăng nhập lại.');
  error.code = 'SESSION_EXPIRED';
  return error;
}

export async function getMyAccess(session, force = false) {
  if (!session?.access_token || !session?.user?.id) throw new Error('Bạn chưa đăng nhập ICAEW LMS.');
  const now = Date.now();
  if (!force && accessCache.userId === session.user.id && accessCache.value && now - accessCache.checkedAt < ACCESS_CACHE_MS) {
    return accessCache.value;
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_my_access`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${session.access_token}`,
      'content-type': 'application/json'
    },
    body: '{}'
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || 'Không kiểm tra được quyền truy cập.');
  const value = text ? JSON.parse(text) : null;
  if (!value || value.allowed !== true) throw new Error('Tài khoản này không được cấp quyền.');
  accessCache = { userId: session.user.id, checkedAt: now, value };
  return value;
}

export async function refreshSession(session) {
  if (!session?.refresh_token) {
    saveSession(null);
    clearAccessCache();
    clearAuthValidation();
    throw makeSessionExpiredError();
  }
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ refresh_token: session.refresh_token })
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { message: text }; }
  if (!res.ok) {
    saveSession(null);
    clearAccessCache();
    clearAuthValidation();
    throw makeSessionExpiredError();
  }
  const next = {
    access_token: data.access_token,
    refresh_token: data.refresh_token || session.refresh_token,
    expires_at: data.expires_at || Math.floor(Date.now()/1000) + Number(data.expires_in || 3600),
    token_type: data.token_type || 'bearer',
    user: data.user || session.user
  };
  clearAccessCache();
  clearAuthValidation();
  saveSession(next);
  return next;
}

async function validateAuthSession(session, retry = true) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${session.access_token}`
    }
  });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { message: text }; }

  if (res.ok) {
    authValidation = { token: session.access_token, checkedAt: Date.now() };
    if (body?.id && session.user?.id === body.id) {
      const next = { ...session, user: body };
      saveSession(next);
      return next;
    }
    return session;
  }

  const error = new Error(body?.msg || body?.message || body?.error_description || body?.error || 'Phiên đăng nhập không còn hợp lệ.');
  error.status = res.status;
  error.body = body;

  if (retry && session.refresh_token) {
    try {
      const next = await refreshSession(session);
      return await validateAuthSession(next, false);
    } catch (_) {
      saveSession(null);
      clearAccessCache();
      clearAuthValidation();
      throw makeSessionExpiredError();
    }
  }

  saveSession(null);
  clearAccessCache();
  clearAuthValidation();
  throw makeSessionExpiredError();
}

export async function ensureBaseSession({ validate = true } = {}) {
  let session = loadSession();
  if (!session) throw new Error('Bạn chưa đăng nhập ICAEW LMS.');
  const now = Math.floor(Date.now()/1000);
  if (Number(session.expires_at || 0) - now < 60) session = await refreshSession(session);

  if (validate) {
    const needsValidation =
      authValidation.token !== session.access_token ||
      Date.now() - authValidation.checkedAt > AUTH_VALIDATION_MS;
    if (needsValidation) session = await validateAuthSession(session);
  }
  return session;
}

export async function ensureSession() {
  const session = await ensureBaseSession();
  const access = await getMyAccess(session);
  if (access.mfa_required === true && access.mfa_satisfied !== true) {
    const error = new Error('Tài khoản này yêu cầu mã xác thực 2 bước.');
    error.code = 'MFA_REQUIRED';
    throw error;
  }
  return session;
}

export async function ensureEditorSession() {
  const session = await ensureSession();
  const access = await getMyAccess(session);
  if (access.editor !== true) throw new Error('Tài khoản này không có quyền quản trị.');
  return session;
}

export async function authGetUser(session = null) {
  const current = session || await ensureBaseSession();
  const validated = await validateAuthSession(current);
  return validated.user || null;
}

export async function authUpdatePassword(password) {
  const next=String(password||'');
  if(next.length<8||next.length>128)throw new Error('Mật khẩu phải dài từ 8 đến 128 ký tự.');
  const session=await ensureSession();
  const res=await fetch(`${SUPABASE_URL}/auth/v1/user`,{
    method:'PUT',
    headers:{
      apikey:SUPABASE_KEY,
      Authorization:`Bearer ${session.access_token}`,
      'content-type':'application/json'
    },
    body:JSON.stringify({password:next})
  });
  const text=await res.text();
  if(!res.ok){
    let parsed=null;
    try{parsed=JSON.parse(text);}catch{}
    throw new Error(parsed?.msg||parsed?.message||parsed?.error_description||'Không cập nhật được mật khẩu.');
  }
  return true;
}

export async function authSignOut(scope = 'local') {
  const allowedScopes = new Set(['local', 'global', 'others']);
  if (!allowedScopes.has(scope)) throw new Error('Phạm vi đăng xuất không hợp lệ.');

  const session = loadSession();
  if (session?.access_token) {
    try {
      await fetch(`${SUPABASE_URL}/auth/v1/logout?scope=${encodeURIComponent(scope)}`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${session.access_token}`
        }
      });
    } catch (_) {
      // Local cleanup still proceeds if the server session has already disappeared.
    }
  }

  if (scope !== 'others') {
    saveSession(null);
    clearAccessCache();
    clearAuthValidation();
  }
}

export async function authMfaEnrollTotp(friendlyName = 'Authenticator') {
  const session = await ensureBaseSession();
  const res = await fetch(`${SUPABASE_URL}/auth/v1/factors`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${session.access_token}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      friendly_name: friendlyName,
      factor_type: 'totp',
      issuer: 'Accounting LMS'
    })
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || 'Không khởi tạo được Authenticator.');
  return text ? JSON.parse(text) : null;
}

export async function authMfaChallenge(factorId) {
  const session = await ensureBaseSession();
  const res = await fetch(`${SUPABASE_URL}/auth/v1/factors/${encodeURIComponent(factorId)}/challenge`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${session.access_token}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({})
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || 'Không tạo được MFA challenge.');
  return text ? JSON.parse(text) : null;
}

export async function authMfaVerify(factorId, challengeId, code) {
  const session = await ensureBaseSession();
  const res = await fetch(`${SUPABASE_URL}/auth/v1/factors/${encodeURIComponent(factorId)}/verify`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${session.access_token}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({ challenge_id: challengeId, code })
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || 'Mã xác thực không đúng hoặc đã hết hạn.');
  const data = text ? JSON.parse(text) : null;
  if (data?.access_token && data?.user) {
    const next = {
      access_token: data.access_token,
      refresh_token: data.refresh_token || session.refresh_token,
      expires_at: data.expires_at || Math.floor(Date.now()/1000) + Number(data.expires_in || 3600),
      token_type: data.token_type || 'bearer',
      user: data.user
    };
    clearAccessCache();
    saveSession(next);
    return next;
  }
  return data;
}

export async function authMfaUnenroll(factorId) {
  const session = await ensureBaseSession();
  const res = await fetch(`${SUPABASE_URL}/auth/v1/factors/${encodeURIComponent(factorId)}`, {
    method: 'DELETE',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${session.access_token}`
    }
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || 'Không thể gỡ Authenticator.');
  clearAccessCache();
  return text ? JSON.parse(text) : null;
}

export async function authedFetch(path, init = {}, retry = true) {
  let session = await ensureSession();
  const headers = new Headers(init.headers || {});
  headers.set('apikey', SUPABASE_KEY);
  headers.set('Authorization', `Bearer ${session.access_token}`);
  const res = await fetch(`${SUPABASE_URL}${path}`, { ...init, headers });
  if (res.status === 401 && retry && session.refresh_token) {
    session = await refreshSession(session);
    return authedFetch(path, init, false);
  }
  return res;
}

export async function restGet(table, query = 'select=*') {
  const res = await authedFetch(`/rest/v1/${table}?${query}`);
  const text = await res.text();
  if (!res.ok) throw new Error(text || `Không đọc được ${table}.`);
  return text ? JSON.parse(text) : [];
}

export async function restInsert(table, payload) {
  const res = await authedFetch(`/rest/v1/${table}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(payload)
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || `Không tạo được ${table}.`);
  return text ? JSON.parse(text) : [];
}

export async function restPatch(table, query, payload) {
  const res = await authedFetch(`/rest/v1/${table}?${query}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(payload)
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || `Không cập nhật được ${table}.`);
  return text ? JSON.parse(text) : [];
}

export async function restDelete(table, query) {
  const res = await authedFetch(`/rest/v1/${table}?${query}`, {
    method: 'DELETE',
    headers: { Prefer: 'return=representation' }
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || `Không xoá được ${table}.`);
  return text ? JSON.parse(text) : [];
}

export async function restRpc(name, payload={}) {
  const res=await authedFetch(`/rest/v1/rpc/${encodeURIComponent(name)}`,{
    method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)
  });
  const result=await res.text();
  if(!res.ok)throw new Error(result||`Không đọc được báo cáo ${name}`);
  return result?JSON.parse(result):[];
}

export async function restUpsert(table, payload, onConflict) {
  const suffix=onConflict?`?on_conflict=${encodeURIComponent(onConflict)}`:'';
  const res=await authedFetch(`/rest/v1/${table}${suffix}`,{
    method:'POST',
    headers:{'content-type':'application/json',Prefer:'resolution=merge-duplicates,return=representation'},
    body:JSON.stringify(payload)
  });
  const text=await res.text();
  if(!res.ok) throw new Error(text || `Không đồng bộ được ${table}.`);
  return text?JSON.parse(text):[];
}

function safeFileName(name, fallback='file') {
  return String(name || fallback)
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-zA-Z0-9._-]+/g,'_')
    .replace(/^_+|_+$/g,'')
    .slice(0,120) || fallback;
}

export async function uploadChatFile(groupId, file) {
  if (!groupId || !file) throw new Error('Thiếu nhóm hoặc file.');
  if (Number(file.size || 0) > 20 * 1024 * 1024) throw new Error('File chat tối đa 20 MB.');
  const session = await ensureSession();
  const safe = safeFileName(file.name);
  const storagePath = `${groupId}/${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2,8)}-${safe}`;
  const encoded = storagePath.split('/').map(encodeURIComponent).join('/');
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/chat-files/${encoded}`, {
    method:'POST',
    headers:{
      apikey:SUPABASE_KEY,
      Authorization:`Bearer ${session.access_token}`,
      'Content-Type':file.type || 'application/octet-stream',
      'x-upsert':'false'
    },
    body:file
  });
  const text=await res.text();
  if(!res.ok) throw new Error(text || 'Không upload được file chat.');
  return {
    storagePath,
    name:file.name,
    mime:file.type || 'application/octet-stream',
    size:Number(file.size || 0)
  };
}

export async function downloadChatFile(storagePath, fileName='download') {
  const session=await ensureSession();
  const encoded=String(storagePath||'').split('/').map(encodeURIComponent).join('/');
  const res=await fetch(`${SUPABASE_URL}/storage/v1/object/authenticated/chat-files/${encoded}`,{
    headers:{
      apikey:SUPABASE_KEY,
      Authorization:`Bearer ${session.access_token}`
    }
  });
  if(!res.ok) throw new Error(await res.text() || 'Không tải được file.');
  const blob=await res.blob();
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=safeFileName(fileName,'download');
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30_000);
}

export function createRealtimeClient(session, subscriptions, onEvent, onStatus=()=>{}) {
  if (!session?.access_token) throw new Error('Thiếu phiên đăng nhập cho Realtime.');
  const projectRef=new URL(SUPABASE_URL).hostname.split('.')[0];
  const wsUrl=`wss://${projectRef}.supabase.co/realtime/v1/websocket?apikey=${encodeURIComponent(SUPABASE_KEY)}&vsn=1.0.0`;
  let socket=null,heartbeat=null,reconnect=null,stopped=false,ref=0,joinRef=null,retries=0;
  const topic='realtime:portal-'+Math.random().toString(36).slice(2);
  const nextRef=()=>String(++ref);
  const report=status=>{try{onStatus?.(status);}catch(error){console.warn('Realtime status:',error);}};
  const connect=async()=>{
    if(stopped)return;
    report('connecting');
    // Use the refreshed token after a long sleep or disconnection.
    try{
      const current=await ensureSession();
      if(!stopped&&current?.user?.id===session.user.id)session=current;
    }catch(error){
      report(navigator.onLine?'auth-error':'disconnected');
      if(!stopped)reconnect=setTimeout(connect,Math.min(20_000,1500*Math.pow(2,Math.min(retries++,4))));
      return;
    }
    if(stopped)return;
    socket=new WebSocket(wsUrl);
    socket.addEventListener('open',()=>{
      retries=0;
      joinRef=nextRef();
      socket.send(JSON.stringify({
        topic,event:'phx_join',ref:joinRef,join_ref:joinRef,
        payload:{config:{
          broadcast:{ack:false,self:false},
          presence:{enabled:false},
          postgres_changes:(subscriptions||[]).map(item=>({
            event:item.event||'*',schema:item.schema||'public',table:item.table,
            ...(item.filter?{filter:item.filter}:{})
          })),private:false
        },access_token:session.access_token}
      }));
      heartbeat=setInterval(()=>{
        if(socket?.readyState===WebSocket.OPEN)
          socket.send(JSON.stringify({topic:'phoenix',event:'heartbeat',payload:{},ref:nextRef(),join_ref:null}));
      },20_000);
    });
    socket.addEventListener('message',event=>{
      let msg;
      try{msg=JSON.parse(event.data);}catch{return;}
      if(msg?.event==='phx_reply'&&msg.ref===joinRef)
        report(msg.payload?.status==='ok'?'connected':'subscription-error');
      if(msg?.event==='postgres_changes')onEvent?.(msg.payload);
      if(msg?.event==='phx_error'||msg?.event==='phx_close')report('disconnected');
    });
    socket.addEventListener('close',()=>{
      clearInterval(heartbeat);heartbeat=null;
      report('disconnected');
      if(!stopped){
        const delay=Math.min(20_000,1500*Math.pow(2,Math.min(retries++,4)));
        reconnect=setTimeout(connect,delay);
      }
    });
    socket.addEventListener('error',()=>socket?.close());
  };
  connect();
  return {stop(){
    stopped=true;
    clearInterval(heartbeat);
    clearTimeout(reconnect);
    try{socket?.close();}catch{}
  }};
}

export async function uploadImportFile(file) {
  const session = await ensureSession();
  const safe = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]+/g,'_').slice(0,120) || 'source';
  const storagePath = `${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2,8)}-${safe}`;
  const encoded = storagePath.split('/').map(encodeURIComponent).join('/');
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/content-imports/${encoded}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': file.type || 'application/octet-stream',
      'x-upsert': 'false'
    },
    body: file
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || 'Không upload được file.');
  return { storagePath };
}

function splitTranslationText(text, maxChars = 9000) {
  const source = String(text ?? '');
  if (source.length <= maxChars) return [{ text: source, separator: '' }];

  const paragraphs = source.split(/(\n\s*\n)/);
  const pieces = [];
  let current = '';
  let pendingSeparator = '';

  const pushCurrent = () => {
    if (!current) return;
    pieces.push({ text: current, separator: pendingSeparator });
    current = '';
    pendingSeparator = '';
  };

  for (const part of paragraphs) {
    if (!part) continue;
    if (/^\n\s*\n$/.test(part)) {
      pendingSeparator += part;
      continue;
    }

    const candidate = current ? current + pendingSeparator + part : part;
    if (candidate.length <= maxChars) {
      current = candidate;
      pendingSeparator = '';
      continue;
    }

    pushCurrent();

    if (part.length <= maxChars) {
      current = part;
      continue;
    }

    for (let i = 0; i < part.length; i += maxChars) {
      pieces.push({
        text: part.slice(i, i + maxChars),
        separator: i === 0 ? pendingSeparator : ''
      });
      pendingSeparator = '';
    }
  }

  pushCurrent();
  return pieces.length ? pieces : [{ text: source, separator: '' }];
}

async function callTranslateBatch({content_type, target_language, context, segments}) {
  const session = await ensureSession();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/icaew-translate`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${session.access_token}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({ content_type, target_language, context, segments })
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { error: text }; }
  if (!res.ok) throw new Error(data?.error || 'Không dịch được nội dung lúc này.');
  return data;
}

export async function callUniversalTranslate({
  content_type = 'document',
  target_language = 'vi',
  context = '',
  segments = []
}) {
  if (!Array.isArray(segments) || !segments.length) throw new Error('Không có nội dung để dịch.');

  const expanded = [];
  const assembly = new Map();

  segments.forEach((segment, segmentIndex) => {
    const id = String(segment?.id || `segment_${segmentIndex}`);
    const source = String(segment?.text ?? '');
    const parts = splitTranslationText(source);
    assembly.set(id, parts.map((part, partIndex) => ({
      partId: `${id}__part_${partIndex}`,
      separator: part.separator
    })));
    parts.forEach((part, partIndex) => {
      expanded.push({
        id: `${id}__part_${partIndex}`,
        text: part.text
      });
    });
  });

  const batches = [];
  let current = [];
  let currentChars = 0;
  for (const segment of expanded) {
    const size = segment.text.length;
    if (current.length && (current.length >= 35 || currentChars + size > 28000)) {
      batches.push(current);
      current = [];
      currentChars = 0;
    }
    current.push(segment);
    currentChars += size;
  }
  if (current.length) batches.push(current);

  const translatedById = new Map();
  let allCached = true;
  let modelName = null;

  for (const batch of batches) {
    const result = await callTranslateBatch({
      content_type,
      target_language,
      context,
      segments: batch
    });
    allCached = allCached && result?.cached === true;
    modelName = modelName || result?.model_name || null;
    for (const item of result?.segments || []) translatedById.set(item.id, item.text);
  }

  const merged = segments.map((segment, segmentIndex) => {
    const id = String(segment?.id || `segment_${segmentIndex}`);
    const parts = assembly.get(id) || [];
    let text = '';
    parts.forEach((part, index) => {
      const translated = translatedById.get(part.partId);
      if (translated == null) throw new Error('Bản dịch trả về thiếu một phần nội dung.');
      if (index > 0) text += part.separator || '\n\n';
      text += translated;
    });
    return { id, text };
  });

  return {
    content_type,
    target_language,
    segments: merged,
    cached: allCached,
    model_name: modelName
  };
}

export async function callQuestionTranslate({question, options, target_language='vi', subject=''}) {
  const segments = [
    { id: 'question_text', text: question },
    ...options.map((text, index) => ({ id: `option_${index}`, text }))
  ];
  const result = await callUniversalTranslate({
    content_type: 'question',
    target_language,
    context: subject,
    segments
  });
  const byId = new Map(result.segments.map(item => [item.id, item.text]));
  return {
    question_text: byId.get('question_text') || question,
    options: options.map((text, index) => byId.get(`option_${index}`) || text),
    target_language,
    cached: result.cached,
    model_name: result.model_name
  };
}

export async function callAiRoute({storagePath, fileName, mimeType, targetType}) {
  const session = await ensureSession();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/icaew-ai-route`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${session.access_token}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({ storagePath, fileName, mimeType, targetType })
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { error: text }; }
  if (!res.ok) throw new Error(data?.error || 'AI chưa phân loại được nơi lưu.');
  return data;
}

export async function callAiImport({storagePath, fileName, mimeType, targetType, subjectTitle, chapterTitle, exerciseTitle}) {
  const session = await ensureSession();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/icaew-ai-import`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${session.access_token}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({ storagePath, fileName, mimeType, targetType, subjectTitle, chapterTitle, exerciseTitle })
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { error: text }; }
  if (!res.ok) throw new Error(data?.error || 'AI Import chưa được cấu hình.');
  return data;
}

export { SUPABASE_URL, SUPABASE_KEY, AUTH_KEY };