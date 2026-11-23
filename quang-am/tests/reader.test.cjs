/* Independent regression tests for Quang Am, no NPM packages required. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

function session(preloaded={}) {
 const data=new Map(Object.entries(preloaded));
 const nodes=new Map(),listeners=new Map();
 const element=(id)=>{
  if(!nodes.has(id)){
   const events={};
   const el={
    id, value:"", textContent:"", hidden:false, href:"", className:"",
    download:"", files:[], children:[], attributes:{}, dataset:{visible:"false"},
    firstChild:{textContent:""},
    classList:{toggle(){},add(){},remove(){}},
    addEventListener(type,handler){events[type]=handler},
    trigger(type,event={}){return events[type]?.(event)},
    querySelector(){return element("indicator-child")},
    setAttribute(name,value){this.attributes[name]=value},
    getBoundingClientRect(){return{top:0,bottom:500}},
    append(...children){this.children.push(...children)},
    replaceChildren(...children){this.children=children.flatMap(c=>c.children??[c])},
    remove(){},
    click(){events.click?.({preventDefault(){}})},
   };
   nodes.set(id,el);
  }
  return nodes.get(id);
 };
 const document={
  activeElement:null, title:"", visibilityState:"visible",
  getElementById:element,createElement:()=>({
   textContent:"",className:"",href:"",target:"",rel:"",attributes:{},children:[],
   classList:{toggle(){}}, append(...items){this.children.push(...items)},
   setAttribute(name,value){this.attributes[name]=value},
   click(){},remove(){},
  }),
  createDocumentFragment:()=>({children:[],append(item){this.children.push(item)}}),
  addEventListener(type,cb){listeners.set("doc:"+type,cb)},
  body:{append(){}}
 };
 const browser={
  innerHeight:844,scrollY:250,
  addEventListener(type,cb){listeners.set("win:"+type,cb)},
  prompt(){},
 };
 const storage={
  getItem(k){return data.has(k)?data.get(k):null},
  setItem(k,v){data.set(k,String(v))},
  removeItem(k){data.delete(k)}
 };
 const location={search:"",pathname:"/quang-am/",origin:"https://accountinglms.github.io",hash:"",protocol:"https:"};
 const context={
  document,window:browser,localStorage:storage,navigator:{onLine:true},
  location,history:{replaceState(){}},
  fetch(){return Promise.reject(new Error("Network intentionally disabled for unit tests"))},
  setTimeout(){return 1},clearTimeout(){},
  requestAnimationFrame(cb){cb();return 1},
  console, Blob, URL, URLSearchParams, Intl, Date, File:undefined
 };
 vm.runInNewContext(app,context,{filename:"app.js"});
 return {data,element,listeners,context};
}
const K={chapter:"qa-reader.v1.chapter",max:"qa-reader.v1.max",source:"qa-reader.v1.source",recent:"qa-reader.v2.recent"};
const starting=()=>({[K.chapter]:"617",[K.max]:"620",[K.source]:"truyenhay"});
function form(s,value){
 s.element("chapter-input").value=String(value);
 s.element("update-form").trigger("submit",{preventDefault(){}});
}
test("all UI references correspond to HTML elements",()=>{
 const ids=[...new Set([...app.matchAll(/(?<![\\w$])e\\('([^']+)'\\)/g)].map(m=>m[1]))];
 const missing=ids.filter(id=>!html.includes('id="'+id+'"'));
 assert.deepEqual(missing,[]);
});
test("old chapter review does not overwrite saved bookmark",()=>{
 const s=session(starting());
 assert.equal(s.element("chapter-number").textContent,"617");
 s.element("previous").onclick();
 assert.equal(s.data.get(K.chapter),"617");
 const hist=JSON.parse(s.data.get(K.recent));
 assert.equal(hist[0].chapter,616);
});
test("next chapter advances bookmark and updates safe mobile link",()=>{
 const s=session(starting());
 s.element("dock-next").onclick();
 assert.equal(s.data.get(K.chapter),"618");
 assert.equal(s.element("dock-link").href.endsWith("/chuong-618"),true);
});
test("manual downgrade preserves furthest and can recover",()=>{
 const s=session(starting());
 form(s,600);
 assert.equal(s.data.get(K.chapter),"600");
 assert.equal(s.data.get(K.max),"620");
 s.element("restore-highest").trigger("click");
 assert.equal(s.data.get(K.chapter),"620");
});
test("offline warning is visible without disabling local bookmarks",()=>{
 const s=session(starting());
 s.context.navigator.onLine=false;
 s.listeners.get("win:offline")();
 assert.equal(s.element("offline-status").hidden,false);
 s.element("dock-next").onclick();
 assert.equal(s.data.get(K.chapter),"618");
});
test("alternate source preserves preferred source and bookmark",()=>{
 const s=session(starting());
 assert.equal(s.element("alternate-source").href.includes("vietnamthuquan.eu"),true);
 s.element("alternate-source").onclick();
 assert.equal(s.data.get(K.source),"truyenhay");
 assert.equal(s.data.get(K.chapter),"617");
});
test("full backup is not imported until explicit confirmation",async()=>{
 const s=session(starting());
 const backup={
  version:1,book:"quang-am-chi-ngoai",exportedAt:new Date().toISOString(),
  chapter:665,highest:690,previous:664,source:"thuvien",
  recent:[{chapter:665,source:"thuvien",at:Date.now()}]
 };
 const content=JSON.stringify(backup);
 s.element("backup-file").files=[{size:content.length,text:async()=>content}];
 await s.element("backup-file").trigger("change");
 assert.equal(s.data.get(K.chapter),"617");
 assert.equal(s.element("backup-preview").hidden,false);
 s.element("backup-confirm").trigger("click");
 assert.equal(s.data.get(K.chapter),"665");
 assert.equal(s.data.get(K.max),"690");
 assert.equal(s.data.get(K.source),"thuvien");
 assert.equal(s.element("backup-preview").hidden,true);
});
test("invalid backup is rejected safely without replacing bookmark",async()=>{
 const s=session(starting());
 const bad=JSON.stringify({version:1,book:"not-quang-am",chapter:1});
 s.element("backup-file").files=[{size:bad.length,text:async()=>bad}];
 await s.element("backup-file").trigger("change");
 assert.equal(s.element("backup-preview").hidden,true);
 assert.equal(s.data.get(K.chapter),"617");
});
test("history stays limited to 12 entries",()=>{
 const s=session(starting());
 for(let n=618;n<650;n++)form(s,n);
 const history=JSON.parse(s.data.get(K.recent));
 assert.ok(history.length<=12);
 assert.equal(history[0].chapter,649);
});
