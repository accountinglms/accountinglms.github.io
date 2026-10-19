import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createAttemptDb} from './helpers/numeric-attempt-db.mjs';
const {db,record,owner}=await createAttemptDb();
const body=(statuses,gradable=statuses.map(s=>s!=='ungraded'))=>({
  p_exercise_id:'numeric',p_run_id:randomUUID(),p_started_at:new Date().toISOString(),
  p_score:statuses.filter(s=>s==='correct').length,p_total_questions:statuses.length,
  p_correct_count:statuses.filter(s=>s==='correct').length,p_wrong_count:statuses.filter(s=>s==='wrong').length,
  p_unanswered_count:statuses.filter(s=>s==null).length,p_bookmarked_count:0,p_duration_seconds:10,
  p_answers_status:statuses,p_selected_answers:statuses.map(()=>[550,503.94]),p_bookmarks:statuses.map(()=>false),
  p_question_snapshot:statuses.map((status,i)=>({type:'numeric',status:status||'unanswered',gradable:gradable[i],numeric_policy:{mode:'rounded',decimal_places:2},grading_version:2})),
  p_context_snapshot:{},p_submitted_from:'test'
});
try{
  const mixed=body(['correct','ungraded',null],[true,false,true]);
  const saved=await record(mixed);const id=saved[0].id;
  const row=(await db.query('select * from exercise_attempts where id=$1',[id])).rows[0];
  assert.equal(row.score,1);assert.equal(row.total_questions,3);assert.equal(row.gradable_questions,2);assert.equal(row.ungraded_count,1);assert.equal(row.unanswered_count,1);assert.equal(Number(row.accuracy),100);
  assert.equal((await record(mixed))[0].id,id,'Retry duplicated an attempt');
  await record(body(['ungraded','ungraded']));
  const pending=(await db.query('select * from exercise_attempts where gradable_questions=0')).rows[0];
  assert.equal(pending.ungraded_count,2);assert.equal(pending.accuracy,null);
  await record(body(['correct',null],[true,false]));
  assert.equal((await db.query('select gradable_questions from exercise_attempts order by attempt_no desc limit 1')).rows[0].gradable_questions,1,'Unanswered question with no key reduced the score');
  const legacy=body(['correct',null]);legacy.p_question_snapshot=[{status:'correct'},{status:'unanswered'}];await record(legacy);
  assert.equal((await db.query('select gradable_questions from exercise_attempts order by attempt_no desc limit 1')).rows[0].gradable_questions,2,'Legacy payload changed its denominator');
  await assert.rejects(record({...body(['correct']),p_score:2}),/INVALID_ATTEMPT_COUNTS/);
  await assert.rejects(record(body(['correct'],[false])),/INVALID_GRADABLE_COUNTS/);
  await db.query("select set_config('test.allowed','false',false)");
  await assert.rejects(record(body(['correct'])),/NOT_ALLOWED/);
  await db.query("select set_config('test.allowed','true',false),set_config('test.uid',$1,false)",['22222222-2222-4222-8222-222222222222']);
  assert.equal((await db.query('select * from exercise_attempts')).rows.length,0,'History leaked across accounts');
  await db.query("select set_config('test.uid',$1,false)",[owner]);
  const before=(await db.query('select question_snapshot from exercise_attempts where id=$1',[id])).rows[0].question_snapshot;
  const changed={...mixed,p_question_snapshot:[{changed:true}]};await record(changed);
  assert.deepEqual((await db.query('select question_snapshot from exercise_attempts where id=$1',[id])).rows[0].question_snapshot,before,'A retry rewrote historical answers or rules');
  console.log('PASS numeric attempts in Postgres: pending counts, denominator, legacy compatibility, idempotency, immutable snapshots and RLS');
}finally{await db.close();}
