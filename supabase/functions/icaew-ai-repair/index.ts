import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {parseImportJson} from "../_shared/import-json.js";
import {loadImportSources} from "../_shared/import-sources.js";
import {geminiFailure} from "../_shared/gemini-errors.js";
import {buildRepairTargets,repairInstructions,validateRepairs} from "../_shared/import-repair.js";

declare const EdgeRuntime: {waitUntil(task: Promise<unknown>): void};
const URL = Deno.env.get('SUPABASE_URL')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const KEY = Deno.env.get('GEMINI_API_KEY') || '';
const MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-3.5-flash-lite';
const ORIGIN = 'https://accountinglms.github.io';
const uuid = (value: unknown) => typeof value==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
function response(body: unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','access-control-allow-origin':ORIGIN,'access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'authorization, apikey, content-type','cache-control':'no-store','vary':'Origin'}})}
function dbHeaders(token: string){return {apikey:ANON,Authorization:'Bearer '+token,'content-type':'application/json'}}
async function rpc(token: string,name: string,body: unknown){
  const res=await fetch(URL+'/rest/v1/rpc/'+name,{method:'POST',headers:dbHeaders(token),body:JSON.stringify(body)});
  const data=await res.json();if(!res.ok)throw Error(String(data?.message||'REPAIR_SAVE_FAILED'));return data;
}
async function repair(token: string,claim: any){
  try{
    const payload=claim.draft.payload;
    if(!Array.isArray(payload.questions))payload.questions=[];
    const targets=buildRepairTargets(payload.questions,payload.lesson);
    let result: any={payload,applied:[],suggestions:[],issues:[]};
    if(targets.length){
      if(!KEY)throw Error('AI_NOT_CONFIGURED');
      const files=(payload.files||[]).map((f: any)=>({storagePath:f.storagePath,fileName:f.name||f.fileName,mimeType:f.mimeType}));
      let sourceParts: any[]=[];
      if(targets.some((t: any)=>!t.translation_only)){
        const sources=await loadImportSources({files},String(claim.draft.created_by),{url:URL,anonKey:ANON,token,fetch});
        sourceParts=sources.parts;
      }
      const prompt=repairInstructions(payload,targets);
      // One bounded request. No automatic provider retry, no paid fallback or search.
      const res=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(MODEL)+':generateContent',{
        method:'POST',headers:{'x-goog-api-key':KEY,'content-type':'application/json'},signal:AbortSignal.timeout(80000),
        body:JSON.stringify({contents:[{role:'user',parts:[...sourceParts,{text:prompt}]}],generationConfig:{responseMimeType:'application/json',temperature:0.1,maxOutputTokens:12000}})
      });
      const data=await res.json();
      if(!res.ok){const failure=geminiFailure(res.status,data,res.headers.get('retry-after'));await rpc(token,'finish_import_repair',{p_run_id:claim.run_id,p_error:failure.body});return}
      if(data?.candidates?.[0]?.finishReason==='MAX_TOKENS')throw Error('AI_OUTPUT_TRUNCATED');
      const text=(data?.candidates?.[0]?.content?.parts||[]).filter((p: any)=>p?.thought!==true&&typeof p?.text==='string').map((p: any)=>p.text).join('').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
      result=validateRepairs(parseImportJson(text).value,payload,targets,files.length);
    }
    await rpc(token,'finish_import_repair',{p_run_id:claim.run_id,p_result:result});
  }catch(error){
    const code=error instanceof Error?error.message:'REPAIR_FAILED';
    console.error('AI repair stopped',{run_id:claim.run_id,code:code.slice(0,150)});
    try{await rpc(token,'finish_import_repair',{p_run_id:claim.run_id,p_error:{code,error:code==='AI_NOT_CONFIGURED'?'Gemini chưa được cấu hình.':'Chưa sửa được phần lỗi. Bản nháp được giữ nguyên; bạn có thể thử lại hoặc chỉnh sửa thủ công.'}})}catch{console.error('Could not save repair state',{run_id:claim.run_id})}
  }
}
Deno.serve(async(req: Request)=>{
  if(req.headers.get('origin')&&req.headers.get('origin')!==ORIGIN)return response({error:'ORIGIN_NOT_ALLOWED'},403);
  if(req.method==='OPTIONS')return response({ok:true});
  if(req.method!=='POST')return response({error:'METHOD_NOT_ALLOWED'},405);
  try{
    const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
    if(!token)return response({error:'UNAUTHORIZED'},401);
    const [userRes,accessRes]=await Promise.all([
      fetch(URL+'/auth/v1/user',{headers:dbHeaders(token)}),
      fetch(URL+'/rest/v1/rpc/get_my_access',{method:'POST',headers:dbHeaders(token),body:'{}'})
    ]);
    const user=userRes.ok?await userRes.json():null,access=accessRes.ok?await accessRes.json():null;
    if(!user?.id||access?.editor!==true||access?.mfa_satisfied===false)return response({error:'FORBIDDEN'},403);
    const input=await req.json();
    if(!uuid(input.draftId)||!uuid(input.requestId)||!['auto','manual'].includes(input.mode)||typeof input.expectedUpdatedAt!=='string')return response({error:'INVALID_INPUT'},400);
    const claim=await rpc(token,'begin_import_repair',{p_draft_id:input.draftId,p_request_id:input.requestId,p_expected_updated_at:input.expectedUpdatedAt,p_mode:input.mode});
    if(claim.state!=='claimed')return response(claim,claim.code?409:200);
    if(typeof EdgeRuntime!=='undefined'&&typeof EdgeRuntime.waitUntil==='function'){
      EdgeRuntime.waitUntil(repair(token,claim));
      return response({state:'running',run_id:claim.run_id},202);
    }
    await repair(token,claim);
    return response({state:'finished',run_id:claim.run_id});
  }catch(error){return response({error:error instanceof Error?error.message:'REPAIR_FAILED'},400)}
});
