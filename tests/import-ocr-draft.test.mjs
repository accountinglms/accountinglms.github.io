import assert from 'node:assert/strict';
import {buildOcrDraft} from '../assets/import-ocr-draft.js';

const pages=[{source_file:1,source_page:1,confidence:98,text:'Accounting practice\nQuestion 1\nA business receives GBP 12,000 for 6 months.\nRevenue after 2 months = ?\nA. GBP 12,000'},
  {source_file:2,source_page:1,confidence:96,text:'B. GBP 4,000\nAnswer: B\nExplanation: (GBP 12,000 / 6 months) * 2 months = GBP 4,000.\nQuestion 2\nWhich balance is an asset?\nA. Cash\nB. Revenue'},
  {source_file:3,source_page:1,confidence:97,text:'Question 3\nChoose TWO items.\nA. Cash\nB. Inventory\nC. Revenue\nAnswer: A, B'}];
const draft=buildOcrDraft(pages,{title:'Revenue'});
assert.equal(draft.questions.length,3);
const [first,second,third]=draft.questions;
assert.ok(first.prompt.includes('GBP 12,000 for 6 months'));
assert.ok(first.prompt.includes('Revenue after 2 months = ?'));
assert.deepEqual(first.options,['GBP 12,000','GBP 4,000']);
assert.equal(first.correct_answer,1);
assert.equal(first.explanation_en,'(GBP 12,000 / 6 months) * 2 months = GBP 4,000.');
assert.deepEqual(first.source_files,[1,2]);assert.equal(first.source_file,1);
assert.equal(second.source_file,2);assert.equal(second.correct_answer,null);assert.equal(second.answer_needs_review,true);
assert.equal(third.question_type,'multiple');assert.deepEqual(third.correct_answer,[0,1]);
assert.equal(first.verification_status,'needs_review');assert.equal(first.extraction_method,'local_ocr');
assert.equal(draft.provider,'local');
const unnumbered=buildOcrDraft([{source_file:2,source_page:4,confidence:77,text:'A business retains this entire source paragraph.\nThere are no choices or answer key.'}]);
assert.equal(unnumbered.questions[0].prompt,'A business retains this entire source paragraph.\nThere are no choices or answer key.');
assert.deepEqual(unnumbered.questions[0].options,[]);assert.equal(unnumbered.questions[0].correct_answer,null);
assert.equal(unnumbered.questions[0].source_page,4);
const vi='Câu 1\nĐâu là tài sản?\nA. Tiền mặt\nB. Doanh thu\nĐáp án: A';
assert.equal(buildOcrDraft([{source_file:1,source_page:1,text:vi,confidence:91}]).questions[0].correct_answer,0);
const lesson=buildOcrDraft(pages,{targetType:'lesson'});
assert.equal(lesson.lesson.content_markdown,pages.map(page=>page.text).join('\n\n'));
assert.equal(lesson.lesson.content_markdown_vi,null,'A translation was invented');
assert.throws(()=>buildOcrDraft([{source_file:1,source_page:1,text:'  '}]),/Chưa đọc/);
console.log('PASS: direct-text drafts preserve source wording and provenance, keep unknown answers ungraded, and only use explicit answer keys.');
