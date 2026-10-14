import fs from 'node:fs';
import path from 'node:path';
// Publish application files only; server code, tests and repository metadata stay out.
const root=process.cwd(),out=path.join(root,'dist');
const entryFiles=['index.html','home.html','community.html','progress.html','account.html','admin.html','lessons.html','diagnostics.html','history.html','404.html','sw.js','manifest.webmanifest','.nojekyll','favicon.ico','favicon-16.png','favicon-32.png','apple-touch-icon.png','icon-192.png','icon-512.png'];
const copy=(source,target)=>{
  const stat=fs.lstatSync(source);
  if(stat.isSymbolicLink())throw new Error('Do not publish symlinks: '+source);
  if(stat.isDirectory()){
    fs.mkdirSync(target,{recursive:true});
    for(const name of fs.readdirSync(source)){
      if(name.startsWith('.'))throw new Error('Unexpected hidden application asset: '+name);
      copy(path.join(source,name),path.join(target,name));
    }
  }else if(stat.isFile())fs.copyFileSync(source,target);
  else throw new Error('Unsupported application asset: '+source);
};
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out);
for(const file of entryFiles)copy(path.join(root,file),path.join(out,file));
copy(path.join(root,'assets'),path.join(out,'assets'));
const sw=fs.readFileSync(path.join(out,'sw.js'),'utf8');
const app=JSON.parse(sw.match(/const APP=(\[[^\n]+\])/)[1].replaceAll("'",'"'));
for(const resource of app){
  if(!resource.startsWith('./')||resource.includes('..'))throw new Error('Unsafe offline resource: '+resource);
  if(!fs.existsSync(path.join(out,resource)))throw new Error('Offline resource missing from Pages artifact: '+resource);
}
console.log('Pages application artifact built; all '+app.length+' offline resources are included.');
