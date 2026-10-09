import {
  ensureBaseSession,
  getMyAccess,
  authGetUser,
  authMfaEnrollTotp,
  authMfaChallenge,
  authMfaVerify,
  authMfaUnenroll,
  restGet,
  restInsert,
  restPatch
} from './common.js';

const $ = selector => document.querySelector(selector);
let session = null;
let access = null;
let authUser = null;
let profile = null;
let pendingFactor = null;

function notice(message, kind='info') {
  const el = $('#notice');
  el.textContent = message;
  el.className = 'notice' + (kind === 'info' ? '' : ' ' + kind);
}

function initials(value) {
  const text = String(value || '').trim();
  if (!text) return 'U';
  const parts = text.split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts.at(-1)[0] : text.slice(0,2)).toUpperCase();
}

function verifiedTotpFactors() {
  return (authUser?.factors || []).filter(f => f.factor_type === 'totp' && f.status === 'verified');
}

function render() {
  const displayName = profile?.display_name || authUser?.user_metadata?.display_name || authUser?.email?.split('@')[0] || 'Account';
  $('#profile-name').textContent = displayName;
  $('#profile-avatar').textContent = initials(displayName);
  $('#profile-email').textContent = authUser?.email || '—';
  $('#identity-email').textContent = authUser?.email || '—';
  $('#display-name').value = profile?.display_name || '';
  $('#profile-role').textContent = access?.role === 'owner' ? 'Owner' : 'Member';

  const emailVerified = Boolean(authUser?.email_confirmed_at || authUser?.confirmed_at);
  $('#email-state').textContent = emailVerified ? '✓ Verified' : 'Unverified';
  $('#email-state').className = emailVerified ? 'verified' : 'pending';

  const phone = authUser?.phone || '';
  $('#identity-phone').textContent = phone || 'Chưa cấu hình';
  const phoneVerified = Boolean(authUser?.phone_confirmed_at);
  $('#phone-state').textContent = phoneVerified ? '✓ Verified' : 'SMS later';
  $('#phone-state').className = phoneVerified ? 'verified' : 'pending';

  const factors = verifiedTotpFactors();
  const aal = access?.aal || 'aal1';
  $('#aal-state').textContent = aal.toUpperCase();
  $('#session-note').textContent = factors.length
    ? (aal === 'aal2' ? 'Phiên này đã hoàn tất xác thực 2 bước.' : 'Phiên này cần xác thực Authenticator trước khi dùng dữ liệu LMS.')
    : 'Tài khoản hiện chưa yêu cầu Authenticator.';
  $('#security-dot').classList.toggle('secure', factors.length > 0 && aal === 'aal2');

  const status = $('#mfa-status');
  status.textContent = factors.length ? '2FA đang bật' : '2FA chưa bật';
  status.className = 'statusPill' + (factors.length ? ' verified' : '');

  $('#mfa-summary').textContent = factors.length
    ? `Tài khoản đang có ${factors.length} Authenticator đã xác minh. Khi đăng nhập bằng mật khẩu, LMS sẽ yêu cầu thêm mã 6 số trước khi cấp quyền truy cập.`
    : 'Bật Authenticator để thêm lớp bảo vệ thứ hai. Không cần SMS và không phát sinh phí gửi tin nhắn.';

  const list = $('#factor-list');
  list.replaceChildren();
  factors.forEach((factor, index) => {
    const row = document.createElement('div');
    row.className = 'factor';
    const main = document.createElement('div');
    main.className = 'factorMain';
    const strong = document.createElement('strong');
    strong.textContent = factor.friendly_name || `Authenticator ${index + 1}`;
    const meta = document.createElement('span');
    meta.textContent = 'TOTP · Verified · ' + (factor.updated_at ? new Date(factor.updated_at).toLocaleDateString('vi-VN') : '');
    main.append(strong, meta);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Gỡ';
    remove.dataset.factorId = factor.id;
    row.append(main, remove);
    list.appendChild(row);
  });
}

async function loadProfile() {
  const rows = await restGet('profiles', 'select=*&id=eq.' + encodeURIComponent(session.user.id) + '&limit=1');
  profile = Array.isArray(rows) ? rows[0] || null : null;
}

async function refreshAccount() {
  session = await ensureBaseSession();
  access = await getMyAccess(session, true);
  if (access.mfa_required === true && access.mfa_satisfied !== true) {
    $('#account-auth').classList.remove('hidden');
    $('#account-app').classList.add('hidden');
    notice('Cần xác thực Authenticator trước khi mở Account & Security.', 'error');
    return false;
  }
  authUser = await authGetUser(session);
  await loadProfile();
  render();
  $('#account-auth').classList.add('hidden');
  $('#account-app').classList.remove('hidden');
  notice('Account & Security đã sẵn sàng.', 'ok');
  return true;
}

$('#profile-form').addEventListener('submit', async event => {
  event.preventDefault();
  const display_name = $('#display-name').value.trim();
  if (display_name.length > 80) return notice('Tên hiển thị quá dài.', 'error');
  try {
    if (profile) {
      const rows = await restPatch('profiles', 'id=eq.' + encodeURIComponent(session.user.id), {display_name: display_name || null, updated_at:new Date().toISOString()});
      profile = rows?.[0] || {...profile, display_name};
    } else {
      const rows = await restInsert('profiles', {id:session.user.id, display_name:display_name || null, updated_at:new Date().toISOString()});
      profile = rows?.[0] || {id:session.user.id, display_name};
    }
    render();
    notice('Đã lưu thông tin cá nhân.', 'ok');
  } catch (error) {
    notice('Không lưu được hồ sơ: ' + error.message, 'error');
  }
});

$('#start-totp').addEventListener('click', async () => {
  const button = $('#start-totp');
  button.disabled = true;
  try {
    const label = 'Authenticator ' + new Date().toLocaleDateString('vi-VN');
    pendingFactor = await authMfaEnrollTotp(label);
    if (!pendingFactor?.id || !pendingFactor?.totp?.qr_code) throw new Error('Supabase không trả về QR setup.');

    const qr = pendingFactor.totp.qr_code;
    $('#totp-qr').src = qr.startsWith('data:')
      ? qr
      : 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(qr);
    $('#totp-secret').textContent = pendingFactor.totp.secret || '—';
    $('#totp-code').value = '';
    $('#totp-message').textContent = '';
    $('#totp-setup').classList.remove('hidden');
    $('#totp-code').focus({preventScroll:true});
  } catch (error) {
    notice('Không khởi tạo được Authenticator: ' + error.message, 'error');
  } finally {
    button.disabled = false;
  }
});

async function cancelPendingFactor() {
  const factor = pendingFactor;
  pendingFactor = null;
  $('#totp-setup').classList.add('hidden');
  $('#totp-qr').removeAttribute('src');
  $('#totp-secret').textContent = '—';
  $('#totp-code').value = '';
  if (factor?.id) {
    try { await authMfaUnenroll(factor.id); } catch (_) {}
  }
}

$('#cancel-totp').addEventListener('click', cancelPendingFactor);

$('#copy-secret').addEventListener('click', async () => {
  const secret = $('#totp-secret').textContent.trim();
  if (!secret || secret === '—') return;
  try {
    await navigator.clipboard.writeText(secret);
    $('#totp-message').textContent = 'Đã copy secret.';
  } catch {
    $('#totp-message').textContent = 'Không copy tự động được. Hãy nhấn giữ để sao chép.';
  }
});

$('#totp-code').addEventListener('input', event => {
  event.target.value = event.target.value.replace(/\D/g,'').slice(0,6);
});

$('#verify-totp').addEventListener('click', async () => {
  const code = $('#totp-code').value.replace(/\D/g,'');
  if (!pendingFactor?.id) return;
  if (!/^\d{6}$/.test(code)) {
    $('#totp-message').textContent = 'Hãy nhập đúng mã 6 số từ Authenticator.';
    return;
  }
  const button = $('#verify-totp');
  button.disabled = true;
  $('#totp-message').textContent = 'Đang xác minh…';
  try {
    const challenge = await authMfaChallenge(pendingFactor.id);
    session = await authMfaVerify(pendingFactor.id, challenge.id, code);
    pendingFactor = null;
    $('#totp-setup').classList.add('hidden');
    await refreshAccount();
    notice('Đã bật xác thực hai bước bằng Authenticator.', 'ok');
  } catch (error) {
    $('#totp-message').textContent = 'Mã không đúng hoặc đã hết hạn: ' + error.message;
  } finally {
    button.disabled = false;
  }
});

$('#factor-list').addEventListener('click', async event => {
  const button = event.target.closest('[data-factor-id]');
  if (!button) return;
  const factorId = button.dataset.factorId;
  const factor = verifiedTotpFactors().find(f => f.id === factorId);
  if (!factor) return;
  const count = verifiedTotpFactors().length;
  const message = count === 1
    ? 'Đây là Authenticator cuối cùng. Gỡ nó sẽ tắt 2FA cho tài khoản. Tiếp tục?'
    : 'Gỡ Authenticator này khỏi tài khoản?';
  if (!confirm(message)) return;
  button.disabled = true;
  try {
    await authMfaUnenroll(factorId);
    await refreshAccount();
    notice(count === 1 ? 'Đã tắt TOTP cho tài khoản.' : 'Đã gỡ Authenticator.', 'ok');
  } catch (error) {
    notice('Không gỡ được Authenticator: ' + error.message, 'error');
  } finally {
    button.disabled = false;
  }
});

(async () => {
  try {
    await refreshAccount();
  } catch (error) {
    $('#account-app').classList.add('hidden');
    $('#account-auth').classList.remove('hidden');
    notice('Không mở được Account & Security: ' + error.message, 'error');
  }
})();
