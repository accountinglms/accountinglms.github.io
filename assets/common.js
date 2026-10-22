const SUPABASE_URL = 'https://uangiwgznukuicrfnohq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_FRBwRP7TAmiu02eRF9l49g_tCa4DsGJ';
const AUTH_KEY = 'icaew-lms-auth-v2';
let accessCache = { userId: null, token: null, checkedAt: 0, value: null };
const accessRequests = new Map();
const validationRequests = new Map();
const refreshRequests = new Map();
let authValidation = { token: null, userId: null, checkedAt: 0 };
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
  const previous=loadSession();
  if (previous?.access_token !== session?.access_token || previous?.user?.id !== session?.user?.id) {
    clearAccessCache();
    clearAuthValidation();
  }
  if (!session) localStorage.removeItem(AUTH_KEY);
  else localStorage.setItem(AUTH_KEY, JSON.stringify(session));
}

function clearAccessCache() {
  accessCache = { userId: null, token: null, checkedAt: 0, value: null };
}

function clearAuthValidation() {
  authValidation = { token: null, userId: null, checkedAt: 0 };
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

function networkError(message = 'Kết nối đang gián đoạn. Hãy kiểm tra mạng và thử lại.', cause) {
  const error = new Error(message, { cause });
  error.code = 'NETWORK_ERROR';
  error.retryable = true;
  return error;
}

export function isRetryableError(error) {
  return error?.retryable === true || error?.code === 'NETWORK_ERROR';
}

export async function fetchWithTimeout(url, init = {}, timeoutMs = 15_000) {
  const controller = new AbortController();
  const abort = () => controller.abort(init.signal?.reason);
  if (init.signal?.aborted) abort();
  else init.signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (cause) {
    if (init.signal?.aborted) throw cause;
    throw networkError(controller.signal.aborted
      ? 'Kết nối mất quá nhiều thời gian. Hãy thử lại.' : undefined, cause);
  } finally {
    clearTimeout(timer);
    init.signal?.removeEventListener('abort', abort);
  }
}

function responseError(response, text, fallback) {
  let body;
  try { body = JSON.parse(text); } catch { body = null; }
  const error = response.status === 429 || response.status >= 500
    ? networkError('Máy chủ đang bận hoặc tạm thời không phản hồi. Hãy thử lại sau ít phút.')
    : new Error(body?.msg || body?.message || body?.error_description || body?.error || fallback);
  error.status = response.status;
  error.body = body;
  if (!error.code && body?.code) error.code = body.code;
  return error;
}

function currentSessionFor(session) {
  const current = loadSession();
  if (current?.user?.id === session?.user?.id && current?.access_token === session?.access_token) return current;
  const error = new Error('Phiên đăng nhập đã thay đổi. Hãy mở lại trang.');
  error.code = 'SESSION_CHANGED';
  throw error;
}

function expireSession(session) {
  // A late response from an old account must never clear the current account.
  if (loadSession()?.access_token === session?.access_token) saveSession(null);
  return makeSessionExpiredError();
}

function singleFlight(requests, key, request) {
  if (!requests.has(key)) {
    const pending = request().finally(() => {
      if (requests.get(key) === pending) requests.delete(key);
    });
    requests.set(key, pending);
  }
  return requests.get(key);
}

export async function getMyAccess(session, force = false) {
  if (!session?.access_token || !session?.user?.id) throw new Error('Bạn chưa đăng nhập ICAEW LMS.');
  currentSessionFor(session);
  const now = Date.now();
  if (!force && accessCache.userId === session.user.id && accessCache.token === session.access_token && accessCache.value && now - accessCache.checkedAt < ACCESS_CACHE_MS) {
    return accessCache.value;
  }
  return singleFlight(accessRequests, session.access_token, async () => {
    const res = await fetchWithTimeout(`${SUPABASE_URL}/rest/v1/rpc/get_my_access`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}`, 'content-type': 'application/json' },
      body: '{}'
    });
    const text = await res.text();
    if (!res.ok) throw responseError(res, text, 'Không kiểm tra được quyền truy cập.');
    const value = text ? JSON.parse(text) : null;
    currentSessionFor(session);
    if (!value || value.allowed !== true) throw new Error('Tài khoản này không được cấp quyền.');
    accessCache = { userId: session.user.id, token: session.access_token, checkedAt: Date.now(), value };
    return value;
  });
}

export async function refreshSession(session) {
  const current = loadSession();
  if (current && session && current.user.id === session.user.id && current.access_token !== session.access_token) return current;
  currentSessionFor(session);
  if (!session?.refresh_token) throw expireSession(session);
  return singleFlight(refreshRequests, session.refresh_token, async () => {
    const res = await fetchWithTimeout(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ refresh_token: session.refresh_token })
    });
    const text = await res.text();
    if (!res.ok) {
      const error = responseError(res, text, 'Không làm mới được phiên đăng nhập.');
      if (isRetryableError(error)) throw error;
      throw expireSession(session);
    }
    const data = text ? JSON.parse(text) : null;
    if (!data?.access_token || (data.user?.id && data.user.id !== session.user.id)) {
      throw networkError('Phản hồi đăng nhập chưa hợp lệ. Hãy thử lại.');
    }
    // Logout and account switching may happen while this request is in flight.
    const latest = loadSession();
    if (latest?.user?.id === session.user.id && latest.access_token !== session.access_token) return latest;
    currentSessionFor(session);
    const next = {
      access_token: data.access_token,
      refresh_token: data.refresh_token || session.refresh_token,
      expires_at: data.expires_at || Math.floor(Date.now()/1000) + Number(data.expires_in || 3600),
      token_type: data.token_type || 'bearer',
      user: data.user || session.user
    };
    saveSession(next);
    return next;
  });
}

async function validateAuthSession(session, retry = true) {
  return singleFlight(validationRequests, session.access_token + ':' + retry, async () => {
    const res = await fetchWithTimeout(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}` }
    });
    const text = await res.text();
    if (res.ok) {
      const body = text ? JSON.parse(text) : null;
      currentSessionFor(session);
      if (!body?.id) throw networkError('Chưa kiểm tra được tài khoản. Hãy thử lại.');
      if (body.id !== session.user.id) throw expireSession(session);
      const next = { ...session, user: body };
      saveSession(next);
      authValidation = { token: session.access_token, userId: body.id, checkedAt: Date.now() };
      return next;
    }
    const error = responseError(res, text, 'Không kiểm tra được phiên đăng nhập.');
    if (isRetryableError(error)) throw error;
    if (res.status !== 401 && res.status !== 403 && !isStaleSessionError(error)) throw error;
    if (retry && session.refresh_token) {
      const next = await refreshSession(session);
      return validateAuthSession(next, false);
    }
    throw expireSession(session);
  });
}

export async function ensureBaseSession({ validate = true } = {}) {
  let session = loadSession();
  if (!session) throw new Error('Bạn chưa đăng nhập ICAEW LMS.');
  const now = Math.floor(Date.now()/1000);
  if (Number(session.expires_at || 0) - now < 60) session = await refreshSession(session);

  if (validate) {
    const needsValidation =
      authValidation.token !== session.access_token || authValidation.userId !== session.user.id ||
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
  const res=await fetchWithTimeout(`${SUPABASE_URL}/auth/v1/user`,{
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
  if (!['local','global','others'].includes(scope)) throw new Error('Phạm vi đăng xuất không hợp lệ.');
  const session=loadSession();
  if(scope==='local')saveSession(null);
  if(!session?.access_token){
    if(scope!=='local')throw new Error('Cần đăng nhập để thu hồi phiên trên các thiết bị khác.');
    return;
  }
  try{
    const res=await fetchWithTimeout(`${SUPABASE_URL}/auth/v1/logout?scope=${encodeURIComponent(scope)}`,{
      method:'POST',headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${session.access_token}`}
    });
    if(!res.ok)throw responseError(res,await res.text(),'Chưa thu hồi được các phiên đăng nhập.');
    if(scope==='global'&&loadSession()?.user?.id===session.user.id)saveSession(null);
  }catch(error){
    // Local sign-out always completes; remote revocation must be confirmed by the server.
    if(scope!=='local')throw error;
  }
}

export async function authMfaEnrollTotp(friendlyName = 'Authenticator') {
  const session = await ensureBaseSession();
  const res = await fetchWithTimeout(`${SUPABASE_URL}/auth/v1/factors`, {
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
  const res = await fetchWithTimeout(`${SUPABASE_URL}/auth/v1/factors/${encodeURIComponent(factorId)}/challenge`, {
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
  const res = await fetchWithTimeout(`${SUPABASE_URL}/auth/v1/factors/${encodeURIComponent(factorId)}/verify`, {
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
  const res = await fetchWithTimeout(`${SUPABASE_URL}/auth/v1/factors/${encodeURIComponent(factorId)}`, {
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

export async function authedFetch(path, init = {}, retry = true, timeoutMs = 15_000) {
  let session = await ensureSession();
  const headers = new Headers(init.headers || {});
  headers.set('apikey', SUPABASE_KEY);
  headers.set('Authorization', `Bearer ${session.access_token}`);
  const res = await fetchWithTimeout(`${SUPABASE_URL}${path}`, { ...init, headers }, timeoutMs);
  if (res.status === 401 && retry && session.refresh_token) {
    session = await refreshSession(session);
    return authedFetch(path, init, false, timeoutMs);
  }
  return res;
}

export async function restGet(table, query = 'select=*') {
  const res = await authedFetch(`/rest/v1/${table}?${query}`);
  const text = await res.text();
  if (!res.ok) throw responseError(res, text, `Không đọc được ${table}.`);
  return text ? JSON.parse(text) : [];
}

export async function restInsert(table, payload) {
  const res = await authedFetch(`/rest/v1/${table}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(payload)
  });
  const text = await res.text();
  if (!res.ok) throw responseError(res, text, `Không tạo được ${table}.`);
  return text ? JSON.parse(text) : [];
}

export async function restPatch(table, query, payload) {
  const res = await authedFetch(`/rest/v1/${table}?${query}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(payload)
  });
  const text = await res.text();
  if (!res.ok) throw responseError(res, text, `Không cập nhật được ${table}.`);
  return text ? JSON.parse(text) : [];
}

export async function restDelete(table, query) {
  const res = await authedFetch(`/rest/v1/${table}?${query}`, {
    method: 'DELETE',
    headers: { Prefer: 'return=representation' }
  });
  const text = await res.text();
  if (!res.ok) throw responseError(res, text, `Không xoá được ${table}.`);
  return text ? JSON.parse(text) : [];
}

export async function restRpc(name, payload={}) {
  const res=await authedFetch(`/rest/v1/rpc/${encodeURIComponent(name)}`,{
    method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)
  });
  const result=await res.text();
  if(!res.ok)throw responseError(res,result,`Không đọc được báo cáo ${name}`);
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
  if(!res.ok) throw responseError(res, text, `Không đồng bộ được ${table}.`);
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

export async function getChatFileBlob(storagePath,{signal}={}) {
  const session=await ensureSession();
  const encoded=String(storagePath||'').split('/').map(encodeURIComponent).join('/');
  const res=await fetch(`${SUPABASE_URL}/storage/v1/object/authenticated/chat-files/${encoded}`,{
    headers:{
      apikey:SUPABASE_KEY,
      Authorization:`Bearer ${session.access_token}`
    },signal
  });
  if(!res.ok) throw new Error(await res.text() || 'Không tải được file.');
  return res.blob();
}

export async function downloadChatFile(storagePath, fileName='download') {
  const blob=await getChatFileBlob(storagePath);
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

export async function uploadImportFile(file, {storagePath: requestedPath} = {}) {
  const session = await ensureSession();
  const safe = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]+/g,'_').slice(0,120) || 'source';
  const storagePath = requestedPath || `${session.user.id}/${crypto.randomUUID()}-${safe}`;
  if(!storagePath.startsWith(session.user.id+'/'))throw Error('Tệp thuộc phiên đăng nhập khác. Hãy mở lại trang.');
  const encoded = storagePath.split('/').map(encodeURIComponent).join('/');
  const res = await authedFetch(`/storage/v1/object/content-imports/${encoded}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': file.type || 'application/octet-stream',
      'x-upsert': 'false'
    },
    body: file
  }, true, 60_000);
  const text = await res.text();
  if (!res.ok) {
    // The server may have saved the file before a connection lost its reply.
    // Never overwrite it or accept a different file merely because a path exists.
    if(res.status===409||(res.status===400&&/already exists|duplicate/i.test(text))){
      const saved=await downloadImportFile(storagePath);
      if(saved.size!==file.size)throw Error('Tệp đã lưu khác nội dung. Hãy bắt đầu lượt nhập mới.');
      const digest=async blob=>new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()));
      const [left,right]=await Promise.all([digest(saved),digest(file)]);
      if(!left.every((byte,i)=>byte===right[i]))throw Error('Tệp đã lưu khác nội dung. Hãy bắt đầu lượt nhập mới.');
    }else throw responseError(res,text,'Không tải lên được tệp. Hãy thử lại.');
  }
  if(loadSession()?.user?.id!==session.user.id)throw Error('Phiên đăng nhập đã thay đổi. Hãy mở lại trang.');
  return { storagePath };
}

export async function downloadImportFile(storagePath) {
  const encoded = storagePath.split('/').map(encodeURIComponent).join('/');
  const res = await authedFetch(`/storage/v1/object/authenticated/content-imports/${encoded}`);
  if (!res.ok) throw new Error('Không tải được tệp nguồn đã lưu.');
  return res.blob();
}

function aiRequestError(data, status, fallback) {
  const error = new Error(data?.error || fallback);
  error.code = data?.code || (status === 429 ? 'AI_QUOTA_EXCEEDED' : 'AI_REQUEST_FAILED');
  error.status = status;
  error.retryAfterSeconds = Number(data?.retry_after_seconds) || null;
  error.quotaScope = data?.quota_scope || 'unknown';
  error.finishReason = data?.finish_reason || null;
  error.blockReason = data?.block_reason || null;
  return error;
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

export async function callAiRoute({storagePath, fileName, mimeType, files, targetType}) {
  const session = await ensureSession();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/icaew-ai-route`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${session.access_token}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({ storagePath, fileName, mimeType, files, targetType })
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { error: text }; }
  if (!res.ok) throw aiRequestError(data, res.status, 'AI chưa phân loại được nơi lưu.');
  return data;
}

export async function callAiImport({storagePath, fileName, mimeType, files, targetType, subjectTitle, chapterTitle, exerciseTitle, answerReviewVersion=0,draftId}) {
  let session = await ensureSession();
  if(session.refresh_token&&Number(session.expires_at||0)-Date.now()/1000<180)session=await refreshSession(session);
  const res = await fetch(`${SUPABASE_URL}/functions/v1/icaew-ai-import`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${session.access_token}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({ storagePath, fileName, mimeType, files, targetType, subjectTitle, chapterTitle, exerciseTitle, answerReviewVersion,draftId })
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { error: text }; }
  if (!res.ok) throw aiRequestError(data, res.status, 'AI Import chưa được cấu hình.');
  return data;
}

export async function callAiRepair(input){
  const session=await ensureEditorSession();
  if(session.refresh_token&&Number(session.expires_at||0)-Date.now()/1000<180)await refreshSession(session);
  const res=await authedFetch('/functions/v1/icaew-ai-repair',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input)});
  const text=await res.text();let data;try{data=JSON.parse(text)}catch{data={error:'Chưa đọc được trạng thái sửa. Bản nháp vẫn được giữ.'}}
  const messages={DRAFT_CHANGED:'Bản nháp đã thay đổi ở nơi khác. Hãy mở lại bản mới nhất.',REPAIR_BUSY:'Đang có một lượt sửa khác. Hãy chờ lượt đó hoàn tất.',REPAIR_COOLDOWN:'Hãy chờ 15 giây trước khi thử sửa lại.',REPAIR_DAILY_LIMIT:'Đã đạt giới hạn lượt sửa trong ngày. Bạn vẫn có thể chỉnh sửa bản nháp thủ công.'};
  if(!res.ok)throw aiRequestError({...data,error:messages[data.code]||data.error},res.status,'Chưa bắt đầu được lượt sửa.');
  return data;
}

export { SUPABASE_URL, SUPABASE_KEY, AUTH_KEY };
