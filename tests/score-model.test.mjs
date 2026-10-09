import assert from 'node:assert/strict';
import { examScore, answeredAccuracy, averageScores, weightedScores, assessmentConfidence } from '../assets/score-model.js';

// Answered accuracy must never be confused with exam score.
const partial={score:4,total_questions:10,correct_count:4,wrong_count:0,unanswered_count:6,accuracy:100};
assert.equal(examScore(partial),40);
assert.equal(answeredAccuracy(partial),100);
assert.equal(examScore({score:0,total_questions:0}),null);
assert.equal(examScore({score:11,total_questions:10}),null);
assert.equal(examScore({score:-1,total_questions:10}),null);
assert.equal(averageScores([partial,{score:5,total_questions:10}]),45);
assert.equal(Math.round(weightedScores([partial,{score:8,total_questions:10}])),67);
assert.deepEqual(assessmentConfidence({attemptCount:2,coverage:90,pass:55,scores:[100,100]}).enough,false);
assert.equal(assessmentConfidence({attemptCount:3,coverage:90,pass:55,scores:[70,70,70]}).safe,true);
assert.equal(assessmentConfidence({attemptCount:3,coverage:40,pass:55,scores:[100,100,100]}).safe,false);
assert.equal(assessmentConfidence({attemptCount:3,coverage:100,pass:55,scores:[20,100,100]}).passed,false);
console.log('PASS score model: official-style score differs from answered accuracy; confidence is cautious.');
