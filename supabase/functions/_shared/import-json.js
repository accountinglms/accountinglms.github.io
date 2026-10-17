// Repair string encoding only. Never infer JSON structure or missing answers.
const escapes=new Set(['"','\\','/','b','f','n','r','t']);

/** @param {string} text */
export function parseImportJson(text){
  try{return {value:JSON.parse(text),repaired:false};}
  catch(originalError){
    if(!(originalError instanceof SyntaxError))throw originalError;
    let out='',i=0,repaired=false;
    while(i<text.length){
      if(text[i]!=='"'){out+=text[i++];continue;}
      let token='"',changed=false,closed=false;
      i++;
      while(i<text.length){
        const char=text[i];
        if(char==='"'){token+='"';i++;closed=true;break;}
        if(char.charCodeAt(0)<32){
          token+=JSON.stringify(char).slice(1,-1);i++;changed=true;continue;
        }
        if(char!=='\\'){token+=char;i++;continue;}
        const next=text[i+1];
        if(next===undefined)throw originalError;
        if(escapes.has(next)){
          token+=text.slice(i,i+2);i+=2;continue;
        }
        if(next==='u'&&/^[0-9a-f]{4}$/i.test(text.slice(i+2,i+6))){
          token+=text.slice(i,i+6);i+=6;continue;
        }
        const braced=next==='u'?/^\\u\{([0-9a-f]{1,6})\}/i.exec(text.slice(i)):null;
        if(braced){
          const point=parseInt(braced[1],16);
          if(point<=0x10ffff&&(point<0xd800||point>0xdfff)){
            token+=JSON.stringify(String.fromCodePoint(point)).slice(1,-1);
            i+=braced[0].length;changed=true;continue;
          }
        }
        // Preserve literal backslashes. An invalid Unicode sequence is ambiguous:
        // keep its original characters and require source review of that field.
        token+=(next==='u'?'[UNREADABLE]':'')+'\\\\';
        i++;changed=true;
      }
      if(!closed)throw originalError;
      let after=i;while(/\s/.test(text[after]||'')&&after<text.length)after++;
      if(changed&&text[after]===':')throw new SyntaxError('Cannot repair JSON property names');
      repaired ||= changed;
      out+=token;
    }
    if(!repaired)throw originalError;
    return {value:JSON.parse(out),repaired:true};
  }
}
