"use client";
import {useEffect,useState,useCallback} from "react";
import {ArrowUpRight,ArrowRight,BookOpen,Library,Compass,GraduationCap,Search,NotebookPen} from "lucide-react";
import VisualCatalog from "../components/visual-catalog";
import {linkedVisuals} from "../lib/visual-cases";
import TangentLab from "../components/tangent-lab";
import Diagnostic from "../components/research-diagnosis";
import Editor from "../components/research-editor";
import {NoteReader} from "../components/research-notes";
import {examSources} from "../lib/exam-sources";
import type {Entry,ResearchData} from "../lib/research-types";
import {request,message} from "../lib/research-client";
import "./research.css";
const nav=[["home","首页"],["notes","知识库"],["exams","真题库"],["diagnosis","学习诊断"],["visual","数学可视化"],["about","关于我"]];
const paths=[
 {id:"notes",icon:BookOpen,title:"知识笔记",body:"从核心概念出发，梳理定义、条件与方法。"},
 {id:"exams",icon:Library,title:"高考真题",body:"按年份、卷型和数学方法查找原题出处。"},
 {id:"visual",icon:Compass,title:"可视化实验",body:"拖动一个点，看见参数与图形之间的关系。"},
 {id:"diagnosis",icon:NotebookPen,title:"学习诊断",body:"提交题面与作答，通过教师审核获取反馈。"}];
const href=(e:Entry)=>"#"+e.kind+"/"+encodeURIComponent(e.id);
function EntryRow({entry:e}:{entry:Entry}){return <a className="rl-row" href={href(e)}><span><small>{e.kind==="exam"?e.year+" · "+e.paper+" · 第 "+e.number+" 题":e.category}</small><strong>{e.title}</strong></span><ArrowUpRight size={20}/></a>;}
function Catalog({items,exam,initial}:{items:Entry[];exam:boolean;initial:string}){
 const [query,setQuery]=useState(initial),[filter,setFilter]=useState<Record<string,string>>({});
 const keys=exam?["category","year","paper","type","tags"]:["category","tags"];
 const labels:Record<string,string>={category:"知识板块",year:"年份",paper:"地区或卷型",type:"题型",tags:"方法与标签"};
 const values=(e:Entry,k:string)=>[e[k as keyof Entry]].flat().map(String);
 const hits=items.filter(e=>keys.every(k=>!filter[k]||values(e,k).includes(filter[k]))&&[e.title,e.body,e.category,e.paper,e.tags.join(" ")].join(" ").toLowerCase().includes(query.trim().toLowerCase()));
 return <><header className="rl-pagehead"><p>{exam?"按出处查题":"教学手记"}</p><h1>{exam?"高考真题库":"数学知识库"}</h1><div>{exam?"查阅原卷题号、命题评析与教师录入的解析。":"按知识板块和方法检索玉米老师的数学笔记。"}</div></header>
 <section className="rl-panel"><label className="rl-search"><Search size={18}/><input aria-label="关键词搜索" type="search" placeholder={exam?"搜索题目、卷型或方法":"搜索概念、标题或笔记正文"} value={query} onChange={e=>setQuery(e.target.value)}/></label>
 <div className="rl-filters">{keys.map(k=><label key={k}>{labels[k]}<select value={filter[k]||""} onChange={e=>setFilter({...filter,[k]:e.target.value})}><option value="">全部</option>{[...new Set(items.flatMap(i=>values(i,k)))].filter(v=>v!=="undefined").sort().map(v=><option key={v}>{v}</option>)}</select></label>)}</div>
 <p className="rl-caption">{hits.length} {exam?"条题目记录":"篇笔记"}</p>{hits.map(e=><EntryRow key={e.id} entry={e}/>)}{hits.length===0&&<p>没有符合条件的内容。<button className="rl-link" onClick={()=>{setQuery("");setFilter({});}}>清除筛选</button></p>}</section></>;
}
function Detail({entry:e,items}:{entry:Entry;items:Entry[]}){
 const isExam=e.kind==="exam",index=examSources.find(x=>x.id===e.id);
 const related=items.filter(i=>i.id!==e.id&&(i.category===e.category||i.tags.some(t=>e.tags.includes(t))));
 function openNote(title:string){const note=items.find(v=>v.kind==="note"&&v.title===title);location.hash=note?href(note):"notes?q="+encodeURIComponent(title);}
 return <><a href={isExam?"#exams":"#notes"} className="rl-back">← 返回{isExam?"真题库":"知识库"}</a><article className="rl-panel rl-reader"><p className="rl-caption">{e.category} · {e.tags.join(" / ")}</p>
 {isExam&&<p>{e.year} · {e.paper} · 第 {e.number} 题 · {e.type}</p>}
 <h1>{e.title}</h1><NoteReader title={e.title} body={e.body||(index?"题面及命题分析见下方来源。":"")} openNote={openNote}/>
 {e.source&&<a className="rl-button" href={e.source} target="_blank" rel="noreferrer">查看{index?index.sourceTitle:"原题来源"} ↗</a>}
 {e.answer&&<details><summary>查看完整解析</summary><NoteReader title="解析" body={e.answer} openNote={openNote}/></details>}</article>
 <section className="rl-panel"><h2>继续学习</h2>{linkedVisuals(e).map(lab=><a key={lab.id} className="rl-row" href={"#visual/"+lab.id}>可视化实验 · {lab.title} <ArrowRight size={18}/></a>)}{related.slice(0,5).map(v=><EntryRow key={v.id} entry={v}/>)}</section></>;
}
function Home({notes}:{notes:Entry[]}){return <><section className="rl-hero"><div className="rl-intro"><p className="rl-kicker"><i/>玉米老师的高中数学研究所</p><h1>从一道题，<br/>读懂<span>一种方法。</span></h1>
 <p className="rl-lead">把知识笔记、历年真题和动态实验放在同一张书桌上，顺着自己的疑问学习数学。</p><div className="rl-actions"><a className="rl-button rl-dark" href="#notes">进入知识库 <ArrowRight size={17}/></a><a className="rl-button" href="#diagnosis">提交学习诊断 <ArrowUpRight size={16}/></a></div></div><div className="rl-figure"><TangentLab compact/><a href="#visual/tangent">打开切线实验 <ArrowUpRight size={14}/></a></div></section>
 <section className="rl-homeblock"><h2>学习入口</h2><div className="rl-cards">{paths.map(({id,title,icon:Icon,body})=><a href={"#"+id} key={id}><Icon className="rl-cardicon" size={25}/><h3>{title}</h3><p>{body}</p><ArrowUpRight className="rl-cardarrow" size={16}/></a>)}</div></section>
 <section className="rl-homeblock"><div className="rl-titlebar"><h2>精选知识笔记</h2><a href="#notes">全部笔记 →</a></div>{notes.slice(0,3).map(e=><EntryRow key={e.id} entry={e}/>)}</section></>}
export default function ResearchApp({initialEntries}:{initialEntries:Entry[]}){
 const [route,setRoute]=useState("home"),[data,setData]=useState<ResearchData>({user:null,isAdmin:false,entries:initialEntries,tasks:[],aiReady:false}),[error,setError]=useState("");
 const reload=useCallback(async()=>{try{setData(await request<ResearchData>("research"));setError("");}catch(e){setError(message(e));throw e;}},[]);
 useEffect(()=>{function sync(){setRoute(location.hash.slice(1)||"home");window.scrollTo(0,0);}sync();window.addEventListener("hashchange",sync);void reload().catch(()=>{});return()=>window.removeEventListener("hashchange",sync);},[reload]);
 const [segment,qs]=route.split("?"),[page,id]=segment.split("/"),items=data.entries.filter(e=>e.status==="public"),notes=items.filter(e=>e.kind==="note");
 const entry=items.find(v=>v.id===id&&v.kind===page),login="/login?return_to="+encodeURIComponent("/#"+route);
 return <div className="rl-shell"><header className="rl-top"><div className="rl-nav"><a href="#home" className="rl-brand"><span>∿</span><strong>钰数临风<small>数学研究所</small></strong></a><nav aria-label="主导航">{nav.map(([v,l])=><a key={v} href={"#"+v} aria-current={(v===page||(page==="note"&&v==="notes")||(page==="exam"&&v==="exams"))?"page":undefined}>{l}</a>)}</nav><a className="rl-account" href={data.user?"#center":login}><GraduationCap size={17}/>{data.user?"学习中心":"登录学习"}</a></div></header>
 <main className="rl-main">{error&&<div role="alert" className="rl-notice">学习数据加载失败。<button onClick={()=>void reload().catch(()=>{})}>重试</button></div>}
 {page==="home"?<Home notes={notes}/>:page==="notes"||page==="exams"?<Catalog key={route} exam={page==="exams"} items={page==="exams"?items.filter(e=>e.kind==="exam"):notes} initial={new URLSearchParams(qs).get("q")||""}/>:entry?<Detail key={entry.id} entry={entry} items={items}/>:page==="visual"?<VisualCatalog id={id} items={items}/>:page==="diagnosis"?<Diagnostic data={data} login={login} reload={reload}/>:page==="manage"&&data.isAdmin?<Editor entries={data.entries} reload={reload}/>:page==="center"?<><header className="rl-pagehead"><p>个人学习中心</p><h1>{data.user||"访客"}的书桌</h1></header><section className="rl-panel">{[["#diagnosis","我的提交与诊断报告"],["/?view=dashboard","练习记录与错题"],["/?view=courses","课程与咨询"],...(data.isAdmin?[["#manage","知识与真题管理"],["/?view=admin","课程与预约管理"]]:[])].map(([url,l])=><a className="rl-row" key={url} href={url}>{l} →</a>)}{data.user&&<button className="rl-link" onClick={async()=>{if(confirm("永久删除本账号的个人资料、练习、预约、诊断及附件？")){try{await request("research/erase",{});location.assign("/logout?return_to=/");}catch(e){setError(message(e));}}}}>删除我的个人学习资料</button>} <a href="/logout?return_to=/">退出登录</a></section></>:page==="about"?<><header className="rl-pagehead"><p>关于研究所</p><h1>玉米老师的数学课</h1></header><section className="rl-panel"><h2>从知识到方法，从解题到理解</h2><p>这里记录面向高一至高三的教学笔记，重点关注导数、圆锥曲线和分步骤拆题。讲解一道题时，先确定条件，再解释为什么选择这个方法，最后用相似题检验能否迁移。</p><div className="rl-actions"><a className="rl-button rl-dark" href="/?view=courses">课程与咨询 →</a><a className="rl-button" href="#diagnosis">了解试卷初诊</a></div></section></>:<section className="rl-panel"><h2>此内容暂不可访问</h2><a href="#home">返回首页</a></section>}
 </main><footer className="rl-footer"><span>钰数临风 ｜ 数学研究所</span><a href="#about">关于玉米老师 ↗</a></footer></div>
}