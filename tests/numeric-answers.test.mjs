import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {importAnswerError,normalizeImportQuestion,importOutputSchema} from '../assets/import-answers.js';

// Numeric answer boxes must be recognized separately from multiple-choice answers.
const labels=['FIFO basis £','AVCO basis £'];
const q={question_type:'numeric',prompt:'Closing inventory at 31 October',options:labels,correct_answer:[550,503.94],confidence:.95};
assert.equal(importAnswerError(q),'');
assert.deepEqual(normalizeImportQuestion({...q,correct_answer:['550','503.94']}).correct_answer,[550,503.94]);
assert.ok(importAnswerError({...q,correct_answer:[550]}));
assert.ok(importAnswerError({...q,correct_answer:[550,null]}));
assert.ok(importAnswerError({...q,correct_answer:null}));
assert.equal(importOutputSchema(2,'questions').properties.questions.items.properties.question_type.enum.includes('numeric'),true);

// Run the actual quiz grading functions, not a duplicated scoring implementation.
const source=fs.readFileSync('assets/learner-core.js','utf8');
function extract(start,end){
  const from=source.indexOf('    function '+start+'('),to=source.indexOf('    function '+end+'(',from+1);
  assert.ok(from>0&&to>from,'Cannot locate learner function '+start);
  return source.slice(from,to);
}
const helpers=extract('numericValue','draftComplete')+extract('gradeAnswer','checkCurrentAnswer');
const {numericValue,gradeAnswer}=vm.runInNewContext(helpers+'\n({numericValue,gradeAnswer})');
const exercise={type:'numeric',options:labels,answer:[550,503.9393939393939]};
assert.equal(gradeAnswer(exercise,['550','503.94']),true,'Correct rounded FIFO/AVCO should count');
assert.equal(gradeAnswer(exercise,['£550','503,94']),true,'Currency and decimal comma should work');
assert.equal(gradeAnswer(exercise,['550','503.95']),false,'Incorrect penny should not pass');
assert.equal(gradeAnswer(exercise,['550','450']),false,'Wrong AVCO method must not pass unnoticed');
assert.equal(gradeAnswer(exercise,['550','']),false,'Missing second box must not count as correct');
assert.equal(gradeAnswer({...exercise,answer:[]},['550','503.94']),false,'Unknown key cannot be marked correct');
assert.equal(numericValue('1,234.50'),1234.5);
assert.equal(numericValue('503,94'),503.94);
assert.equal(numericValue('abc'),null);
console.log('PASS numeric-entry: source labels, multiple numeric answer boxes, exact score, rounding and offline input parsing.');
