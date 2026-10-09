import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'index.html',
  'home.html',
  'community.html',
  'progress.html',
  'account.html',
  'admin.html',
  'lessons.html',
  'diagnostics.html',
  'history.html',
  'manifest.webmanifest',
  'sw.js',
  'assets/learner.css',
  'assets/account.css',
  'assets/history.css',
  'assets/portal.css',
  'assets/vg-theme.css',
  'assets/calculator.css',
  'assets/theme-init.js',
  'assets/learner-core.js',
  'assets/cloud-sync.js',
  'assets/calculator.js',
  'assets/calculator-pro.js',
  'assets/translation.js',
  'assets/common.js',
  'assets/score-model.js',
  'assets/subject-cover.js',
  'assets/account.js',
  'assets/admin.js',
  'assets/lessons.js',
  'assets/diagnostics.js',
  'assets/history.js',
  'assets/home.js',
  'assets/community.js',
  'assets/community-social.css',
  'assets/community-voice.js',
  'assets/community-social.js',
  'assets/progress.js',
  'supabase/functions/icaew-ai-import/index.ts',
  'supabase/functions/icaew-ai-route/index.ts',
  'supabase/functions/icaew-question-translate/index.ts',
  'supabase/functions/icaew-translate/index.ts'
];

for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) {
    throw new Error('Missing required file: ' + file);
  }
}

const clientFiles = [
  'index.html',
  'home.html',
  'community.html',
  'progress.html',
  'account.html',
  'admin.html',
  'lessons.html',
  'diagnostics.html',
  'history.html',
  ...fs.readdirSync(path.join(root, 'assets')).filter(x => x.endsWith('.js')).map(x => 'assets/' + x),
];

for (const file of clientFiles) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  if (/[A-Z0-9._%+-]+@gmail\.com/i.test(text)) {
    throw new Error('Personal email must not be hard-coded in public client source: ' + file);
  }
  if (/SUPABASE_SERVICE_ROLE_KEY|sb_secret_|service[_-]?role/i.test(text)) {
    throw new Error('Server secret/service-role reference found in client source: ' + file);
  }
}


for (const file of ['index.html','home.html','community.html','progress.html','account.html','admin.html','lessons.html','diagnostics.html','history.html']) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  if (!text.includes('http-equiv="Content-Security-Policy"')) {
    throw new Error('Missing Content Security Policy meta tag: ' + file);
  }
}

const learnerHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scriptTags = learnerHtml.match(/<script\\b[^>]*>/gi) || [];
if (scriptTags.some(tag => !/\\bsrc=/.test(tag)) || /<style\\b/i.test(learnerHtml)) {
  throw new Error('index.html must not contain inline script/style blocks after frontend refactor');
}
for (const asset of ['assets/learner.css','assets/calculator.css','assets/theme-init.js','assets/learner-core.js','assets/cloud-sync.js','assets/calculator.js','assets/calculator-pro.js','assets/translation.js']) {
  if (!learnerHtml.includes(asset)) throw new Error('index.html is missing modular learner asset: ' + asset);
}

for (const unsafePattern of [
  'questionText.innerHTML = q.q',
  'textSpan.innerHTML = opt',
  'statementEl.innerHTML = statement',
  'id="eng-exp">${textEng}',
  'id="vie-exp">${textVie}'
]) {
  if (learnerHtml.includes(unsafePattern)) {
    throw new Error('Unsafe database-to-innerHTML rendering detected: ' + unsafePattern);
  }
}

const edge = fs.readFileSync(path.join(root, 'supabase/functions/icaew-ai-import/index.ts'), 'utf8');
if (/Access-Control-Allow-Origin["']?\s*:\s*["']\*["']/.test(edge)) {
  throw new Error('AI Edge Function must not use wildcard CORS.');
}
if (/const\s+ALLOWED\s*=\s*new\s+Set/.test(edge)) {
  throw new Error('AI Edge Function must use database-backed roles, not a hard-coded allowlist.');
}
if (!edge.includes('get_my_access')) {
  throw new Error('AI Edge Function is missing server-side access verification.');
}

const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
for (const file of ['home.html','community.html','progress.html','account.html','admin.html','lessons.html','diagnostics.html','history.html','manifest.webmanifest','assets/learner.css','assets/account.css','assets/history.css','assets/portal.css','assets/vg-theme.css','assets/calculator.css','assets/theme-init.js','assets/learner-core.js','assets/cloud-sync.js','assets/calculator.js','assets/calculator-pro.js','assets/translation.js','assets/common.js','assets/score-model.js','assets/account.js','assets/admin.js','assets/lessons.js','assets/diagnostics.js','assets/history.js','assets/home.js','assets/community.js','assets/progress.js']) {
  if (!sw.includes(file)) throw new Error('Service worker cache list is missing: ' + file);
}

if (fs.existsSync(path.join(root, 'assets/lms-patch.js')) || learnerHtml.includes('assets/lms-patch.js')) {
  throw new Error('Legacy patch layer must remain removed after frontend refactor.');
}
if (!fs.readFileSync(path.join(root, 'assets/learner-core.js'), 'utf8').includes('function draftComplete')) {
  throw new Error('Integrated quiz flow is missing from learner core.');
}
const cloudSync = fs.readFileSync(path.join(root, 'assets/cloud-sync.js'), 'utf8');
if (!cloudSync.includes('loadDatabaseCatalog')) {
  throw new Error('Database catalog loading is missing from cloud data layer.');
}

if (!cloudSync.includes('/auth/v1/recover')) {
  throw new Error('Password recovery endpoint missing from auth data layer.');
}
if (!cloudSync.includes('localStorage.setItem(AUTH_KEY')) {
  throw new Error('Persistent auth session storage missing from auth data layer.');
}
if (!learnerHtml.includes('id="auth-forgot-btn"') || !learnerHtml.includes('id="auth-reset-view"')) {
  throw new Error('Password recovery UI is incomplete.');
}
if (!learnerHtml.includes('id="auth-mfa-view"') || !learnerHtml.includes('id="auth-mfa-code"')) {
  throw new Error('MFA challenge UI is incomplete.');
}
if (!cloudSync.includes('/auth/v1/factors/') || !cloudSync.includes('/challenge') || !cloudSync.includes('/verify')) {
  throw new Error('MFA challenge/verify flow is missing from cloud auth layer.');
}
const accountHtml = fs.readFileSync(path.join(root, 'account.html'), 'utf8');
const accountJs = fs.readFileSync(path.join(root, 'assets/account.js'), 'utf8');
if (!accountHtml.includes('id="account-app"') || !accountHtml.includes('id="totp-setup"')) {
  throw new Error('Account & Security TOTP UI is incomplete.');
}
if (!accountJs.includes('authMfaEnrollTotp') || !accountJs.includes('authMfaVerify') || !accountJs.includes('authMfaUnenroll')) {
  throw new Error('Account TOTP management flow is incomplete.');
}
const commonJs = fs.readFileSync(path.join(root, 'assets/common.js'), 'utf8');
if (!commonJs.includes('mfa_satisfied')) {
  throw new Error('Shared authorization is not MFA-aware.');
}
if (!commonJs.includes("authSignOut(scope = 'local')") || !commonJs.includes('AUTH_VALIDATION_MS')) {
  throw new Error('Persistent session validation/scoped sign-out is missing from shared auth.');
}
if (!cloudSync.includes("authSignOut(scope='local')") || !cloudSync.includes('authGetCurrentUser();')) {
  throw new Error('Learner session resume validation or local sign-out is missing.');
}
if (!accountHtml.includes('id="logout-current"') || !accountHtml.includes('id="logout-all"')) {
  throw new Error('Scoped sign-out controls are missing from Account & Security.');
}
if (!accountJs.includes("authSignOut('local')") || !accountJs.includes("authSignOut('global')")) {
  throw new Error('Account session controls are not wired to local/global sign-out.');
}

const translationJs = fs.readFileSync(path.join(root, 'assets/translation.js'), 'utf8');
const lessonsJs = fs.readFileSync(path.join(root, 'assets/lessons.js'), 'utf8');
const translateEdge = fs.readFileSync(path.join(root, 'supabase/functions/icaew-translate/index.ts'), 'utf8');
if (!learnerHtml.includes('id="translate-question-btn"') || !translationJs.includes('callQuestionTranslate')) {
  throw new Error('Question translation UI is incomplete.');
}
if (!translationJs.includes("button?.addEventListener('click'") || translationJs.includes('showTranslation();\nresetView();')) {
  throw new Error('Question translation must remain explicitly user-triggered.');
}
if (!lessonsJs.includes('callUniversalTranslate') || !lessonsJs.includes('lesson-translate-btn')) {
  throw new Error('Lesson/theory translation is not wired to the universal translation layer.');
}
if (!commonJs.includes('callUniversalTranslate') || !commonJs.includes('/functions/v1/icaew-translate')) {
  throw new Error('Universal translation client is missing.');
}
if (!translateEdge.includes('Do NOT answer the question') || !translateEdge.includes('get_my_access')) {
  throw new Error('Universal translation Edge Function lost anti-hint or authorization safeguards.');
}
if (!translateEdge.includes('content_translations') || !translateEdge.includes('contentType === "question"')) {
  throw new Error('Universal translation cache/type rules are not wired.');
}
if (!translateEdge.includes('"question","lesson","theory","document"')) {
  throw new Error('Universal translation content-type coverage regressed.');
}

const learnerCore = fs.readFileSync(path.join(root, 'assets/learner-core.js'), 'utf8');
const adminHtml = fs.readFileSync(path.join(root, 'admin.html'), 'utf8');
const adminJs = fs.readFileSync(path.join(root, 'assets/admin.js'), 'utf8');
if (!cloudSync.includes('CATALOG_CACHE_KEY')) {
  throw new Error('Latest database catalog is not cached for offline fallback.');
}
if (!adminJs.includes('verification_status')) {
  throw new Error('Admin import workflow is missing verification persistence.');
}
if (!edge.includes('google_search') || !edge.includes('verification_status')) {
  throw new Error('AI import function is missing grounded verification.');
}
if (!learnerCore.includes('row.practical_example_en') || !learnerCore.includes('row.practical_example_vi') || !learnerCore.includes('row.standard_reference')) {
  throw new Error('Practical-example learner mapping is missing.');
}
if (!learnerCore.includes('practical-example-card') || !learnerCore.includes('standard-reference')) {
  throw new Error('Practical example/reference learner UI is missing.');
}
if (!adminHtml.includes('id="q-example-en"') || !adminHtml.includes('id="q-example-vi"') || !adminHtml.includes('id="q-standard-ref"')) {
  throw new Error('Question Editor is missing practical-example/reference fields.');
}
if (!adminJs.includes('practical_example_en') || !adminJs.includes('standard_reference')) {
  throw new Error('Admin publish flow is not preserving practical examples/references.');
}
if (!edge.includes('practical_example_en') || !edge.includes('standard_reference') || !edge.includes('Never invent paragraph numbers')) {
  throw new Error('AI Import explanation/example/reference safeguards are missing.');
}

const routeEdge = fs.readFileSync(path.join(root, 'supabase/functions/icaew-ai-route/index.ts'), 'utf8');
if (!routeEdge.includes('get_my_access') || !routeEdge.includes('MIXED_SUBJECT_CONTENT')) {
  throw new Error('AI routing function is missing access or mixed-content safeguards.');
}
if (!routeEdge.includes('Do not create or modify database records')) {
  throw new Error('AI routing must remain suggestion-only on the server.');
}
if (!commonJs.includes('callAiRoute') || !commonJs.includes('/functions/v1/icaew-ai-route')) {
  throw new Error('AI routing client is missing.');
}
if (!adminHtml.includes('id="ai-route"') || !adminHtml.includes('id="confirm-destination"')) {
  throw new Error('Admin routing/confirmation controls are missing.');
}
if (!adminHtml.includes('id="quick-add-subject"') || !adminHtml.includes('id="quick-add-chapter"') || !adminHtml.includes('id="quick-add-exercise"')) {
  throw new Error('Inline destination creation controls are missing.');
}
if (!adminJs.includes('destinationConfirmed') || !adminJs.includes('applyRouteSuggestion')) {
  throw new Error('Admin destination confirmation/routing state is missing.');
}
if (!edge.includes('safeText(input?.subjectTitle, "subjectTitle", 300, true)') || edge.includes('subjectTitle || "unspecified"')) {
  throw new Error('AI Import backend must require an explicit destination.');
}

const aiImportIndex = adminHtml.indexOf('id="import-file"');
const questionLibraryIndex = adminHtml.indexOf('id="question-list"');
if (aiImportIndex < 0 || questionLibraryIndex < 0 || aiImportIndex > questionLibraryIndex) {
  throw new Error('Admin must keep AI Import above Question Library.');
}
for (const id of ['subject','chapter','exercise','question-form','lesson-form','create-snapshot']) {
  if (!adminHtml.includes('id="' + id + '"')) throw new Error('Admin AI-first refactor lost control: ' + id);
}
if (!adminHtml.includes('class="toolDetails"')) {
  throw new Error('Admin secondary tools must remain collapsible.');
}

if (!/<body class="[^"]*\bauth-pending\b[^"]*">/.test(learnerHtml) || !learnerHtml.includes('id="auth-boot"')) {
  throw new Error('Neutral auth boot state is missing from learner shell.');
}
if (!learnerHtml.includes('class="auth-gate hidden"')) {
  throw new Error('Login gate must remain hidden until auth resolution completes.');
}
if (!cloudSync.includes('function finishAuthBoot()') || !cloudSync.includes("document.body.classList.remove('auth-pending')")) {
  throw new Error('Auth boot state is not resolved by the cloud session layer.');
}


const calculatorJs = fs.readFileSync(path.join(root, 'assets/calculator.js'), 'utf8');
const calculatorProJs = fs.readFileSync(path.join(root, 'assets/calculator-pro.js'), 'utf8');
if (!learnerHtml.includes('data-calculator-launcher') || !learnerHtml.includes('assets/calculator.js')) {
  throw new Error('Integrated calculator launcher/script is missing from learner shell.');
}
if (!calculatorJs.includes('data-calc-drag') || !calculatorJs.includes('calc-close') || !calculatorJs.includes("angleMode = 'DEG'") || !calculatorProJs.includes('Distribution') || !calculatorProJs.includes('Inequality') || !calculatorProJs.includes('Base-N')) {
  throw new Error('Calculator drag, close, or scientific mode support is incomplete.');
}

const historyHtml = fs.readFileSync(path.join(root, 'history.html'), 'utf8');
const historyJs = fs.readFileSync(path.join(root, 'assets/history.js'), 'utf8');
if (!learnerHtml.includes('href="history.html"') || !learnerCore.includes('lms:attempt-submitted')) {
  throw new Error('Learner attempt-history entry point or submit event is missing.');
}
if (!cloudSync.includes('record_exercise_attempt') || !cloudSync.includes('ATTEMPT_QUEUE_BASE') || !cloudSync.includes('attemptQueueKey()')) {
  throw new Error('Attempt history is not persisted through a per-user cloud/offline queue.');
}
if (!cloudSync.includes('payload.owner_user_id = cloudSession.user.id') || !cloudSync.includes('payload.owner_user_id !== cloudSession.user.id') || !learnerCore.includes('lmsBindOfflineUser')) {
  throw new Error('Cross-account offline attempt isolation or user-scoped study state is missing.');
}
if (!accountHtml.includes('id="account-recover-legacy"') ||
    !accountJs.includes('accountingLMSLegacyClaimedBy_v1') ||
    !accountJs.includes('confirmation.trim().toLowerCase()')) {
  throw new Error('Account must own legacy recovery with explicit identity confirmation.');
}
if (learnerHtml.includes('id="cloud-logout-btn"') || learnerHtml.includes('id="cloud-password-btn"') ||
    !accountHtml.includes('id="account-password-form"') ||
    !learnerHtml.includes('sidebar-learning-nav') || !learnerHtml.includes('learner-start-options')) {
  throw new Error('Learning workspace must be focused; all password and logout controls belong in Account.');
}
if (!cloudSync.includes('attempt_run_id') || !cloudSync.includes('attempt_recorded')) {
  throw new Error('Current attempt identity is not preserved in cloud progress.');
}
if (!historyHtml.includes('id="timeline"') || !historyHtml.includes('wss://uangiwgznukuicrfnohq.supabase.co')) {
  throw new Error('History page is missing timeline UI or Realtime CSP access.');
}
if (!historyJs.includes("table:'exercise_attempts'") || !historyJs.includes("event:'INSERT'")) {
  throw new Error('Attempt History is not subscribed to realtime inserts.');
}
if (!historyJs.includes('question_snapshot') || !historyJs.includes('selected_answer')) {
  throw new Error('Attempt detail snapshot rendering is missing.');
}


const homeHtml = fs.readFileSync(path.join(root, 'home.html'), 'utf8');
const communityHtml = fs.readFileSync(path.join(root, 'community.html'), 'utf8');
const progressHtml = fs.readFileSync(path.join(root, 'progress.html'), 'utf8');
const homeJs = fs.readFileSync(path.join(root, 'assets/home.js'), 'utf8');
const communityJs = fs.readFileSync(path.join(root, 'assets/community.js'), 'utf8');
const progressJs = fs.readFileSync(path.join(root, 'assets/progress.js'), 'utf8');

for (const [name, html] of [['home',homeHtml],['community',communityHtml],['progress',progressHtml]]) {
  if (!html.includes('assets/portal.css')) throw new Error(name + ' page is missing the portal design system.');
  if (!html.includes('assets/vg-theme.css')) throw new Error(name + ' page is missing Van Gogh Academic Modernism.');
  if (!html.includes('wss://uangiwgznukuicrfnohq.supabase.co')) throw new Error(name + ' page CSP is missing Supabase Realtime.');
}
for (const file of ['index.html','lessons.html','history.html','account.html','admin.html','diagnostics.html']) {
  const html=fs.readFileSync(path.join(root,file),'utf8');
  if (!html.includes('assets/vg-theme.css')) throw new Error(file + ' is missing the final visual theme.');
}
const vgTheme=fs.readFileSync(path.join(root,'assets/vg-theme.css'),'utf8');
if (!vgTheme.includes('prefers-reduced-motion') || !vgTheme.includes('.subject-cover-art') || !vgTheme.includes('body.page-community .chat-sidebar')) {
  throw new Error('Final theme is missing accessibility, subject-art, or community visual safeguards.');
}
if (!learnerHtml.includes('href="home.html"') || !learnerHtml.includes('href="history.html"') || !learnerHtml.includes('data-calculator-launcher')) {
  throw new Error('Focused learner navigation requires Home, attempt history and calculator.');
}
if (!homeHtml.includes('href="community.html"') || !homeHtml.includes('href="progress.html"') || !homeHtml.includes('href="account.html"')) {
  throw new Error('Global navigation belongs to the Home member portal.');
}
const coverStudio=fs.readFileSync(path.join(root,'assets/subject-cover.js'),'utf8');
if (!homeJs.includes("subjectCoverDataURL") || !coverStudio.includes("classifySubjectCover") ||
    !coverStudio.includes("generateSubjectCoverSVG") || !adminJs.includes("renderSubjectCoverPreview") ||
    !homeHtml.includes('assets/home.js') || !fs.readFileSync(path.join(root,'admin.html'),'utf8').includes('id="subject-cover-image-main"')) {
  throw new Error('Every subject must receive an automatic zero-cost contextual cover.');
}
if (!homeHtml.includes('id="feedback-form"') || !homeHtml.includes('id="announcement-form"') || !homeJs.includes("restInsert('feedback'") || !homeJs.includes("restInsert('announcements'")) {
  throw new Error('Home feedback or admin announcement workflow is incomplete.');
}
if (!communityHtml.includes('id="global-notification-count"') || !communityHtml.includes('id="message-stream"') || !communityJs.includes('uploadChatFile') || !communityJs.includes('createRealtimeClient')) {
  throw new Error('Community chat, file upload, unread badge, or realtime wiring is incomplete.');
}
if (!progressHtml.includes('id="trend-chart"') || !progressJs.includes("level==='advanced'?50:55") || !progressJs.includes('safeTarget')) {
  throw new Error('Progress plan or ICAEW threshold logic is incomplete.');
}
if (!communityJs.includes("get_portal_unread_counts") || !communityJs.includes('id.desc') || !progressJs.includes('examScore')) {
  throw new Error('Pagination, unread counters and score correctness must remain intact.');
}
if (!commonJs.includes('uploadChatFile') || !commonJs.includes('downloadChatFile') || !commonJs.includes('createRealtimeClient')) {
  throw new Error('Portal storage/realtime helpers are missing.');
}
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
if (manifest.start_url !== './home.html') throw new Error('Installed PWA must launch into member home.');


const brandPages=['index.html','home.html','account.html','admin.html','community.html','history.html','lessons.html','progress.html','diagnostics.html'];
for(const page of brandPages){
  const html=fs.readFileSync(path.join(root,page),'utf8');
  for(const marker of ['favicon.ico?v=46','favicon-32.png?v=46','favicon-16.png?v=46','apple-touch-icon.png?v=46']){
    if(!html.includes(marker))throw new Error('Missing mascot favicon in '+page+': '+marker);
  }
}
for(const [file,size] of [['icon-192.png',192],['icon-512.png',512],['apple-touch-icon.png',180],['favicon-32.png',32],['favicon-16.png',16]]){
  const data=fs.readFileSync(path.join(root,file));
  if(data.toString('hex',0,8)!=='89504e470d0a1a0a'||data.readUInt32BE(16)!==size||data.readUInt32BE(20)!==size)
    throw new Error('Malformed brand icon: '+file);
}
const brandedIco=fs.readFileSync(path.join(root,'favicon.ico'));
if(brandedIco.length<100||brandedIco.readUInt16LE(0)!==0||brandedIco.readUInt16LE(2)!==1||brandedIco.readUInt16LE(4)<3)
  throw new Error('Multi-resolution favicon.ico is invalid.');
const brandManifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));
if(!['icon-192.png','icon-512.png'].every(src=>brandManifest.icons.some(icon=>icon.src===src)))throw new Error('PWA branding icons missing.');
const brandSw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
if(!brandSw.includes("icaew-lms-github-v46")||!brandSw.includes("'./favicon.ico'"))
  throw new Error('Brand icons absent from updated PWA cache.');


const socialJs=fs.readFileSync(path.join(root,'assets/community-social.js'),'utf8');
const voiceJs=fs.readFileSync(path.join(root,'assets/community-voice.js'),'utf8');
const chatSocialCss=fs.readFileSync(path.join(root,'assets/community-social.css'),'utf8');
const upgradedCommunity=fs.readFileSync(path.join(root,'community.html'),'utf8');
const upgradedCommon=fs.readFileSync(path.join(root,'assets/common.js'),'utf8');
if(!socialJs.includes("request_friend")||!socialJs.includes("start_direct_chat")||!socialJs.includes("respond_friend"))
 throw new Error('Friends, invitations and private messages are not connected.');
if(!communityJs.includes("create_study_group")||!communityJs.includes("getChatFileBlob"))
 throw new Error('Secure group creation and image preview must remain enabled.');
if(!upgradedCommunity.includes('id="social-tabs"')||!upgradedCommunity.includes('id="voice-call-btn"')||
 !upgradedCommunity.includes('assets/community-social.js')||!upgradedCommunity.includes('assets/community-voice.js')||
 !upgradedCommunity.includes('assets/community-social.css'))
 throw new Error('Social tabs, direct messages or voice call UI missing.');
if(!voiceJs.includes("start_voice_call")||!voiceJs.includes("getUserMedia")||!voiceJs.includes("RTCPeerConnection"))
 throw new Error('Voice call signaling is incomplete.');
if(!upgradedCommon.includes('export async function getChatFileBlob')||!chatSocialCss.includes('#social-tabs'))
 throw new Error('Secure private chat media display missing.');
if(!sw.includes('icaew-lms-github-v47')||!sw.includes("'./assets/community-social.js'"))
 throw new Error('PWA v47 social upgrade cache is missing.');

console.log('Security/static integrity checks passed.');
