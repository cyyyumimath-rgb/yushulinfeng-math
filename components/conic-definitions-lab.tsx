"use client";

import {useEffect,useRef,useState,type PointerEvent} from "react";
import {Formula} from "./math-text";
import {conicMeasurements,cutExtent,cutKind,cutPoint,projectCut,type XYZ} from "./conic-definitions-geometry";
import type {ConicKind,XY} from "./polar-lab-geometry";
import "./polar-lab.css";

const names={ellipse:"椭圆",parabola:"抛物线",hyperbola:"双曲线"};
const namesOfViews=["第一定义 · 距离轨迹","第二定义 · 焦点准线","第三定义 · 斜率积","圆锥截线"];
const M=(tex:string)=><Formula tex={tex}/>;
const f=(v:number)=>String(Number(v.toFixed(3)));
function Range({label,symbol,value,min,max,step,change}:{label:string;symbol:string;value:number;min:number;max:number;step:number;change:(n:number)=>void}) {
  return <label className="polar-control"><span>{label} {M(symbol+"="+f(value))}</span><input type="range" aria-label={label} value={value} min={min} max={max} step={step} onChange={e=>change(Number(e.target.value))}/></label>;
}
function path(points:XY[]) {return points.map(([x,y],i)=>(i?"L":"M")+x.toFixed(2)+" "+y.toFixed(2)).join(" ");}

function PlaneFigure({kind,size,t,branch,view,slope,move}:{kind:ConicKind;size:number;t:number;branch:number;view:number;slope:boolean;move:(t:number,branch:number)=>void}) {
  const d=conicMeasurements(kind,size,t,branch);
  const parabola=kind==="parabola",showDirectrix=!slope&&(view===1||parabola);
  const far=conicMeasurements(kind,size,1,branch).P;
  const bound=Math.max(4,Math.abs(far[0])+.7,Math.abs(d.F[0])+.7,showDirectrix?Math.abs(d.directrix)+.7:0);
  const scale=Math.min(207/bound,138/3.1);
  const project=([x,y]:XY):XY=>[220+x*scale,156-y*scale];
  const line=(p:XY,q:XY,color:string,dash=false)=><path d={path([project(p),project(q)])} fill="none" stroke={color} strokeWidth="2" strokeDasharray={dash?"5 4":undefined}/>;
  const mark=(p:XY,fill:string,r=4.3)=><circle cx={project(p)[0]} cy={project(p)[1]} r={r} fill={fill} stroke="#fff" strokeWidth="1.5"/>;
  const sample=(branch:number):XY[]=>Array.from({length:201},(_,i)=>{
    const u=(i/100-1)*(kind==="ellipse"?1:(156/scale)/2.7);
    return project(conicMeasurements(kind,size,u,branch).P);
  });
  const A:XY=[-d.a,0],B:XY=[d.a,0];
  function drag(event:PointerEvent<SVGSVGElement>){
    const ctm=event.currentTarget.getScreenCTM();if(!ctm)return;
    const raw=new DOMPoint(event.clientX,event.clientY).matrixTransform(ctm.inverse());
    const x=(raw.x-220)/scale,y=(156-raw.y)/scale;
    const next=kind==="ellipse"?Math.atan2(y/d.b,x/d.a)/Math.PI:Math.max(-1,Math.min(1,y/2.7));
    move(next,kind==="hyperbola"&&x!==0?Math.sign(x):branch);
  }
  return <figure className="cd-figure"><svg viewBox="0 0 440 312" role="img" aria-label={names[kind]+"、动点和定义中的距离关系，可拖动或使用动点参数滑块"}
    onPointerDown={e=>{if(e.button!==0)return;e.currentTarget.setPointerCapture(e.pointerId);drag(e);}}
    onPointerMove={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))drag(e);}}>
    <rect width="440" height="312" fill="#f5f9f5"/>
    <path d="M 6 156 H 434 l-5 -3 m5 3 -5 3 M 220 305 V 7 l-3 5 m3 -5 3 5" fill="none" stroke="#a8b9ad"/>
    {showDirectrix&&line([d.directrix,-156/scale],[d.directrix,156/scale],"#938461",true)}
    {[...(kind==="hyperbola"?[-1,1]:[1])].map(v=><path key={v} d={path(sample(v))} fill="none" stroke="#294e51" strokeWidth="2.6"/>)}
    {slope?<>{line(A,d.P,"#9c643c")}{line(B,d.P,"#5775a0")}{mark(A,"#9c643c")}{mark(B,"#5775a0")}</>:
      <>{line(d.F,d.P,"#9c643c")}{mark(d.F,"#9c643c")}
        {showDirectrix?<>{line(d.P,d.H,"#5775a0",true)}{mark(d.H,"#5775a0")}</>:<>{line(d.G,d.P,"#5775a0")}{mark(d.G,"#5775a0")}</>}
      </>}
    {mark(d.P,"#13715f",5.6)}
    </svg><figcaption><span className="cd-green">动点 {M("P")}</span>
      <span className="cd-orange">{slope?<>左顶点 {M("A")}</>:<>焦点 {M("F")}</>}</span>
      <span className="cd-blue">{slope?<>右顶点 {M("B")}</>:showDirectrix?<>准线垂足 {M("H")}</>:<>另一焦点 {M("G")}</>}</span></figcaption>
      <div className="cd-read">{M("P\\approx\\left("+f(d.P[0])+","+f(d.P[1])+"\\right)")}</div>
    </figure>;
}

function ConeFigure({m,angle,overview,rotate}:{m:number;angle:number;overview:boolean;rotate:(angle:number)=>void}) {
  const gesture=useRef<{start:number;angle:number}|null>(null);
  const h=1,length=cutExtent(m,overview);
  const project=(p:XYZ)=>projectCut(p,angle,length);
  const edges:string[]=[];
  for(let i=0;i<16;i++){
    const t=i*Math.PI/8;
    const q:XYZ=[length*Math.cos(t),length*Math.sin(t),length];
    edges.push(path([project(q),project([0,0,0]),project([-q[0],-q[1],-q[2]])]));
  }
  for(const z of [-length,-length*.5,length*.5,length]){
    edges.push(path(Array.from({length:121},(_,i)=>project([z*Math.cos(i*Math.PI/60),z*Math.sin(i*Math.PI/60),z]))));
  }
  const x1=Math.max(-length,(-length-h)/m),x2=Math.min(length,(length-h)/m);
  const plane:XYZ[]=[[x1,-length/1.25,h+m*x1],[x1,length/1.25,h+m*x1],[x2,length/1.25,h+m*x2],[x2,-length/1.25,h+m*x2]];
  const strips:XY[][]=[];
  let strip:XY[]=[];
  for(let i=0;i<=1000;i++){
    const q=cutPoint(m,h,i*Math.PI/500);
    if(q&&Math.abs(q[2])<=length){
      strip.push(project(q));
    }else if(strip.length){strips.push(strip);strip=[];}
  }
  if(strip.length)strips.push(strip);
  return <figure className="cd-figure"><svg viewBox="0 0 440 312" role="img" aria-label="双圆锥、斜截平面与截线，水平拖动可转动视角"
    onPointerDown={e=>{if(e.button!==0)return;e.currentTarget.setPointerCapture(e.pointerId);gesture.current={start:e.clientX,angle};}}
    onPointerMove={e=>{if(gesture.current)rotate((gesture.current.angle+(e.clientX-gesture.current.start)*.7+3600)%360);}}
    onLostPointerCapture={()=>{gesture.current=null;}}>
    <rect width="440" height="312" fill="#f5f9f5"/>
    {edges.map((d,i)=><path key={i} d={d} fill="none" stroke="#a0b1af" strokeWidth={i<16?.85:1.2}/>)}
    <path d={path(plane.map(project))+" Z"} fill="#b198c0" fillOpacity=".25" stroke="#9a84a3" strokeWidth="1.1"/>
    {strips.map((s,i)=><path key={i} d={path(s)} fill="none" stroke="#14705b" strokeWidth="3"/>)}
    </svg><figcaption><span>灰线为双圆锥面，淡紫色为截平面，绿色为交线。</span>
      {!overview&&m!==1&&1/Math.abs(1-m)>length&&<span>{m<1?"椭圆远端超出当前视窗，可切到全景观察闭合交线。":"双曲线的另一支位于当前视窗外，可切到全景观察两支。"}</span>}
    </figcaption></figure>;
}

export default function ConicDefinitionsLab(){
  const [kind,setKind]=useState<ConicKind>("ellipse"),[view,setView]=useState(0);
  const [size,setSize]=useState(1.6),[t,setT]=useState(.25),[branch,setBranch]=useState(1);
  const [tilt,setTilt]=useState(.5),[angle,setAngle]=useState(28),[overview,setOverview]=useState(false),[running,run]=useState(false);
  const startT=useRef(.25);
  const para=kind==="parabola",ell=kind==="ellipse";
  const slope=view===2&&!para,cone=view===3||(view===2&&para);
  const title=para&&cone?"第三视角 · 截线刻画":namesOfViews[view];
  const d=conicMeasurements(kind,size,t,branch);
  useEffect(()=>{
    if(!running)return;
    const start=performance.now();
    const timer=window.setInterval(()=>{
      if(cone){setAngle(v=>(v+2)%360);return;}
      const distance=(performance.now()-start)/4500+startT.current+1;
      const phase=distance%(ell?2:4);
      setT(ell||phase<=2?phase-1:3-phase);
    },65);
    return ()=>window.clearInterval(timer);
  },[running,cone,ell]);
  function selectKind(k:ConicKind){run(false);setKind(k);setTilt(k==="ellipse"?.5:k==="parabola"?1:1.6);if(k==="parabola"&&view===2)setView(3);}
  function selectView(v:number){run(false);setView(v);}
  const display=(tex:string)=><Formula tex={tex} display/>;
  return <section className="polar-lab cd-lab" aria-label="圆锥曲线的三种定义视角">
    <header><h2>同一条曲线可以怎样定义？</h2><p>{para?<>抛物线以焦点、准线等距为定义，也就是离心率 {M("e=1")} 的情形。第三个视角从圆锥截线研究这条轨迹。</>:"用焦点距离、准线和顶点斜率积研究轨迹，也可以观察平面截圆锥的过程。"}</p></header>
    <div className="polar-study">
      {cone?<ConeFigure m={tilt} angle={angle} overview={overview} rotate={v=>{run(false);setAngle(v);}}/>:<PlaneFigure kind={kind} size={size} t={t} branch={branch} view={view} slope={slope}
        move={(v,side)=>{run(false);setT(v);setBranch(side);}}/>}
      <div className="polar-steps"><h3>{names[kind]} · {title}</h3>
        {view===0?<>{para?<><p>给定定点和一条不经过它的直线。动点到焦点的距离等于到这条直线的垂直距离，其轨迹为抛物线。</p>
          {display("PF=PH,\\quad F=(p/2,0),\\quad\\ell:x=-p/2")}{display("y^2=2px,\\quad p>0")}</>:
          <><p>固定两个不同焦点。让动点到两焦点的距离{ell?"之和":"之差的绝对值"}保持为常数，并检查常数与焦距的关系。</p>
          {display(ell?"PF+PG=2a>FG=2c":"|PF-PG|=2a,\\qquad 0<2a<FG=2c")}
          {display((ell?"PF+PG":"|PF-PG|")+"="+f(2*d.a))}</>}
          <div>{M("PF\\approx "+f(d.pf))}　{M((para?"PH":"PG")+"\\approx "+f(para?d.ph:d.pg))}</div></>:
        view===1?<><p>固定焦点和相应的准线。动点到焦点的距离与到准线的垂直距离之比为常数。改变动点，比较两段长度的比。</p>
          {display("\\frac{PF}{PH}=e"+(para?"=1":ell?"<1":">1"))}
          {display("\\ell:\\;x\\approx "+f(d.directrix)+",\\qquad F\\approx("+f(d.c)+",0)")}
          {display("PF\\approx "+f(d.pf)+",\\quad PH\\approx "+f(d.ph)+",\\quad e\\approx "+f(d.e))}
          {para&&<p>抛物线的等距轨迹正是离心率等于一时的情形。</p>}</>:
        slope?<><p>取横轴上的两顶点，分别与动点连接。只要两条斜率都有定义，它们的乘积便保持不变。</p>
          {display("A=(-a,0),\\quad B=(a,0)")}
          {display("k_{AP}k_{BP}=\\frac{y^2}{x^2-a^2}="+(ell?"-":"")+"\\frac{b^2}{a^2}")}
          <p>{d.slopeProduct===null?"动点到达顶点，此处不能定义两条连线的斜率。":<>当前乘积 {M("\\approx "+f(d.slopeProduct))}。</>} 用斜率积直接定义的轨迹缺两个顶点，取闭包后得到整条曲线。</p></>:
          <><p>取直圆锥的上下两叶，用一个不过顶点的平面截它。转动视角看交线，调节倾斜程度观察类别转换。</p>
          {display("x^2+y^2=z^2,\\qquad z=1+mx")}
          {display("(1-m^2)x^2+y^2-2mx=1")}
          <p>{ell?"当斜率介于零与一之间时，平面只截一叶，交线闭合。":para?"平面平行于一条母线。消元后得到抛物线，沿开口方向延伸。":"平面同时截到两叶，各自给出双曲线的一支。"} 末式是交线在 {M("xy")} 平面上的投影方程。图中显示有限范围内的锥面。</p>
          {para&&<p>椭圆和双曲线借助同一条轴的两个相对顶点建立斜率积关系。抛物线只有一个顶点，采用焦点—准线或截线刻画。</p>}</>}
      </div>
    </div>
    <div className="polar-controls"><div className="polar-tabs">{(Object.keys(names) as ConicKind[]).map(k=><button key={k} aria-pressed={kind===k} onClick={()=>selectKind(k)}>{names[k]}</button>)}</div>
      <div className="polar-tabs" role="group" aria-label="选择定义或截线视角">{namesOfViews.map((name,i)=>para&&i===2?null:
        <button key={name} aria-pressed={i===view||(para&&cone&&i===3)} onClick={()=>selectView(i)}>{para&&i===3?"第三视角 · 截线刻画":name}</button>)}</div>
      {cone&&<div className="polar-actions" role="group" aria-label="截线观察范围">
        <button aria-pressed={!overview} onClick={()=>setOverview(false)}>局部 · 固定比例</button>
        <button aria-pressed={overview} onClick={()=>setOverview(true)}>全景 · 观察截形</button>
      </div>}
      <div className="polar-sliders">{cone?<><Range label="截平面斜率" symbol="m" min={.15} max={2} step={.05} value={tilt} change={v=>{setTilt(v);setKind(cutKind(v));}}/>
        <Range label="观察方位角" symbol="\theta/{}^\circ" min={0} max={360} step={1} value={angle} change={v=>{run(false);setAngle(v);}}/></>:
        <><Range label="动点参数" symbol="t" min={-1} max={1} step={.01} value={t} change={v=>{run(false);setT(v);}}/>
        <Range label={para?"焦参数":ell?"纵半轴":"虚半轴"} symbol={para?"p":"b"} min={.8} max={2.4} step={.1} value={size} change={setSize}/></>}</div>
      <p>{cone?"水平拖动图面可转动双圆锥。":"拖动图面或移动滑块，观察几何量随点移动。"}</p>
      <div className="polar-actions"><button onClick={()=>{startT.current=t;run(!running);}}>{running?"暂停":cone?"旋转观察":"播放动点轨迹"}</button>
        {!cone&&kind==="hyperbola"&&<button onClick={()=>setBranch(-branch)}>切换到{branch===1?"左":"右"}支</button>}
        <button onClick={()=>{run(false);setT(.25);setSize(1.6);setBranch(1);setAngle(28);setOverview(false);selectKind(kind);}}>重置参数</button></div>
      <details><summary>定义与命名依据</summary><p>部分高中教辅将椭圆、双曲线的顶点斜率积刻画称作“第三定义”，本案例沿用这一用法，并另列圆锥截线。抛物线的第一与第二视角共享等距条件，第三视角采用截线刻画。</p>
        <a href="https://faculty.ecnu.edu.cn/_upload/article/files/bf/65/6a540d9040668953474a000b12c8/12845571-e1e5-4c98-b247-a6d746a3a90f.pdf#page=43" target="_blank" rel="noreferrer">徐超《HPM 视角下的“抛物线及其标准方程”教学》</a>　<a href="https://m.fx361.com/news/2025/0424/26933087.html" target="_blank" rel="noreferrer">冯爱龙《溯源教材：基于关键能力培养的“圆锥曲线第三定义”复习课探究》</a></details>
    </div>
  </section>;
}

