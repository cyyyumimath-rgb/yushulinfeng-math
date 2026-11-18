"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import MathText,{Formula} from "./math-text";
import {drawingLesson,projectionNames,solidNames,type DrawingSolid,type ProjectionMethod} from "../lib/drawing-models";
import type {V2} from "../lib/section-geometry";
import "./drawing-lab.css";

const pointList=(points:V2[])=>points.map(p=>p.join(",")).join(" ");

// Use equally spaced targets so that straight edges and ellipse arcs have the
// same tracing tolerance regardless of the source path's vertex count.
function samples(points:V2[]){
  const lengths=[0];
  for(let i=1;i<points.length;i++) lengths.push(lengths[i-1]+Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]));
  const total=lengths[lengths.length-1], count=Math.max(2,Math.ceil(total/3));
  let j=1;
  return Array.from({length:count+1},(_,i):V2=>{
    const distance=total*i/count;
    while(lengths[j]<distance && j<lengths.length-1) j++;
    const t=(distance-lengths[j-1])/(lengths[j]-lengths[j-1]||1);
    return [points[j-1][0]+t*(points[j][0]-points[j-1][0]),points[j-1][1]+t*(points[j][1]-points[j-1][1])];
  });
}

export default function DrawingLab(){
  const [solid,setSolid]=useState<DrawingSolid>("cube");
  const [method,setMethod]=useState<ProjectionMethod>("oblique");
  const lesson=useMemo(()=>drawingLesson(solid,method),[solid,method]);
  const [index,setIndex]=useState(0),[progress,setProgress]=useState(0);
  const [play,setPlay]=useState(false),[trace,setTrace]=useState(false);
  const [guides,setGuides]=useState(true);
  const count=lesson.strokes.length, done=index>=count;
  const current=lesson.strokes[index];
  const path=useMemo(()=>current?samples(current.points):[],[current]);
  const traceIndex=useRef(0),pointer=useRef<number|null>(null),playFrom=useRef(0);
  const tip=path[Math.round(progress*(path.length-1))];
  const end=path[path.length-1];

  useEffect(()=>{
    if(!play||done) return;
    const start=performance.now();
    const from=playFrom.current;
    const duration=window.matchMedia("(prefers-reduced-motion: reduce)").matches?550:1600;
    let frame:number;
    function tick(now:number){
      const t=Math.min(1,from+(now-start)/duration);
      setProgress(t);
      if(t<1) frame=requestAnimationFrame(tick);
      else {
        playFrom.current=0;
        setIndex(i=>i+1);setProgress(0);
        if(index+1===count) setPlay(false);
      }
    }
    frame=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(frame);
  },[play,done,index,count]);

  function seek(next:number){
    setPlay(false);setIndex(next);setProgress(0);
    playFrom.current=0;traceIndex.current=0;pointer.current=null;
  }
  function change(s:DrawingSolid,m:ProjectionMethod){seek(0);setTrace(false);setSolid(s);setMethod(m);}
  function togglePlay(){
    if(play){setPlay(false);return;}
    if(done)seek(0);
    playFrom.current=done?0:progress;
    setTrace(false);setPlay(true);
  }
  function advanceTrace(event:React.PointerEvent<SVGSVGElement>){
    if(!trace||done||event.pointerId!==pointer.current) return;
    const matrix=event.currentTarget.getScreenCTM(); if(!matrix) return;
    const p=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());
    const tolerance=Math.max(7,Math.min(15,9/matrix.a));
    let next=traceIndex.current;
    // Only a bounded run ahead may be consumed; crossing the finish early
    // cannot complete a stroke without following it from its start.
    for(let j=next;j<Math.min(path.length,traceIndex.current+11);j++)
      if(Math.hypot(path[j][0]-p.x,path[j][1]-p.y)<=tolerance) next=j;
    traceIndex.current=next;
    setProgress(next/(path.length-1));
    if(next===path.length-1){seek(index+1);}
  }

  return <section className="drawing-lab" aria-label="几何体逐笔作图">
    <header className="drawing-lab__head"><h3>把空间几何体画在纸上</h3><p>跟随逐笔演示在纸上作图，也可以在屏幕上从起笔点沿淡红线描一遍。</p></header>
    <div className="drawing-lab__options">
      <div role="group" aria-label="几何体">{(Object.keys(solidNames) as DrawingSolid[]).map(s=><button key={s} aria-pressed={s===solid} onClick={()=>change(s,method)}>{solidNames[s]}</button>)}</div>
      <div role="group" aria-label="投影方法">{(Object.keys(projectionNames) as ProjectionMethod[]).map(m=><button key={m} aria-pressed={m===method} onClick={()=>change(solid,m)}>{projectionNames[m]}</button>)}</div>
    </div>
    <div className="drawing-lab__body"><div className="drawing-lab__paper">
      <svg className={trace?"drawing-lab__tracing":""} viewBox="0 0 420 278" role="img" aria-label={solidNames[solid]+"的"+projectionNames[method]+"分笔投影"}
        onPointerDown={e=>{
          if(!trace||done) return;
          const matrix=e.currentTarget.getScreenCTM(); if(!matrix)return;
          const hit=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());
          if(Math.hypot(hit.x-tip[0],hit.y-tip[1])>18) return;
          pointer.current=e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId); advanceTrace(e);
        }} onPointerMove={advanceTrace} onLostPointerCapture={()=>{pointer.current=null;}}>
        {guides&&!done&&lesson.guides.filter(g=>index>=g.from&&index<=g.until).map((g,i)=><polyline key={i} points={pointList(g.points)} fill="none" stroke="#8d998c" strokeWidth=".95" strokeDasharray="3 4"/>)}
        {lesson.strokes.map((stroke,i)=><polyline key={i} points={pointList(stroke.points)} fill="none" stroke={i<index?"#203a37":i===index?"#bd6258":"#b9c5bb"} strokeWidth={i===index?3:i<index?2.5:1.3}
          strokeOpacity={i===index?.58:1} strokeDasharray={stroke.hidden?"6 4":undefined} strokeLinejoin="round" strokeLinecap="round"/>)}
        {current&&<>
          <polyline points={pointList(path.slice(0,Math.round(progress*(path.length-1))+1))} fill="none" stroke="#b44032" strokeWidth="3.2" strokeDasharray={current.hidden?"6 4":undefined} strokeLinejoin="round" strokeLinecap="round"/>
          <circle cx={end[0]} cy={end[1]} r="4.8" fill="white" stroke="#b84b3e" strokeWidth="1.5"/>
          <circle cx={tip[0]} cy={tip[1]} r="6" fill="#b84b3e" stroke="white" strokeWidth="2"/>
        </>}
      </svg>
      <div className="drawing-lab__legend"><span><i/>当前笔尖</span><span><i/>收笔点</span><span><b/>隐藏棱或弧</span></div>
    </div>
    <aside className="drawing-lab__instruction" aria-live="polite">
      <small>{done?"作图完成":<>第 <Formula tex={String(index+1)}/> 笔，共 <Formula tex={String(count)}/> 笔</>}</small>
      <h4>{current?<MathText text={current.caption}/>:solidNames[solid]+"已画完"}</h4>
      <p>{current?current.tip:"对照成图检查平行关系、对应边长与虚实线，再在空白纸上独立画一次。"}</p>
      {current&&<p className="drawing-lab__line-tip">{current.hidden?"本笔画虚线，表示被遮挡的轮廓。":"本笔画实线，表示可见的轮廓。"}</p>}
    </aside></div>
    <div className="drawing-lab__tools">
      <button type="button" aria-pressed={play} onClick={togglePlay}>{play?"暂停演示":done?"重播演示":"播放演示"}</button>
      <button type="button" aria-pressed={trace} onClick={()=>{seek(done?0:index);setTrace(!trace);}}>{trace?"结束描红":"自己描红"}</button>
      <button type="button" disabled={index===0&&progress===0} onClick={()=>seek(Math.max(0,index-1))}>上一步</button>
      <button type="button" disabled={done} onClick={()=>seek(index+1)}>下一步</button>
      <button type="button" onClick={()=>seek(0)}>从头开始</button>
      {lesson.guides.length>0&&<label><input type="checkbox" checked={guides} onChange={e=>setGuides(e.target.checked)}/>显示辅助线</label>}
    </div>
    <p className="drawing-lab__projection">{method==="oblique"?<>斜二测中，横轴水平，竖轴竖直，两轴上的长度照原长画。纵深轴向右上方倾斜 <Formula tex="45^\circ"/>，该轴上的长度取原长的 <Formula tex="\tfrac12"/>。</>:<>正等轴测中，三条正轴的投影两两成 <Formula tex="120^\circ"/>。横向两轴分别朝左下与右下，竖轴朝上。三轴采用相同的缩短系数 <Formula tex="\sqrt{2/3}"/>，作图可统一选取图上单位长度。</>}</p>
  </section>;
}
