import assert from 'node:assert/strict';
import {hasImportContent,isReadyImport,requireImportContent} from '../assets/import-result.js';
for(const payload of [null,{}, {questions:[]},{questions:[],lesson:{content_markdown:'Lesson only'}}]){
  assert.equal(hasImportContent(payload,'questions'),false);
  assert.throws(()=>requireImportContent(payload,'questions'),error=>error.code==='AI_NO_QUESTIONS');
  assert.equal(isReadyImport({target_type:'questions',payload:{...payload,processing:{state:'ready'}}}),false);
}
assert.equal(isReadyImport({target_type:'questions',payload:{questions:[{prompt:'Q'}],processing:{state:'ready'}}}),true);
assert.equal(hasImportContent({questions:[],lesson:{content_markdown:'Revenue = GBP 4,000.'}},'lesson'),true);
assert.equal(hasImportContent({questions:[{prompt:'Q'}],lesson:{content_markdown:' '}},'lesson'),false);
console.log('PASS: empty questions cannot become ready; valid lessons do not need questions.');
