// Shared by classic learner scripts and module-based History/Progress pages.
// Decimal comparisons use integers: no floating-point epsilon changes the rule.
(()=>{
  const finite=value=>typeof value==='number'&&Number.isFinite(value);
  const count=value=>value!=null&&Number.isInteger(Number(value))&&Number(value)>=0?Number(value):null;
  function policy(question){
    const raw=question?.numericPolicy??question?.numeric_policy??question?.metadata?.numeric_policy??{};
    if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
    const result={version:2,mode:raw.mode??'rounded',decimal_places:raw.decimal_places??2,
      rounding:raw.rounding??'half_up',tolerance:raw.tolerance??0,unit:raw.unit??''};
    return ['rounded','exact','tolerance'].includes(result.mode)
      &&Number.isInteger(result.decimal_places)&&result.decimal_places>=0&&result.decimal_places<=8
      &&['half_up','half_even','truncate'].includes(result.rounding)
      &&finite(result.tolerance)&&result.tolerance>=0
      &&typeof result.unit==='string'&&result.unit.length<=20?result:null;
  }
  function normalized(raw,rule={}){
    if(finite(raw))return String(raw);
    if(typeof raw!=='string'||raw.length>160)return null;
    let value=raw.trim(),negative=false;
    if(/^\(.*\)$/.test(value)){negative=true;value=value.slice(1,-1).trim();}
    value=value.replace(/^[£$€]\s*|\s*[£$€]$/g,'').replace(/[\s\u00a0]/g,'');
    if(rule?.unit==='%')value=value.replace(/%$/,'');
    if(!/^-?(?:\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?|\d+,\d{1,2})$/.test(value))return null;
    if(negative&&value.startsWith('-'))return null;
    value=/^-?\d+,\d{1,2}$/.test(value)?value.replace(',','.'):value.replaceAll(',','');
    return (negative?'-':'')+value;
  }
  function numericValue(raw,rule){
    const text=normalized(raw,rule);if(text===null)return null;
    const value=Number(text);return Number.isFinite(value)?value:null;
  }
  function decimal(raw,rule){
    const text=normalized(raw,rule);if(text===null)return null;
    const match=/^(-?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i.exec(text);
    if(!match)return null;
    let scale=(match[3]||'').length-Number(match[4]||0);
    if(Math.abs(scale)>320)return null;
    let digits=BigInt(match[2]+(match[3]||''));
    if(scale<0){digits*=10n**BigInt(-scale);scale=0;}
    return {value:match[1]? -digits:digits,scale};
  }
  function rounded(value,places,rounding){
    const negative=value.value<0n,n=negative?-value.value:value.value;
    if(value.scale<=places)return value.value*10n**BigInt(places-value.scale);
    const divisor=10n**BigInt(value.scale-places),rest=n%divisor;
    let whole=n/divisor;
    if(rounding!=='truncate'&&(rest*2n>divisor||(rest*2n===divisor&&(rounding==='half_up'||whole%2n===1n))))whole++;
    return negative?-whole:whole;
  }
  function same(actual,expected,rule){
    const left=decimal(actual,rule),right=decimal(expected,rule);if(!left||!right)return false;
    if(rule.mode==='rounded')return rounded(left,rule.decimal_places,rule.rounding)===rounded(right,rule.decimal_places,rule.rounding);
    const tolerance=rule.mode==='tolerance'?decimal(rule.tolerance,rule):{value:0n,scale:0};
    if(!tolerance)return false;
    const scale=Math.max(left.scale,right.scale,tolerance.scale);
    const difference=left.value*10n**BigInt(scale-left.scale)-right.value*10n**BigInt(scale-right.scale);
    return (difference<0n?-difference:difference)<=tolerance.value*10n**BigInt(scale-tolerance.scale);
  }
  function hasAnswerKey(question){
    const type=question?.type??question?.question_type,answer=question?.answer??question?.correct_answer,options=question?.options;
    if(!Array.isArray(options)||!options.length)return false;
    const index=value=>Number.isInteger(value)&&value>=0&&value<options.length;
    if(type==='numeric')return Boolean(policy(question))&&Array.isArray(answer)&&answer.length===options.length&&answer.every(finite);
    if(type==='single')return index(answer);
    if(type==='multiple')return Array.isArray(answer)&&answer.length>0&&answer.every(index)&&new Set(answer).size===answer.length;
    return type==='tf'&&Array.isArray(answer)&&answer.length===options.length&&answer.every(value=>typeof value==='boolean');
  }
  function gradeField(question,index,actual){
    const rule=policy(question),expected=(question?.answer??question?.correct_answer)?.[index];
    return rule&&finite(expected)?same(actual,expected,rule):null;
  }
  function gradeNumeric(question,selection){
    return hasAnswerKey(question)&&Array.isArray(selection)&&selection.length===question.options.length
      &&selection.every((value,index)=>gradeField(question,index,value)===true);
  }
  function expectedText(question,index){
    const rule=policy(question),expected=(question?.answer??question?.correct_answer)?.[index];
    if(!finite(expected))return 'Chưa có đáp án chuẩn';
    if(!rule||rule.mode!=='rounded')return String(expected);
    const value=decimal(expected,rule);if(!value)return String(expected);
    const n=rounded(value,rule.decimal_places,rule.rounding),negative=n<0n;
    const digits=(negative?-n:n).toString().padStart(rule.decimal_places+1,'0');
    return (negative?'-':'')+(rule.decimal_places?digits.slice(0,-rule.decimal_places)+'.'+digits.slice(-rule.decimal_places):digits);
  }
  function instruction(question){
    const rule=policy(question);if(!rule)return 'Chưa có quy tắc chấm hợp lệ; câu này sẽ được giữ ở trạng thái chưa chấm.';
    if(rule.mode==='exact')return 'So sánh giá trị số chính xác'+(rule.unit?' · Đơn vị: '+rule.unit:'')+'.';
    if(rule.mode==='tolerance')return 'Sai số tuyệt đối được chấp nhận: ±'+rule.tolerance+(rule.unit?' '+rule.unit:'')+'.';
    const rounding={half_up:'từ 5 làm tròn ra xa 0',half_even:'đúng nửa làm tròn về số chẵn',truncate:'cắt phần thập phân dư'}[rule.rounding];
    return 'Làm tròn đến '+rule.decimal_places+' chữ số thập phân ('+rounding+')'+(rule.unit?' · Đơn vị: '+rule.unit:'')+'.';
  }
  function attemptMetrics(attempt={}){
    const total=count(attempt.total_questions)??0;
    const states=Array.isArray(attempt.answers_status)?attempt.answers_status:Array.isArray(attempt.question_snapshot)?attempt.question_snapshot.map(q=>q.status):[];
    const ungraded=Math.min(total,count(attempt.ungraded_count)??states.filter(value=>value==='ungraded').length);
    const gradable=count(attempt.gradable_questions)??count(attempt.context_snapshot?.grading?.gradable_questions)??Math.max(0,total-ungraded);
    const score=count(attempt.score)??0,correct=count(attempt.correct_count)??score,wrong=count(attempt.wrong_count)??0;
    return {total,gradable,score,correct,wrong,ungraded,unanswered:count(attempt.unanswered_count)??Math.max(0,total-correct-wrong-ungraded),
      percent:gradable>0&&gradable<=total&&score<=gradable?100*score/gradable:null};
  }
  globalThis.LmsGrading=Object.freeze({policy,numericValue,hasAnswerKey,gradeField,gradeNumeric,expectedText,instruction,attemptMetrics});
})();
