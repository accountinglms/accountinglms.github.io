// All recognizer assets are local and loaded only when direct extraction is used.
// Files stay on the user's device; the existing authenticated draft stores the result.
const vendor=new URL('./vendor/ocr/',import.meta.url);
const MAX_PAGES=100,MAX_PIXELS=4_000_000,MAX_TEXT=500_000;

function pdfText(items){
  let text='',lastY=null,lastRight=null;
  for(const item of items){
    if(typeof item.str!=='string')continue;
    const x=item.transform?.[4],y=item.transform?.[5];
    if(lastY!=null&&Math.abs(y-lastY)>2)text+='\n';
    else if(text&&!text.endsWith('\n')&&lastRight!=null&&x>lastRight+2)text+=x>lastRight+20?'   ':' ';
    text+=item.str;
    if(item.hasEOL)text+='\n';
    lastY=y;lastRight=Number(x)+Number(item.width||0);
  }
  return text.trim();
}

export async function readImportPages(files,{getFile,cachedPages=[],onProgress=()=>{},onPage=async()=>{}}={}){
  const pages=[],failures=[];
  let worker=null,pdfjs=null,totalPages=0,totalText=0,activeFile=0,activePage=0;
  const cached=(file,page)=>cachedPages.find(saved=>saved.source_key===file.storagePath&&saved.source_page===page&&typeof saved.text==='string'&&saved.text.trim());
  const report=detail=>onProgress(`Đọc trực tiếp · tệp ${activeFile}/${files.length} · trang ${activePage}${detail?' · '+detail:''}`);
  async function recognize(image){
    if(!worker){
      report('đang nạp bộ đọc chữ');
      const {default:{createWorker}}=await import('./vendor/ocr/tesseract.esm.min.js');
      worker=await createWorker(['eng','vie'],1,{workerPath:new URL('worker.min.js',vendor).href,corePath:vendor.href,
        langPath:vendor.href,workerBlobURL:false,logger:message=>{if(message.status==='recognizing text')report(Math.round((message.progress||0)*100)+'%');}});
      await worker.setParameters({preserve_interword_spaces:'1'});
    }
    const result=await worker.recognize(image);
    return {text:result.data.text,confidence:result.data.confidence};
  }
  async function save(file,page,result,pageCount){
    if(++totalPages>MAX_PAGES)throw Error('Đã đạt giới hạn 100 trang đọc trực tiếp cho một lượt.');
    const text=String(result.text||'');totalText+=text.length;
    if(!text.trim())throw Error('Trang chưa đọc được chữ. Bản gốc vẫn có thể mở hoặc xuất bản.');
    if(totalText>MAX_TEXT)throw Error('Nội dung quá dài cho một lượt đọc trực tiếp.');
    const entry={source_key:file.storagePath,source_file:activeFile,source_page:page,page_count:pageCount,text,confidence:Number(result.confidence)||0};
    pages.push(entry);await onPage(entry);
  }
  try{
    for(let index=0;index<files.length;index++){
      const file=files[index];activeFile=index+1;activePage=1;
      let document=null;
      try{
        const saved=cached(file,1),completed=saved&&cachedPages.filter(page=>page.source_key===file.storagePath&&page.text?.trim()).length===saved.page_count;
        if(completed){for(let page=1;page<=saved.page_count;page++){const entry=cached(file,page);if(!entry)throw Error('Thiếu trang đã lưu.');await save(file,page,entry,saved.page_count);}continue;}
        report('đang mở tệp');
        const blob=await getFile(file,index);
        if(file.mimeType==='text/plain'){await save(file,1,{text:await blob.text(),confidence:100},1);continue;}
        if(file.mimeType==='application/pdf'){
          pdfjs||=await import('./vendor/ocr/pdf.min.mjs');
          pdfjs.GlobalWorkerOptions.workerSrc=new URL('pdf.worker.min.mjs',vendor).href;
          document=await pdfjs.getDocument({data:new Uint8Array(await blob.arrayBuffer()),isEvalSupported:false,disableFontFace:true,useSystemFonts:true}).promise;
          if(document.numPages+totalPages>MAX_PAGES)throw Error('Tối đa 100 trang trong một lượt đọc trực tiếp. Hãy chia PDF thành phần nhỏ hơn.');
          for(let number=1;number<=document.numPages;number++){
            activePage=number;report();
            const savedPage=cached(file,number);
            if(savedPage){await save(file,number,savedPage,document.numPages);continue;}
            let page=null;
            try{
              page=await document.getPage(number);
              const text=pdfText((await page.getTextContent()).items);
              if(text.replace(/\s/g,'').length>=20){await save(file,number,{text,confidence:100},document.numPages);continue;}
              const base=page.getViewport({scale:1}),scale=Math.min(2.5,Math.sqrt(MAX_PIXELS/(base.width*base.height)));
              const viewport=page.getViewport({scale}),canvas=window.document.createElement('canvas');
              canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
              try{await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;await save(file,number,await recognize(canvas),document.numPages);}
              finally{canvas.width=canvas.height=0;}
            }catch(error){failures.push({source_file:index+1,name:file.name+' · trang '+number,message:error.message||'Chưa đọc được trang.'});}
            finally{page?.cleanup();}
          }
        }else if(file.mimeType.startsWith('image/')){
          const bitmap=await createImageBitmap(blob),canvas=window.document.createElement('canvas');
          try{
            const scale=Math.min(2,Math.sqrt(MAX_PIXELS/(bitmap.width*bitmap.height)));
            canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
            const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0,canvas.width,canvas.height);
            await save(file,1,await recognize(canvas),1);
          }finally{bitmap.close();canvas.width=canvas.height=0;}
        }else throw Error('Định dạng chưa hỗ trợ đọc trực tiếp.');
      }catch(error){failures.push({source_file:index+1,name:file.name,message:error.message||'Chưa đọc được tệp.'});}
      finally{await document?.destroy();}
    }
    return {pages,failures};
  }finally{await worker?.terminate();}
}
