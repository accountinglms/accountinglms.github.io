/* Learning metrics: exam score uses ALL questions; answered accuracy is diagnostic only.
 * This is not an official ICAEW grading algorithm or a predictive model. */
export function examScore(attempt) {
  const total=Number(attempt?.total_questions);
  const score=Number(attempt?.score);
  if(!Number.isFinite(total)||total<=0||!Number.isFinite(score)||score<0||score>total)return null;
  return 100*score/total;
}
export function answeredAccuracy(attempt) {
  const answered=Number(attempt?.correct_count)+Number(attempt?.wrong_count);
  const correct=Number(attempt?.correct_count);
  if(!Number.isFinite(answered)||answered<=0||!Number.isFinite(correct)||correct<0||correct>answered)return null;
  return 100*correct/answered;
}
export function recentScores(attempts,limit=5) {
  return (attempts||[]).slice(-limit).map(examScore).filter(Number.isFinite);
}
export function averageScores(attempts,limit=5) {
  const scores=recentScores(attempts,limit);
  return scores.length?scores.reduce((a,b)=>a+b,0)/scores.length:null;
}
export function weightedScores(attempts,limit=5){
  const scores=recentScores(attempts,limit);
  if(!scores.length)return null;
  const denominator=scores.reduce((sum,_,i)=>sum+i+1,0);
  return scores.reduce((sum,value,i)=>sum+value*(i+1),0)/denominator;
}
export function percent(n) {return Number.isFinite(n)?`${Math.round(n)}%`:'—';}
export function assessmentConfidence({attemptCount,coverage,pass,scores}) {
  const count=Number(attemptCount||0),cov=Number(coverage||0);
  const latest=(scores||[]).slice(-3).filter(Number.isFinite);
  const enough=count>=3&&cov>=60&&latest.length===3;
  const safe=enough&&latest.every(v=>v>=pass+10);
  const passed=enough&&latest.every(v=>v>=pass);
  return {enough,safe,passed,neededAttempts:Math.max(0,3-count),coverageOk:cov>=60};
}
