import assert from 'node:assert/strict';
import {planChatUpdate,createChatUpdateQueue} from '../assets/chat-updates.js';
const event=(table,record,type='UPDATE')=>({data:{schema:'public',table,type,[type==='DELETE'?'old_record':'record']:record}});
const options={roomId:'room-a',messageIds:[1,2]};
assert.deepEqual(planChatUpdate(event('chat_reads',{group_id:'room-a',user_id:'me'}),options),{read:{group_id:'room-a',user_id:'me'},readDeleted:false});
assert.deepEqual(planChatUpdate(event('chat_messages',{id:3,group_id:'room-b'},'INSERT'),options),{summaries:true});
assert.deepEqual(planChatUpdate(event('chat_messages',{id:3,group_id:'room-a'},'INSERT'),options),{summaries:true,messageIds:['3']});
assert.deepEqual(planChatUpdate(event('chat_messages',{id:1},'DELETE'),options),{summaries:true,messageIds:['1']});
assert.deepEqual(planChatUpdate(event('chat_messages',{id:99,group_id:'room-a'}),options),{summaries:true},'An edit outside loaded history must not create a gap in the stream');
assert.deepEqual(planChatUpdate(event('chat_message_reactions',{message_id:99}),options),{});
assert.deepEqual(planChatUpdate(event('chat_message_reactions',{message_id:2}),options),{reactionIds:['2']});
assert.deepEqual(planChatUpdate({data:{schema:'private',table:'chat_messages'}},options),{});
assert.deepEqual(planChatUpdate(null,options),{core:true,messages:true});

const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let release,started,active=0,maxActive=0;
const gate=new Promise(resolve=>release=resolve),first=new Promise(resolve=>started=resolve),batches=[];
const queue=createChatUpdateQueue(async batch=>{
  maxActive=Math.max(maxActive,++active);batches.push(batch);
  if(batches.length===1){started();await gate;}
  active--;
},{delay:5});
queue.push({messageIds:['1'],summaries:true});queue.push({messageIds:['1','2']});
await first;
queue.push({messageIds:['3']});queue.push({reactions:true});
await wait(15);assert.equal(batches.length,1,'Concurrent requests were started');
release();await wait(25);
assert.equal(maxActive,1);assert.deepEqual(batches[0].messageIds,['1','2']);assert.deepEqual(batches[1].messageIds,['3']);assert.equal(batches[1].reactions,true);
queue.stop();

let paused=true,calls=0,errors=0,retriedIds=[];
const pausedQueue=createChatUpdateQueue(async batch=>{calls++;if(calls===1)throw new Error('offline');retriedIds=batch.messageIds;},{delay:5,isPaused:()=>paused,onError:()=>errors++});
pausedQueue.push({messageIds:['lost']});await wait(15);assert.equal(calls,0);
paused=false;pausedQueue.resume();await wait(15);assert.equal(calls,1);assert.equal(errors,1);
await wait(15);assert.equal(calls,1,'A failed refresh entered an automatic request loop');
pausedQueue.push({messageIds:['new']});await wait(15);assert.equal(calls,2,'A subsequent event could not retry');
assert.deepEqual(retriedIds,['lost','new'],'A later message event silently dropped the failed change');
pausedQueue.push({messages:true});pausedQueue.stop();await wait(15);assert.equal(calls,2);
console.log('PASS chat updates: receipt routing, room scope, loaded history, coalescing, serialization, hidden tabs and retry.');
