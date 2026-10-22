import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';

const name=process.env.BROWSER||'chromium',base=process.env.TEST_BASE_URL||'https://127.0.0.1:4173';
// Small real PDFs, including an image-only scanned page, exercise PDF.js and OCR together.
function pdfBytes(jpeg){
  const streams=['BT /F1 18 Tf 45 720 Td (Question 7) Tj 0 -35 Td (Revenue after 2 months = ?) Tj 0 -35 Td (A. GBP 12000) Tj 0 -35 Td (B. GBP 4000) Tj ET',
    '', 'q 550 0 0 360 20 250 cm /Im1 Do Q',
    'BT /F1 18 Tf 45 720 Td (Question 9) Tj 0 -35 Td (This text remains available after a blank page.) Tj ET'];
  const objects=[Buffer.from('<< /Type /Catalog /Pages 2 0 R >>'),Buffer.from('<< /Type /Pages /Count 4 /Kids [4 0 R 6 0 R 8 0 R 10 0 R] >>'),Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')];
  for(let index=0;index<streams.length;index++){
    objects.push(Buffer.from(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 3 0 R >> /XObject << /Im1 12 0 R >> >> /Contents ${5+index*2} 0 R >>`));
    objects.push(Buffer.from(`<< /Length ${Buffer.byteLength(streams[index])} >>\nstream\n${streams[index]}\nendstream`));
  }
  objects.push(Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width 1500 /Height 900 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`),jpeg,Buffer.from('\nendstream')]));
  const chunks=[Buffer.from('%PDF-1.7\n')],offsets=[0];let offset=chunks[0].length;
  objects.forEach((object,index)=>{const chunk=Buffer.concat([Buffer.from(`${index+1} 0 obj\n`),object,Buffer.from('\nendobj\n')]);offsets.push(offset);chunks.push(chunk);offset+=chunk.length;});
  chunks.push(Buffer.from(`xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.slice(1).map(value=>String(value).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF`));
  return Buffer.concat(chunks);
}

const browser=await (name==='webkit'?webkit:chromium).launch({headless:true});
try{
  const context=await browser.newContext({serviceWorkers:'block',ignoreHTTPSErrors:true});
  const page=await context.newPage(),external=[],errors=[];
  page.on('request',request=>{if(!request.url().startsWith(base)&&!request.url().startsWith('data:')&&!request.url().startsWith('blob:'))external.push(request.url());});
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'/assets/vendor/ocr/NOTICE.txt');
  const jpeg=Buffer.from(await page.evaluate(()=>{
    const canvas=document.createElement('canvas');canvas.width=1500;canvas.height=900;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,1500,900);ctx.fillStyle='#000';ctx.font='48px sans-serif';
    ['Question 8','Which balance is an asset?','A. Cash','B. Revenue'].forEach((text,index)=>ctx.fillText(text,80,140+index*130));
    return canvas.toDataURL('image/jpeg',.95).split(',')[1];
  }),'base64');
  const pdf=pdfBytes(jpeg);
  const result=await page.evaluate(async bytes=>{
    const {readImportPages}=await import('/assets/import-ocr.js');
    const file={name:'source.pdf',mimeType:'application/pdf',storagePath:'owner/source.pdf'};
    const saved=[];
    const result=await readImportPages([file],{getFile:async()=>new Blob([new Uint8Array(bytes)],{type:'application/pdf'}),onPage:async page=>saved.push(page)});
    const textFile={name:'source.txt',mimeType:'text/plain',storagePath:'owner/source.txt'};
    const direct=await readImportPages([textFile],{getFile:async()=>new Blob(['Question 1\nPreserve 12 months = GBP 4000.'])});
    let reads=0;
    const cached=await readImportPages([textFile],{cachedPages:direct.pages,getFile:async()=>{reads++;throw Error('Completed text was fetched again');}});
    return {...result,saved,direct,cached,reads};
  },[...pdf]);
  assert.deepEqual(result.pages.map(page=>page.source_page),[1,3,4],'A blank PDF page discarded later pages');
  assert.ok(result.pages[0].text.includes('Revenue after 2 months = ?'));
  assert.match(result.pages[1].text,/Which balance is an asset/);
  assert.ok(result.pages[2].text.includes('remains available after a blank page'));
  assert.equal(result.failures.length,1);assert.match(result.failures[0].name,/trang 2/);
  assert.equal(result.saved.length,3);assert.equal(result.reads,0);assert.deepEqual(result.cached.pages,result.direct.pages);
  assert.deepEqual(external,[],'Direct extraction sent a request outside the LMS');assert.deepEqual(errors,[]);
  console.log(`PASS ${name}: PDF text extraction, real scanned-page OCR, blank-page continuation, durable page checkpoints and reuse; no external requests.`);
  await context.close();
}finally{await browser.close();}
