import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'index.html',
  'admin.html',
  'lessons.html',
  'diagnostics.html',
  'manifest.webmanifest',
  'sw.js',
  'assets/common.js',
  'assets/admin.js',
  'assets/lessons.js',
  'assets/diagnostics.js',
  'assets/lms-patch.js',
  'supabase/functions/icaew-ai-import/index.ts'
];

for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) {
    throw new Error('Missing required file: ' + file);
  }
}

const clientFiles = [
  'index.html',
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
for (const file of ['admin.html','lessons.html','diagnostics.html','manifest.webmanifest','assets/common.js','assets/admin.js','assets/lessons.js','assets/diagnostics.js','assets/lms-patch.js']) {
  if (!sw.includes(file)) throw new Error('Service worker cache list is missing: ' + file);
}

console.log('Security/static integrity checks passed.');
