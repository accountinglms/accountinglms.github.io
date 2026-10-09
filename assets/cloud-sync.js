/* ICAEW LMS V7.5 — hardened Auth + Safari handoff + offline-first cloud sync */
(() => {
    const SUPABASE_URL = 'https://uangiwgznukuicrfnohq.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_FRBwRP7TAmiu02eRF9l49g_tCa4DsGJ';
    const AUTH_KEY = 'icaew-lms-auth-v2';
    let accessInfo = null;

    let cloudSession = null;
    let cloudReady = false;
    let syncTimer = null;
    let prefTimer = null;
    let refreshing = null;
    const pendingSections = new Set();

    const gate = document.getElementById('auth-gate');
    const emailInput = document.getElementById('auth-email');
    const passwordInput = document.getElementById('auth-password');
    const loginBtn = document.getElementById('auth-login-btn');
    const signupBtn = document.getElementById('auth-signup-btn');
    const authMessage = document.getElementById('auth-message');
    window.addEventListener('error', e => { if (authMessage) { authMessage.textContent = 'Lỗi ứng dụng: ' + (e.message || 'JavaScript không chạy đúng.'); authMessage.style.color = '#ef7b7b'; } });
    window.addEventListener('unhandledrejection', e => { if (authMessage) { const m = e.reason?.message || String(e.reason || 'Lỗi kết nối'); authMessage.textContent = 'Lỗi kết nối: ' + m; authMessage.style.color = '#ef7b7b'; } });
    const accountBox = document.getElementById('cloud-account');
    const accountEmail = document.getElementById('cloud-user-email');
    const cloudLabel = document.getElementById('cloud-sync-label');
    const cloudDot = document.getElementById('cloud-dot');
    const logoutBtn = document.getElementById('cloud-logout-btn');
    const passwordBtn = document.getElementById('cloud-password-btn');

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
    function setCloudLabel(text, online=true) {
        if (cloudLabel) cloudLabel.textContent = text;
        if (cloudDot) cloudDot.classList.toggle('online', !!online);
    }
    function showGate(show) { gate.classList.toggle('hidden', !show); }
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
    async function refreshSession() {
        if (refreshing) return refreshing;
        if (!cloudSession?.refresh_token) throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.');
        refreshing = (async () => {
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
    async function authSignUp(email, password) {
        const res = await fetchWithTimeout(`${SUPABASE_URL}/auth/v1/signup?redirect_to=${encodeURIComponent(location.href.split('#')[0])}`, {
            method:'POST',
            headers:{'apikey':SUPABASE_KEY,'content-type':'application/json'},
            body:JSON.stringify({email,password,data:{display_name:email.split('@')[0]}})
        });
        return parseResponse(res);
    }
    async function authSignOut() {
        if (cloudSession?.access_token) {
            try { await authedFetch('/auth/v1/logout', {method:'POST'}, false); } catch (_) {}
        }
        saveSession(null);
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
            saveSession(session);
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
        await authSignOut();
        accountBox.hidden = true;
        showGate(true);
        setAuthMessage('Đã đăng xuất. Tiến độ cục bộ trên thiết bị vẫn được giữ.');
    }

    async function changePassword() {
        const next = prompt('Nhập mật khẩu mới (ít nhất 8 ký tự):');
        if (!next) return;
        if (next.length < 8) return alert('Mật khẩu cần ít nhất 8 ký tự.');
        try { await authUpdatePassword(next); alert('Đã đổi mật khẩu.'); }
        catch (error) { alert('Không đổi được mật khẩu: ' + error.message); }
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

        updateAllSidebarScores();
        updateResumeButton();
        if (activeSectionId && progressStore[activeSectionId]) loadQuestion();
        cloudReady = true;
        for (const id of uploadAfter) pendingSections.add(id);
        if (uploadAfter.length) scheduleSyncFlush(50);
        queuePrefSync(80);
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

    async function handleSignedIn(session) {
        const email = session?.user?.email?.toLowerCase() || '';
        saveSession(session);
        try {
            await getMyAccess(true);
        } catch (error) {
            await authSignOut();
            showGate(true);
            return setAuthMessage(error.message || 'Tài khoản này không có quyền sử dụng ICAEW LMS.', true);
        }
        accountEmail.textContent = email;
        accountBox.hidden = false;
        showGate(false);
        await hydrateCloud();
    }

    loginBtn.addEventListener('click', login);
    signupBtn.addEventListener('click', signup);
    logoutBtn.addEventListener('click', logout);    passwordBtn.addEventListener('click', changePassword);
    passwordInput.addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
    window.addEventListener('online', () => { setCloudLabel('Đã có mạng · đang đồng bộ…', true); scheduleSyncFlush(50); queuePrefSync(80); });
    window.addEventListener('offline', () => setCloudLabel('Offline · tiến độ vẫn lưu trên máy', false));

    (async () => {
        if (location.protocol === 'file:') {
            showGate(true);
            setAuthMessage('Bạn đang mở file .html cục bộ. Hãy dùng nút “Mở ICAEW LMS Online” để đăng nhập và đồng bộ cloud.', true);
        }
        const saved = loadSession();
        if (saved) {
            saveSession(saved);
            try {
                await ensureSession();
                await handleSignedIn(cloudSession);
            } catch (_) {
                saveSession(null);
                accessInfo = null;
                showGate(true);
                setAuthMessage('Phiên đăng nhập cũ đã hết hạn hoặc tài khoản không còn quyền. Hãy đăng nhập lại.');
            }
        } else showGate(true);
    })();

    if ('serviceWorker' in navigator && location.protocol === 'https:') {
        window.addEventListener('load', () => navigator.serviceWorker.register('sw.js', {scope:'./'}).catch(err => console.warn('SW:', err)));
    }
})();
