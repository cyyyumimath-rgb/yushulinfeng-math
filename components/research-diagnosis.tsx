"use client";
import {useState,type FormEvent} from "react";
import {request,message} from "../lib/research-client";
import type {Diagnosis,ResearchData} from "../lib/research-types";
import {NoteReader} from "./research-notes";
function Task({task,admin,aiReady,reload,owner}:{task:Diagnosis;admin:boolean;aiReady:boolean;reload:()=>Promise<void>;owner:boolean}){
 const [text,setText]=useState(task.draft||task.report),[busy,setBusy]=useState(false),[feedback,setFeedback]=useState("");
 async function act(path:string,data:unknown){setBusy(true);setFeedback("");try{await request(path,data);await reload();}catch(e){setFeedback(message(e));}finally{setBusy(false);}}
 return <details className="rl-task"><summary><strong>{task.title}</strong><span>{{submitted:"待处理",draft:"教师审核中",reviewed:"报告已交付"}[task.status]}</span></summary>
 <small>{task.created.slice(0,10)} · {task.mode==="paper"?"整卷诊断":"单题诊断"} · {task.details}</small>
 <p>{task.problem}</p>{task.work&&<blockquote>{task.work}</blockquote>}
 {task.files.map(f=><p key={f.id}><a href={"/api/material/"+f.id}>{f.role==="solution"?"作答":"题面"} · {f.name}</a></p>)}
 {task.report&&<NoteReader title="教师审核报告" body={task.report} openNote={v=>location.hash="notes?q="+encodeURIComponent(v)}/>}
 {admin&&<div className="rl-form"><label>诊断报告<textarea rows={9} maxLength={50000} value={text} onChange={e=>setText(e.target.value)}/></label><div className="rl-actions">
 <button disabled={busy||!aiReady} onClick={()=>act("generate/"+task.id,{})}>{busy?"处理中…":"根据材料生成 AI 初稿"}</button>
 <button disabled={busy||!text.trim()} onClick={()=>act("research/review",{id:task.id,revision:task.revision,text,publish:false})}>保存草稿</button>
 <button className="rl-dark" disabled={busy||!text.trim()} onClick={()=>act("research/review",{id:task.id,revision:task.revision,text,publish:true})}>审核通过并交付</button></div>
 {!aiReady&&<small>AI 服务尚未配置，可填写教师报告。</small>}</div>}
 {owner&&<button disabled={busy} className="rl-link" onClick={()=>{if(confirm("删除本次提交、全部附件及报告？"))void act("remove/"+task.id,{});}}>删除我的这次提交</button>}
 {feedback&&<p role="alert">{feedback}</p>}</details>
}
export default function Diagnostic({data,reload,login}:{data:ResearchData;reload:()=>Promise<void>;login:string}){
 const [mode,setMode]=useState("single"),[busy,setBusy]=useState(false),[feedback,setFeedback]=useState("");
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const form=e.currentTarget,f=new FormData(form);
 const size=[...f.values()].reduce((n,v)=>n+(typeof v==="string"?0:v.size),0);
 if(size>8*1024*1024){setFeedback("文件合计超过 8 MB，请压缩后重新上传。");return;}
 setBusy(true);setFeedback("");try{await request("diagnoses",f);form.reset();await reload();setFeedback("材料已提交。教师审核后，可在下方查看报告。");}catch(err){setFeedback(message(err));}finally{setBusy(false);}}
 return <><header className="rl-pagehead"><p>学习支持</p><h1>学习诊断</h1><div>把题目和解题过程放在一起，找到下一步值得练习的地方。</div></header>
 <div className="rl-split"><section className="rl-panel"><div className="rl-tabs">{[["single","单题诊断"],["paper","整卷诊断"]].map(([v,l])=><button key={v} aria-pressed={v===mode} onClick={()=>setMode(v)}>{l}</button>)}</div>
 <form className="rl-form" onSubmit={submit}><input type="hidden" name="mode" value={mode}/><label>{mode==="paper"?"考试名称":"题目名称"}<input name="title" required maxLength={120}/></label>
 {mode==="paper"?<label>年级、得分与满分<input name="details" placeholder="例如：高二，86 / 150 分" maxLength={500}/></label>:<input type="hidden" name="details" value=""/>}
 <label>题面文字或 LaTeX<textarea name="problem" rows={3} maxLength={12000}/></label><label>上传题面<input name="question" type="file" multiple accept="image/jpeg,image/png,application/pdf"/></label>
 <label>我的解题过程<textarea name="work" rows={3} maxLength={12000} placeholder="写下你的思路，或上传答题卡、手写过程"/></label>
 <label>上传作答材料<input name="solution" type="file" multiple accept="image/jpeg,image/png,application/pdf"/></label>
 <small>支持 JPG、PNG、PDF，最多 8 个文件，合计 8 MB。请遮盖姓名、学校和考号。</small>
 <label className="rl-check"><input type="checkbox" name="consent" value="yes" required/>我同意本站保存材料，由教师及 OpenAI 辅助分析。未成年人已取得监护人同意。</label>
 {data.user?<button className="rl-dark" disabled={busy}>{busy?"正在上传…":"提交给老师"}</button>:<a className="rl-button rl-dark" href={login}>登录后提交</a>}
 {feedback&&<p role="status">{feedback}</p>}</form></section>
 <aside className="rl-panel rl-aside"><p>教师审核服务</p><h2>高中数学试卷初诊</h2><strong className="rl-price">¥50 <small>/ 次 · 试验价</small></strong><p>范围为一份试卷。提交题面和实际作答，重点讲解题数由老师与家庭确认后再约定服务。</p><ul><li>依据原始作答定位问题</li><li>讲解重点错题与方法</li><li>安排优先训练和复测</li></ul><p>当前提交为诊断申请，提交时无需付款。</p><a href="/?view=courses">查看课程与咨询 →</a></aside></div>
 {data.user&&<section className="rl-panel rl-history"><h2>{data.isAdmin?"诊断审核与历史":"我的提交与报告"}</h2>{!data.tasks.length&&<p>提交后可在这里跟进审核进度。</p>}{data.tasks.map(t=><Task key={t.id+":"+t.revision} task={t} admin={data.isAdmin} owner={!data.isAdmin} aiReady={data.aiReady} reload={reload}/>)}</section>}</>;
}