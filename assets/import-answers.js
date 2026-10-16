// Shared by the editor and AI endpoint. Never infer a missing answer.
const truthWord=value=>{
  if(typeof value==='boolean')return value;
  if(typeof value!=='string')return null;
  const word=value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
  return ['true','dung'].includes(word)?true:['false','sai'].includes(word)?false:null;
};
export function importAnswerError(question){
  const {question_type:type,options,correct_answer:answer}=question||{};
  if(!Array.isArray(options)||options.length<2||options.length>30||options.some(value=>typeof value!=='string'||!value.trim()))return 'Cần từ 2 đến 30 lựa chọn có nội dung.';
  const index=value=>Number.isInteger(value)&&value>=0&&value<options.length;
  if(type==='single')return index(answer)?'':'Hãy chọn một đáp án.';
  if(type==='multiple')return Array.isArray(answer)&&answer.length>0&&answer.every(index)&&new Set(answer).size===answer.length?'':'Hãy chọn các đáp án đúng.';
  if(type==='tf')return Array.isArray(answer)&&answer.length===options.length&&answer.every(value=>typeof value==='boolean')?'':'Hãy chọn Đúng hoặc Sai cho từng mệnh đề.';
  return 'Loại câu hỏi chưa hợp lệ.';
}
export function assertImportAnswers(questions){
  if(!Array.isArray(questions)||questions.length===0)throw new Error('Chưa có câu hỏi để xuất bản.');
  questions.forEach((question,index)=>{const issue=importAnswerError(question);if(issue)throw new Error(`Câu ${index+1}: ${issue}`);});
}
export function normalizeImportQuestion(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return raw;
  const question={...raw},notes=[];
  const original=question.correct_answer;
  if(question.question_type==='tf'&&Array.isArray(original)&&original.every(value=>truthWord(value)!==null)){
    question.correct_answer=original.map(truthWord);
  }else if(['single','tf'].includes(question.question_type)&&truthWord(original)!==null&&Array.isArray(question.options)&&question.options.length===2){
    const labels=question.options.map(value=>truthWord(typeof value==='string'?value.replace(/^\s*[a-z][.)]\s*/i,''):value));
    if(labels.includes(true)&&labels.includes(false)){
      question.question_type='single';question.correct_answer=labels.indexOf(truthWord(original));
      notes.push('Đã chuẩn hoá lựa chọn Đúng/Sai thành câu chọn một đáp án.');
    }
  }
  const confidence=question.confidence;
  if(typeof confidence==='string'&&/^\s*\d+(?:\.\d+)?\s*%\s*$/.test(confidence))question.confidence=Number(confidence.replace('%',''))/100;
  else if(typeof confidence==='string'&&/^\s*(?:0(?:\.\d+)?|1(?:\.0+)?)\s*$/.test(confidence))question.confidence=Number(confidence);
  else if(typeof confidence==='number'&&Number.isInteger(confidence)&&confidence>1&&confidence<=100){question.confidence=confidence/100;notes.push('Độ tin cậy AI dùng thang phần trăm đã được chuẩn hoá.');}
  if(typeof question.confidence!=='number'||!Number.isFinite(question.confidence)||question.confidence<0||question.confidence>1){
    question.confidence=0;question.verification_status='needs_review';notes.push('AI chưa cung cấp độ tin cậy hợp lệ; cần kiểm tra nội dung với nguồn.');
  }
  const issue=importAnswerError(question);
  question.answer_needs_review=Boolean(issue);question.answer_issue=issue||null;
  if(issue){question.correct_answer=null;question.verification_status='needs_review';notes.push('Đáp án AI chưa hợp lệ. '+issue);}
  if(notes.length)question.review_note=[typeof question.review_note==='string'?question.review_note:'',...notes].filter(Boolean).join(' ');
  return question;
}

export function importOutputSchema(fileCount,targetType){
  const text={type:['string','null']},file={type:'integer',minimum:1,maximum:fileCount};
  const properties={
    question_type:{type:'string',enum:['single','multiple','tf']},prompt:{type:'string'},
    options:{type:'array',minItems:2,maxItems:30,items:{type:'string'}},
    correct_answer:{description:'single: zero-based integer; multiple: integer indexes; tf: one boolean per statement; null if unknown. Never invent an answer.',anyOf:[{type:'integer',minimum:0,maximum:29},{type:'array',items:{type:'integer',minimum:0,maximum:29},minItems:1,maxItems:30},{type:'array',items:{type:'boolean'},minItems:2,maxItems:30},{type:'null'}]},
    required_selections:{type:['integer','null']},confidence:{type:'number',minimum:0,maximum:1},
    source_page:{type:['integer','null']},source_file:file,source_files:{type:'array',items:file,minItems:1,maxItems:fileCount},
    verification_status:{type:'string',enum:['source_only','needs_review','conflict']}
  };
  for(const key of ['explanation_en','explanation_vi','practical_example_en','practical_example_vi','standard_reference','verification_note','review_note'])properties[key]=text;
  const lesson={type:['object','null'],properties:{title:{type:'string'},summary:text,content_markdown:{type:'string'},content_markdown_vi:text,standard_references:{type:'array',items:{type:'string'}},verification_status:{type:'string',enum:['source_only','needs_review','conflict']},verification_note:text},required:['title','content_markdown']};
  return {type:'object',properties:{title:{type:'string'},questions:{type:'array',maxItems:150,items:{type:'object',properties,required:['question_type','prompt','options','correct_answer','confidence','source_file','source_files']}},lesson:targetType==='questions'?{type:'null'}:lesson,warnings:{type:'array',items:{type:'string'}},processed_files:{type:'array',items:file,minItems:fileCount,maxItems:fileCount}},required:['title','questions','lesson','warnings','processed_files']};
}
