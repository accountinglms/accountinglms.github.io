import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';
import { hasUnsafeMarkup } from '../supabase/functions/_shared/text-safety.js';

// Exact formula from a real Gemini response rejected by the old validator.
const formula = 'Revenue earned is calculated based on the portion of service delivered over time: (GBP 12,000 / 6 months) * 2 months = GBP 4,000.';
const allowed = [formula, 'months = 2', 'contribution = revenue - variable costs',
  'onboarding = complete', 'Khấu hao = (Nguyên giá - Giá trị thanh lý) / 5',
  '0 < months <= 12', 'Assets = Liabilities + Equity', '**Revenue** = 4,000'];
const blocked = ['<script>alert(1)</script>', '<iframe src="x"></iframe>',
  '<svg onload="alert(1)"></svg>', '<img src="x" onerror="alert(1)">',
  '<IMG SRC=x ONERROR = alert(1)>', '<img/onerror=alert(1)>',
  '<div\nonclick = "alert(1)">text</div>', '<a href="javascript:alert(1)">x</a>',
  '<object data="x"></object>', '<style>body{display:none}</style>'];

for (const slug of ['icaew-ai-import','icaew-ai-route','icaew-question-translate','icaew-translate']) {
  const source = fs.readFileSync(`supabase/functions/${slug}/index.ts`, 'utf8');
  const prefix = source.slice(0, source.indexOf('Deno.serve')).replace(/^import[^\n]*\n/gm, '');
  const context = vm.createContext({ Deno: { env: { get: () => undefined } }, hasUnsafeMarkup });
  vm.runInContext(stripTypeScriptTypes(prefix), context);
  const validate = context.safeText || context.cleanText;
  assert.equal(typeof validate, 'function');
  for (const text of allowed) assert.equal(validate(text, 'test', 5000), text, `${slug} rejected valid text`);
  for (const text of blocked) assert.throws(() => validate(text, 'test', 5000), /unsafe markup/, `${slug} allowed active markup`);
  assert.throws(() => validate('x'.repeat(5001), 'test', 5000));
  assert.throws(() => validate(123, 'test', 5000));
  if (slug === 'icaew-ai-import') {
    const question = { question_type:'single', prompt:'What revenue is earned after 2 months?',
      options:['GBP 12,000','GBP 6,000','GBP 4,000','GBP 2,000'], correct_answer:2,
      confidence:1, explanation_en:formula, verification_status:'source_only' };
    const output = { title:'Accounting Practice', questions:[question], lesson:null, warnings:[] };
    assert.equal(context.validateOutput(output, 'questions').questions[0].explanation_en, formula);
    assert.throws(() => context.validateOutput({ ...output, questions:[{ ...question, explanation_en:blocked[3] }] }, 'questions'), /unsafe markup/);
    assert.throws(() => context.validateOutput({ ...output, questions:[{ ...question, correct_answer:10 }] }, 'questions'), /out of range/);
  }
}
console.log('PASS: original Gemini formula accepted; active markup rejected; import/routing/translation validators and output schema checked.');
