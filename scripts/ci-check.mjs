import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'index.html',
  'account.html',
  'admin.html',
  'lessons.html',
  'diagnostics.html',
  'manifest.webmanifest',
  'sw.js',
  'assets/learner.css',
  'assets/account.css',
  'assets/theme-init.js',
  'assets/learner-core.js',
  'assets/cloud-sync.js',
  'assets/translation.js',
  'assets/common.js',
  'assets/account.js',
  'assets/admin.js',
  'assets/lessons.js',
  'assets/diagnostics.js',
  'supabase/functions/icaew-ai-import/index.ts',
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
  'account.html',
  'admin.html',
  'lessons.html',
  'diagnostics.html',
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


for (const file of ['index.html','account.html','admin.html','lessons.html','diagnostics.html']) {
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
for (const asset of ['assets/learner.css','assets/theme-init.js','assets/learner-core.js','assets/cloud-sync.js','assets/translation.js']) {
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
for (const file of ['account.html','admin.html','lessons.html','diagnostics.html','manifest.webmanifest','assets/learner.css','assets/account.css','assets/theme-init.js','assets/learner-core.js','assets/cloud-sync.js','assets/translation.js','assets/common.js','assets/account.js','assets/admin.js','assets/lessons.js','assets/diagnostics.js']) {
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
if (!accountHtml.includes('Account & Security') || !accountHtml.includes('id="totp-setup"')) {
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

console.log('Security/static integrity checks passed.');
