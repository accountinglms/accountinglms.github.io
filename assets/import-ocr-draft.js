// Build drafts from source text, without asking a generative model to reproduce it.
// A missing answer stays missing. Source pages are kept separately for recovery.
import {normalizeImportQuestion} from './import-answers.js';

const starts=/^[ \t]*(?:(?:Question|Q|Câu)[ \t]*(\d{1,3})[ \t]*[:.)-]?[ \t]*|(\d{1,3})[.)][ \t]+|(\d{1,3})[ \t]+(?=[A-ZÀ-Ỵ]))/gmi;
const optionStart=/^[ \t]*(?:\(([A-Ha-h])\)|([A-Ha-h])[.)]|([A-H])[ \t]+)[ \t]*/gm;

function splitOptions(text){
  const candidates=[...text.matchAll(optionStart)].map(match=>({start:match.index,end:match.index+match[0].length,label:(match[1]||match[2]||match[3]).toUpperCase()}));
  let group=[];
  for(let i=0;i<candidates.length;i++){
    if(candidates[i].label!=='A')continue;
    const sequence=[candidates[i]];
    for(let j=i+1;j<candidates.length&&candidates[j].label===String.fromCharCode(65+sequence.length);j++)sequence.push(candidates[j]);
    if(sequence.length>=2)group=sequence;
  }
  if(!group.length)return {prompt:text.trim(),options:[],answer:null,explanation:null};
  const last=group.at(-1),tail=text.slice(last.end);
  const answerMatch=/^[ \t]*(?:(?:Correct[ \t]+)?Answer|Đáp án)[ \t]*[:：][ \t]*([A-H](?:[ \t]*[,;&/][ \t]*[A-H])*)[ \t]*\.?[ \t]*$/im.exec(tail);
  const explanationMatch=/^[ \t]*(?:Explanation|Solution|Lời giải)[ \t]*[:：]?[ \t]*/im.exec(tail);
  const tailEnd=Math.min(...[answerMatch?.index,explanationMatch?.index,tail.length].filter(value=>value!=null));
  const options=group.map((marker,index)=>text.slice(marker.end,index+1<group.length?group[index+1].start:last.end+tailEnd).trim());
  const labels=answerMatch?.[1].match(/[A-H]/g)||[];
  const indexes=[...new Set(labels.map(label=>group.findIndex(marker=>marker.label===label)))];
  const answer=indexes.length&&indexes.every(index=>index>=0)?indexes:null;
  return {prompt:text.slice(0,group[0].start).trim()||text.trim(),options,answer,
    explanation:explanationMatch?tail.slice(explanationMatch.index+explanationMatch[0].length).trim():null};
}

export function buildOcrDraft(pages,{files=[],targetType='questions',title='Nội dung từ tệp',warnings=[]}={}){
  const ordered=pages.filter(page=>typeof page.text==='string'&&page.text.trim()).slice().sort((a,b)=>a.source_file-b.source_file||a.source_page-b.source_page);
  if(!ordered.length)throw new Error('Chưa đọc được chữ từ tệp. Tệp gốc vẫn được giữ và có thể xuất bản ngay.');
  let text='';
  const ranges=ordered.map(page=>{
    const start=text.length;text+=page.text.replace(/\r\n?/g,'\n')+'\n\n';
    return {...page,start,end:text.length};
  });
  const notes=['Đã đọc chữ trực tiếp từ tệp. Ký tự và cách tách câu có thể chưa chính xác; có thể xuất bản ngay và sửa sau.',...warnings];
  const processed_files=[...new Set(ordered.map(page=>page.source_file))];
  if(targetType==='lesson')return {title,questions:[],processed_files,warnings:notes,model_name:'local-ocr-v1',provider:'local',
    lesson:{title,summary:null,content_markdown:text.trim(),content_markdown_vi:null,verification_status:'needs_review',verification_note:notes[0],extraction_method:'local_ocr'}};
  const markers=[...text.matchAll(starts)];
  // A page without numbering still becomes readable source content, with no invented options.
  const blocks=markers.length?markers.map((marker,index)=>({start:index===0?0:marker.index,end:markers[index+1]?.index??text.length,number:Number(marker[1]||marker[2]||marker[3])})):
    ranges.map(range=>({start:range.start,end:range.end,number:null}));
  const questions=blocks.map(block=>{
    const source=ranges.filter(range=>range.start<block.end&&range.end>block.start);
    const original=text.slice(block.start,block.end).trim();
    const parsed=splitOptions(original);
    const correct_answer=parsed.answer?(parsed.answer.length===1?parsed.answer[0]:parsed.answer):null;
    const confidence=Math.min(...source.map(page=>Math.max(0,Math.min(100,Number(page.confidence)||0))))/100;
    return normalizeImportQuestion({question_type:parsed.answer?.length>1?'multiple':'single',prompt:parsed.prompt,options:parsed.options,
      correct_answer,required_selections:parsed.answer?.length>1?parsed.answer.length:1,
      explanation_en:parsed.explanation,explanation_vi:null,practical_example_en:null,practical_example_vi:null,
      source_file:source[0].source_file,source_page:source[0].source_page,source_files:[...new Set(source.map(page=>page.source_file))],
      source_question_number:block.number,confidence,verification_status:'needs_review',extraction_method:'local_ocr',
      review_note:correct_answer==null?'Nguồn chưa có đáp án được nhận diện chắc chắn; câu này chưa chấm điểm tự động.':null,
      verification_note:'Nội dung được đọc trực tiếp từ tệp; chưa kiểm chứng độ chính xác của nhận dạng chữ hoặc đáp án.'});
  }).filter(question=>question.prompt);
  if(!questions.length)throw new Error('Chưa tách được nội dung câu hỏi. Tệp gốc vẫn được giữ.');
  return {title,questions,lesson:null,processed_files,warnings:notes,model_name:'local-ocr-v1',provider:'local'};
}
