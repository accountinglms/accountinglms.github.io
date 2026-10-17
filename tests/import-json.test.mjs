import assert from 'node:assert/strict';
import {parseImportJson} from '../supabase/functions/_shared/import-json.js';
import {importContentError,assertImportAnswers} from '../assets/import-answers.js';

const valid={prompt:'£12,000\nTwo months.',options:['C:\\users\\notes','\\underbrace{x}'],correct_answer:[false,0],unicode:'😀'};
assert.deepEqual(parseImportJson(JSON.stringify(valid)),{value:valid,repaired:false});
assert.equal(parseImportJson(String.raw`{"text":"\u00a312,000"}`).value.text,'£12,000');
for(const [raw,expected] of [[String.raw`\u{00a3}`,'£'],[String.raw`\u{1f600}`,'😀'],[String.raw`\(x\)`,'\\(x\\)'],['first\nsecond','first\nsecond'],['a\tb','a\tb']]){
  const result=parseImportJson('{"text":"'+raw+'"}');
  assert.equal(result.repaired,true);assert.equal(result.value.text,expected);
}
for(const raw of [String.raw`\underbrace{x}`,String.raw`\u00G0`,String.raw`\u{110000}`,String.raw`\u{d800}`,String.raw`\u12`]){
  const result=parseImportJson('{"prompt":"'+raw+'","question_type":"single","options":["Yes","No"],"correct_answer":0}');
  assert.ok(result.value.prompt.includes('[UNREADABLE]'));
  assert.ok(result.value.prompt.includes(raw),'Original ambiguous escape text was discarded');
  assert.ok(importContentError(result.value));assert.throws(()=>assertImportAnswers([result.value]),/UNREADABLE/);
}
for(const raw of ['{"text":"unterminated','{"text":"a"','{"text":"a",}','{"answer":false,,"other":0}',String.raw`{"\u{61}":1}`])assert.throws(()=>parseImportJson(raw),SyntaxError);
const escaped=JSON.stringify({text:String.raw`\u{00a3}`});
assert.equal(parseImportJson(escaped).value.text,String.raw`\u{00a3}`,'A valid literal Unicode string was decoded again');
assert.equal(parseImportJson(String.raw`{"text":"\u{003c}script\u{003e}"}`).value.text,'<script>');
console.log('PASS import JSON: strict valid output unchanged, safe string repairs, ambiguous Unicode source review, no structural/answer invention.');
