// Shared checks for the editor and repair worker. AI confidence is not verification.
import {importAnswerError,normalizeImportQuestion} from './import-answers.js';

export const hasUnreadable=value=>typeof value==='string'&&/\[\s*UNREADABLE(?:\s*:[^\]\r\n]*)?\s*\]/i.test(value);
export const EXAMPLE_FIELDS=['practical_example_en','practical_example_vi'];
export const FIELD_LABELS={prompt:'Đề bài',options:'Lựa chọn',correct_answer:'Đáp án',explanation_en:'Lời giải EN',explanation_vi:'Lời giải VI',practical_example_en:'Ví dụ EN',practical_example_vi:'Ví dụ VI',content_markdown:'Nội dung gốc',content_markdown_vi:'Nội dung VI'};

// A small arithmetic parser, never eval. Only check complete numerical equations;
// prose, percentages, identifiers, accounting parentheses and rounded workings are skipped.
function arithmetic(text){
  if(text.length>500||!/^[-+*/().\d\s]+$/.test(text))return null;
  const tokens=text.match(/\d+(?:\.\d+)?|[-+*/()]/g)||[];let at=0,depth=0;
  function atom(){if(++depth>30)throw Error();let v;const t=tokens[at++];if(t==='+'||t==='-')v=(t==='-'?-1:1)*atom();else if(t==='('){v=sum();if(tokens[at++]!==')')throw Error()}else if(t&&/^\d/.test(t))v=Number(t);else throw Error();depth--;return v}
  function product(){let v=atom();while(tokens[at]==='*'||tokens[at]==='/'){const op=tokens[at++],right=atom();v=op==='*'?v*right:v/right}return v}
  function sum(){let v=product();while(tokens[at]==='+'||tokens[at]==='-'){const op=tokens[at++],right=product();v=op==='+'?v+right:v-right}return v}
  try{const value=sum();return at===tokens.length&&Number.isFinite(value)?value:null}catch{return null}
}
export function hasArithmeticMismatch(text){
  if(typeof text!=='string')return false;
  return text.split(/\r?\n/).some(line=>{
    if(/\(\s*[£$€]?\d[\d.,]*\s*\)/.test(line))return false;
    if(line.length>1000||/round|approximately|approx\.|làm tròn|xấp xỉ|%/i.test(line))return false;
    const parts=line.replace(/(?:GBP|USD|VND|EUR)|[£$€₫,]/g,'').replace(/×/g,'*').replace(/÷/g,'/').split('=');
    if(parts.length!==2)return false;
    const left=arithmetic(parts[0].trim()),right=arithmetic(parts[1].trim().replace(/\.$/,''));
    return left!==null&&right!==null&&Math.abs(left-right)>Math.max(.011,Math.abs(right)*.000001);
  });
}
export function scanImportQuality(questions=[],lesson=null){
  const issues=[];
  function add(index,field,code,message,blocking=true){issues.push({id:`${index}:${field}:${code}`,question_index:index,field,code,message,blocking})}
  questions.forEach((q,i)=>{
    for(const field of ['prompt','explanation_en','explanation_vi',...EXAMPLE_FIELDS])if(hasUnreadable(q[field]))add(i,field,'unreadable',`${FIELD_LABELS[field]} có phần chưa đọc rõ.`,!EXAMPLE_FIELDS.includes(field));
    if(q.options?.some(hasUnreadable))add(i,'options','unreadable','Lựa chọn có phần chưa đọc rõ.');
    const answer=importAnswerError(q);if(answer)add(i,'correct_answer','answer',answer);
    for(const field of ['explanation_en','explanation_vi']){
      if(/\bwait,\s*(?:let[’']?s|the|this|we)|\blet[’']?s (?:check|look at) the source|khoan[,\s]|đợi[,\s].*kiểm tra/i.test(q[field]||''))add(i,field,'self_correction',`${FIELD_LABELS[field]} chứa đoạn suy luận tự sửa; cần đối chiếu nguồn.`);
      if(hasArithmeticMismatch(q[field]))add(i,field,'arithmetic',`${FIELD_LABELS[field]} có phép tính cần kiểm tra lại.`);
    }
    if(q.verification_status==='conflict')add(i,'correct_answer','source_conflict','Đáp án hoặc lời giải đang được đánh dấu mâu thuẫn với nguồn.');
  });
  for(const field of ['content_markdown','content_markdown_vi'])if(hasUnreadable(lesson?.[field]))add(-1,field,'unreadable',`${FIELD_LABELS[field]} có phần chưa đọc rõ.`);
  return issues;
}
export function buildRepairTargets(questions=[],lesson=null){
  const grouped=new Map();
  for(const issue of scanImportQuality(questions,lesson)){
    const key=issue.question_index;
    if(!grouped.has(key))grouped.set(key,{question_index:key,fields:[],issues:[]});
    const item=grouped.get(key);if(!item.fields.includes(issue.field))item.fields.push(issue.field);item.issues.push(issue);
  }
  // Bound one request, never silently discard remaining issues: the editor still lists all.
  return [...grouped.values()].slice(0,20).map(target=>{
    const q=target.question_index<0?lesson:questions[target.question_index];
    const onlyExamples=target.fields.every(field=>EXAMPLE_FIELDS.includes(field));
    return {...target,source_file:q?.source_file||1,source_page:q?.source_page||null,translation_only:onlyExamples&&target.fields.every(field=>{
      const other=field.endsWith('_vi')?field.replace(/_vi$/,'_en'):field.replace(/_en$/,'_vi');return typeof q[other]==='string'&&q[other].trim()&&!hasUnreadable(q[other]);
    })};
  });
}
export function cleanImportWarnings(warnings,questions,lesson){
  const keep=(warnings||[]).filter(text=>!/^Câu [\d, ]+ có phần \[UNREADABLE\]/.test(text)&&!/^Đã chuẩn hoá ký tự trong phản hồi AI\./.test(text)&&!/^Cần kiểm tra nội dung hoặc đáp án câu /.test(text)&&!/^Một số ví dụ bổ sung chưa hoàn thiện/.test(text));
  const issues=scanImportQuality(questions,lesson),core=[...new Set(issues.filter(x=>x.blocking&&x.question_index>=0).map(x=>x.question_index+1))];
  if(core.length)keep.push(`Cần kiểm tra nội dung hoặc đáp án câu ${core.join(', ')} trước khi xuất bản.`);
  if(issues.some(x=>!x.blocking))keep.push('Một số ví dụ bổ sung chưa hoàn thiện sẽ được ẩn khi xuất bản.');
  return [...new Set(keep)];
}
export function publishableExample(value){return hasUnreadable(value)?null:value||null}
export function importRevisionDiff(before,after){
  const patches=[];
  const compare=(oldItem,newItem,index,fields)=>{
    const changes={},previous={};
    for(const field of fields)if(JSON.stringify(oldItem?.[field]??null)!==JSON.stringify(newItem?.[field]??null)){previous[field]=oldItem?.[field]??null;changes[field]=newItem?.[field]??null;}
    if(Object.keys(changes).length)patches.push({question_index:index,before:previous,changes,reason:'Thay đổi đã lưu trong bản nháp.'});
  };
  for(let i=0;i<Math.max(before?.questions?.length||0,after?.questions?.length||0);i++)compare(before?.questions?.[i],after?.questions?.[i],i,['prompt','options','correct_answer','explanation_en','explanation_vi',...EXAMPLE_FIELDS]);
  if(before?.lesson||after?.lesson)compare(before?.lesson,after?.lesson,-1,['content_markdown','content_markdown_vi']);
  return patches;
}
export function applyRepairSuggestion(payload,suggestion){
  const next=structuredClone(payload),i=suggestion.question_index,item=i<0?next.lesson:next.questions[i];
  if(!item||Object.entries(suggestion.before).some(([key,value])=>JSON.stringify(item[key]??null)!==JSON.stringify(value)))throw Error('Nội dung đã thay đổi. Hãy kiểm tra lại đề xuất trước khi áp dụng.');
  Object.assign(item,suggestion.changes);
  if(i>=0){
    if(Object.hasOwn(suggestion.changes,'options')&&!Object.hasOwn(suggestion.changes,'correct_answer'))item.correct_answer=null;
    Object.assign(item,normalizeImportQuestion(item));
  }
  item.verification_status='needs_review';item.review_note='Đã áp dụng đề xuất đối chiếu nguồn. Người biên tập cần kiểm tra trước khi xuất bản.';
  next.warnings=cleanImportWarnings(next.warnings,next.questions||[],next.lesson);return next;
}
