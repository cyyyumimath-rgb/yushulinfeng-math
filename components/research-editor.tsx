"use client";
import {useState,type FormEvent} from "react";
import {request,message} from "../lib/research-client";
import {visualCases} from "../lib/visual-cases";
import {sections,type Entry} from "../lib/research-types";
import {NoteReader,parseObsidian} from "./research-notes";
const initial:Entry={id:"",version:0,kind:"note",status:"draft",title:"",body:"",category:sections[0],tags:[]};
export default function Editor({entries,reload}:{entries:Entry[];reload:()=>Promise<void>}){
 const [item,set]=useState<Entry>(initial),[tags,setTags]=useState(""),[busy,working]=useState(false),[info,note]=useState("");
 const [versions,setVersions]=useState<{version:number;status:string;updated:string;data:string}[]>([]);
 function edit(v:Entry){set(v);setTags(v.tags.join("，"));setVersions([]);note("");}
 const field=(k:keyof Entry,v:string|number)=>set({...item,[k]:v});
 async function save(e:FormEvent<HTMLFormElement>){e.preventDefault();const status=(e.nativeEvent as SubmitEvent).submitter?.getAttribute("value")||"draft";working(true);try{
 const result=await request<{id:string}>("research/save",{...item,id:item.id||undefined,status,tags:tags.split(/[,，、]/).map(v=>v.trim()).filter(Boolean)});
 set({...item,id:result.id,version:item.version+1,status:status as Entry["status"]});await reload();setVersions([]);note(status==="draft"?"草稿已保存。":"已审核发布。");
 }catch(err){note(message(err));}finally{working(false);}}
 return <section><header className="rl-pagehead"><p>教师工作台</p><h1>内容管理</h1><a href="#diagnosis">查看诊断审核队列 →</a></header><section className="rl-panel">
 <div className="rl-actions"><select aria-label="选择内容" value={item.id} onChange={e=>edit(entries.find(v=>v.id===e.target.value)||initial)}><option value="">新建内容</option>{entries.map(v=><option key={v.id} value={v.id}>{v.title}</option>)}</select><button onClick={()=>edit({...initial})}>新建</button></div>
 <form className="rl-form" onSubmit={save}><label>内容类型<select disabled={!!item.id} value={item.kind} onChange={e=>edit({...initial,kind:e.target.value as Entry["kind"]})}><option value="note">知识笔记</option><option value="exam">高考真题</option></select></label>
 {item.kind==="note"&&<label>导入 Obsidian Markdown<input type="file" accept=".md,.markdown,text/markdown" onChange={async e=>{const f=e.target.files?.[0];if(f){try{if(f.size>220000)throw Error("笔记过大。");const p=parseObsidian(await f.text(),f.name);edit({...item,...p,category:p.category||item.category});}catch(err){note(message(err));}}}}/></label>}
 <label>标题<input required value={item.title} onChange={e=>field("title",e.target.value)}/></label>
 <div className="rl-fields"><label>知识分类<input required list="categories" value={item.category} onChange={e=>field("category",e.target.value)}/><datalist id="categories">{sections.map(v=><option key={v}>{v}</option>)}</datalist></label><label>方法与标签（逗号分隔）<input value={tags} onChange={e=>setTags(e.target.value)}/></label></div>
 {item.kind==="exam"&&<div className="rl-fields"><label>年份<input type="number" min="1977" max="2100" required value={item.year||""} onChange={e=>field("year",Number(e.target.value))}/></label>
 {([["paper","地区或卷型"],["number","原卷题号"],["source","可核验的来源网址"]] as const).map(([k,l])=><label key={k}>{l}<input required type={k==="source"?"url":"text"} value={item[k]||""} onChange={e=>field(k,e.target.value)}/></label>)}
 <label>题型<select required value={item.type||""} onChange={e=>field("type",e.target.value)}><option value="">选择题型</option>{["单选","多选","填空","解答"].map(v=><option key={v}>{v}</option>)}</select></label></div>}
 <label>{item.kind==="exam"?"题面":"笔记正文"}<textarea rows={12} required value={item.body} onChange={e=>field("body",e.target.value)}/></label>
 {item.kind==="exam"&&<label>答案与详细解析<textarea rows={5} required value={item.answer||""} onChange={e=>field("answer",e.target.value)}/></label>}
 <label>关联可视化<select value={item.caseId||""} onChange={e=>field("caseId",e.target.value)}><option value="">无</option>{visualCases.map(lab=><option key={lab.id} value={lab.id}>{lab.title}</option>)}</select></label>
 <div className="rl-actions"><button disabled={busy} value="draft">保存草稿</button><button className="rl-dark" disabled={busy} value="public">审核并公开发布</button></div></form>
 {item.version>0&&<button className="rl-link" onClick={async()=>{try{setVersions(await request("versions/"+item.id));}catch(e){note(message(e));}}}>查看修改记录</button>}
 {versions.map(v=><details key={v.version}><summary>版本 {v.version} · {v.updated.slice(0,10)}</summary><pre>{JSON.parse(v.data).body}</pre><button onClick={()=>{const old=JSON.parse(v.data);edit({...item,...old});}}>恢复此内容到编辑器</button></details>)}
 {item.body&&<details><summary>预览正文</summary><NoteReader title={item.title} body={item.body} openNote={title=>note("关联笔记 · "+title)}/></details>}
 {info&&<p role="status">{info}</p>}</section></section>;
}