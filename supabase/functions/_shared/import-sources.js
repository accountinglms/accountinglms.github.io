import { hasUnsafeMarkup } from './text-safety.js';

export const MAX_IMPORT_FILES = 20;
export const MAX_IMPORT_FILE_BYTES = 4 * 1024 * 1024;
export const MAX_IMPORT_TOTAL_BYTES = 12 * 1024 * 1024;
const allowedMime = new Set(['image/png','image/jpeg','image/webp','application/pdf','text/plain']);

export class ImportSourceError extends Error {
  /** @param {string} message @param {number} status */
  constructor(message, status) { super(message); this.status = status; }
}

/** @param {unknown} value @param {string} field @param {number} max */
function sourceText(value, field, max) {
  if (typeof value !== 'string' || !value.trim() || value.length > max || hasUnsafeMarkup(value)) {
    throw new ImportSourceError('INVALID_SOURCE_' + field, 400);
  }
  return value.trim();
}

/** @param {Uint8Array} bytes */
function detectedMime(bytes) {
  if (bytes.length >= 8 && [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a].every((v,i)=>bytes[i]===v)) return 'image/png';
  if (bytes.length >= 3 && bytes[0]===0xff && bytes[1]===0xd8 && bytes[2]===0xff) return 'image/jpeg';
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0,4))==='RIFF' && String.fromCharCode(...bytes.slice(8,12))==='WEBP') return 'image/webp';
  if (bytes.length >= 5 && String.fromCharCode(...bytes.slice(0,5))==='%PDF-') return 'application/pdf';
  try { if (!new TextDecoder('utf-8',{fatal:true}).decode(bytes).includes('\u0000')) return 'text/plain'; } catch { /* binary */ }
  return null;
}

/** @param {Uint8Array} bytes */
function toBase64(bytes) {
  let binary='';
  for(let i=0;i<bytes.length;i+=32768) binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
  return btoa(binary);
}

/** @param {Response} response @param {number} remainingBytes */
async function readSourceBytes(response, remainingBytes) {
  const reader=response.body?.getReader();
  if (!reader) return new Uint8Array();
  /** @type {Uint8Array[]} */
  const chunks=[];
  let size=0;
  try {
    while(true){
      const {value,done}=await reader.read();
      if(done)break;
      size+=value.byteLength;
      if(size>MAX_IMPORT_FILE_BYTES||size>remainingBytes){
        await reader.cancel();
        throw new ImportSourceError('Tối đa 4 MB mỗi tệp và 12 MB cho cả lượt nhập.',413);
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes=new Uint8Array(size);
  let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
  return bytes;
}

/**
 * Validate the entire manifest before reading any file. Every download uses the caller's JWT.
 * @param {any} input
 * @param {string} userId
 * @param {{url:string, anonKey:string, token:string, fetch:typeof fetch}} config
 */
export async function loadImportSources(input, userId, config) {
  const rawFiles = input?.files === undefined ? [input] : input.files;
  if (!Array.isArray(rawFiles) || !rawFiles.length || rawFiles.length > MAX_IMPORT_FILES) {
    throw new ImportSourceError('Hãy chọn từ 1 đến 20 tệp mỗi lần.', 400);
  }
  const files = rawFiles.map((raw, i) => {
    const storagePath=sourceText(raw?.storagePath,'storagePath',500);
    const fileName=sourceText(raw?.fileName,'fileName',300);
    const mimeType=sourceText(raw?.mimeType,'mimeType',100);
    if (!allowedMime.has(mimeType)) throw new ImportSourceError('Định dạng tệp không được hỗ trợ: '+fileName,415);
    if (!storagePath.startsWith(userId+'/') || storagePath.split('/').some(s=>!s||s==='.'||s==='..') || storagePath.includes('\\')) {
      throw new ImportSourceError('SOURCE_OWNERSHIP_MISMATCH',403);
    }
    return {storagePath,fileName,mimeType,source_file:i+1};
  });
  if (new Set(files.map(f=>f.storagePath)).size!==files.length) throw new ImportSourceError('DUPLICATE_SOURCE',400);
  /** @type {any[]} */
  const parts=[];
  let totalBytes=0;
  for (const file of files) {
    const objectPath=file.storagePath.split('/').map(encodeURIComponent).join('/');
    const response=await config.fetch(config.url+'/storage/v1/object/authenticated/content-imports/'+objectPath,{
      headers:{apikey:config.anonKey,Authorization:'Bearer '+config.token}
    });
    if (!response.ok) throw new ImportSourceError('Không đọc được tệp nguồn: '+file.fileName,400);
    const declaredBytes=Number(response.headers.get('content-length'));
    if (declaredBytes>MAX_IMPORT_FILE_BYTES || declaredBytes+totalBytes>MAX_IMPORT_TOTAL_BYTES) {
      await response.body?.cancel();
      throw new ImportSourceError('Tối đa 4 MB mỗi tệp và 12 MB cho cả lượt nhập.',413);
    }
    const bytes=await readSourceBytes(response,MAX_IMPORT_TOTAL_BYTES-totalBytes);
    totalBytes+=bytes.byteLength;
    if (!bytes.byteLength) throw new ImportSourceError('Tệp nguồn trống: '+file.fileName,400);
    if (bytes.byteLength>MAX_IMPORT_FILE_BYTES || totalBytes>MAX_IMPORT_TOTAL_BYTES) throw new ImportSourceError('Tối đa 4 MB mỗi tệp và 12 MB cho cả lượt nhập.',413);
    if (detectedMime(bytes)!==file.mimeType) throw new ImportSourceError('FILE_SIGNATURE_MISMATCH: '+file.fileName,415);
    parts.push({text:'SOURCE_FILE '+file.source_file+' / '+files.length+': '+JSON.stringify(file.fileName)});
    parts.push(file.mimeType==='text/plain' ? {text:new TextDecoder().decode(bytes)} : {inlineData:{mimeType:file.mimeType,data:toBase64(bytes)}});
  }
  return {files,parts};
}
