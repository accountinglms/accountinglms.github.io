import assert from 'node:assert/strict';
import {findCourseItem,courseItemPath,courseItemCounts,courseParentDeleted} from '../assets/content-management.js';

const catalog={
  subjects:[{id:'s',title:'Accounting'},{id:'s2',title:'Finance',deleted_at:'2026-10-10'}],
  chapters:[{id:'c',subject_id:'s',title:'The accounting equation'},{id:'c2',subject_id:'s2',title:'The accounting equation'}],
  exercises:[{id:'e',chapter_id:'c',title:'Question bank'},{id:'e2',chapter_id:'c2',title:'Question bank'}],
  questions:[{exercise_id:'e'},{exercise_id:'e'},{exercise_id:'e2'}],
  lessons:[{chapter_id:'c'},{chapter_id:'c2'}]
};
assert.equal(findCourseItem(catalog.chapters,'  THE   ACCOUNTING EQUATION ','subject_id','s').id,'c');
assert.equal(findCourseItem(catalog.chapters,'The accounting equation','subject_id','s2').id,'c2');
assert.equal(findCourseItem([{id:'gone',title:'Chapter',deleted_at:'2026-10-10'}],'Chapter'),undefined);
assert.equal(courseItemPath('exercise',catalog.exercises[0],catalog),'Accounting → The accounting equation → Question bank');
assert.deepEqual(courseItemCounts('subject',catalog.subjects[0],catalog),{chapters:1,exercises:1,questions:2,lessons:1});
assert.deepEqual(courseItemCounts('chapter',catalog.chapters[0],catalog),{chapters:1,exercises:1,questions:2,lessons:1});
assert.deepEqual(courseItemCounts('exercise',catalog.exercises[0],catalog),{chapters:0,exercises:1,questions:2,lessons:0});
assert.equal(courseParentDeleted('exercise',catalog.exercises[0],catalog),false);
assert.equal(courseParentDeleted('exercise',catalog.exercises[1],catalog),true);
assert.equal(courseParentDeleted('exercise',{id:'orphan',chapter_id:'missing'},catalog),true);
catalog.chapters[0].deleted_at='2026-10-10';
assert.equal(courseParentDeleted('exercise',catalog.exercises[0],catalog),true);
assert.equal(courseParentDeleted('chapter',catalog.chapters[0],catalog),false);
console.log('PASS: correct duplicate reuse, scoped preview counts and parent-first restore.');
