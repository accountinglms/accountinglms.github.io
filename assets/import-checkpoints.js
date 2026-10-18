// Keep the original bytes until the server has acknowledged the import.
// Keys include the account; no credentials are stored in this database.
export function createImportCheckpoints(owner, factory=globalThis.indexedDB){
  if(!owner)throw Error('Import recovery requires an account.');
  let opening;
  function open(){
    if(!opening)opening=new Promise((resolve,reject)=>{
      if(!factory)return reject(Error('Local file storage is unavailable.'));
      const request=factory.open('lms-import-checkpoints-v1',1);
      let abandoned=false;
      const timer=setTimeout(()=>{abandoned=true;opening=null;reject(Error('Local file storage did not respond.'));},5000);
      request.onupgradeneeded=()=>{
        const store=request.result.createObjectStore('batches',{keyPath:['owner','id']});
        store.createIndex('owner','owner');
      };
      request.onsuccess=()=>{
        clearTimeout(timer);const db=request.result;
        if(abandoned){db.close();return;}
        db.onversionchange=()=>{db.close();opening=null;};resolve(db);
      };
      request.onerror=()=>{clearTimeout(timer);opening=null;reject(request.error);};
      request.onblocked=()=>{clearTimeout(timer);abandoned=true;opening=null;reject(Error('Local file storage is busy.'));};
    });
    return opening;
  }
  async function transaction(mode,operation){
    const db=await open();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction('batches',mode),store=tx.objectStore('batches');
      const timer=setTimeout(()=>{try{tx.abort();}catch{}reject(Error('Local file save did not respond.'));},10_000);
      let value;
      tx.oncomplete=()=>{clearTimeout(timer);resolve(value);};
      tx.onabort=()=>{clearTimeout(timer);reject(tx.error||Error('Local file save was interrupted.'));};
      tx.onerror=()=>{}; // onabort reports errors after the transaction rolls back.
      try{
        const request=operation(store);
        request.onsuccess=()=>{value=request.result;};
      }catch(error){tx.abort();reject(error);}
    });
  }
  let queue=Promise.resolve();
  return {
    put(record){
      const snapshot=structuredClone({...record,owner,updatedAt:Date.now()});
      const write=queue.catch(()=>{}).then(async()=>{
        // WebKit can reject native Blob/File records in IndexedDB. Store their
        // bytes instead; reconstruct File objects only when resuming an upload.
        await Promise.all((snapshot.files||[]).map(async file=>{
          if(file.blob instanceof Blob){file.bytes=await file.blob.arrayBuffer();delete file.blob;}
        }));
        return transaction('readwrite',store=>store.put(snapshot));
      });
      queue=write;return write.then(()=>snapshot);
    },
    get:id=>transaction('readonly',store=>store.get([owner,id])),
    list:()=>transaction('readonly',store=>store.index('owner').getAll(owner)),
    remove(id){
      const write=queue.catch(()=>{}).then(()=>transaction('readwrite',store=>store.delete([owner,id])));
      queue=write;return write;
    }
  };
}

export function checkpointFiles(record,manifest){
  return manifest.map(entry=>{
    const saved=record?.files?.find(file=>file.key===entry.key);
    const bytes=saved?.bytes instanceof ArrayBuffer?saved.bytes:saved?.blob;
    return bytes instanceof ArrayBuffer||bytes instanceof Blob
      ?new File([bytes],entry.name,{type:entry.mimeType,lastModified:entry.lastModified||0})
      :{name:entry.name,type:entry.mimeType,size:entry.size||0,lastModified:entry.lastModified||0};
  });
}
