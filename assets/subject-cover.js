/**
 * Subject Cover Studio. Generated on-device, free, deterministic and offline.
 * Draws vector artwork based on the subject title/chapter, without any AI API.
 */
export const COVER_CATEGORIES=Object.freeze({
  accounting:'Kế toán',finance:'Tài chính',management:'Kế toán quản trị',
  audit:'Kiểm toán',tax:'Thuế',economics:'Kinh tế',law:'Luật kinh doanh',
  sustainability:'Phát triển bền vững',analytics:'Phân tích dữ liệu'
});

const PATTERNS=[
 ['audit',/\b(audit|auditing|assurance|internal control|kiem toan|kiem soat noi bo)\b/],
 ['tax',/\b(tax|taxation|thue|vat|corporate tax)\b/],
 ['management',/\b(management accounting|managerial accounting|cost accounting|costing|cost behaviour|cost behavior|chi phi|ke toan quan tri|du toan|budget|variance analysis)\b/],
 ['sustainability',/\b(sustainability|sustainable|environment|esg|green finance|carbon|moi truong|phat trien ben vung)\b/],
 ['law',/\b(business law|corporate law|legal|law|phap luat|luat|regulation)\b/],
 ['analytics',/\b(analytics|statistics|statistical|business intelligence|excel|data science|phan tich du lieu|thong ke)\b/],
 ['economics',/\b(economics|economic|microeconomics|macroeconomics|kinh te|cung cau|supply and demand)\b/],
 ['finance',/\b(finance|financial management|financial market|investment|investing|valuation|stock market|securities|cash flow|ngan hang|dau tu|tai chinh|co phieu|thi truong chung khoan|corporate finance)\b/],
 ['accounting',/\b(accounting|accountant|bookkeeping|ledger|financial reporting|financial accounting|ifrs|balance sheet|ke toan|bao cao tai chinh|ghi so)\b/]
];

function words(value){
  return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/đ/g,'d').replace(/Đ/g,'d')
    .toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
}
export function classifySubjectCover(subject,chapters=[]){
  const name=words(subject?.title||subject?.name||'');
  const other=words(chapters.map(ch=>typeof ch==='string'?ch:(ch?.title||'')).join(' '));
  for(const [key,re] of PATTERNS)if(re.test(name))return key;
  for(const [key,re] of PATTERNS)if(re.test(other))return key;
  return 'accounting';
}

function hash(value){
  let x=2166136261;
  for(const char of String(value)){x^=char.charCodeAt(0);x=Math.imul(x,16777619);}
  return x>>>0;
}
function rect(x,y,w,h,fill,rx=4,extra=''){
  return "<rect x='"+x+"' y='"+y+"' width='"+w+"' height='"+h+"' rx='"+rx+"' fill='"+fill+"' "+extra+"/>";
}
function path(d,stroke,sw=4,fill='none',extra=''){
  return "<path d='"+d+"' fill='"+fill+"' stroke='"+stroke+"' stroke-width='"+sw+"' stroke-linecap='round' stroke-linejoin='round' "+extra+"/>";
}

function ledger(){
  let ruled='';
  for(let i=0;i<6;i++)ruled+=path('M118 '+(143+i*30)+'H433','#7293a0',2,'none',"opacity='.43'");
  return "<g transform='translate(40 3) rotate(-6 270 206)'>"+
    rect(65,73,441,301,'#061527',18,"opacity='.4' transform='translate(13 16)'")+
    rect(65,73,441,301,'url(#paper)',16,"stroke='#dbb975' stroke-width='3'")+
    rect(66,73,30,301,'#325875',5)+
    ruled+rect(115,107,172,15,'#204465',6)+
    rect(319,107,112,15,'#c99c52',6)+
    path('M270 125V340','#63839b',2)+
    [0,1,2,3].map(i=>path('M120 '+(155+i*47)+'h'+(115+(i%3)*23),'#567c90',7)).join('')+
    "</g><g transform='translate(470 170) rotate(12 95 110)'>"+
    rect(0,0,184,222,'url(#device)',20,"stroke='#d7b679' stroke-width='3'")+
    rect(19,19,148,47,'#a9bfc3',7)+
    path('M42 42h104','#315c69',6)+
    Array.from({length:12},(_,i)=>rect(18+(i%4)*38,83+Math.floor(i/4)*37,30,28,i===11?'#cf9b53':'#4a7189',5)).join('')+
    "</g>";
}
function finance(){
  return "<g transform='translate(87 64)'>"+
    rect(0,0,518,312,'url(#device)',22,"stroke='#90a9b8' stroke-width='3'")+
    rect(24,25,470,249,'#0a2540',11)+
    [0,1,2,3,4].map(i=>path('M39 '+(64+i*41)+'h435','#9db4c2',1,'none',"opacity='.21'")).join('')+
    Array.from({length:11},(_,i)=>{
      const x=61+i*37,y=171-(hash('candle'+i)%100),up=i%3===0;
      return path('M'+x+' '+(y-20)+'v77',up?'#ecc77e':'#6db6b0',3)+
        rect(x-11,y,22,42,up?'#e3b262':'#69aca8',2);
    }).join('')+
    path('M62 219L120 190l40 8 48-65 54 20 57-51 43 19 66-66 34 18','#f0d18d',6)+
    "</g><g transform='translate(486 287)'>"+
    [0,1,2].map(i=>"<g transform='translate("+(i*44)+" "+(-i*20)+")'>"+
      rect(0,34,66,54,'url(#gold)',3)+
      "<ellipse cx='33' cy='34' rx='33' ry='13' fill='#f2d18e' stroke='#ac7c36' stroke-width='2'/>"+
    "</g>").join('')+"</g>";
}
function management(){
  return "<g transform='translate(98 60)'>"+
    rect(0,0,520,322,'url(#device)',19,"stroke='#9bafbb' stroke-width='3'")+
    rect(19,20,482,271,'#0c2947',10)+
    rect(42,42,160,14,'#dec084',7)+
    [0,1,2,3].map(i=>{
      const x=42+i*112;
      return rect(x,78,99,182,'#1b415f',8,"stroke='#4b718c' stroke-width='2'")+
        rect(x+19,251-[64,100,135,90][i],23,[64,100,135,90][i],'#7fb6c4',3)+
        rect(x+55,251-[110,78,99,146][i],23,[110,78,99,146][i],'#ddb66b',3);
    }).join('')+
    [0,1,2].map(i=>rect(42+i*150,302,128,21,i===0?'#dec080':'#6f9aae',6)).join('')+
    "</g>";
}
function audit(){
  return "<g transform='translate(90 38) rotate(-6 235 203)'>"+
    rect(52,35,421,351,'url(#paper)',18,"stroke='#ceab76' stroke-width='3'")+
    rect(173,16,172,45,'url(#device)',11,"stroke='#e2c481' stroke-width='3'")+
    rect(111,99,235,16,'#41647b',6)+
    [0,1,2,3].map(i=>rect(110,144+i*55,30,30,'#d6e3e3',5,"stroke='#60828f' stroke-width='3'")+
      path('M117 '+(156+i*55)+'l10 10 19-23','#ba9052',6)+
      path('M169 '+(158+i*55)+'h'+(150-i*9),'#65869a',7)).join('')+"</g>"+
    "<g transform='translate(495 172) rotate(-13 70 70)'>"+
    "<circle cx='62' cy='66' r='79' fill='#143757' stroke='#efc984' stroke-width='15'/>"+
    "<circle cx='62' cy='66' r='57' fill='#729eac' opacity='.45'/>"+
    path('M114 119l104 115','#e4bc75',30)+"</g>";
}
function tax(){
  return "<g transform='translate(130 58)'>"+
    path('M44 147L245 33l201 114','#edcc8e',8)+
    rect(44,145,403,30,'url(#gold)',4)+
    [0,1,2,3].map(i=>{
      const x=80+i*93;
      return rect(x,177,61,174,'url(#paper)',6)+rect(x-6,177,73,16,'#8ea8b5',3)+rect(x-6,333,73,18,'#7892a0',3);
    }).join('')+
    rect(26,348,442,20,'#a9aab2',4)+rect(12,370,467,17,'#e1bd76',4)+"</g>"+
    "<circle cx='588' cy='133' r='60' fill='#efcd87' stroke='#a98041' stroke-width='6'/>"+
    path('M562 108l54 53','#173852',10)+
    "<circle cx='562' cy='113' r='9' fill='#173852'/><circle cx='610' cy='161' r='9' fill='#173852'/>";
}
function economics(){
  return "<g transform='translate(114 51)'>"+
    rect(10,18,505,328,'url(#device)',20)+rect(32,40,461,278,'#0a2947',11)+
    path('M75 74v202h360','#ebd09b',5)+
    path('M104 262Q251 220 410 78','#e6b776',8)+
    path('M103 90Q254 119 413 267','#89c8c9',8)+
    "<circle cx='256' cy='179' r='21' fill='#f0cf8f' stroke='#234b66' stroke-width='5'/>"+
    "</g>";
}
function law(){
  return "<g transform='translate(152 29)'>"+
    rect(208,86,26,279,'url(#gold)',6)+rect(120,357,205,28,'#d4ad6c',10)+
    rect(93,103,254,18,'url(#gold)',8)+
    "<circle cx='220' cy='88' r='29' fill='#edcd8b' stroke='#98703c' stroke-width='5'/>"+
    [0,1].map(i=>"<g transform='translate("+(i*199)+" 0)'>"+
      path('M126 123l-64 123h126z','#dfb979',5,'#497689',"opacity='.85'")+
      path('M62 246q64 65 126 0','#e4bc79',6)+
    "</g>").join('')+"</g>"+
    "<g transform='translate(505 284) rotate(-23 70 55)'>"+
    rect(12,62,176,24,'#d6b16f',8)+rect(124,14,60,98,'url(#device)',9,"stroke='#e5bd77' stroke-width='5'")+"</g>";
}
function sustainability(){
  return "<circle cx='371' cy='233' r='160' fill='#2e5c69' opacity='.58' stroke='#8babaa' stroke-width='5'/>"+
    path('M358 341C226 260 268 103 513 67c12 197-49 278-155 274Z','#e0c479',6,'url(#leaf)')+
    path('M359 333Q421 190 501 85M368 303Q297 233 298 174M415 213q42-13 78-58','#cbe0b5',10)+
    [0,1,2,3].map(i=>rect(556+i*35,360-[46,82,115,145][i],22,[46,82,115,145][i],i%2?'#dec181':'#7fbab8',4)).join('');
}
function analytics(){
  return "<g transform='translate(102 57)'>"+
    rect(21,10,512,317,'url(#device)',19,"stroke='#9eb7c0' stroke-width='4'")+
    rect(40,31,471,261,'#0b2946',9)+
    path('M65 70v200h419','#b6cbd1',4)+
    Array.from({length:21},(_,i)=>{
      const x=94+hash('sx'+i)%358,y=91+hash('sy'+i)%154;
      return "<circle cx='"+x+"' cy='"+y+"' r='"+(4+hash('r'+i)%5)+"' fill='"+(i%3===0?'#f0c981':'#72b4c4')+"'/>";
    }).join('')+
    path('M91 247L466 91','#eed290',5,'none',"stroke-dasharray='14 8'")+
    rect(185,346,180,18,'#7395a6',7)+
    "</g>";
}
const GRAPHICS={accounting:ledger,finance,management,audit,tax,economics,law,sustainability,analytics};

export function generateSubjectCoverSVG(subject,chapters=[]){
  const category=classifySubjectCover(subject,chapters);
  const key=String(subject?.id||subject?.title||'general');
  const seed=hash(key);
  const gold=['#e9c785','#e2bc75','#f0d59d','#d5ae69','#edc484'][seed%5];
  let background='';
  for(let i=0;i<11;i++){
    const height=35+hash(key+':b:'+i)%120;
    background+=rect(41+i*64,329-height,27,height,i%4===0?'#d7ae6e':'#7fa0af',4,"opacity='.19'");
  }
  const defs="<defs>"+
    "<linearGradient id='sky' x2='1' y2='1'><stop stop-color='#091a31'/><stop offset='.55' stop-color='#214b72'/><stop offset='1' stop-color='#0e263d'/></linearGradient>"+
    "<linearGradient id='paper' x2='1' y2='1'><stop stop-color='#fff8e8'/><stop offset='1' stop-color='#c6d3d6'/></linearGradient>"+
    "<linearGradient id='device' x2='1' y2='1'><stop stop-color='#476d86'/><stop offset='.53' stop-color='#1c3955'/><stop offset='1' stop-color='#0b1e33'/></linearGradient>"+
    "<linearGradient id='gold' x2='1' y2='1'><stop stop-color='"+gold+"'/><stop offset='.65' stop-color='#b48c48'/><stop offset='1' stop-color='#f1d69d'/></linearGradient>"+
    "<linearGradient id='leaf' x2='1' y2='1'><stop stop-color='#94bfa3'/><stop offset='1' stop-color='#285e5a'/></linearGradient>"+
    "<radialGradient id='glow'><stop stop-color='#f1c982' stop-opacity='.25'/><stop offset='1' stop-color='#f1c982' stop-opacity='0'/></radialGradient>"+
    "</defs>";
  const lattice="<g opacity='.1' stroke='#b4c7d3' stroke-width='1'>"+
    Array.from({length:13},(_,i)=>path('M'+(i*61)+' 0v440','#b4c7d3',1)).join('')+
    Array.from({length:8},(_,i)=>path('M0 '+(i*65)+'h720','#b4c7d3',1)).join('')+
    "</g>";
  return "<svg xmlns='http://www.w3.org/2000/svg' width='720' height='440' viewBox='0 0 720 440' aria-hidden='true'>"+
    defs+rect(0,0,720,440,'url(#sky)',0)+
    "<circle cx='"+(535+seed%80)+"' cy='"+(70+seed%45)+"' r='239' fill='url(#glow)'/>"+
    lattice+"<g>"+background+"</g>"+path('M0 370Q160 346 270 383T720 360v80H0z','none',0,'#071a2d',"opacity='.45'")+
    GRAPHICS[category]()+rect(3,3,714,434,'none',0,"stroke='#abc5d0' stroke-opacity='.22' stroke-width='6'")+"</svg>";
}
const imageCache=new Map();
export function subjectCoverDataURL(subject,chapters=[]){
  const key=JSON.stringify([subject?.id,subject?.title,
    chapters.map(x=>typeof x==='string'?x:x?.title)]);
  if(imageCache.has(key))return imageCache.get(key);
  const url='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(generateSubjectCoverSVG(subject,chapters));
  if(imageCache.size>120)imageCache.clear();
  imageCache.set(key,url);
  return url;
}
export function subjectCoverLabel(subject,chapters=[]){
  return COVER_CATEGORIES[classifySubjectCover(subject,chapters)];
}
