import {ensureSession,restGet,restRpc,restInsert,restPatch,createRealtimeClient} from './common.js';

// Browser-to-browser audio. HTTPS, microphone permission and compatible NAT are required.
// Audio is never uploaded to Supabase; only SDP/ICE signaling is stored.
const $=s=>document.querySelector(s);
let session=null,roomId=null,peerId=null,currentCall=null,pc=null,localStream=null,remoteAudio=null;
let lastSignalId=0,pollBusy=false,incomingBusy=false,incomingTimer=null,signalTimer=null;
let inviteVisible=false,seenOffer=false,seenAnswer=false,queuedIce=[],refreshWire=null,lastHeartbeat=0;
const callButton=$('#voice-call-btn');
const videoButton=$('#video-call-btn');
const panel=$('#voice-call-panel');
const nameOf=id=>(window.__socialNameLookup?.(id)||'thành viên LMS');
function showPanel(title,detail,buttons=''){
  if(!panel)return;
  panel.hidden=false;
  $('#voice-title').textContent=title;
  $('#voice-description').textContent=detail;
  $('#voice-controls').innerHTML=buttons;
}
function closePanel(){if(panel)panel.hidden=true;}
function cleanup(){
  clearInterval(signalTimer);signalTimer=null;lastSignalId=0;
  try{pc?.close();}catch{}
  pc=null;
  if(localStream){localStream.getTracks().forEach(t=>t.stop());localStream=null;}
  if(remoteAudio){remoteAudio.pause();remoteAudio.srcObject=null;remoteAudio.remove();remoteAudio=null;}
  for(const el of ['#remote-video','#local-video']){const video=$(el);if(video){video.pause();video.srcObject=null;}}
  if($('#video-stage'))$('#video-stage').hidden=true;
  currentCall=null;seenOffer=false;seenAnswer=false;queuedIce=[];inviteVisible=false;
  closePanel();
}
async function sendSignal(kind,payload){
  if(!currentCall)return;
  await restInsert('chat_call_signals',{call_id:currentCall.id,sender_id:session.user.id,kind,payload});
}
function initPeer(){
  if(!window.RTCPeerConnection||!navigator.mediaDevices?.getUserMedia)
    throw new Error('Trình duyệt hiện tại không hỗ trợ gọi thoại WebRTC.');
  pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});
  for(const track of localStream.getTracks())pc.addTrack(track,localStream);
  const isVideo=currentCall?.media_kind==='video';
  const stage=$('#video-stage');
  if(stage)stage.hidden=!isVideo;
  if(isVideo){const local=$('#local-video');if(local){local.muted=true;local.playsInline=true;local.srcObject=localStream;local.play().catch(()=>{});}}
  if(!isVideo){
    remoteAudio=document.createElement('audio');
    remoteAudio.autoplay=true;remoteAudio.playsInline=true;
    remoteAudio.style.display='none';document.body.appendChild(remoteAudio);
  }
  pc.ontrack=e=>{
    const stream=e.streams?.[0]||new MediaStream([e.track]);
    const output=isVideo?$('#remote-video'):remoteAudio;
    if(!output)return;
    output.srcObject=stream;
    output.play().catch(()=>{showPanel('Đã kết nối','Nhấn vào màn hình để bật âm thanh.',hangupButton());});
  };
  pc.onicecandidate=e=>{if(e.candidate&&currentCall)
    sendSignal('ice',e.candidate.toJSON()).catch(error=>console.warn('ICE signaling:',error));};
  pc.onconnectionstatechange=()=>{
    if(pc?.connectionState==='connected')showPanel(currentCall?.media_kind==='video'?'Đang gọi video':'Đang gọi thoại','Âm thanh và hình ảnh truyền trực tiếp giữa hai thiết bị, không được lưu trên LMS.',hangupButton());
    if(pc?.connectionState==='failed')showPanel('Không kết nối được','Có thể do NAT hoặc tường lửa. Bản beta chưa có máy chủ TURN; hãy kết thúc và thử lại.',hangupButton());
  };
}
function hangupButton(){return '<button class="voice-hangup" data-call-action="end" type="button">Kết thúc cuộc gọi</button>';}
async function hangUp(status='ended'){
  const id=currentCall?.id;
  if(id)try{await restPatch('chat_calls','id=eq.'+encodeURIComponent(id),{status});}
  catch(error){console.warn('Could not update call status:',error);}
  cleanup();
}
async function startCall(kind='audio'){
  if(!roomId||!peerId||currentCall)return;
  try{
    localStream=await navigator.mediaDevices.getUserMedia({audio:true,video:kind==='video'});
    const id=await restRpc('start_media_call',{p_group:roomId,p_callee:peerId,p_kind:kind});
    currentCall={id,group_id:roomId,caller_id:session.user.id,callee_id:peerId,status:'ringing',media_kind:kind};
    initPeer();
    showPanel(kind==='video'?'Đang gọi video…':'Đang gọi thoại…','Đợi người kia chấp nhận cuộc gọi.',hangupButton());
    const offer=await pc.createOffer();
    await pc.setLocalDescription(offer);
    await sendSignal('offer',pc.localDescription.toJSON());
    beginSignalPoll();
  }catch(error){
    if(currentCall)await hangUp();else cleanup();
    alert(error.message||'Không thể bắt đầu cuộc gọi.');
  }
}
async function fetchSignals(){
  if(!currentCall||!pc||pollBusy)return;
  pollBusy=true;
  try{
    const id=currentCall.id;
    const [rows,calls]=await Promise.all([
      restGet('chat_call_signals','select=id,sender_id,kind,payload&call_id=eq.'+encodeURIComponent(id)+'&id=gt.'+lastSignalId+'&order=id.asc&limit=150'),
      restGet('chat_calls','select=id,status&limit=1&id=eq.'+encodeURIComponent(id))
    ]);
    if(!currentCall||currentCall.id!==id)return;
    const status=calls[0]?.status;
    if(!status||['ended','declined','missed'].includes(status)){cleanup();return;}
    if(status==='active')currentCall.status='active';
    for(const signal of rows){
      lastSignalId=Math.max(lastSignalId,Number(signal.id)||0);
      if(signal.sender_id===session.user.id)continue;
      if(signal.kind==='offer'&&!seenOffer&&currentCall.callee_id===session.user.id){
        seenOffer=true;
        await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
        const answer=await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await sendSignal('answer',pc.localDescription.toJSON());
        await restPatch('chat_calls','id=eq.'+encodeURIComponent(id),{status:'active'});
      }else if(signal.kind==='answer'&&!seenAnswer&&currentCall.caller_id===session.user.id){
        seenAnswer=true;
        await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
        showPanel('Đang kết nối…','Thiết lập đường truyền âm thanh.',hangupButton());
      }else if(signal.kind==='ice'){
        if(pc.remoteDescription)await pc.addIceCandidate(new RTCIceCandidate(signal.payload)).catch(console.warn);
        else queuedIce.push(signal.payload);
      }
      if(pc.remoteDescription&&queuedIce.length){
        const list=queuedIce.splice(0);
        for(const candidate of list)await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.warn);
      }
    }
    if(status==='active'&&Date.now()-lastHeartbeat>24000){
      lastHeartbeat=Date.now();
      await restPatch('chat_calls','id=eq.'+encodeURIComponent(id),{updated_at:new Date().toISOString()}).catch(()=>{});
    }
  }catch(error){console.warn('Voice signal check:',error);}
  finally{pollBusy=false;}
}
function beginSignalPoll(){
  clearInterval(signalTimer);
  fetchSignals().catch(console.warn);
  signalTimer=setInterval(()=>{fetchSignals().catch(console.warn);},1500);
}
async function acceptCall(){
  if(!currentCall||currentCall.callee_id!==session.user.id||pc)return;
  try{
    localStream=await navigator.mediaDevices.getUserMedia({audio:true,video:currentCall.media_kind==='video'});
    initPeer();
    showPanel('Đang kết nối…','Đang thiết lập cuộc gọi thoại an toàn.',hangupButton());
    beginSignalPoll();
  }catch(error){await hangUp('declined');alert(error.message||'Không thể sử dụng microphone.');}
}
async function checkIncoming(){
  if(!session||currentCall||incomingBusy||document.visibilityState==='hidden')return;
  incomingBusy=true;
  try{
    const rows=await restGet('chat_calls','select=*&callee_id=eq.'+encodeURIComponent(session.user.id)+'&status=eq.ringing&order=created_at.desc&limit=1');
    const call=rows[0];
    if(!call||currentCall)return;
    const age=Date.now()-new Date(call.created_at).getTime();
    if(age>180000)return;
    currentCall=call;inviteVisible=true;
    showPanel(call.media_kind==='video'?'Có cuộc gọi video đến':'Có cuộc gọi thoại đến','Một thành viên đang gọi cho bạn.',
      '<button class="voice-answer" type="button" data-call-action="answer">Trả lời</button>'+
      '<button class="voice-hangup" type="button" data-call-action="decline">Từ chối</button>');
  }catch(error){console.warn('Incoming calls:',error);}
  finally{incomingBusy=false;}
}
document.addEventListener('lms:room',event=>{
  roomId=event.detail?.kind==='direct'?event.detail.groupId:null;
  peerId=event.detail?.kind==='direct'?event.detail.peerId:null;
  if(callButton)callButton.hidden=!(roomId&&peerId);
  if(videoButton)videoButton.hidden=!(roomId&&peerId);
});
callButton?.addEventListener('click',()=>startCall('audio').catch(console.error));
videoButton?.addEventListener('click',()=>startCall('video').catch(console.error));
panel?.addEventListener('click',event=>{
  const action=event.target.closest('[data-call-action]')?.dataset.callAction;
  if(action==='end')hangUp().catch(console.error);
  if(action==='answer')acceptCall().catch(console.error);
  if(action==='decline')hangUp('declined').catch(console.error);
});
async function init(){
  session=await ensureSession();
  const requested=new URLSearchParams(location.search).get('group');
  if(requested&&/^[0-9a-f-]{36}$/i.test(requested)&&!roomId){
    const rows=await restGet('chat_groups','select=id,kind,direct_low,direct_high&id=eq.'+encodeURIComponent(requested)+'&limit=1');
    const g=rows[0];
    if(g?.kind==='direct'){
      roomId=g.id;peerId=g.direct_low===session.user.id?g.direct_high:g.direct_low;
      if(callButton)callButton.hidden=false;
      if(videoButton)videoButton.hidden=false;
    }
  }
  refreshWire=createRealtimeClient(session,[{table:'chat_calls',event:'*'}],()=>{
    if(currentCall&&pc)fetchSignals().catch(console.warn);
    else checkIncoming().catch(console.warn);
  });
  incomingTimer=setInterval(()=>checkIncoming().catch(console.warn),3500);
  await checkIncoming();
}
window.addEventListener('beforeunload',()=>{
  clearInterval(incomingTimer);clearInterval(signalTimer);
  refreshWire?.stop();
  if(currentCall){
    const id=currentCall.id;
    // A close may prevent best-effort status update; stale calls expire on the next start.
    restPatch('chat_calls','id=eq.'+encodeURIComponent(id),{status:'ended'}).catch(()=>{});
  }
  cleanup();
});
init().catch(error=>console.warn('Voice beta unavailable:',error));
