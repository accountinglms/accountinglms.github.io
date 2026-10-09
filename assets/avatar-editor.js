import {ensureSession,restGet} from './common.js';
import {uploadAvatar,clearAvatar,paintAvatar,initialsFor} from './avatar.js';

const $=s=>document.querySelector(s);
let session=null,profile=null,image=null,originalURL=null,zoom=1,offsetX=0,offsetY=0,dragStart=null,busy=false;
const CROP_SIZE=400;
function setStatus(msg,kind='info'){
 const el=$('#avatar-edit-status');if(el){el.textContent=msg;el.dataset.kind=kind;}
}
function preview(){
 const canvas=$('#avatar-crop-canvas');
 if(!canvas||!image)return;
 const ctx=canvas.getContext('2d');
 if(!ctx)return;
 const w=image.naturalWidth,h=image.naturalHeight,size=Math.min(w,h)/zoom;
 let x=Math.max(0,Math.min(w-size,(w-size)/2-offsetX*size/CROP_SIZE));
 let y=Math.max(0,Math.min(h-size,(h-size)/2-offsetY*size/CROP_SIZE));
 ctx.clearRect(0,0,CROP_SIZE,CROP_SIZE);
 ctx.drawImage(image,x,y,size,size,0,0,CROP_SIZE,CROP_SIZE);
}
function unload(){
 if(originalURL){URL.revokeObjectURL(originalURL);originalURL=null;}
 image=null;dragStart=null;
}
function close(){
 if(busy)return;
 $('#avatar-edit-dialog').hidden=true;
 $('#avatar-source-input').value='';
 unload();setStatus('');
}
async function choose(file){
 if(!file)return;
 if(!file.type.startsWith('image/')||file.size>25*1024*1024)
   throw new Error('Chỉ chọn ảnh nhỏ hơn 25 MB từ thư viện thiết bị.');
 unload();const url=URL.createObjectURL(file);
 originalURL=url;
 const img=new Image();
 img.decoding='async';
 img.src=url;
 try{await img.decode();}
 catch{unload();throw new Error('Thiết bị không đọc được ảnh này. Hãy thử JPG, PNG hoặc WebP.');}
 if(img.naturalWidth<120||img.naturalHeight<120){unload();throw new Error('Ảnh cần có ít nhất 120 × 120 px.');}
 image=img;zoom=1;offsetX=0;offsetY=0;
 $('#avatar-zoom').value='1';
 $('#avatar-edit-dialog').hidden=false;
 setStatus('Kéo ảnh để căn chỉnh · kéo thanh Zoom để phóng to.');
 preview();
}
async function compress(){
 const canvas=$('#avatar-crop-canvas');
 if(!image||!canvas)throw new Error('Chưa chọn ảnh.');
 return new Promise((resolve,reject)=>{
  canvas.toBlob(blob=>{
   if(!blob)return reject(new Error('Không xử lý được ảnh.'));
   resolve(blob);
  },'image/webp',0.84);
 }).then(async blob=>{
  if(blob.type==='image/webp'||blob.type==='image/jpeg')return blob;
  return await new Promise((resolve,reject)=>canvas.toBlob(x=>x?resolve(x):reject(Error('Không nén được ảnh.')),'image/jpeg',0.83));
 });
}
async function ensureMyProfile(){
 session=await ensureSession();
 const rows=await restGet('profiles','select=id,display_name,avatar_path,avatar_color&id=eq.'+encodeURIComponent(session.user.id)+'&limit=1');
 profile=rows[0]||null;
 return profile;
}
function updateUI(){
 const container=$('#avatar-editor-trigger');
 const deleteButton=$('#avatar-remove-trigger');
 if(deleteButton)deleteButton.hidden=!profile?.avatar_path;
 // Avatar is decorative until the authenticated photo can be loaded.
 const node=$('#profile-avatar');
 if(node)paintAvatar(node,profile,profile?.display_name||'U').catch(()=>{});
 if(container)container.setAttribute('aria-label',profile?.avatar_path?'Thay ảnh đại diện':'Chọn ảnh đại diện');
}
function emit(){
 if(profile?.id)document.dispatchEvent(new CustomEvent('lms:profile-image',{detail:{profile}}));
}
async function save(){
 if(busy||!image)return;
 busy=true;
 const btn=$('#avatar-save-crop');btn.disabled=true;
 $('#avatar-cancel-crop').disabled=true;
 setStatus('Đang tối ưu và lưu ảnh…');
 try{
  const blob=await compress();
  const newPath=await uploadAvatar(blob,profile?.avatar_path);
  profile={...profile,avatar_path:newPath};
  $('#avatar-edit-dialog').hidden=true;
  unload();$('#avatar-source-input').value='';
  updateUI();emit();
  setStatus('');
 }catch(err){setStatus(err.message||'Không lưu được ảnh.','error');}
 finally{busy=false;btn.disabled=false;$('#avatar-cancel-crop').disabled=false;}
}
async function remove(){
 if(busy||!profile?.avatar_path)return;
 if(!confirm('Xóa ảnh đại diện của bạn?'))return;
 busy=true;const btn=$('#avatar-remove-trigger');btn.disabled=true;
 try{
  await clearAvatar(profile.avatar_path);
  profile={...profile,avatar_path:null};
  updateUI();emit();setStatus('');
 }catch(e){alert(e.message||'Không xóa được ảnh đại diện.');}
 finally{busy=false;btn.disabled=false;}
}
function initializeCropDrag(){
 const crop=$('#avatar-crop-canvas');
 crop.addEventListener('pointerdown',e=>{
  if(!image||busy)return;
  dragStart={x:e.clientX,y:e.clientY,ox:offsetX,oy:offsetY};
  crop.setPointerCapture?.(e.pointerId);
 });
 crop.addEventListener('pointermove',e=>{
  if(!dragStart||!image)return;
  const rect=crop.getBoundingClientRect();
  const factor=CROP_SIZE/Math.max(1,rect.width);
  offsetX=dragStart.ox+(e.clientX-dragStart.x)*factor;
  offsetY=dragStart.oy+(e.clientY-dragStart.y)*factor;
  preview();
 });
 for(const event of ['pointerup','pointercancel','lostpointercapture'])crop.addEventListener(event,()=>dragStart=null);
}
async function init(){
 if(!$('#avatar-source-input')||!$('#avatar-edit-dialog'))return;
 try{await ensureMyProfile();}catch(e){console.warn('Avatar editor session unavailable',e);return;}
 updateUI();
 $('#avatar-editor-trigger')?.addEventListener('click',()=>$('#avatar-source-input').click());
 $('#avatar-source-input').addEventListener('change',e=>choose(e.target.files?.[0]).catch(err=>{
  $('#avatar-source-input').value='';alert(err.message||'Không đọc được ảnh.');
 }));
 $('#avatar-cancel-crop').addEventListener('click',close);
 $('#avatar-crop-close').addEventListener('click',close);
 $('#avatar-save-crop').addEventListener('click',()=>save().catch(console.warn));
 $('#avatar-remove-trigger')?.addEventListener('click',()=>remove().catch(console.warn));
 $('#avatar-zoom').addEventListener('input',e=>{zoom=Number(e.target.value)||1;preview();});
 initializeCropDrag();
 document.addEventListener('lms:avatar-updated',e=>{
  if(e.detail.userId!==session.user.id)return;
  profile={...profile,avatar_path:e.detail.path};updateUI();
 });
 document.addEventListener('lms:open-member-profile',e=>{
  const own=e.detail?.userId===session.user.id;
  const controls=$('#avatar-own-controls');if(controls)controls.hidden=!own;
  if(own)updateUI();
 });
}
init().catch(console.error);
