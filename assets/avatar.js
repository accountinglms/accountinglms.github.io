import {authedFetch,ensureSession,restPatch} from './common.js';

// Private user avatars: no public bucket URLs, no token in markup or localStorage.
// Only authenticated LMS members may fetch profile photos.
const BUCKET='profile-avatars';
const cache=new Map();
const MAX_CACHE=90;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const pathPattern=/^([0-9a-f-]{36})\/([0-9a-f-]{36})\.(webp|jpg)$/i;
function validPath(path){const m=pathPattern.exec(String(path||''));return Boolean(m&&uuid.test(m[1])&&uuid.test(m[2]));}
function urlFor(path,{authenticated=false}={}){return '/storage/v1/object/'+(authenticated?'authenticated/':'')+BUCKET+'/'+path.split('/').map(encodeURIComponent).join('/');}
export function escapeAvatar(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function initialsFor(name){
 return String(name||'U').trim().split(/\s+/).filter(Boolean).map(x=>x[0]).slice(0,2).join('').toUpperCase()||'U';
}
export function avatarMark(profile,{className='portal-avatar',name}={}){
 const display=String(name??profile?.display_name??'Thành viên');
 return '<span class="'+escapeAvatar(className)+'" data-avatar-user="'+escapeAvatar(profile?.id||'')+
   '" aria-label="'+escapeAvatar('Ảnh đại diện '+display)+'">'+escapeAvatar(initialsFor(display))+'</span>';
}
async function readAvatar(path){
 if(!validPath(path))throw new Error('Invalid avatar reference.');
 if(!cache.has(path)){
  const task=(async()=>{
   const res=await authedFetch(urlFor(path,{authenticated:true}));
   if(!res.ok)throw new Error('Avatar unavailable');
   const blob=await res.blob();
   if(blob.size>3145728||blob.size<12)throw new Error('Invalid avatar size');
   // Safari/WebKit can return an empty Blob.type from mocked or cached authenticated responses.
   // Validate the actual image signature rather than trusting a MIME header.
   const magic=new Uint8Array(await blob.slice(0,12).arrayBuffer());
   const jpeg=magic[0]===0xff&&magic[1]===0xd8&&magic[2]===0xff;
   const webp=String.fromCharCode(...magic.slice(0,4))==='RIFF'&&
     String.fromCharCode(...magic.slice(8,12))==='WEBP';
   if(!jpeg&&!webp)throw new Error('Unsupported avatar image signature');
   return URL.createObjectURL(new Blob([blob],{type:jpeg?'image/jpeg':'image/webp'}));
  })().catch(err=>{cache.delete(path);throw err;});
  cache.set(path,task);
  if(cache.size>MAX_CACHE){
   const [key,old]=cache.entries().next().value;
   cache.delete(key);old.then(url=>URL.revokeObjectURL(url)).catch(()=>{});
  }
 }
 return cache.get(path);
}
export async function paintAvatar(node,profile,name){
 if(!node)return;
 const path=validPath(profile?.avatar_path)?profile.avatar_path:null;
 const display=String(name??profile?.display_name??'');
 const token=path||'initials:'+display;
 node.dataset.avatarToken=token;
 // Do not depend on CSS background-image: mobile Safari and theme overrides
 // can leave an apparently empty circle even when the private fetch succeeds.
 node.style.backgroundImage='';
 if(!path){
  node.classList.remove('has-avatar-image');
  delete node.dataset.avatarError;
  delete node.dataset.avatarRenderedPath;
  node.textContent=initialsFor(display);
  return;
 }
 const existing=node.querySelector('img.lms-avatar-photo');
 if(existing&&node.dataset.avatarRenderedPath===path&&existing.complete&&existing.naturalWidth>0)return;
 node.classList.remove('has-avatar-image');
 delete node.dataset.avatarRenderedPath;
 node.textContent=initialsFor(display);
 try{
  const url=await readAvatar(path);
  if(!node.isConnected||node.dataset.avatarToken!==token)return;
  const photo=new Image();
  photo.className='lms-avatar-photo';
  photo.alt='';
  photo.decoding='async';
  photo.src=url;
  try{await photo.decode();}
  catch(error){if(!photo.complete||photo.naturalWidth===0)throw error;}
  if(!photo.naturalWidth||!photo.naturalHeight)throw new Error('Unable to decode avatar image');
  if(!node.isConnected||node.dataset.avatarToken!==token)return;
  node.replaceChildren(photo);
  node.dataset.avatarRenderedPath=path;
  delete node.dataset.avatarError;
  node.classList.add('has-avatar-image');
 }catch(error){
  if(node.dataset.avatarToken!==token)return;
  node.dataset.avatarError=String(error?.message||error).slice(0,180);
  node.classList.remove('has-avatar-image');
  delete node.dataset.avatarRenderedPath;
  node.textContent=initialsFor(display);
 }
}
export function hydrateAvatars(root,profiles=[]){
 const map=new Map(profiles.map(p=>[p.id,p]));
 const el=root||document;
 for(const node of el.querySelectorAll('[data-avatar-user]')){
  const profile=map.get(node.dataset.avatarUser)||null;
  paintAvatar(node,profile,profile?.display_name||node.dataset.avatarFallback||node.textContent||'U').catch(()=>{});
 }
}
export async function uploadAvatar(blob,previousPath){
 const session=await ensureSession();
 if(!['image/webp','image/jpeg'].includes(blob.type)||blob.size>3145728)
   throw new Error('Ảnh sau nén phải nhỏ hơn 3 MB.');
 const extension=blob.type==='image/webp'?'webp':'jpg';
 const newPath=session.user.id+'/'+crypto.randomUUID()+'.'+extension;
 const res=await authedFetch(urlFor(newPath),{
  method:'POST',headers:{'content-type':blob.type,'cache-control':'3600','x-upsert':'false'},body:blob
 });
 if(!res.ok)throw new Error('Không tải được ảnh lên máy chủ. '+(await res.text()).slice(0,170));
 try{
  const data=await restPatch('profiles','id=eq.'+encodeURIComponent(session.user.id),{
   avatar_path:newPath,avatar_updated_at:new Date().toISOString()
  });
  if(!data.length)throw new Error('Không cập nhật được hồ sơ.');
 }catch(err){await removeAvatarObject(newPath).catch(()=>{});throw err;}
 if(validPath(previousPath)&&previousPath.startsWith(session.user.id+'/')){
  await removeAvatarObject(previousPath).catch(()=>{});
 }
 document.dispatchEvent(new CustomEvent('lms:avatar-updated',{detail:{userId:session.user.id,path:newPath}}));
 return newPath;
}
async function removeAvatarObject(path){
 if(!validPath(path))return;
 const res=await authedFetch(urlFor(path),{method:'DELETE'});
 if(!res.ok)throw new Error('Unable to remove avatar photo');
 const old=cache.get(path);
 cache.delete(path);if(old)old.then(url=>URL.revokeObjectURL(url)).catch(()=>{});
}
export async function clearAvatar(path){
 const session=await ensureSession();
 const data=await restPatch('profiles','id=eq.'+encodeURIComponent(session.user.id),{
  avatar_path:null,avatar_updated_at:new Date().toISOString()
 });
 if(!data.length)throw new Error('Không cập nhật được hồ sơ.');
 if(validPath(path)&&path.startsWith(session.user.id+'/'))await removeAvatarObject(path).catch(()=>{});
 document.dispatchEvent(new CustomEvent('lms:avatar-updated',{detail:{userId:session.user.id,path:null}}));
}
