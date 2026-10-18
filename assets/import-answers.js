// Shared by the editor and AI endpoint. Never infer a missing answer.
const truthWord=value=>{
  if(typeof value==='boolean')return value;
  if(typeof value!=='string')return null;
  const word=value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
  return ['true','dung'].includes(word)?true:['false','sai'].includes(word)?false:null;
};
export function importAnswerError(question){
  const {question_type:type,options,correct_answer:answer}=question||{};
  if(type==='numeric'){
    if(!Array.isArray(options)||!options.length||options.length>30||options.some(value=>typeof value!=='string'||!value.trim()))return 'Cần ít nhất một nhãn ô nhập số.';
    return Array.isArray(answer)&&answer.length===options.length&&answer.every(value=>typeof value==='number'&&Number.isFinite(value))
      ? '' : 'Cần đáp án số cho từng ô để chấm tự động. Có thể xuất bản trước rồi bổ sung sau.';
  }
  if(!Array.isArray(options)||options.length<2||options.length>30||options.some(value=>typeof value!=='string'||!value.trim()))return 'Cần từ 2 đến 30 lựa chọn có nội dung.';
  const index=value=>Number.isInteger(value)&&value>=0&&value<options.length;
  if(type==='single')return index(answer)?'':'Hãy chọn một đáp án.';
  if(type==='multiple')return Array.isArray(answer)&&answer.length>0&&answer.every(index)&&new Set(answer).size===answer.length?'':'Hãy chọn các đáp án đúng.';
  if(type==='tf')return Array.isArray(answer)&&answer.length===options.length&&answer.every(value=>typeof value==='boolean')?'':'Hãy chọn Đúng hoặc Sai cho từng mệnh đề.';
  return 'Loại câu hỏi chưa hợp lệ.';
}
export function importContentError(item){
  // Optional examples can be hidden while their translation is repaired. Core source
  // content and answers still block publication when incomplete.
  const fields=[item?.prompt,...(Array.isArray(item?.options)?item.options:[]),item?.explanation_en,item?.explanation_vi,item?.content_markdown,item?.content_markdown_vi];
  return fields.some(value=>typeof value==='string'&&/\[\s*UNREADABLE(?:\s*:[^\]\r\n]*)?\s*\]/i.test(value))?'Có phần [UNREADABLE] chưa đọc rõ. Hãy đối chiếu tệp nguồn và điền đầy đủ nội dung trước khi xuất bản.':'';
}
export function assertImportAnswers(questions){
  if(!Array.isArray(questions)||questions.length===0)throw new Error('Chưa có câu hỏi để xuất bản.');
  questions.forEach((question,index)=>{if(typeof question?.prompt!=='string'||!question.prompt.trim())throw new Error(`Câu ${index+1}: nội dung câu hỏi đang trống.`);const issue=importContentError(question)||importAnswerError(question);if(issue)throw new Error(`Câu ${index+1}: ${issue}`);});
}
export function normalizeImportQuestion(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return raw;
  const question={...raw},notes=[];
  const original=question.correct_answer;
  if(question.question_type==='numeric'&&Array.isArray(original)){
    // A numeric answer must be an actual numeric value, not a choice index.
    // Convert only simple decimal strings; never infer results from the prompt.
    const parsed=original.map(value=>typeof value==='number'?value:
      typeof value==='string'&&/^-?\d+(?:\.\d+)?$/.test(value.trim())?Number(value.trim()):null);
    if(parsed.every(value=>value!==null&&Number.isFinite(value)))question.correct_answer=parsed;
  }
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
  const contentIssue=importContentError(question);
  if(contentIssue){question.verification_status='needs_review';notes.push(contentIssue);}
  if(notes.length)question.review_note=[typeof question.review_note==='string'?question.review_note:'',...notes].filter(Boolean).join(' ');
  return question;
}

export function importOutputSchema(fileCount,targetType){
  const text={type:['string','null']},file={type:'integer',minimum:1,maximum:fileCount};
  const properties={
    question_type:{type:'string',enum:['single','multiple','tf','numeric']},prompt:{type:'string',description:'Verbatim complete source question, including its scenario, all figures, conditions, tables and instructions. Never summarise or paraphrase. Mark unreadable spans [UNREADABLE].'},
    options:{type:'array',minItems:1,maxItems:30,items:{type:'string',description:'For numeric: label each answer box in source order (such as FIFO basis £, AVCO basis £). Otherwise copy each full source choice.'}},
    correct_answer:{description:'numeric: array of numeric values, one per labeled input, or null when source does not provide a reliable answer; single: option index; multiple: index array; tf: boolean array. Never guess.',anyOf:[{type:'integer',minimum:0,maximum:29},{type:'array',items:{type:'number'},minItems:1,maxItems:30},{type:'array',items:{type:'boolean'},minItems:2,maxItems:30},{type:'null'}]},
    required_selections:{type:['integer','null']},confidence:{type:'number',minimum:0,maximum:1},
    source_page:{type:['integer','null']},source_file:file,source_files:{type:'array',items:file,minItems:1,maxItems:fileCount},
    verification_status:{type:'string',enum:['source_only','needs_review','conflict']}
  };
  for(const key of ['explanation_en','explanation_vi','practical_example_en','practical_example_vi','standard_reference','verification_note','review_note'])properties[key]=text;
  for(const key of ['explanation_en','explanation_vi'])properties[key]={...text,description:'Full source answer explanation in this language, copied verbatim when present. Translate the full source explanation faithfully for the other language. Preserve every reasoning step, calculation and rejected-option rationale. Only generate an explanation if the source contains none, and disclose that in review_note.'};
  const lesson={type:['object','null'],properties:{title:{type:'string'},summary:{...text,description:'Optional separate overview; never replace or shorten content_markdown with this summary.'},content_markdown:{type:'string',description:'Full verbatim source lesson in original language. Preserve every paragraph, heading, table, formula and worked example; never summarise.'},content_markdown_vi:{...text,description:'Complete faithful Vietnamese translation of the entire source lesson; do not condense.'},standard_references:{type:'array',items:{type:'string'}},verification_status:{type:'string',enum:['source_only','needs_review','conflict']},verification_note:text},required:['title','content_markdown']};
  return {type:'object',properties:{title:{type:'string'},questions:{type:'array',maxItems:150,items:{type:'object',properties,required:['question_type','prompt','options','correct_answer','confidence','source_file','source_files']}},lesson:targetType==='questions'?{type:'null'}:lesson,warnings:{type:'array',items:{type:'string'}},processed_files:{type:'array',items:file,minItems:fileCount,maxItems:fileCount}},required:['title','questions','lesson','warnings','processed_files']};
}
