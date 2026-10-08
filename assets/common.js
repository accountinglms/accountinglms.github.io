const SUPABASE_URL = 'https://uangiwgznukuicrfnohq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_FRBwRP7TAmiu02eRF9l49g_tCa4DsGJ';
const AUTH_KEY = 'icaew-lms-auth-v2';
const ALLOWED_EMAILS = new Set(['sondoanthai2007@gmail.com','trancongphuong301@gmail.com']);

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

export function allowed(email) {
  return ALLOWED_EMAILS.has(String(email || '').trim().toLowerCase());
}

export async function refreshSession(session) {
  if (!session?.refresh_token) throw new Error('Phiên đăng nhập đã hết hạn.');
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ refresh_token: session.refresh_token })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.msg || data?.error_description || 'Không thể làm mới phiên đăng nhập.');
  const next = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at || Math.floor(Date.now()/1000) + Number(data.expires_in || 3600),
    user: data.user
  };
  if (!allowed(next.user?.email)) throw new Error('Email này không được cấp quyền.');
  saveSession(next);
  return next;
}

export async function ensureSession() {
  let session = loadSession();
  if (!session) throw new Error('Bạn chưa đăng nhập ICAEW LMS.');
  if (!allowed(session.user?.email)) throw new Error('Email này không được cấp quyền.');
  const now = Math.floor(Date.now()/1000);
  if (Number(session.expires_at || 0) - now < 60) session = await refreshSession(session);
  return session;
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

export { SUPABASE_URL, SUPABASE_KEY, AUTH_KEY, ALLOWED_EMAILS };