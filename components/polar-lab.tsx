"use client";

import { useEffect, useId, useMemo, useRef, useState, type PointerEvent } from "react";
import { Formula } from "./math-text";
import { contactPoints, joining, polarLine, secantConstruction, visibleSegment, type ConicKind, type Line, type XY } from "./polar-lab-geometry";
import "./polar-lab.css";

const W=520, H=340, scale=49, xmax=W/(2*scale), ymax=H/(2*scale);
const names:Record<ConicKind,string>={ellipse:"椭圆",hyperbola:"双曲线",parabola:"抛物线"};
const sx=(x:number)=>W/2+scale*x;
const sy=(y:number)=>H/2-scale*y;
const fmt=(v:number)=>String(Number(v.toFixed(4)));
const clamp=(v:number,bound:number)=>Math.round(10*Math.max(-bound,Math.min(bound,v)))/10;
const draw=(pts:XY[])=>pts.map(([x,y],i)=>(i===0?"M":"L")+sx(x).toFixed(2)+" "+sy(y).toFixed(2)).join(" ");

function outline(kind:ConicKind,b:number,height=ymax) {
  if (kind==="ellipse") return draw(Array.from({length:161},(_,i):XY=>{
    const t=2*Math.PI*i/160;
    return [3*Math.cos(t),b*Math.sin(t)];
  }))+"Z";
  function branch(side:number) {
    return draw(Array.from({length:121},(_,i):XY=>{
      const y=-height+2*height*i/120;
      return [kind==="parabola"?y*y/(2*b):side*2*Math.sqrt(1+(y/b)**2),y];
    }));
  }
  return kind==="parabola"?branch(1):branch(-1)+" "+branch(1);
}

function equation(a:number,b:number,rhs:number) {
  let text="";
  for (const [coefficient,variable] of [[a,"x"],[b,"y"]] as const) {
    if (Math.abs(coefficient)<1e-9) continue;
    const sign=coefficient<0?"-":text?"+":"";
    const factor=Math.abs(Math.abs(coefficient)-1)<1e-9?"":fmt(Math.abs(coefficient));
    text+=sign+factor+variable;
  }
  return (text||"0")+"="+fmt(rhs);
}

function segment(line:Line,zoom=1) {
  const hits=visibleSegment(line,xmax*zoom,ymax*zoom);
  return hits.length===2?draw(hits):"";
}

function Control({label,tex,value,limit,change}:{
  label:string; tex:string; value:number; limit:[number,number]; change:(v:number)=>void
}) {
  return <label className="polar-control"><span>{label} <Formula tex={tex+"="+fmt(value)}/></span>
    <input type="range" min={limit[0]} max={limit[1]} step={0.1} value={value} onChange={e=>change(Number(e.target.value))}/></label>;
}

function ConstructionDrawing({c,step,zoom}:{c:NonNullable<ReturnType<typeof secantConstruction>>;step:number;zoom:number}){
  const {A,B,C,D,X,Y}=c;
  const lines=[joining(A,B),joining(C,D)];
  if(step>=1)lines.push(joining(A,C),joining(B,D));
  if(step>=2)lines.push(joining(A,D),joining(B,C));
  const points=Object.entries(c).slice(0,4+Math.min(step,2));
  const used:XY[]=[];
  return <g>{lines.map((l,i)=><path key={i} d={segment(l,zoom)} stroke={i<2?"#8f80a6":i<4?"#4387a1":"#be7843"}
    fill="none" strokeDasharray={i<2?"6 4":undefined} strokeWidth="1.4"/>)}
    {points.map(([name,p],i)=>{
      const clearance=(q:XY)=>Math.min(...lines.map(([a,b,d])=>Math.abs(a*q[0]+b*q[1]+d)/Math.hypot(a,b)),
        ...used.map(t=>Math.hypot(t[0]-q[0],t[1]-q[1])/1.6),...points.map(([,t])=>Math.hypot(t[0]-q[0],t[1]-q[1])));
      const choices=Array.from({length:16},(_,j):XY=>[p[0]+.34*zoom*Math.cos(j*Math.PI/8),p[1]+.34*zoom*Math.sin(j*Math.PI/8)]);
      const label=choices.reduce((best,q)=>clearance(q)>clearance(best)?q:best);
      used.push(label);
      return <g key={name}><circle cx={sx(p[0])} cy={sy(p[1])} r={3.8*zoom} fill={i<4?"#655378":i===4?"#287488":"#a25c32"}/>
        <foreignObject x={sx(label[0])-9*zoom} y={sy(label[1])-10*zoom} width={18*zoom} height={20*zoom}>
          <div className="polar-marker" style={{fontSize:13*zoom}}><Formula tex={name}/></div>
        </foreignObject></g>;
    })}</g>;
}

export default function PolarLab() {
  const gid=useId().replace(/[^a-zA-Z0-9_-]/g,"")+"polar";
  const svg=useRef<SVGSVGElement>(null);
  const [kind,setKind]=useState<ConicKind>("ellipse"), [size,setSize]=useState(2);
  const [pole,setPole]=useState<XY>([4,1]), [showTangents,setShowTangents]=useState(true);
  const [step,setStep]=useState(-1),[playing,play]=useState(false),[fit,setFit]=useState(true);
  const construction=useMemo(()=>secantConstruction(kind,size,pole),[kind,size,pole]);
  const frozenZoom=useRef<number|null>(null);
  const finish=()=>{setStep(-1);play(false);};
  function locate(next:XY){finish();setPole(next);}
  useEffect(()=>{
    if(!playing)return;
    if(step>=3){play(false);return;}
    const timer=window.setTimeout(()=>setStep(step+1),1500);
    return ()=>window.clearTimeout(timer);
  },[step,playing]);
  const building=step>=0&&!!construction;
  const bounds=building&&fit?Math.max(1,...Object.values(construction).map(([x,y])=>Math.max(Math.abs(x)/(xmax*.88),Math.abs(y)/(ymax*.85)))):1;
  const zoom=frozenZoom.current??bounds;
  const left=(1-zoom)*W/2,top=(1-zoom)*H/2;
  const [u,v]=pole, para=kind==="parabola", ellipse=kind==="ellipse";
  const a=ellipse?3:2, den=fmt(size*size);
  const line=polarLine(kind,size,pole), contacts=contactPoints(kind,size,line);
  const atInfinity=Math.hypot(line[0],line[1])<1e-9;
  const onCurve=Math.abs(line[0]*u+line[1]*v+line[2])<1e-8;
  const polarPath=segment(line,zoom);
  const curve=para?"y^2="+fmt(2*size)+"x":"\\frac{x^2}{"+a*a+"}"+(ellipse?"+":"-")+"\\frac{y^2}{"+den+"}=1";
  const relation=para?"y_0 y=p(x+x_0)":"\\frac{x_0x}{a^2}"+(ellipse?"+":"-")+"\\frac{y_0y}{b^2}=1";
  const numeric=para?equation(size,-v,-size*u):equation(size*size*u,(ellipse?1:-1)*a*a*v,a*a*size*size);
  const outsideCount=contacts.filter(([x,y])=>Math.abs(x)>xmax*zoom||Math.abs(y)>ymax*zoom).length;
  let result="极线与曲线有两个实交点。从极点连向交点，得到两条实切线。";
  if(atInfinity) result="极点位于中心。极线方程在仿射平面内无解，在射影平面中对应无穷远直线。";
  else if(onCurve) result="极点落在曲线上，极线就是曲线在该点的切线。";
  else if(contacts.length===0) result="极线与曲线没有实交点。从这个极点无法引出实切线。";
  else if(contacts.length===1) result="极点落在一条渐近线上。极线有一个有限切点，另一个交点在无穷远处。";

  function move(e:PointerEvent<SVGSVGElement>) {
    const matrix=svg.current?.getScreenCTM();
    if(!matrix) return;
    const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());
    locate([clamp((p.x-W/2)/scale,4.5),clamp((H/2-p.y)/scale,3)]);
  }
  function choose(next:ConicKind) {
    finish();setKind(next); setSize(next==="hyperbola"?1.5:2);
    setPole(next==="parabola"?[-1,1]:next==="hyperbola"?[0,2]:[4,1]);
  }
  return <section className="polar-lab" aria-label="圆锥曲线的极点与极线">
    <header><h2>一个点怎样确定一条极线？</h2>
      <div className="polar-tabs" role="group" aria-label="曲线类型">{(Object.keys(names) as ConicKind[]).map(k=><button type="button" key={k} aria-pressed={k===kind} onClick={()=>choose(k)}>{names[k]}</button>)}</div>
    </header>
    <div className="polar-study">
      <figure>
        <svg ref={svg} className="polar-plot" viewBox={[left,top,W*zoom,H*zoom].join(" ")} role="img" aria-label={names[kind]+"及极线，极点坐标 "+u+"，"+v}
          onPointerDown={e=>{if(e.button!==0)return;frozenZoom.current=zoom;e.currentTarget.setPointerCapture(e.pointerId);move(e);}}
          onPointerMove={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))move(e);}} onLostPointerCapture={()=>{frozenZoom.current=null;setPole(p=>[...p]);}}>
          <defs><pattern id={gid} width={scale} height={scale} x={sx(0)} y={sy(0)} patternUnits="userSpaceOnUse"><path d={"M"+scale+" 0H0V"+scale} stroke="#cedbd4" strokeWidth="1" fill="none"/></pattern></defs>
          <rect x={left} y={top} width={W*zoom} height={H*zoom} fill="#f5f9f5"/><rect x={left} y={top} width={W*zoom} height={H*zoom} fill={"url(#"+gid+")"}/>
          <path d={segment([1,0,0],zoom)+" "+segment([0,1,0],zoom)} fill="none" stroke="#80958a" strokeWidth="1.3"/>
          {kind==="hyperbola"&&[1,-1].map(sign=><path key={sign} d={segment([sign*size/2,-1,0],zoom)} stroke="#8f9f94" strokeWidth="1.4" strokeDasharray="2 5"/>)}
          {showTangents&&!building&&!onCurve&&contacts.map((point,i)=><path key={i} d={segment(polarLine(kind,size,point),zoom)} fill="none" stroke="#8b6a3e" strokeWidth="1.7" strokeDasharray="6 4"/>)}
          <path d={outline(kind,size,ymax*zoom)} fill="none" stroke="#263e50" strokeWidth="3"/>
          {building&&construction&&<ConstructionDrawing c={construction} step={step} zoom={zoom}/>}
          {(!building||step===3)&&<path d={polarPath} fill="none" stroke="#087c63" strokeWidth="2.6"/>}
          {!building&&contacts.map(([x,y],i)=><circle key={i} cx={sx(x)} cy={sy(y)} r={onCurve?8:4.5} fill="white" stroke="#0a775e" strokeWidth="2"/>)}
          <circle cx={sx(u)} cy={sy(v)} r={11*zoom} fill="#bf5637" opacity=".14"/><circle cx={sx(u)} cy={sy(v)} r={5*zoom} fill="#a6472a" stroke="white" strokeWidth="1.6"/>
        </svg>
        <figcaption><span><i className="polar-dot"/>极点 <Formula tex="P"/></span><span><i className="polar-curve"/>曲线</span><span><i className="polar-line"/>极线</span>
          {(!building&&!onCurve&&showTangents&&contacts.length>0)&&<span><i className="polar-tangent"/>切线</span>}{!building&&contacts.length>0&&<span><i className="polar-contact"/>切点</span>}
          {kind==="hyperbola"&&<span><i className="polar-asymptote"/>渐近线</span>}</figcaption>
      </figure>
      <div className="polar-steps"><h3>从点到线</h3><ol>
        <li><strong>选曲线、定极点。</strong><Formula tex={curve} display/><Formula tex={"P=(x_0,y_0)=("+fmt(u)+","+fmt(v)+")"}/></li>
        <li><strong>写极线。</strong>{para?<span>在 <Formula tex="y^2=2px"/> 中，用 <Formula tex="y_0y"/> 与 <Formula tex="p(x+x_0)"/> 对应两边。</span>:<span>把平方项 <Formula tex="x^2,y^2"/> 分别换成 <Formula tex="x_0x,y_0y"/>。</span>}
          <Formula tex={relation} display/>{!atInfinity&&<p>代入得 <Formula tex={numeric}/>。</p>}</li>
        <li><strong>看切点。</strong>{result}{outsideCount>0&&<p>部分切点位于图框之外。</p>}{!atInfinity&&!polarPath&&<p>当前极线位于图框之外。</p>}</li>
      </ol></div>
    </div>
    <div className="polar-controls">
    <h3>两条割线作极线</h3>
    {construction?<><p>过极点取两条不同割线，分别交曲线于 <Formula tex="A,B"/> 与 <Formula tex="C,D"/>。内点也适用。</p>
      <div className="polar-tabs">{["作两条割线","交叉连接一","交叉连接二","连接两交点"].map((s,i)=><button key={s} aria-pressed={step===i} onClick={()=>{play(false);setStep(i);}}>{s}</button>)}</div>
      {step>=0&&<p role="status"><Formula tex={["P=AB\\cap CD","X=AC\\cap BD","Y=AD\\cap BC","\\ell_P=XY"][step]}/>。{["取四个不同的实交点。","延长两条连接线求第一个对边交点。","换另一组对边求第二个交点。","内接完全四点形的对角三点构成自极三角形，故这条直线就是所求极线。"][step]}</p>}
      <div className="polar-actions"><button onClick={()=>{if(!playing&&(step<0||step===3))setStep(0);play(!playing);}}>{playing?"暂停作图":"播放作图"}</button><button onClick={()=>{setStep(0);play(true);}}>从头演示</button>
      <button disabled={step<0} onClick={finish}>收起辅助线</button>
      <label><input type="checkbox" checked={fit} onChange={e=>setFit(e.target.checked)}/>容纳全部作图点</label></div></>:
      <p>{onCurve?"割线的两组交点都含极点，四点形退化。此时直接由极线方程得到该点处的切线。":atInfinity?"过中心的两条弦均被中心平分。四个端点构成平行四边形，两组对边的交点均在无穷远处。":"这组割线未能分开有限作图点，请移动极点或调整参数。"}</p>}
    <p><a href="https://sites.math.washington.edu/~king/coursedir/m445w03/class/03-12-conicpolar.html" target="_blank" rel="noreferrer">直尺作图依据 · 华盛顿大学几何课程</a></p>
    <div className="polar-sliders">
      <Control label="极点横坐标" tex="x_0" value={u} limit={[-4.5,4.5]} change={x=>locate([x,v])}/>
      <Control label="极点纵坐标" tex="y_0" value={v} limit={[-3,3]} change={y=>locate([u,y])}/>
      <Control label={para?"焦参数":ellipse?"纵半轴":"虚半轴"} tex={para?"p":"b"} value={size} limit={[1,3]} change={s=>{finish();setSize(s);}}/>
    </div>
    <div className="polar-actions"><label><input type="checkbox" checked={showTangents} onChange={e=>setShowTangents(e.target.checked)}/>显示切线</label>
      <button type="button" onClick={()=>locate(para?[0,0]:[a,0])}>{para?"移到顶点":"移到曲线上"}</button>
      <button type="button" onClick={()=>{locate(para?[2,0]:ellipse?[1.8,0.6]:[3,0.2]);setStep(0);}}>观察内点作图</button>
      {!para&&<button type="button" onClick={()=>locate([0,0])}>移到中心</button>}
      {kind==="hyperbola"&&<button type="button" onClick={()=>locate([2,size])}>移到渐近线</button>}
      <button type="button" onClick={()=>{choose(kind);setShowTangents(true);}}>重置</button>
    </div><p>点击或拖动图面可移动极点。每个网格边长为 <Formula tex="1"/>。</p>
    </div>
  </section>;
}
