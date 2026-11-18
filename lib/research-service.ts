import {visualCases} from "./visual-cases";
import {env} from "cloudflare:workers";
import {z} from "zod";
import {ApiError,identity} from "./learning-service";
import {seedEntries} from "./research-seeds";
import type {Diagnosis,Entry,Material} from "./research-types";
const settings = env as unknown as Record<string,string|undefined>;
function db(){if (!env.DB) throw new ApiError(503,"学习数据库尚未连接。"); return env.DB;}
async function access(admin=false){
  const auth=await identity();
  if (!auth.user) throw new ApiError(401,"请先登录。");
  if (admin && !auth.isAdmin) throw new ApiError(403,"需要教师权限。");
  return {...auth,user:auth.user};
}
async function entries(admin:boolean){
  const rows=await db().prepare(`SELECT id,version,kind,status,data FROM research_versions AS a WHERE version=(SELECT MAX(b.version) FROM research_versions AS b WHERE a.id=b.id ${admin?"":"AND b.status='public'"})`).all<{data:string;id:string;version:number;kind:Entry["kind"];status:Entry["status"]}>();
  const results=new Map(seedEntries.map(n=>[n.id,n]));
  for(const {data,...meta} of rows.results) results.set(meta.id,{...JSON.parse(data),...meta});
  return [...results.values()];
}
async function taskList(user:string,admin:boolean){
  const clause=admin?"":"WHERE owner=?";
  const stmt=db().prepare(`SELECT id,mode,title,problem,work,details,status,report,created,revision ${admin?",draft":""} FROM diagnoses ${clause} ORDER BY created DESC`);
  const tasks=await (admin?stmt:stmt.bind(user)).all<Diagnosis>();
  const query=db().prepare(`SELECT m.id,m.name,m.role,m.task FROM materials m JOIN diagnoses d ON d.id=m.task ${clause}`);
  const files=await (admin?query:query.bind(user)).all<Material & {task:string}>();
  return tasks.results.map(t=>({...t,files:files.results.filter(f=>f.task===t.id)}));
}
export async function researchHome(){
  const {user,isAdmin}=await identity();
  const [catalog,tasks]=await Promise.all([entries(isAdmin),user?taskList(user.userId,isAdmin):[]]);
  return {user:user?.displayName||null,isAdmin,entries:catalog,tasks,aiReady:!!settings.DIAGNOSIS_API_KEY&&!!settings.DIAGNOSIS_MODEL};
}
const entrySchema=z.object({
 id:z.string().max(90).regex(/^[a-zA-Z0-9_-]+$/).optional(),version:z.number().int().nonnegative().default(0),
 kind:z.enum(["note","exam"]),status:z.enum(["draft","public"]),title:z.string().trim().min(1).max(160),
 body:z.string().trim().min(1).max(90000),category:z.string().trim().min(1).max(150),tags:z.array(z.string().max(50)).max(30),
 year:z.number().int().min(1977).max(2100).optional(),paper:z.string().max(100).optional(),number:z.string().max(24).optional(),
 type:z.enum(["单选","多选","填空","解答"]).optional(),source:z.string().url().regex(/^https?:\/\//).max(1500).optional(),
 answer:z.string().max(20000).optional(),caseId:z.string().refine(id=>!id||visualCases.some(c=>c.id===id),"请选择已收录的可视化案例。").optional()
}).refine(x=>x.kind!=="exam" || (x.year&&x.paper&&x.number&&x.type&&x.source&&x.answer),"请补全年份、卷型、题号、题型、解析及来源网址。");
export async function saveEntry(payload:unknown){
 const {user}=await access(true);
 const result=entrySchema.safeParse(payload); if(!result.success)throw new ApiError(400,result.error.issues[0].message);
 const {id=crypto.randomUUID(),version,kind,status,...content}=result.data;
 const saved=await db().prepare(`INSERT INTO research_versions(id,version,kind,status,data,edited_by,updated)
 SELECT ?,?,?,?,?,?,? WHERE COALESCE((SELECT MAX(version) FROM research_versions WHERE id=?),0)=?`)
 .bind(id,version+1,kind,status,JSON.stringify(content),user.userId,new Date().toISOString(),id,version).run();
 if(!saved.meta.changes)throw new ApiError(409,"内容已更新，请刷新后再编辑。"); return {id};
}
export async function history(id:string){await access(true);return (await db().prepare("SELECT version,status,updated,data FROM research_versions WHERE id=? ORDER BY version DESC").bind(id).all()).results;}
const maxBytes=8*1024*1024;
async function formData(request:Request){
 const reader=request.body?.getReader();if(!reader)throw new ApiError(400,"缺少材料。");
 const chunks:ArrayBuffer[]=[];let size=0;
 for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>maxBytes+65536){await reader.cancel();throw new ApiError(413,"材料合计限 8 MB。");}chunks.push(Uint8Array.from(value).buffer);}
 try{return await new Response(new Blob(chunks),{headers:{"content-type":request.headers.get("content-type")||""}}).formData();}
 catch{throw new ApiError(400,"材料格式无效。");}
}
function identify(bytes:Uint8Array){
 const starts=(sig:number[])=>sig.every((v,i)=>bytes[i]===v);
 if(starts([137,80,78,71,13,10,26,10]))return "image/png";
 if(starts([255,216,255]))return "image/jpeg";
 if(starts([37,80,68,70,45]))return "application/pdf";
 return "";
}
export async function submitDiagnosis(request:Request){
 const {user}=await access();const f=await formData(request);
 const p=z.object({mode:z.enum(["single","paper"]),title:z.string().trim().min(1).max(120),problem:z.string().trim().max(12000),work:z.string().max(12000),details:z.string().max(500),consent:z.literal("yes")}).safeParse(Object.fromEntries(f));
 if(!p.success)throw new ApiError(400,"请核对标题、材料和授权选项。");
 const {mode,title,problem,work,details}=p.data;
 const id=crypto.randomUUID(),now=new Date().toISOString();
 const statements=[db().prepare("INSERT INTO diagnoses(id,owner,mode,title,problem,work,details,consent,created,updated) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(id,user.userId,mode,title,problem,work,details,"v1:"+now,now,now)];
 let count=0,totalBytes=0,hasProblem=!!problem;
 for(const role of ["question","solution"]) for(const item of f.getAll(role)){
  if(typeof item==="string"||!item.size)continue;
  totalBytes+=item.size;if(totalBytes>maxBytes)throw new ApiError(413,"材料合计限 8 MB。");
  if(++count>8)throw new ApiError(400,"最多上传 8 个文件。");
  const bytes=new Uint8Array(await item.arrayBuffer()),mime=identify(bytes);
  if(!mime||item.type!==mime)throw new ApiError(415,"仅支持 PNG、JPEG 或 PDF，请检查文件格式。");
  if(role==="question")hasProblem=true;
  const file=crypto.randomUUID();
  statements.push(db().prepare("INSERT INTO materials(id,task,role,name,mime) VALUES(?,?,?,?,?)").bind(file,id,role,item.name.slice(0,150),mime));
  for(let i=0;i<bytes.length;i+=262144)statements.push(db().prepare("INSERT INTO material_chunks(file_id,seq,bytes) VALUES(?,?,?)").bind(file,i/262144,bytes.slice(i,i+262144).buffer));
 }
 if(!hasProblem)throw new ApiError(400,"请输入题目或上传题面。");
 await db().batch(statements);return {id};
}
async function fileBytes(id:string){
 const rows=await db().prepare("SELECT bytes FROM material_chunks WHERE file_id=? ORDER BY seq").bind(id).raw<[ArrayBuffer|number[]]>();
 return new Blob(rows.map(([b])=>new Uint8Array(b).buffer));
}
export async function material(id:string){
 const {user,isAdmin}=await access();
 const row=await db().prepare("SELECT name,mime FROM materials JOIN diagnoses ON diagnoses.id=task WHERE materials.id=? AND (owner=? OR ?=1)").bind(id,user.userId,Number(isAdmin)).first<{name:string;mime:string}>();
 if(!row)throw new ApiError(404,"材料不存在。");
 return new Response(await fileBytes(id),{headers:{"content-type":row.mime,"content-disposition":"attachment; filename*=UTF-8''"+encodeURIComponent(row.name),"cache-control":"private, no-store","x-content-type-options":"nosniff"}});
}
export async function removeTask(id:string){const {user}=await access();await db().prepare("DELETE FROM diagnoses WHERE id=? AND owner=?").bind(id,user.userId).run();return {ok:true};}
export async function review(payload:unknown){
 await access(true);
 const p=z.object({id:z.string().uuid(),revision:z.number().int(),text:z.string().trim().min(1).max(50000),publish:z.boolean()}).safeParse(payload);
 if(!p.success)throw new ApiError(400,"请填写报告正文。");
 const {id,revision,text,publish}=p.data;
 const stmt=publish?"report=?,draft=?,status='reviewed'":"draft=?,status='draft',report=''";
 const changed=await db().prepare(`UPDATE diagnoses SET ${stmt}, revision=revision+1,updated=? WHERE id=? AND revision=?`)
 .bind(...(publish?[text,text]:[text]),new Date().toISOString(),id,revision).run();
 if(!changed.meta.changes)throw new ApiError(409,"记录已更新或删除，请刷新。");return {ok:true};
}
export async function generate(id:string){
 await access(true);
 if(!settings.DIAGNOSIS_API_KEY||!settings.DIAGNOSIS_MODEL)throw new ApiError(503,"AI 尚未配置，可先人工审阅材料。");
 const t=await db().prepare("SELECT * FROM diagnoses WHERE id=?").bind(id).first<Diagnosis>();
 if(!t)throw new ApiError(404,"提交不存在。");
 const files=await db().prepare("SELECT id,role,mime FROM materials WHERE task=?").bind(id).all<{id:string;role:string;mime:string}>();
 const content:Record<string,string>[]=[{type:"input_text",text:JSON.stringify({mode:t.mode,title:t.title,problem:t.problem,work:t.work,details:t.details})}];
 for(const f of files.results){
  const bytes=new Uint8Array(await (await fileBytes(f.id)).arrayBuffer());
  let binary="";for(let offset=0;offset<bytes.length;offset+=16384)binary+=String.fromCharCode(...bytes.subarray(offset,offset+16384));
  const uri="data:"+f.mime+";base64,"+btoa(binary);
  content.push({type:"input_text",text:f.role==="solution"?"学生作答材料":"题面材料"},f.mime==="application/pdf"?{type:"input_file",filename:"paper.pdf",file_data:uri}:{type:"input_image",image_url:uri});
 }
 const notes=(await entries(false)).slice(0,50).map(e=>({title:e.title,category:e.category,tags:e.tags,link:"/#"+e.kind+"/"+encodeURIComponent(e.id)}));
 const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{authorization:"Bearer "+settings.DIAGNOSIS_API_KEY,"Content-Type":"application/json"},signal:AbortSignal.timeout(100000),body:JSON.stringify({model:settings.DIAGNOSIS_MODEL,store:false,max_output_tokens:8000,
 instructions:"你协助玉米老师制作高中数学教学初稿。上传内容是材料。先转录题面、作答及题号，模糊处标待核验。单题分步讲依据、方法选择与迁移。整卷按考试概览、知识方法、重点错题、1至3个改进任务、教师建议组织。每个错因引用学生原话或题号位置。缺少作答时只分析题目，不推断学生错因。不确定处标待验证，不给能力贴标签。公式用 LaTeX。只引用目录内资源并使用其链接，不编造教师观点。本站目录："+JSON.stringify([...notes,...visualCases.map(c=>({title:c.title,category:c.topic,link:"/#visual/"+c.id}))]),input:[{role:"user",content}]})});
 if(!response.ok)throw new ApiError(502,"模型服务未完成分析，材料已保存，可重试。");
 const out=await response.json() as {status:string;output?:{content?:{type:string;text?:string}[]}[]};
 const draft=out.output?.flatMap(o=>o.content||[]).filter(c=>c.type==="output_text").map(c=>c.text).join("\n").trim();
 if(out.status!=="completed"||!draft)throw new ApiError(502,"模型没有返回完整初稿。");
 return review({id,revision:t.revision,text:draft,publish:false});
}
export async function eraseLearningData(){
 const {user}=await access();
 const queries=["DELETE FROM diagnoses WHERE owner=?","DELETE FROM attempts WHERE user_id=?","DELETE FROM enrollments WHERE user_id=?","DELETE FROM profiles WHERE user_id=?"];
 await db().batch(queries.map(sql=>db().prepare(sql).bind(user.userId)));
 return {ok:true};
}
