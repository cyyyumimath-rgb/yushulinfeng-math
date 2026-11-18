"use client";

import {lazy,Suspense,useEffect,useRef,useState} from "react";
import {ArrowRight,ArrowUpRight,Expand,Minimize} from "lucide-react";
import {linkedVisuals,visualCases} from "../lib/visual-cases";
import type {Entry} from "../lib/research-types";
import TangentLab from "./tangent-lab";
import "./visual-catalog.css";

const experiments = {
  periodic: lazy(()=>import("./trig-labs").then(m=>({default:m.PeriodicLab}))),
  "unit-circle": lazy(()=>import("./trig-labs").then(m=>({default:m.UnitCircleLab}))),
  projection: lazy(()=>import("./vector-labs").then(m=>({default:m.ProjectionLab}))),
  "cube-section": lazy(()=>import("./solid-section-labs").then(m=>({default:m.CubeSectionLab}))),
  "vector-distance": lazy(()=>import("./vector-labs").then(m=>({default:m.VectorDistanceLab}))),
  pyramid: lazy(()=>import("./pyramid-lab")),
  "cylinder-section": lazy(()=>import("./solid-section-labs").then(m=>({default:m.CylinderSectionLab}))),
  "dihedral-angle": lazy(()=>import("./dihedral-lab")),
  "conic-definitions": lazy(()=>import("./conic-definitions-lab")),
  polar: lazy(()=>import("./polar-lab")),
  drawing: lazy(()=>import("./drawing-lab")),
  counting: lazy(()=>import("./counting-lab")),
  tangent: TangentLab,
};

function PreviewDiagram({id}:{id:string}) {
  const axes=<path className="vc-axis" d="M16 78 H204 M48 92 V12"/>;
  const cube=<g><path d="M60 37 L126 37 153 20 88 20 Z M60 37 V86 H126 V37 M126 86 L153 69 V20"/><path className="vc-dash" d="M60 86 L88 69 V20 M88 69 H153"/></g>;
  const diagrams:Record<string,React.ReactNode>={
    periodic:<>{axes}<path className="vc-mainline" d="M18 53 C32 52 33 29 48 29 S64 77 80 77 97 29 113 29 129 77 145 77 161 29 177 29 192 77 208 77"/><path className="vc-dash" d="M113 29 V78"/><circle cx="113" cy="29" r="3.5"/></>,
    "unit-circle":<><path className="vc-axis" d="M35 52 H183 M110 97 V5"/><circle cx="110" cy="52" r="39"/><path className="vc-mainline" d="M140 27 L110 52 140 77"/><path className="vc-dash" d="M140 27 V77"/><circle cx="140" cy="27" r="3"/><circle cx="140" cy="77" r="3"/></>,
    projection:<><path className="vc-axis" d="M20 88 L199 55"/><path className="vc-mainline" d="M46 83 L143 23 M132 24 L143 23 139 33 M46 83 L150 64 M141 61 L150 64 143 70"/><path className="vc-dash" d="M143 23 L150 64"/><path d="M142 66 L140 58 148 57"/></>,
    "cube-section":<>{cube}<path fill="currentColor" fillOpacity=".16" className="vc-mainline" d="M60 64 L93 37 139 29 153 45 120 86 75 77 Z"/></>,
    "vector-distance":<><path className="vc-fill" d="M29 70 L100 41 194 58 122 87 Z"/><path className="vc-dash" d="M52 70 L110 66"/><path className="vc-mainline" d="M110 18 V66"/><path d="M110 60 L118 58 V64"/><circle cx="110" cy="18" r="3"/><circle cx="110" cy="66" r="3"/></>,
    pyramid:<><path className="vc-fill" d="M108 13 L42 83 H135 Z"/><path d="M108 13 L171 65 135 83 M108 13 L135 83"/><path className="vc-dash" d="M42 83 L80 65 H171 M80 65 L108 13"/><path className="vc-mainline" d="M69 55 H124"/><circle cx="69" cy="55" r="3"/><circle cx="124" cy="55" r="3"/></>,
    "cylinder-section":<g transform="rotate(23 110 51)"><ellipse cx="110" cy="22" rx="38" ry="11"/><path d="M72 22 V78 C72 93 148 93 148 78 V22"/><path className="vc-dash" d="M72 78 C72 63 148 63 148 78"/><path className="vc-fill vc-mainline" d="M72 64 C72 51 148 25 148 39 S72 78 72 64Z"/></g>,
    "dihedral-angle":<><path className="vc-fill" d="M32 73L110 49 184 69 106 93Z"/><path className="vc-fill" d="M32 73L110 49 137 12 59 36Z"/><path className="vc-mainline" d="M85 45L68 62 108 74"/><path d="M76 52 Q86 59 81 66"/></>,
    "conic-definitions":<><ellipse cx="64" cy="57" rx="42" ry="28"/><path className="vc-mainline" d="M34 57L70 29 94 57 M140 22Q199 51 140 88"/><path className="vc-dash" d="M184 17V93"/><circle cx="34" cy="57" r="3"/><circle cx="94" cy="57" r="3"/></>,
    polar:<><ellipse cx="93" cy="52" rx="48" ry="32"/><path className="vc-mainline" d="M112 12V92 M112 22L191 52 112 82"/><circle cx="191" cy="52" r="3"/></>,
    drawing:<>{cube}<path className="vc-dash" d="M37 86H180 M60 96V14"/><path className="vc-mainline" d="M60 86H126"/></>,
    counting:<><path className="vc-axis" d="M27 70H190"/>{[38,69,100,131,162].map((x,i)=><rect key={x} x={x} y="37" width="24" height="25" rx="4" fill="currentColor" fillOpacity={i<2?.24:.08}/>)}<path className="vc-mainline" d="M38 67v7h55v-7"/></>,
    tangent:<>{axes}<path d="M56 15 Q109 145 162 15"/><path className="vc-mainline" d="M96 94 L177 20"/><circle cx="137" cy="57" r="3"/></>,
  };
  return <svg viewBox="0 0 220 104" aria-hidden="true" className="vc-mini">{diagrams[id]}</svg>;
}

function Catalog(){
  const [topic,setTopic]=useState("全部");
  const topics=["全部",...new Set(visualCases.map(c=>c.topic))];
  return <>
    <header className="rl-pagehead vc-head"><p>数学可视化</p><h1>交互实验室</h1><div>选一个问题，改变参数，再用图形和公式检验你的猜想。</div></header>
    <div className="vc-filters" aria-label="按主题筛选">{topics.map(t=><button key={t} type="button" aria-pressed={topic===t} onClick={()=>setTopic(t)}>{t}</button>)}</div>
    <div className="vc-grid">{visualCases.filter(c=>topic==="全部"||c.topic===topic).map(c=>
      <a key={c.id} data-topic={c.topic} className="vc-card" href={"#visual/"+c.id}>
        <div className="vc-art"><PreviewDiagram id={c.id}/></div>
        <div className="vc-body"><small>{c.topic}</small><h2>{c.title}</h2><p>{c.question}</p><ArrowUpRight size={17} aria-hidden="true"/></div>
      </a>)}</div>
  </>;
}

function CasePage({lab,items}:{lab:typeof visualCases[number];items:Entry[]}){
  const root=useRef<HTMLElement>(null);
  const [wide,setWide]=useState(false);
  useEffect(()=>{
    const fullscreen=()=>setWide(document.fullscreenElement===root.current);
    const escape=(event:KeyboardEvent)=>{if(event.key==="Escape")setWide(false);};
    document.addEventListener("fullscreenchange",fullscreen);
    document.addEventListener("keydown",escape);
    return ()=>{document.removeEventListener("fullscreenchange",fullscreen);document.removeEventListener("keydown",escape);};
  },[]);
  async function toggle(){
    if(wide){if(document.fullscreenElement===root.current)await document.exitFullscreen();setWide(false);return;}
    try{await root.current?.requestFullscreen?.();}catch{/* Embedded viewers may only support the fixed layout. */}
    setWide(true);
  }
  const Experiment=experiments[lab.id as keyof typeof experiments];
  const readings=items.filter(e=>linkedVisuals(e).some(c=>c.id===lab.id));
  return <>
    <a className="rl-back" href="#visual">← 全部可视化案例</a>
    <header className="rl-pagehead vc-casehead"><p>{lab.topic}</p><h1>{lab.title}</h1><div>{lab.question}</div></header>
    <section ref={root} className={"vc-stage"+(wide?" vc-expanded":"")}>
      {lab.id!=="tangent"&&<div className="vc-stagebar"><button type="button" aria-pressed={wide} onClick={toggle}>{wide?<Minimize size={15}/>:<Expand size={15}/>} {wide?"退出全屏":"全屏演示"}</button></div>}
      <Suspense fallback={<p role="status">正在加载实验…</p>}><Experiment/></Suspense>
    </section>
    {readings.length>0&&<section className="rl-panel vc-related"><h2>关联阅读与训练</h2>{readings.map(e=><a key={e.id} className="rl-row" href={"#"+e.kind+"/"+encodeURIComponent(e.id)}><span><small>{e.kind==="exam"?e.year+" · "+e.paper+" · 第 "+e.number+" 题":e.category}</small><strong>{e.title}</strong></span><ArrowRight size={17}/></a>)}</section>}
  </>;
}

export default function VisualCatalog({id,items}:{id?:string;items:Entry[]}){
  if(!id) return <Catalog/>;
  const lab=visualCases.find(c=>c.id===id);
  return lab?<CasePage key={id} lab={lab} items={items}/>:<section className="rl-panel"><h1>案例未找到</h1><a href="#visual">查看全部可视化案例 →</a></section>;
}
