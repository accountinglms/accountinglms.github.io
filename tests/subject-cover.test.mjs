import assert from 'node:assert/strict';
import { classifySubjectCover, subjectCoverDataURL, generateSubjectCoverSVG, subjectCoverLabel } from '../assets/subject-cover.js';

const samples=[
  ['Accounting Fundamental','accounting'],
  ['Financial Accounting','accounting'],
  ['Kế toán tài chính','accounting'],
  ['Management Accounting','management'],
  ['Cost Behaviour and Budgeting','management'],
  ['Corporate Finance','finance'],
  ['Tài chính và đầu tư','finance'],
  ['Financial Auditing and Assurance','audit'],
  ['Kiểm toán nội bộ','audit'],
  ['Taxation Fundamentals','tax'],
  ['Thuế doanh nghiệp','tax'],
  ['Microeconomics','economics'],
  ['Luật kinh doanh','law'],
  ['Business Data Analytics','analytics'],
  ['Sustainability and ESG','sustainability']
];
for(const [title,category] of samples){
  const subject={id:title.toLowerCase().replace(/\s+/g,'_'),title};
  assert.equal(classifySubjectCover(subject),category,'Incorrect cover type: '+title);
  const svg=generateSubjectCoverSVG(subject);
  assert.match(svg,/^<svg xmlns='http:\/\/www\.w3\.org\/2000\/svg'/);
  assert.match(svg,/<defs>/);
  assert.match(svg,/<\/svg>$/);
  assert.ok(svg.length>1700&&svg.length<30000,'SVG unusual size: '+title);
  assert.ok(subjectCoverLabel(subject));
  const url=subjectCoverDataURL(subject);
  assert.ok(url.startsWith('data:image/svg+xml;charset=utf-8,'),'Missing inline SVG image');
  assert.equal(decodeURIComponent(url.slice('data:image/svg+xml;charset=utf-8,'.length)),svg);
  assert.equal(subjectCoverDataURL({...subject}),url,'Artwork must be stable between renders');
}
const a={id:'a',title:'Accounting Fundamental'};
const b={id:'b',title:'Corporate Finance'};
assert.notEqual(subjectCoverDataURL(a),subjectCoverDataURL(b),'Subjects need their own visuals');
const generic={id:'new_subject',title:'Foundation'};
assert.equal(classifySubjectCover(generic,['An introduction to auditing']), 'audit',
  'Generic subject should use chapter concepts');
assert.equal(classifySubjectCover({id:'basic',title:'Business Studies'}), 'accounting',
  'New unknown courses should have a safe accounting illustration');
const malicious={id:'m',title:'Accounting <script>alert(1)</script>'};
assert.ok(!generateSubjectCoverSVG(malicious).includes('<script>'),
  'Untrusted subjects must not be interpolated into executable SVG');
assert.ok(!subjectCoverDataURL(a).startsWith('https://'),
  'Generated covers must never depend on a paid/external API');
console.log('PASS Subject Cover Studio: semantics, deterministic artwork, safe input, no external API.');
