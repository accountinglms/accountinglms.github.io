const MAX_IMAGE=8*1024*1024;
const imageMime=/^image\/(png|jpeg|webp|gif)$/i;

// Observe rows: preview images are hidden until a safe file arrives.
export function createChatImagePreviews(root,fetchBlob){
  const cache=new Map(),waiting=[],observed=new Map();
  let active=0,epoch=0,bytes=0;
  const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{
    for(const entry of entries)if(entry.isIntersecting){
      const image=observed.get(entry.target);
      observed.delete(entry.target);observer.unobserve(entry.target);
      if(image?.isConnected)show(image);
    }
  },{root,rootMargin:'320px 0px'}):null;
  function trim(){
    for(const [path,item] of cache){
      if(bytes<=32*1024*1024&&cache.size<=24)break;
      if(!item.url)continue;
      cache.delete(path);bytes-=item.bytes;URL.revokeObjectURL(item.url);
    }
  }
  function pump(){
    while(active<2&&waiting.length){
      const item=waiting.shift();
      if(item.epoch!==epoch){item.resolve(null);continue;}
      active++;
      (async()=>{
        try{
          const blob=await fetchBlob(item.path,{signal:item.controller.signal});
          if(item.epoch!==epoch||!imageMime.test(blob.type)||blob.size>MAX_IMAGE){item.resolve(null);return;}
          item.url=URL.createObjectURL(blob);item.bytes=blob.size;bytes+=blob.size;
          item.resolve(item.url);trim();
        }catch(error){
          if(error.name!=='AbortError')console.warn('Không thể xem ảnh đính kèm',error);
          item.resolve(null);
        }finally{active--;pump();}
      })();
    }
  }
  async function show(image){
    const path=image.dataset.previewPath,version=epoch;
    if(!path||image.src||Number(image.dataset.previewSize)>MAX_IMAGE)return;
    let item=cache.get(path);
    if(!item){
      item={path,epoch,controller:new AbortController(),bytes:0};
      item.promise=new Promise(resolve=>item.resolve=resolve);
      cache.set(path,item);waiting.push(item);pump();
    }else{cache.delete(path);cache.set(path,item);}
    const url=await item.promise;
    if(url&&version===epoch&&image.isConnected&&image.dataset.previewPath===path){
      const bottom=root.scrollHeight-root.scrollTop-root.clientHeight<160;
      const top=root.scrollTop;
      image.onload=()=>{if(bottom&&version===epoch&&Math.abs(root.scrollTop-top)<2)root.scrollTop=root.scrollHeight;};
      image.src=url;image.hidden=false;
    }
  }
  return {
    attach(){
      for(const [row] of observed)if(!row.isConnected){observer?.unobserve(row);observed.delete(row);}
      for(const image of root.querySelectorAll('img[data-preview-path]')){
        if(image.src||Number(image.dataset.previewSize)>MAX_IMAGE)continue;
        const row=image.closest('[data-message-id]');
        if(observer&&row){observed.set(row,image);observer.observe(row);}else show(image);
      }
    },
    reset(){
      epoch++;observer?.disconnect();observed.clear();
      for(const item of cache.values()){item.controller.abort();if(item.url)URL.revokeObjectURL(item.url);}
      for(const item of waiting.splice(0))item.resolve(null);
      cache.clear();bytes=0;
    }
  };
}
