/* ICAEW LMS V7.5 — hardened Auth + Safari handoff + offline-first cloud sync */
(() => {
    const SUPABASE_URL = 'https://uangiwgznukuicrfnohq.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_FRBwRP7TAmiu02eRF9l49g_tCa4DsGJ';
    const AUTH_KEY = 'icaew-lms-auth-v2';
    const LAST_EMAIL_KEY = 'icaew-lms-last-email-v1';
    const RECOVERY_REDIRECT = 'https://accountinglms.github.io/';
    // Every queued attempt belongs to the same authenticated account it was made under.
    // Previous unscoped queue remains as a non-destructive legacy archive.
    const ATTEMPT_QUEUE_BASE = 'icaew-lms-attempt-queue-v2:user:';
    const attemptQueueKey = () => ATTEMPT_QUEUE_BASE + (cloudSession?.user?.id || 'signed-out');
    const ATTEMPT_HISTORY_LAUNCHED_AT = Date.parse('2026-10-09T00:00:00Z');
    const MAX_ATTEMPT_DURATION_SECONDS = 24 * 60 * 60;
    const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

    function parseAttemptStartedAt(value) {
        if (!value) return null;
        const parsed = Date.parse(value);
        if (!Number.isFinite(parsed)) return null;
        if (parsed < ATTEMPT_HISTORY_LAUNCHED_AT) return null;
        if (parsed > Date.now() + MAX_CLOCK_SKEW_MS) return null;
        return parsed;
    }

    function sanitizeAttemptDuration(value) {
        if (value == null || value === '') return null;
        const seconds = Number(value);
        if (!Number.isFinite(seconds) || seconds < 0 || seconds > MAX_ATTEMPT_DURATION_SECONDS) return null;
        return Math.round(seconds);
    }

    let accessInfo = null;
    let attemptFlushPromise = null;

    let cloudSession = null;
    let cloudReady = false;
    let syncTimer = null;
    let prefTimer = null;
    let refreshing = null;
    const pendingSections = new Set();

    const gate = document.getElementById('auth-gate');
    const authBoot = document.getElementById('auth-boot');
    const emailInput = document.getElementById('auth-email');
    const passwordInput = document.getElementById('auth-password');
    const loginBtn = document.getElementById('auth-login-btn');
    const signupBtn = document.getElementById('auth-signup-btn');
    const authMessage = document.getElementById('auth-message');
    const authOnlineTip = document.getElementById('auth-online-tip');
    const passwordToggle = document.getElementById('auth-password-toggle');
    const loginView = document.getElementById('auth-login-view');
    const forgotView = document.getElementById('auth-forgot-view');
    const resetView = document.getElementById('auth-reset-view');
    const forgotBtn = document.getElementById('auth-forgot-btn');
    const recoveryEmailInput = document.getElementById('auth-recovery-email');
    const recoverySendBtn = document.getElementById('auth-recovery-send');
    const recoveryBackBtn = document.getElementById('auth-recovery-back');
    const recoveryMessage = document.getElementById('auth-recovery-message');
    const newPasswordInput = document.getElementById('auth-new-password');
    const confirmPasswordInput = document.getElementById('auth-confirm-password');
    const resetSubmitBtn = document.getElementById('auth-reset-submit');
    const resetMessage = document.getElementById('auth-reset-message');
    const mfaView = document.getElementById('auth-mfa-view');
    const mfaFactorWrap = document.getElementById('auth-mfa-factor-wrap');
    const mfaFactorSelect = document.getElementById('auth-mfa-factor');
    const mfaCodeInput = document.getElementById('auth-mfa-code');
    const mfaSubmitBtn = document.getElementById('auth-mfa-submit');
    const mfaCancelBtn = document.getElementById('auth-mfa-cancel');
    const mfaMessage = document.getElementById('auth-mfa-message');
    let mfaFactors = [];
    let interactiveSignIn = false;
    const sessionRetryBtn = document.getElementById('auth-retry-session');
    function isHardAuthError(error) {
        const status = Number(error?.status);
        return isStaleSessionError(error) || error?.code === 'SESSION_EXPIRED'
            || status === 401 || status === 403
            || /không được cấp quyền|invalid login credentials/i.test(String(error?.message || ''));
    }
    function postAuthTarget() {
        const params = new URLSearchParams(location.search);
        const requested = params.get('returnTo');
        if (requested) {
            try {
                const url = new URL(requested, location.origin + '/');
                const allowed = /\/(?:home|index|lessons|community|progress|history|account|diagnostics)\.html$/.test(url.pathname);
                if (url.origin === location.origin && allowed && !url.hash && !url.username && !url.password)
                    return url.pathname.slice(1) + url.search;
            } catch (_) {}
        }
        return 'home.html';
    }
    function shouldOpenHome() {
        const params = new URLSearchParams(location.search);
        const landing = location.pathname.endsWith('/');
        return Boolean(params.get('returnTo')) || interactiveSignIn || landing;
    }
    function showSessionRetry(error) {
        showGate(true);
        showAuthView('login');
        if (sessionRetryBtn) sessionRetryBtn.hidden = false;
        setAuthMessage('Kết nối tạm thời gián đoạn. Phiên đăng nhập vẫn được giữ. Nhấn “Thử kết nối lại” khi có mạng. ' + (error?.message || ''), true);
    }
    window.addEventListener('error', e => { if (authMessage) { authMessage.textContent = 'Lỗi ứng dụng: ' + (e.message || 'JavaScript không chạy đúng.'); authMessage.style.color = '#ef7b7b'; } });
    window.addEventListener('unhandledrejection', e => { if (authMessage) { const m = e.reason?.message || String(e.reason || 'Lỗi kết nối'); authMessage.textContent = 'Lỗi kết nối: ' + m; authMessage.style.color = '#ef7b7b'; } });
    const accountBox = document.getElementById('cloud-account');
    const accountEmail = document.getElementById('cloud-user-email');
    const cloudLabel = document.getElementById('cloud-sync-label');
    const cloudDot = document.getElementById('cloud-dot');
    const logoutBtn = document.getElementById('cloud-logout-btn');
    const legacyRecoverBtn = document.getElementById('legacy-recover-btn');
    const passwordBtn = document.getElementById('cloud-password-btn');
    const adminToolLink = document.getElementById('admin-tool-link');

    const localSaveProgress = saveProgress;
    const localSaveUIPrefs = saveUIPrefs;
    const localApplyTheme = applyTheme;

    async function getMyAccess(force=false) {
        if (!cloudSession?.access_token) throw new Error('Bạn chưa đăng nhập.');
        if (!force && accessInfo) return accessInfo;
        const res = await fetchWithTimeout(`${SUPABASE_URL}/rest/v1/rpc/get_my_access`, {
            method:'POST',
            headers:{
                'apikey':SUPABASE_KEY,
                'Authorization':`Bearer ${cloudSession.access_token}`,
                'content-type':'application/json'
            },
            body:'{}'
        });
        const value = await parseResponse(res);
        if (!value || value.allowed !== true) throw new Error('Tài khoản này không được cấp quyền sử dụng ICAEW LMS.');
        accessInfo = value;
        return value;
    }
    function setAuthMessage(msg, error=false) {
        authMessage.textContent = msg;
        authMessage.style.color = error ? '#ef7b7b' : '';
    }
    function setAuthBusy(busy) { loginBtn.disabled = busy; signupBtn.disabled = busy; }

    function showAuthView(view) {
        if (loginView) loginView.hidden = view !== 'login';
        if (forgotView) forgotView.hidden = view !== 'forgot';
        if (resetView) resetView.hidden = view !== 'reset';
        if (mfaView) mfaView.hidden = view !== 'mfa';
    }
    function setRecoveryMessage(message, error=false) {
        if (!recoveryMessage) return;
        recoveryMessage.textContent = message || '';
        recoveryMessage.style.color = error ? '#ef7b7b' : '';
    }
    function setResetMessage(message, error=false) {
        if (!resetMessage) return;
        resetMessage.textContent = message || '';
        resetMessage.style.color = error ? '#ef7b7b' : '';
    }
    function setMfaMessage(message, error=false) {
        if (!mfaMessage) return;
        mfaMessage.textContent = message || '';
        mfaMessage.style.color = error ? '#ef7b7b' : '';
    }
    function saveLastEmail(email) {
        try {
            const value = String(email || '').trim().toLowerCase();
            if (value) localStorage.setItem(LAST_EMAIL_KEY, value);
        } catch (_) {}
    }
    function loadLastEmail() {
        try { return localStorage.getItem(LAST_EMAIL_KEY) || ''; }
        catch (_) { return ''; }
    }
    function setCloudLabel(text, online=true) {
        let next = String(text || '');
        if (/đang đồng bộ/i.test(next)) {
            next = '↻ Đang đồng bộ…';
        } else if (/offline/i.test(next)) {
            next = '☁ Offline · sẽ đồng bộ khi có mạng';
        } else if (/cloud đã đồng bộ|đã đồng bộ/i.test(next)) {
            const time = new Date().toLocaleTimeString('vi-VN', { hour:'2-digit', minute:'2-digit' });
            next = '☁ Đã đồng bộ ' + time;
        } else if (/lỗi|không thể/i.test(next)) {
            next = '⚠ Lỗi đồng bộ';
        }
        if (cloudLabel) cloudLabel.textContent = next;
        if (cloudDot) cloudDot.classList.toggle('online', !!online);
    }
    function finishAuthBoot() {
        document.body.classList.remove('auth-pending');
        if (authBoot) authBoot.classList.add('hidden');
    }
    function showGate(show) {
        finishAuthBoot();
        gate.classList.toggle('hidden', !show);
    }
    function saveSession(session) {
        cloudSession = session || null;
        try {
            if (session) localStorage.setItem(AUTH_KEY, JSON.stringify(session));
            else localStorage.removeItem(AUTH_KEY);
        } catch (_) {}
    }
    function loadSession() {
        try {
            const raw = localStorage.getItem(AUTH_KEY);
            if (!raw) return null;
            const s = JSON.parse(raw);
            return s && s.access_token && s.user ? s : null;
        } catch (_) { return null; }
    }
    function normalizeSession(data) {
        if (!data || !data.access_token || !data.user) return null;
        return {
            access_token: data.access_token,
            refresh_token: data.refresh_token || cloudSession?.refresh_token || null,
            expires_at: data.expires_at || (Math.floor(Date.now()/1000) + Number(data.expires_in || 3600)),
            token_type: data.token_type || 'bearer',
            user: data.user
        };
    }
    async function fetchWithTimeout(url, options={}, timeoutMs=12000) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try { return await fetch(url, { ...options, signal: controller.signal }); }
        catch (error) {
            if (error && error.name === 'AbortError') throw new Error('Kết nối quá lâu. Hãy kiểm tra mạng và thử lại.');
            throw error;
        } finally { clearTimeout(timer); }
    }

    async function parseResponse(res) {
        const text = await res.text();
        let body = null;
        if (text) {
            try { body = JSON.parse(text); } catch (_) { body = text; }
        }
        if (!res.ok) {
            const msg = body?.msg || body?.message || body?.error_description || body?.error || `HTTP ${res.status}`;
            const err = new Error(String(msg));
            err.status = res.status;
            err.body = body;
            throw err;
        }
        return body;
    }

    function isStaleSessionError(error) {
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
    async function refreshSession() {
        if (refreshing) return refreshing;
        if (!cloudSession?.refresh_token) {
            saveSession(null);
            accessInfo = null;
            throw makeSessionExpiredError();
        }
        refreshing = (async () => {
            try {
                const res = await fetchWithTimeout(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
                    method:'POST',
                    headers:{'apikey':SUPABASE_KEY,'content-type':'application/json'},
                    body:JSON.stringify({refresh_token:cloudSession.refresh_token})
                });
                const data = await parseResponse(res);
                const next = normalizeSession(data);
                accessInfo = null;
                saveSession(next);
                return next;
            } catch (error) {
                if (isHardAuthError(error) || error?.status === 400 || error?.status === 422) {
                    saveSession(null);
                    accessInfo = null;
                    throw makeSessionExpiredError();
                }
                // A timeout, offline state or 5xx must not revoke a valid saved session.
                throw error;
            }
        })().finally(() => { refreshing = null; });
        return refreshing;
    }
    async function ensureSession() {
        if (!cloudSession) throw new Error('Bạn chưa đăng nhập.');
        const now = Math.floor(Date.now()/1000);
        if (Number(cloudSession.expires_at || 0) - now < 60) await refreshSession();
        return cloudSession;
    }
    async function authedFetch(path, options={}, retry=true) {
        await ensureSession();
        const headers = new Headers(options.headers || {});
        headers.set('apikey', SUPABASE_KEY);
        headers.set('Authorization', `Bearer ${cloudSession.access_token}`);
        const res = await fetch(`${SUPABASE_URL}${path}`, {...options, headers});
        if (res.status === 401 && retry && cloudSession?.refresh_token) {
            await refreshSession();
            return authedFetch(path, options, false);
        }
        return res;
    }
    async function authSignIn(email, password) {
        const res = await fetchWithTimeout(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
            method:'POST',
            headers:{'apikey':SUPABASE_KEY,'content-type':'application/json'},
            body:JSON.stringify({email,password})
        });
        return parseResponse(res);
    }

    async function authGetCurrentUser(recover=true) {
        await ensureSession();
        try {
            const res = await fetchWithTimeout(`${SUPABASE_URL}/auth/v1/user`, {
                headers:{
                    'apikey':SUPABASE_KEY,
                    'Authorization':`Bearer ${cloudSession.access_token}`
                }
            });
            return await parseResponse(res);
        } catch (error) {
            const invalid = isHardAuthError(error);
            if (recover && invalid && cloudSession?.refresh_token) {
                await refreshSession();
                return authGetCurrentUser(false);
            }
            if (invalid) {
                saveSession(null);
                accessInfo = null;
                throw makeSessionExpiredError();
            }
            throw error;
        }
    }

    async function authMfaChallenge(factorId) {
        await ensureSession();
        const res = await fetchWithTimeout(
            `${SUPABASE_URL}/auth/v1/factors/${encodeURIComponent(factorId)}/challenge`,
            {
                method:'POST',
                headers:{
                    'apikey':SUPABASE_KEY,
                    'Authorization':`Bearer ${cloudSession.access_token}`,
                    'content-type':'application/json'
                },
                body:'{}'
            }
        );
        return parseResponse(res);
    }

    async function authMfaVerify(factorId, challengeId, code) {
        await ensureSession();
        const res = await fetchWithTimeout(
            `${SUPABASE_URL}/auth/v1/factors/${encodeURIComponent(factorId)}/verify`,
            {
                method:'POST',
                headers:{
                    'apikey':SUPABASE_KEY,
                    'Authorization':`Bearer ${cloudSession.access_token}`,
                    'content-type':'application/json'
                },
                body:JSON.stringify({challenge_id:challengeId, code})
            }
        );
        return parseResponse(res);
    }

    async function authRequestPasswordRecovery(email) {
        const res = await fetchWithTimeout(
            `${SUPABASE_URL}/auth/v1/recover?redirect_to=${encodeURIComponent(RECOVERY_REDIRECT)}`,
            {
                method:'POST',
                headers:{'apikey':SUPABASE_KEY,'content-type':'application/json'},
                body:JSON.stringify({email})
            }
        );
        return parseResponse(res);
    }

    async function recoverySessionFromUrl() {
        const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
        const query = new URLSearchParams(location.search);
        const type = hash.get('type') || query.get('type');
        const errorDescription = hash.get('error_description') || query.get('error_description');
        const recoveryLike = type === 'recovery' || Boolean(errorDescription);
        if (!recoveryLike) return { handled:false, session:null };

        if (errorDescription) {
            history.replaceState(null, '', location.pathname);
            showGate(true);
            showAuthView('forgot');
            setRecoveryMessage('Liên kết khôi phục không còn hợp lệ hoặc đã hết hạn. Hãy yêu cầu một liên kết mới.', true);
            return { handled:true, session:null };
        }

        const accessToken = hash.get('access_token');
        const refreshToken = hash.get('refresh_token');
        if (!accessToken) {
            showGate(true);
            showAuthView('forgot');
            setRecoveryMessage('Không đọc được phiên khôi phục từ liên kết email. Hãy yêu cầu lại liên kết đặt mật khẩu.', true);
            return { handled:true, session:null };
        }

        const userRes = await fetchWithTimeout(`${SUPABASE_URL}/auth/v1/user`, {
            headers:{
                'apikey':SUPABASE_KEY,
                'Authorization':`Bearer ${accessToken}`
            }
        });
        const user = await parseResponse(userRes);
        const session = normalizeSession({
            access_token:accessToken,
            refresh_token:refreshToken,
            expires_in:Number(hash.get('expires_in') || 3600),
            token_type:hash.get('token_type') || 'bearer',
            user
        });
        if (!session) throw new Error('Không tạo được phiên khôi phục mật khẩu.');

        saveSession(session);
        accessInfo = null;
        const access = await getMyAccess(true);
        if (access?.allowed !== true) {
            await authSignOut();
            throw new Error('Tài khoản này không được cấp quyền sử dụng ICAEW LMS.');
        }

        history.replaceState(null, '', location.pathname);
        showGate(true);
        showAuthView('reset');
        setResetMessage('');
        newPasswordInput?.focus({preventScroll:true});
        return { handled:true, session };
    }
    async function authSignUp(email, password) {
        const res = await fetchWithTimeout(`${SUPABASE_URL}/auth/v1/signup?redirect_to=${encodeURIComponent(location.href.split('#')[0])}`, {
            method:'POST',
            headers:{'apikey':SUPABASE_KEY,'content-type':'application/json'},
            body:JSON.stringify({email,password,data:{display_name:email.split('@')[0]}})
        });
        return parseResponse(res);
    }
    async function authSignOut(scope='local') {
        const allowedScopes = new Set(['local','global','others']);
        if (!allowedScopes.has(scope)) scope = 'local';
        const token = cloudSession?.access_token;
        if (token) {
            try {
                await fetchWithTimeout(`${SUPABASE_URL}/auth/v1/logout?scope=${encodeURIComponent(scope)}`, {
                    method:'POST',
                    headers:{
                        'apikey':SUPABASE_KEY,
                        'Authorization':`Bearer ${token}`
                    }
                });
            } catch (_) {}
        }
        if (scope !== 'others') {
            saveSession(null);
            accessInfo = null;
        }
    }
    async function authUpdatePassword(password) {
        const res = await authedFetch('/auth/v1/user', {
            method:'PUT',
            headers:{'content-type':'application/json'},
            body:JSON.stringify({password})
        });
        return parseResponse(res);
    }
    async function restGet(table, query='') {
        const res = await authedFetch(`/rest/v1/${table}${query ? '?' + query : ''}`, {
            method:'GET', headers:{'Accept':'application/json'}
        });
        return parseResponse(res);
    }

    const CATALOG_CACHE_KEY = 'accountingLMSCatalog_v1';

    async function loadDatabaseCatalog() {
        try {
            const [subjects, chapters, exercises, questions] = await Promise.all([
                restGet('subjects', 'select=*&is_active=eq.true&order=sort_order.asc'),
                restGet('chapters', 'select=*&is_active=eq.true&order=sort_order.asc'),
                restGet('exercises', 'select=*&is_active=eq.true&order=sort_order.asc'),
                restGet('questions', 'select=*&status=eq.published&order=sort_order.asc')
            ]);
            const catalog = { subjects, chapters, exercises, questions, cached_at: Date.now() };
            try { localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(catalog)); } catch (_) {}
            return applyDatabaseCatalog(catalog);
        } catch (error) {
            try {
                const cached = JSON.parse(localStorage.getItem(CATALOG_CACHE_KEY) || 'null');
                if (cached?.subjects?.length) {
                    console.warn('Catalog network load failed; using last synced database catalog.', error);
                    return applyDatabaseCatalog(cached);
                }
            } catch (_) {}
            throw error;
        }
    }
    async function restUpsert(table, payload, conflict) {
        const q = conflict ? `?on_conflict=${encodeURIComponent(conflict)}` : '';
        const res = await authedFetch(`/rest/v1/${table}${q}`, {
            method:'POST',
            headers:{'content-type':'application/json','Prefer':'resolution=merge-duplicates,return=minimal'},
            body:JSON.stringify(payload)
        });
        if (!res.ok) return parseResponse(res);
        return null;
    }

    async function restRpc(name, payload) {
        const res = await authedFetch(`/rest/v1/rpc/${name}`, {
            method:'POST',
            headers:{'content-type':'application/json','Accept':'application/json'},
            body:JSON.stringify(payload || {})
        });
        return parseResponse(res);
    }

    function loadAttemptQueue() {
        try {
            const value = JSON.parse(localStorage.getItem(attemptQueueKey()) || '[]');
            return Array.isArray(value) ? value : [];
        } catch (_) { return []; }
    }

    function saveAttemptQueue(queue) {
        try { localStorage.setItem(attemptQueueKey(), JSON.stringify(queue || [])); }
        catch (error) { console.warn('Attempt queue save:', error); }
    }

    function queueAttempt(payload) {
        if (!payload?.exercise_id || !payload?.run_id || !cloudSession?.user?.id) return;
        payload.owner_user_id = cloudSession.user.id;
        const queue = loadAttemptQueue();
        const index = queue.findIndex(item => item.run_id === payload.run_id && item.exercise_id === payload.exercise_id);
        if (index >= 0) queue[index] = payload;
        else queue.push(payload);
        saveAttemptQueue(queue);
    }

    async function loadAttemptSummaries() {
        if (!cloudSession) return;
        try {
            const rows = await restGet(
                'exercise_attempts',
                'select=id,exercise_id,score,total_questions,attempt_no,completed_at&order=completed_at.desc&limit=500'
            );
            window.lmsSetAttemptSummaries?.(Array.isArray(rows) ? rows : []);
        } catch (error) {
            console.warn('Attempt summaries:', error);
        }
    }

    async function flushAttemptQueue() {
        if (attemptFlushPromise) return attemptFlushPromise;
        if (!cloudReady || !cloudSession || !navigator.onLine) return;
        attemptFlushPromise = (async () => {
            let queue = loadAttemptQueue();
            if (!queue.length) return;
            const remaining = [];
            for (const payload of queue) {
                // Refuse to upload attempts created by another user, even after account switching.
                if (!cloudSession?.user?.id || payload.owner_user_id !== cloudSession.user.id) {
                    remaining.push(payload);
                    continue;
                }
                try {
                    const rows = await restRpc('record_exercise_attempt', {
                        p_exercise_id: payload.exercise_id,
                        p_run_id: payload.run_id,
                        p_started_at: payload.started_at,
                        p_score: Number(payload.score || 0),
                        p_total_questions: Number(payload.total_questions || 0),
                        p_correct_count: Number(payload.correct_count || 0),
                        p_wrong_count: Number(payload.wrong_count || 0),
                        p_unanswered_count: Number(payload.unanswered_count || 0),
                        p_bookmarked_count: Number(payload.bookmarked_count || 0),
                        p_duration_seconds: sanitizeAttemptDuration(payload.duration_seconds),
                        p_answers_status: payload.answers_status || [],
                        p_selected_answers: payload.selected_answers || [],
                        p_bookmarks: payload.bookmarks || [],
                        p_question_snapshot: payload.question_snapshot || [],
                        p_context_snapshot: payload.context_snapshot || {},
                        p_submitted_from: payload.submitted_from || 'web'
                    });
                    const row = Array.isArray(rows) ? rows[0] : rows;
                    window.dispatchEvent(new CustomEvent('lms:attempt-saved', {
                        detail: {
                            exercise_id: payload.exercise_id,
                            run_id: payload.run_id,
                            id: row?.id || null,
                            attempt_no: row?.attempt_no || null,
                            completed_at: row?.completed_at || new Date().toISOString()
                        }
                    }));
                } catch (error) {
                    console.warn('Attempt history sync:', error);
                    remaining.push(payload);
                    window.dispatchEvent(new CustomEvent('lms:attempt-save-failed', {
                        detail: { exercise_id: payload.exercise_id, run_id: payload.run_id }
                    }));
                }
            }
            saveAttemptQueue(remaining);
            if (remaining.length === 0) await loadAttemptSummaries();
        })().finally(() => { attemptFlushPromise = null; });
        return attemptFlushPromise;
    }

    window.addEventListener('lms:attempt-submitted', event => {
        const payload = event.detail;
        if (!payload?.exercise_id || !payload?.run_id) return;
        queueAttempt(payload);
        flushAttemptQueue();
    });

    function sectionLength(secId) {
        for (const ch of courseData) {
            const sec = ch.sections.find(s => s.id === secId);
            if (sec) return sec.data.length;
        }
        return 0;
    }
    function hasLocalActivity(state) {
        if (!state) return false;
        return (state.lastQuestion || 0) > 0 ||
            (state.isAnswered || []).some(Boolean) ||
            (state.bookmarks || []).some(Boolean) ||
            (state.draftSelections || []).some(v => v !== null && v !== undefined);
    }
    function toIso(ms) {
        const n = Number(ms || Date.now());
        return new Date(Number.isFinite(n) ? n : Date.now()).toISOString();
    }

    saveProgress = function() {
        if (activeSectionId && progressStore[activeSectionId]) progressStore[activeSectionId].updatedAt = Date.now();
        localSaveProgress();
        if (activeSectionId) queueCloudSync(activeSectionId);
    };
    saveUIPrefs = function() {
        uiPrefs.updatedAt = Date.now();
        localSaveUIPrefs();
        queuePrefSync();
    };
    applyTheme = function(theme, persist=true) {
        localApplyTheme(theme, persist);
        if (persist) queuePrefSync();
    };

    async function login() {
        const email = emailInput.value.trim().toLowerCase();
        const password = passwordInput.value;
        if (!emailInput.checkValidity()) { emailInput.reportValidity(); return setAuthMessage('Hãy nhập đúng địa chỉ email.', true); }
        if (!passwordInput.checkValidity() || !password) { passwordInput.reportValidity(); return setAuthMessage('Hãy nhập mật khẩu.', true); }
        if (location.protocol === 'file:') return setAuthMessage('Bạn đang mở file HTML cục bộ. Hãy bấm “Mở ICAEW LMS Online” ở phía trên rồi đăng nhập trong Safari.', true);
        setAuthBusy(true); setAuthMessage('Đang đăng nhập…');
        try {
            const data = await authSignIn(email, password);
            const session = normalizeSession(data);
            if (!session) throw new Error('Không nhận được phiên đăng nhập.');
            saveLastEmail(email);
            saveSession(session);
            interactiveSignIn = true;
            await handleSignedIn(session);
        } catch (error) {
            setAuthMessage('Không đăng nhập được: ' + error.message, true);
        } finally { setAuthBusy(false); }
    }

    async function signup() {
        setAuthMessage('Đăng ký công khai đã được tắt. Tài khoản mới phải được Admin cấp quyền trước.', true);
    }

    async function logout() {
        cloudReady = false;
        accessInfo = null;
        pendingSections.clear();
        await authSignOut('local');
        window.lmsBindOfflineUser?.(null);
        refreshLegacyRecoveryButton();
        accountBox.hidden = true;
        if (adminToolLink) adminToolLink.hidden = true;
        showGate(true);
        showAuthView('login');
        setAuthMessage('Đã đăng xuất khỏi thiết bị này. Các thiết bị khác vẫn giữ phiên đăng nhập.');
    }

    async function changePassword() {
        const next = prompt('Nhập mật khẩu mới (ít nhất 8 ký tự):');
        if (!next) return;
        if (next.length < 8) return alert('Mật khẩu cần ít nhất 8 ký tự.');
        try { await authUpdatePassword(next); alert('Đã đổi mật khẩu.'); }
        catch (error) { alert('Không đổi được mật khẩu: ' + error.message); }
    }


    let recoveryCooldownTimer = null;
    function startRecoveryCooldown(seconds=60) {
        if (!recoverySendBtn) return;
        clearInterval(recoveryCooldownTimer);
        let remaining = seconds;
        recoverySendBtn.disabled = true;
        const original = 'Gửi liên kết khôi phục';
        const render = () => {
            recoverySendBtn.querySelector('span')?.replaceChildren(document.createTextNode(`Gửi lại sau ${remaining}s`));
        };
        render();
        recoveryCooldownTimer = setInterval(() => {
            remaining -= 1;
            if (remaining <= 0) {
                clearInterval(recoveryCooldownTimer);
                recoverySendBtn.disabled = false;
                recoverySendBtn.querySelector('span')?.replaceChildren(document.createTextNode(original));
                return;
            }
            render();
        }, 1000);
    }

    async function requestPasswordRecovery() {
        const email = String(recoveryEmailInput?.value || '').trim().toLowerCase();
        if (!email || !recoveryEmailInput.checkValidity()) {
            recoveryEmailInput?.reportValidity();
            return setRecoveryMessage('Hãy nhập đúng email của tài khoản.', true);
        }
        if (location.protocol === 'file:') {
            return setRecoveryMessage('Hãy mở website chính thức trước khi yêu cầu khôi phục mật khẩu.', true);
        }

        recoverySendBtn.disabled = true;
        setRecoveryMessage('Đang gửi email khôi phục…');
        try {
            await authRequestPasswordRecovery(email);
            saveLastEmail(email);
            setRecoveryMessage('Nếu email này thuộc tài khoản hợp lệ, liên kết đặt lại mật khẩu đã được gửi. Hãy kiểm tra Inbox và Spam.');
            startRecoveryCooldown(60);
        } catch (error) {
            recoverySendBtn.disabled = false;
            const message = error?.status === 429
                ? 'Bạn vừa yêu cầu email khôi phục. Hãy chờ một lúc trước khi thử lại.'
                : 'Chưa gửi được email khôi phục: ' + error.message;
            setRecoveryMessage(message, true);
        }
    }

    async function submitRecoveredPassword() {
        const password = String(newPasswordInput?.value || '');
        const confirm = String(confirmPasswordInput?.value || '');
        if (password.length < 8) {
            newPasswordInput?.focus();
            return setResetMessage('Mật khẩu mới cần ít nhất 8 ký tự.', true);
        }
        if (password !== confirm) {
            confirmPasswordInput?.focus();
            return setResetMessage('Hai lần nhập mật khẩu chưa khớp.', true);
        }
        if (!cloudSession?.access_token) {
            showAuthView('forgot');
            return setRecoveryMessage('Phiên khôi phục đã hết hạn. Hãy yêu cầu lại liên kết đặt mật khẩu.', true);
        }

        resetSubmitBtn.disabled = true;
        setResetMessage('Đang cập nhật mật khẩu…');
        try {
            await authUpdatePassword(password);
            saveLastEmail(cloudSession.user?.email || '');
            setResetMessage('Đã cập nhật mật khẩu. Đang mở workspace…');
            newPasswordInput.value = '';
            confirmPasswordInput.value = '';
            await handleSignedIn(cloudSession);
        } catch (error) {
            setResetMessage('Không cập nhật được mật khẩu: ' + error.message, true);
        } finally {
            resetSubmitBtn.disabled = false;
        }
    }

    async function hydrateCloud() {
        if (!cloudSession) return;
        cloudReady = false;
        setCloudLabel('Đang tải tiến độ cloud…', true);
        let rows = [], prefs = null;
        try {
            rows = await restGet('user_progress', 'select=*');
            const prefRows = await restGet('user_preferences', 'select=*&limit=1');
            prefs = Array.isArray(prefRows) ? prefRows[0] : null;
        } catch (error) {
            console.warn('Cloud load:', error);
            setCloudLabel('Không tải được cloud · vẫn học offline được', false);
        }

        const cloudById = new Map((rows || []).map(r => [r.exercise_id, r]));
        const uploadAfter = [];
        courseData.forEach(ch => ch.sections.forEach(sec => {
            const len = sec.data.length;
            const local = normalizeSectionState(progressStore[sec.id] || savedProgress[sec.id], len);
            const row = cloudById.get(sec.id);
            if (!row) {
                progressStore[sec.id] = local;
                if (hasLocalActivity(local)) uploadAfter.push(sec.id);
                return;
            }
            const cloudState = normalizeSectionState({
                answersStatus: row.answers_status,
                isAnswered: row.is_answered,
                userSelections: row.selected_answers,
                draftSelections: row.draft_selections,
                bookmarks: row.bookmarks,
                score: row.score,
                lastQuestion: row.current_question,
                runId: row.attempt_run_id || null,
                startedAt: parseAttemptStartedAt(row.attempt_started_at),
                attemptRecorded: row.attempt_recorded === true,
                updatedAt: Date.parse(row.updated_at || 0)
            }, len);
            const localTs = Number(local.updatedAt || 0);
            const cloudTs = Date.parse(row.updated_at || 0) || 0;
            if (localTs > cloudTs && hasLocalActivity(local)) {
                progressStore[sec.id] = local;
                uploadAfter.push(sec.id);
            } else progressStore[sec.id] = cloudState;
        }));
        saveJSON(STORAGE_KEY, progressStore);

        if (prefs) {
            const cloudPrefTs = Date.parse(prefs.updated_at || 0) || 0;
            const localPrefTs = Number(uiPrefs.updatedAt || 0);
            if (cloudPrefTs >= localPrefTs) {
                uiPrefs.explanationLang = prefs.explanation_mode === 'en' ? 'eng' : prefs.explanation_mode === 'vi' ? 'vie' : 'both';
                uiPrefs.lastSectionId = prefs.last_exercise_id || uiPrefs.lastSectionId;
                uiPrefs.updatedAt = cloudPrefTs;
                localSaveUIPrefs();
                if (prefs.theme === 'light' || prefs.theme === 'dark') localApplyTheme(prefs.theme, true);
            }
        }

        await loadAttemptSummaries();
        updateAllSidebarScores();
        updateResumeButton();
        if (activeSectionId && progressStore[activeSectionId]) loadQuestion();
        cloudReady = true;
        for (const id of uploadAfter) pendingSections.add(id);
        if (uploadAfter.length) scheduleSyncFlush(50);
        queuePrefSync(80);
        flushAttemptQueue();
        setCloudLabel(navigator.onLine ? 'Cloud đã đồng bộ' : 'Offline · sẽ đồng bộ khi có mạng', navigator.onLine);
    }

    function queueCloudSync(secId) {
        if (!cloudReady || !cloudSession || !secId) return;
        pendingSections.add(secId);
        scheduleSyncFlush(700);
    }
    function scheduleSyncFlush(delay=700) {
        clearTimeout(syncTimer);
        syncTimer = setTimeout(flushSync, delay);
    }
    async function flushSync() {
        if (!cloudReady || !cloudSession || !navigator.onLine || pendingSections.size === 0) return;
        const ids = Array.from(pendingSections); pendingSections.clear();
        setCloudLabel('Đang đồng bộ…', true);
        for (const secId of ids) {
            const s = progressStore[secId];
            if (!s) continue;
            const len = sectionLength(secId);
            const completed = len > 0 && s.isAnswered?.length >= len && s.isAnswered.slice(0,len).every(Boolean);
            const payload = {
                user_id: cloudSession.user.id,
                exercise_id: secId,
                current_question: Number(s.lastQuestion || 0),
                score: Number(s.score || 0),
                answers_status: s.answersStatus || [],
                is_answered: s.isAnswered || [],
                selected_answers: s.userSelections || [],
                draft_selections: s.draftSelections || [],
                bookmarks: s.bookmarks || [],
                attempt_run_id: s.runId || null,
                attempt_started_at: s.startedAt ? toIso(s.startedAt) : null,
                attempt_recorded: s.attemptRecorded === true,
                completed,
                completed_at: completed ? toIso(s.updatedAt) : null,
                updated_at: toIso(s.updatedAt)
            };
            try { await restUpsert('user_progress', payload, 'user_id,exercise_id'); }
            catch (error) { console.warn('Cloud sync error', secId, error); pendingSections.add(secId); }
        }
        setCloudLabel(pendingSections.size ? 'Có thay đổi chờ đồng bộ' : 'Cloud đã đồng bộ', pendingSections.size === 0);
    }

    function queuePrefSync(delay=600) {
        if (!cloudReady || !cloudSession) return;
        clearTimeout(prefTimer);
        prefTimer = setTimeout(syncPrefs, delay);
    }
    async function syncPrefs() {
        if (!cloudReady || !cloudSession || !navigator.onLine) return;
        const lang = uiPrefs.explanationLang === 'eng' ? 'en' : uiPrefs.explanationLang === 'vie' ? 'vi' : 'both';
        const payload = {
            user_id: cloudSession.user.id,
            theme: getCurrentTheme(),
            explanation_mode: lang,
            last_exercise_id: uiPrefs.lastSectionId || null,
            updated_at: new Date().toISOString()
        };
        try { await restUpsert('user_preferences', payload, 'user_id'); }
        catch (error) { console.warn('Preference sync error', error); }
    }

    async function beginMfaChallenge() {
        const user = await authGetCurrentUser();
        mfaFactors = (user?.factors || []).filter(
            factor => factor?.factor_type === 'totp' && factor?.status === 'verified'
        );
        if (!mfaFactors.length) {
            throw new Error('Tài khoản yêu cầu MFA nhưng không tìm thấy Authenticator đã xác minh.');
        }

        if (mfaFactorSelect) {
            mfaFactorSelect.innerHTML = '';
            mfaFactors.forEach((factor, index) => {
                const option = document.createElement('option');
                option.value = factor.id;
                option.textContent = factor.friendly_name || `Authenticator ${index + 1}`;
                mfaFactorSelect.appendChild(option);
            });
        }
        if (mfaFactorWrap) mfaFactorWrap.hidden = mfaFactors.length <= 1;
        if (mfaCodeInput) mfaCodeInput.value = '';
        setMfaMessage('');
        showGate(true);
        showAuthView('mfa');
        setTimeout(() => mfaCodeInput?.focus({preventScroll:true}), 0);
    }

    async function verifyMfaLogin() {
        const code = String(mfaCodeInput?.value || '').replace(/\s+/g, '');
        if (!/^\d{6}$/.test(code)) {
            mfaCodeInput?.focus();
            return setMfaMessage('Hãy nhập đúng mã gồm 6 chữ số.', true);
        }
        const factorId = mfaFactorSelect?.value || mfaFactors[0]?.id;
        if (!factorId) return setMfaMessage('Không tìm thấy Authenticator để xác minh.', true);

        mfaSubmitBtn.disabled = true;
        setMfaMessage('Đang xác minh mã…');
        try {
            const challenge = await authMfaChallenge(factorId);
            const verified = await authMfaVerify(factorId, challenge.id, code);
            const next = normalizeSession(verified);
            if (!next) throw new Error('Không nhận được phiên aal2 sau khi xác minh.');
            accessInfo = null;
            saveSession(next);
            setMfaMessage('Đã xác minh. Đang mở Trang chủ…');
            interactiveSignIn = true;
            await handleSignedIn(next);
        } catch (error) {
            setMfaMessage('Mã không đúng, đã hết hạn hoặc không thể xác minh: ' + error.message, true);
        } finally {
            mfaSubmitBtn.disabled = false;
        }
    }

    function canOfferLegacyRecovery() {
        if (!cloudSession?.user?.id || !legacyRecoverBtn) return false;
        try {
            const claimedBy=localStorage.getItem('accountingLMSLegacyClaimedBy_v1');
            if (claimedBy && claimedBy !== cloudSession.user.id) return false;
            const old=JSON.parse(localStorage.getItem('accountingLMSProgress_v2') || '{}');
            return old && typeof old==='object' && Object.keys(old).length>0
                && claimedBy !== cloudSession.user.id;
        } catch { return false; }
    }
    function refreshLegacyRecoveryButton() {
        if (legacyRecoverBtn) legacyRecoverBtn.hidden=!canOfferLegacyRecovery();
    }
    legacyRecoverBtn?.addEventListener('click', async () => {
        if (!cloudSession?.user?.id) return;
        const email=String(cloudSession.user.email||'').toLowerCase();
        const ownership=prompt('Chỉ khôi phục nếu dữ liệu cũ trên trình duyệt này thuộc về chính bạn. Nhập email tài khoản hiện tại để xác nhận:', '');
        if (ownership===null) return;
        if (ownership.trim().toLowerCase() !== email) {
            alert('Email xác nhận không khớp. Không có dữ liệu nào được thay đổi.');
            return;
        }
        try {
            const count=window.lmsRecoverLegacyProgress?.() || 0;
            if (!count) {
                alert('Không tìm thấy phần học cũ cần khôi phục hoặc bản cloud đã mới hơn. Dữ liệu lưu trữ cũ vẫn được giữ nguyên.');
                return;
            }
            localStorage.setItem('accountingLMSLegacyClaimedBy_v1', cloudSession.user.id);
            refreshLegacyRecoveryButton();
            await hydrateCloud();
            alert('Đã đưa '+count+' bài tập từ bản cũ vào tiến độ tài khoản này. Tiến độ sẽ đồng bộ khi có mạng; dữ liệu gốc vẫn được giữ làm bản lưu.');
        } catch (error) {
            alert('Chưa thể khôi phục: '+(error.message||'Lỗi không xác định'));
        }
    });

    async function handleSignedIn(session) {
        const email = session?.user?.email?.toLowerCase() || '';
        saveSession(session);

        let access;
        try {
            accessInfo = null;
            access = await getMyAccess(true);
        } catch (error) {
            if (!isHardAuthError(error)) {
                showSessionRetry(error);
                return;
            }
            await authSignOut('local');
            showGate(true);
            showAuthView('login');
            return setAuthMessage('Phiên đăng nhập đã hết hiệu lực hoặc tài khoản không được cấp quyền. Hãy đăng nhập lại.', true);
        }

        if (access?.mfa_required === true && access?.mfa_satisfied !== true) {
            try {
                await beginMfaChallenge();
            } catch (error) {
                await authSignOut('local');
                showGate(true);
                showAuthView('login');
                const message = isStaleSessionError(error) || error?.code === 'SESSION_EXPIRED'
                    ? 'Phiên đăng nhập cũ đã hết hiệu lực. Hãy đăng nhập lại bằng mật khẩu.'
                    : 'Không thể khởi tạo xác thực 2 bước. Hãy thử đăng nhập lại.';
                setAuthMessage(message, true);
            }
            return;
        }

        if (sessionRetryBtn) sessionRetryBtn.hidden = true;
        if (shouldOpenHome()) {
            location.replace(postAuthTarget());
            return;
        }
        window.lmsBindOfflineUser?.(session.user.id);
        refreshLegacyRecoveryButton();
        accountEmail.textContent = email;
        accountBox.hidden = false;
        if (adminToolLink) adminToolLink.hidden = access?.editor !== true;
        showGate(false);

        try {
            await loadDatabaseCatalog();
        } catch (error) {
            console.warn('Catalog load:', error);
            setCloudLabel('Không tải được catalog · đang dùng dữ liệu offline', false);
        }

        await hydrateCloud();
    }

    sessionRetryBtn?.addEventListener('click',async()=>{
        const existing = loadSession();
        if (!existing) return setAuthMessage('Không tìm thấy phiên đã lưu. Hãy đăng nhập bằng mật khẩu.', true);
        sessionRetryBtn.disabled = true;
        setAuthMessage('Đang kiểm tra lại phiên đăng nhập…');
        try {
            saveSession(existing);
            await ensureSession();
            await authGetCurrentUser();
            await handleSignedIn(cloudSession);
        } catch (error) {
            if (isHardAuthError(error)) {
                saveSession(null);
                sessionRetryBtn.hidden = true;
                setAuthMessage('Phiên đã hết hiệu lực. Hãy đăng nhập bằng mật khẩu.', true);
            } else showSessionRetry(error);
        } finally { sessionRetryBtn.disabled = false; }
    });
    loginBtn.addEventListener('click', login);
    signupBtn.addEventListener('click', signup);
    logoutBtn.addEventListener('click', logout);
    passwordBtn.addEventListener('click', changePassword);
    passwordInput.addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
    forgotBtn?.addEventListener('click', () => {
        const email = emailInput.value.trim() || loadLastEmail();
        if (recoveryEmailInput) recoveryEmailInput.value = email;
        setRecoveryMessage('');
        showAuthView('forgot');
        recoveryEmailInput?.focus({preventScroll:true});
    });
    recoveryBackBtn?.addEventListener('click', () => {
        if (emailInput && recoveryEmailInput?.value) emailInput.value = recoveryEmailInput.value.trim();
        setRecoveryMessage('');
        showAuthView('login');
        emailInput?.focus({preventScroll:true});
    });
    recoverySendBtn?.addEventListener('click', requestPasswordRecovery);
    recoveryEmailInput?.addEventListener('keydown', e => {
        if (e.key === 'Enter') requestPasswordRecovery();
    });
    resetSubmitBtn?.addEventListener('click', submitRecoveredPassword);
    confirmPasswordInput?.addEventListener('keydown', e => {
        if (e.key === 'Enter') submitRecoveredPassword();
    });
    mfaSubmitBtn?.addEventListener('click', verifyMfaLogin);
    mfaCodeInput?.addEventListener('input', () => {
        if (mfaCodeInput) mfaCodeInput.value = mfaCodeInput.value.replace(/\D/g, '').slice(0, 6);
    });
    mfaCodeInput?.addEventListener('keydown', e => {
        if (e.key === 'Enter') verifyMfaLogin();
    });
    mfaCancelBtn?.addEventListener('click', async () => {
        await authSignOut('local');
        accessInfo = null;
        mfaFactors = [];
        if (mfaCodeInput) mfaCodeInput.value = '';
        showGate(true);
        showAuthView('login');
        setAuthMessage('Đã hủy xác thực 2 bước và đăng xuất.');
    });
    passwordToggle?.addEventListener('click', () => {
        const reveal = passwordInput.type === 'password';
        passwordInput.type = reveal ? 'text' : 'password';
        passwordToggle.textContent = reveal ? 'Ẩn' : 'Hiện';
        passwordToggle.setAttribute('aria-label', reveal ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
        passwordToggle.setAttribute('aria-pressed', String(reveal));
        passwordInput.focus({ preventScroll:true });
    });
    window.addEventListener('online', () => { setCloudLabel('Đã có mạng · đang đồng bộ…', true); scheduleSyncFlush(50); queuePrefSync(80); flushAttemptQueue(); });
    window.addEventListener('offline', () => setCloudLabel('Offline · tiến độ vẫn lưu trên máy', false));

    let resumeCheckPromise = null;
    async function validateSessionOnResume() {
        if (document.visibilityState === 'hidden' || !loadSession() || gate.classList.contains('hidden') === false) return;
        if (resumeCheckPromise) return resumeCheckPromise;
        resumeCheckPromise = (async () => {
            try {
                await ensureSession();
                await authGetCurrentUser();
                accessInfo = null;
                const access = await getMyAccess(true);
                if (access?.mfa_required === true && access?.mfa_satisfied !== true) {
                    await beginMfaChallenge();
                }
            } catch (error) {
                if (!isHardAuthError(error)) {
                    setCloudLabel('Không kết nối được để kiểm tra phiên · vẫn giữ phiên đăng nhập', false);
                    return;
                }
                saveSession(null);
                window.lmsBindOfflineUser?.(null);
                accessInfo = null;
                cloudReady = false;
                accountBox.hidden = true;
                if (adminToolLink) adminToolLink.hidden = true;
                showGate(true);
                showAuthView('login');
                setAuthMessage('Phiên đăng nhập đã hết hiệu lực. Hãy đăng nhập lại.', true);
            }
        })().finally(() => { resumeCheckPromise = null; });
        return resumeCheckPromise;
    }

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') validateSessionOnResume();
    });
    window.addEventListener('pageshow', () => validateSessionOnResume());

    (async () => {
        const lastEmail = loadLastEmail();
        if (lastEmail && emailInput && !emailInput.value) emailInput.value = lastEmail;

        const bootParams = new URLSearchParams(location.search);
        const signedOut = bootParams.get('signed_out');
        if (signedOut) {
            history.replaceState(null, '', location.pathname);
            showGate(true);
            showAuthView('login');
            setAuthMessage(
                signedOut === 'all'
                    ? 'Đã đăng xuất tất cả thiết bị. Hãy đăng nhập lại khi cần.'
                    : 'Đã đăng xuất khỏi thiết bị này. Các thiết bị khác vẫn giữ phiên đăng nhập.'
            );
        }

        if (location.protocol === 'file:') {
            showGate(true);
            if (authOnlineTip) authOnlineTip.hidden = false;
            setAuthMessage('Bạn đang mở bản file cục bộ. Hãy chuyển sang website chính thức để đăng nhập.', true);
        } else if (authOnlineTip) {
            authOnlineTip.hidden = true;
        }

        try {
            const recovery = await recoverySessionFromUrl();
            if (recovery.handled) return;
        } catch (error) {
            saveSession(null);
            accessInfo = null;
            showGate(true);
            showAuthView('forgot');
            setRecoveryMessage('Không mở được liên kết khôi phục: ' + error.message, true);
            return;
        }

        const saved = loadSession();
        if (saved) {
            saveSession(saved);
            try {
                await ensureSession();
                await authGetCurrentUser();
                await handleSignedIn(cloudSession);
            } catch (error) {
                if (!isHardAuthError(error)) {
                    showSessionRetry(error);
                } else {
                    saveSession(null);
                    accessInfo = null;
                    showGate(true);
                    showAuthView('login');
                    setAuthMessage('Phiên đăng nhập đã hết hiệu lực. Hãy đăng nhập lại bằng mật khẩu.', true);
                }
            }
        } else {
            showGate(true);
            showAuthView('login');
        }
    })();

    if ('serviceWorker' in navigator && location.protocol === 'https:') {
        window.addEventListener('load', () => navigator.serviceWorker.register('sw.js', {scope:'./'}).catch(err => console.warn('SW:', err)));
    }
})();
