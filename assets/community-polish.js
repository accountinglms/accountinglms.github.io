// Reponsive Community actions and image previews; no server access needed.
const $=s=>document.querySelector(s);
const trigger=$('#chat-more-btn'),menu=$('#chat-more-menu');
let previewURL=null;
function closeMenu(){
 if(menu)menu.hidden=true;
 trigger?.setAttribute('aria-expanded','false');
}
function syncMenu(){
 const direct=!$('#voice-call-btn')?.hidden;
 menu?.querySelectorAll('[data-chat-menu="audio"],[data-chat-menu="video"],[data-chat-menu="profile"]').forEach(b=>b.hidden=!direct);
}
trigger?.addEventListener('click',()=>{
 if(!menu)return;
 syncMenu();menu.hidden=!menu.hidden;
 trigger.setAttribute('aria-expanded',String(!menu.hidden));
});
menu?.addEventListener('click',e=>{
 const action=e.target.closest('[data-chat-menu]')?.dataset.chatMenu;
 if(!action)return;
 closeMenu();
 const targets={search:'#room-search-btn',audio:'#voice-call-btn',video:'#video-call-btn',profile:'#community-room-profile',info:'#community-mobile-info'};
 const b=$(targets[action]);if(!b||b.hidden)return;
 b.click();
});
document.addEventListener('pointerdown',e=>{
 if(!menu?.hidden&&!menu.contains(e.target)&&!trigger?.contains(e.target))closeMenu();
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
document.addEventListener('lms:room',closeMenu);
function clearPreview(){
 if(previewURL){URL.revokeObjectURL(previewURL);previewURL=null;}
 $('#pending-image-preview')?.remove();
 $('#pending-file')?.classList.remove('has-image-preview');
}
function preview(file){
 clearPreview();
 if(!file?.type?.startsWith('image/')||!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type))return;
 previewURL=URL.createObjectURL(file);
 const wrap=$('#pending-file');
 if(!wrap)return;
 const img=document.createElement('img');
 img.id='pending-image-preview';img.alt='Xem trước ảnh chuẩn bị gửi';img.src=previewURL;
 wrap.prepend(img);wrap.classList.add('has-image-preview');
}
$('#file-input')?.addEventListener('change',e=>preview(e.target.files?.[0]));
document.addEventListener('lms:attach-file',e=>preview(e.detail?.file));
$('#remove-pending-file')?.addEventListener('click',clearPreview);
$('#send-btn')?.addEventListener('click',()=>{
 // Other handler owns upload. Watch for completion before releasing preview.
 setTimeout(()=>{if($('#pending-file')?.hidden)clearPreview();},600);
});
window.addEventListener('beforeunload',clearPreview);
