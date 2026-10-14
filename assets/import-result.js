export const EMPTY_QUESTIONS_MESSAGE='AI chưa trích xuất được câu hỏi nào. Hãy kiểm tra độ rõ của ảnh hoặc chọn đúng nguồn, rồi thử lại hoặc nhập thủ công.';
export function hasImportContent(payload,targetType){
  if(targetType==='lesson')return Boolean(payload?.lesson&&String(payload.lesson.content_markdown||'').trim());
  return Array.isArray(payload?.questions)&&payload.questions.length>0;
}
export function isReadyImport(draft){
  return draft?.payload?.processing?.state==='ready'&&hasImportContent(draft.payload,draft.target_type||draft.payload?.destination?.target_type);
}
export function requireImportContent(payload,targetType){
  if(hasImportContent(payload,targetType))return;
  const error=new Error(targetType==='lesson'?'AI chưa tạo được nội dung bài học. Hãy kiểm tra nguồn rồi thử lại hoặc nhập thủ công.':EMPTY_QUESTIONS_MESSAGE);
  error.code=targetType==='lesson'?'AI_NO_LESSON':'AI_NO_QUESTIONS';
  throw error;
}
