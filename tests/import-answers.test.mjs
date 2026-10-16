import assert from 'node:assert/strict';
import {normalizeImportQuestion,importAnswerError,importContentError,assertImportAnswers,importOutputSchema} from '../assets/import-answers.js';
import {fidelityQuestion} from './helpers/import-fidelity-fixture.mjs';
const question={question_type:'tf',prompt:'Assess both statements.',options:['Statement one','Statement two'],correct_answer:[true,false],confidence:.85,verification_status:'source_only'};
assert.throws(()=>assertImportAnswers([]),/Chưa có câu hỏi/);
assert.deepEqual(normalizeImportQuestion(question).correct_answer,[true,false]);
for(const answer of [['true','FALSE'],['Đúng','Sai'],[' true ',false]])assert.deepEqual(normalizeImportQuestion({...question,correct_answer:answer}).correct_answer,[true,false]);
for(const answer of [true,false,[true],[1,0],['true','unknown'],null,undefined,{},[]]){
  const result=normalizeImportQuestion({...question,correct_answer:answer});
  assert.equal(result.correct_answer,null);assert.equal(result.answer_needs_review,true);assert.equal(result.verification_status,'needs_review');
  assert.equal(result.prompt,question.prompt);assert.deepEqual(result.options,question.options);assert.throws(()=>assertImportAnswers([result]),/Câu 1/);
}
for(const [options,answer,index] of [[['True','False'],true,0],[['True','False'],false,1],[['Sai','Đúng'],'Đúng',1],[['A. False','B. True'],'false',0]]){
  const result=normalizeImportQuestion({...question,options,correct_answer:answer});
  assert.equal(result.question_type,'single');assert.equal(result.correct_answer,index);assert.equal(importAnswerError(result),'');
}
for(const [confidence,expected] of [['85%',.85],[85,.85],['0.85',.85],[.85,.85],[null,0],[undefined,0],['high',0],[-1,0],[101,0],[Infinity,0]]){
  const result=normalizeImportQuestion({...question,confidence});assert.equal(result.confidence,expected);assert.equal(result.correct_answer[1],false);
}
for(const answer of [[true],[null],[1,1],[],['1'],[2]])assert.ok(importAnswerError({question_type:'multiple',options:['A','B'],correct_answer:answer}));
assert.equal(importAnswerError({question_type:'single',options:['A','B'],correct_answer:0}),'');
assert.ok(importAnswerError({question_type:'single',options:['A','B'],correct_answer:false}));
assert.ok(importAnswerError({question_type:'tf',options:['A','B'],correct_answer:[true,null]}));
const raw={...question,correct_answer:['true','false']};normalizeImportQuestion(raw);assert.deepEqual(raw.correct_answer,['true','false'],'Normalization mutated provider data');
assert.deepEqual(normalizeImportQuestion(fidelityQuestion).prompt,fidelityQuestion.prompt);
assert.doesNotThrow(()=>assertImportAnswers([fidelityQuestion]));
for(const field of ['prompt','explanation_en','explanation_vi','practical_example_en','practical_example_vi']){
  const pending={...fidelityQuestion,[field]:'The amount is [UNREADABLE].'};
  assert.ok(importContentError(pending));assert.throws(()=>assertImportAnswers([pending]),/Câu 1.*UNREADABLE/);
  assert.equal(normalizeImportQuestion(pending).verification_status,'needs_review');
}
assert.ok(importContentError({...fidelityQuestion,options:['[UNREADABLE: figure]','Readable choice']}));
assert.ok(importContentError({content_markdown:'Full lesson\n[UNREADABLE]'}));
assert.equal(importContentError({prompt:'UNREADABLE is a word, [a note] is a note.'}),'');
assert.equal(importContentError({...fidelityQuestion,review_note:'The previous [UNREADABLE] span was corrected.'}),'','Old review notes must not block a corrected question');
const schema=importOutputSchema(3,'questions');
assert.equal(schema.properties.processed_files.minItems,3);assert.equal(schema.properties.questions.items.properties.confidence.maximum,1);
assert.equal(schema.properties.lesson.type,'null');
console.log('PASS import answers: false/index-zero preservation, explicit TF labels, ambiguous/missing answer quarantine, confidence scales and strict publish validation.');
