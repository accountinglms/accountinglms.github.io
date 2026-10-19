import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {importAnswerError,normalizeImportQuestion,importOutputSchema} from '../assets/import-answers.js';
import '../assets/numeric-grading.js';
const grading=globalThis.LmsGrading;

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
const {numericValue,gradeAnswer}=vm.runInNewContext(helpers+'\n({numericValue,gradeAnswer})',{lmsGrading:grading});
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
assert.equal(gradeAnswer({...exercise,answer:[550,503.94]},['550','503.945']),false,'A half penny must follow rounding instead of an epsilon');
assert.equal(gradeAnswer({...exercise,answer:[550,503.95]},['550','503.945']),true);
assert.equal(gradeAnswer({...exercise,answer:[550,1.005]},['550','1.01']),true,'Decimal half-up must not inherit binary float rounding');
assert.equal(gradeAnswer({...exercise,answer:[550,-1.005]},['550','-1.01']),true);
assert.equal(gradeAnswer({...exercise,answer:[550,1.005],numericPolicy:{rounding:'half_even'}},['550','1.00']),true);
assert.equal(gradeAnswer({...exercise,numericPolicy:{mode:'exact'}},['550','503.94']),false);
assert.equal(gradeAnswer({...exercise,answer:[550,503.94],numericPolicy:{mode:'tolerance',tolerance:.01}},['550','503.95']),true);
assert.equal(gradeAnswer({...exercise,answer:[550,503.94],numericPolicy:{mode:'tolerance',tolerance:.01}},['550','503.95001']),false);
assert.equal(gradeAnswer({...exercise,answer:[550,504],numericPolicy:{decimal_places:0}},['550','503.6']),true);
assert.equal(numericValue('(1,250)'),-1250);
assert.equal(numericValue('5£50'),null,'Currency inserted between digits must not invent a number');
assert.equal(numericValue('20%',{unit:'%'}),20);
assert.equal(numericValue('20%'),null);
assert.equal(grading.expectedText(exercise,1),'503.94');
assert.equal(grading.hasAnswerKey({...exercise,numericPolicy:{mode:'invalid'}}),false);
console.log('PASS numeric-entry: source labels, multiple numeric answer boxes, exact score, rounding and offline input parsing.');
