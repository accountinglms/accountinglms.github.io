import {paintAvatar} from './avatar.js';
import {
  ensureBaseSession,
  getMyAccess,
  authGetUser,
  authMfaEnrollTotp,
  authMfaChallenge,
  authMfaVerify,
  authMfaUnenroll,
  authSignOut,
  authUpdatePassword,
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

function unverifiedTotpFactors() {
  return (authUser?.factors || []).filter(f => f.factor_type === 'totp' && f.status !== 'verified');
}

function render() {
  const displayName = profile?.display_name || authUser?.user_metadata?.display_name || authUser?.email?.split('@')[0] || 'Account';
  $('#profile-name').textContent = displayName;
  // Let paintAvatar preserve a decoded image between profile updates.
  paintAvatar($('#profile-avatar'),profile,displayName).catch(()=>{});
  $('#profile-email').textContent = authUser?.email || '—';
  $('#identity-email').textContent = authUser?.email || '—';
  $('#display-name').value = profile?.display_name || '';
  $('#profile-role').textContent = access?.role === 'owner' ? 'Quản trị viên' : 'Thành viên';

  const emailVerified = Boolean(authUser?.email_confirmed_at || authUser?.confirmed_at);
  $('#email-state').textContent = emailVerified ? 'Đã xác minh' : 'Chưa xác minh';
  $('#email-state').className = emailVerified ? 'verified' : 'pending';

  const phone = authUser?.phone || '';
  $('#identity-phone').textContent = phone || 'Chưa cấu hình';
  const phoneVerified = Boolean(authUser?.phone_confirmed_at);
  $('#phone-state').textContent = phoneVerified ? 'Đã xác minh' : 'Chưa xác minh';
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
    meta.textContent = 'TOTP · Đã xác minh · ' + (factor.updated_at ? new Date(factor.updated_at).toLocaleDateString('vi-VN') : '');
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

function readBrowserData(key) {
  try{
    const data=JSON.parse(localStorage.getItem(key)||'null');
    return data&&typeof data==='object'&&!Array.isArray(data)?data:{};
  }catch{return {};}
}
function updateAccountDataInfo() {
  const userId=session?.user?.id;
  if(!userId)return;
  const local=readBrowserData('accountingLMSProgress_v2:user:'+userId);
  const old=readBrowserData('accountingLMSProgress_v2');
  const claimedBy=localStorage.getItem('accountingLMSLegacyClaimedBy_v1');
  const localCount=Object.keys(local).length;
  $('#account-data-info').textContent=`Bài tập có dữ liệu trên trình duyệt này: ${localCount}. Dữ liệu Cloud được tải và đồng bộ khi bạn mở mục Làm bài.`;
  $('#legacy-recovery-panel').classList.toggle('hidden',
    !Object.keys(old).length||Boolean(claimedBy));
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
  updateAccountDataInfo();
  $('#account-auth').classList.add('hidden');
  $('#account-app').classList.remove('hidden');
  notice('Account & Security đã sẵn sàng.', 'ok');
  return true;
}

$('#account-password-form').addEventListener('submit',async event=>{
  event.preventDefault();
  const form=event.currentTarget;
  const password=$('#account-new-password').value;
  const confirmPassword=$('#account-confirm-password').value;
  if(password!==confirmPassword)return notice('Hai lần nhập mật khẩu không trùng nhau.','error');
  if(password.length<8)return notice('Mật khẩu cần tối thiểu 8 ký tự.','error');
  const button=form.querySelector('[type=submit]');
  button.disabled=true;
  try{
    await authUpdatePassword(password);
    form.reset();
    notice('Mật khẩu đã được cập nhật.','ok');
  }catch(error){
    notice('Không đổi được mật khẩu: '+error.message,'error');
  }finally{button.disabled=false;}
});

$('#account-recover-legacy').addEventListener('click',()=>{
  if(!session?.user?.id)return;
  const userId=session.user.id;
  const legacyKey='accountingLMSProgress_v2';
  const scopedKey='accountingLMSProgress_v2:user:'+userId;
  const claimKey='accountingLMSLegacyClaimedBy_v1';
  const claimedBy=localStorage.getItem(claimKey);
  if(claimedBy){
    notice('Dữ liệu cũ đã được liên kết với một tài khoản. Không tự động sao chép sang tài khoản khác.','error');
    return;
  }
  const confirmation=prompt('Chỉ xác nhận nếu dữ liệu cũ trên trình duyệt này thuộc về bạn. Nhập email tài khoản hiện tại:');
  if(confirmation===null)return;
  if(confirmation.trim().toLowerCase()!==String(session.user.email||'').toLowerCase()){
    notice('Email xác nhận không khớp. Không có dữ liệu nào thay đổi.','error');
    return;
  }
  const archive=readBrowserData(legacyKey);
  const existing=readBrowserData(scopedKey);
  const next={...existing};
  let count=0;
  for(const [key,value] of Object.entries(archive)){
    if(!value||typeof value!=='object'||Array.isArray(value))continue;
    const newer=Number(value.updatedAt)||0;
    const previous=Number(existing[key]?.updatedAt)||0;
    if(newer<=previous)continue;
    if(!['isAnswered','bookmarks','draftSelections','answersStatus'].some(k=>Array.isArray(value[k])&&value[k].length))continue;
    next[key]=value;
    count++;
  }
  if(!count){
    notice('Không có tiến độ cũ mới hơn dữ liệu của tài khoản hiện tại. Bản lưu cũ được giữ nguyên.','ok');
    return;
  }
  try{
    localStorage.setItem(scopedKey,JSON.stringify(next));
    localStorage.setItem(claimKey,userId);
    updateAccountDataInfo();
    notice(`Đã đưa ${count} bài tập vào dữ liệu cục bộ của tài khoản. Hãy mở Làm bài khi có mạng để đồng bộ lên Cloud.`,'ok');
  }catch(error){notice('Không lưu được dữ liệu cũ trên trình duyệt: '+error.message,'error');}
});

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
    authUser = await authGetUser(session);
    const staleFactors = unverifiedTotpFactors();
    if (staleFactors.length) {
      const ok = confirm('Tài khoản đang có ' + staleFactors.length + ' Authenticator thiết lập dang dở. Xóa bản dang dở trước khi tạo QR mới?');
      if (!ok) return;
      for (const factor of staleFactors) await authMfaUnenroll(factor.id);
      authUser = await authGetUser(session);
      render();
    }
    const now = new Date();
    const label = 'Authenticator ' + now.toISOString().replace(/[:.]/g,'-') + '-' + Math.random().toString(36).slice(2,6).toUpperCase();
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

$('#logout-current').addEventListener('click', async () => {
  if (!confirm('Đăng xuất khỏi thiết bị hiện tại? Các thiết bị khác vẫn giữ phiên đăng nhập.')) return;
  notice('Đang đăng xuất thiết bị này…');
  try {
    await authSignOut('local');
  } finally {
    location.href = './?signed_out=local';
  }
});

$('#logout-all').addEventListener('click', async () => {
  if (!confirm('Đăng xuất tất cả thiết bị? Bạn sẽ cần đăng nhập lại và nhập mã Authenticator trên từng thiết bị.')) return;
  notice('Đang thu hồi tất cả phiên đăng nhập…');
  try {
    await authSignOut('global');
  } finally {
    location.href = './?signed_out=all';
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

document.addEventListener('lms:profile-image',e=>{if(e.detail?.profile?.id!==session?.user?.id)return;profile={...profile,...e.detail.profile};render();});
