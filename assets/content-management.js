// Course deletion removes one catalog node while preserving its complete subtree.
export const COURSE_KINDS = {
  subject:{table:'subjects',label:'môn học',parentKey:null},
  chapter:{table:'chapters',label:'chương',parentKey:'subject_id'},
  exercise:{table:'exercises',label:'bài tập',parentKey:'chapter_id'}
};

export function normalizeCourseTitle(value){
  return String(value||'').normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('vi');
}

export function findCourseItem(items,title,parentKey=null,parentId=null){
  const normalized=normalizeCourseTitle(title);
  return items.find(item=>!item.deleted_at&&normalizeCourseTitle(item.title)===normalized&&(!parentKey||item[parentKey]===parentId));
}

export function courseItemPath(kind,item,catalog){
  const chapter=kind==='exercise'?catalog.chapters.find(c=>c.id===item.chapter_id):kind==='chapter'?item:null;
  const subject=kind==='subject'?item:catalog.subjects.find(s=>s.id===chapter?.subject_id);
  return [subject?.title,chapter?.title,kind==='exercise'?item.title:null].filter(Boolean).join(' → ');
}

export function courseItemCounts(kind,item,catalog){
  const chapters=kind==='subject'?catalog.chapters.filter(c=>c.subject_id===item.id):kind==='chapter'?[item]:[];
  const chapterIds=new Set(chapters.map(c=>c.id));
  const exercises=kind==='exercise'?[item]:catalog.exercises.filter(e=>chapterIds.has(e.chapter_id));
  const exerciseIds=new Set(exercises.map(e=>e.id));
  return {
    chapters:chapters.length,
    exercises:exercises.length,
    questions:catalog.questions.filter(q=>exerciseIds.has(q.exercise_id)).length,
    lessons:catalog.lessons.filter(l=>chapterIds.has(l.chapter_id)).length
  };
}

export function courseParentDeleted(kind,item,catalog){
  if(kind==='subject')return false;
  const chapter=kind==='exercise'?catalog.chapters.find(c=>c.id===item.chapter_id):item;
  const subject=catalog.subjects.find(s=>s.id===chapter?.subject_id);
  return !subject||Boolean(subject.deleted_at)||(kind==='exercise'&&(!chapter||Boolean(chapter.deleted_at)));
}
