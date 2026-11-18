"use client";
import {useState} from "react";
import {PlotMath} from "./plot-math";
import {placePointLabels,type Pixel} from "../lib/plot-labels";
import {Formula} from "./math-text";

type Point = [number,number,number];
type Vertex = "A"|"B"|"C"|"D"|"P";
const A:Point=[-1.5,-1,0], B:Point=[1.5,-1,0], D:Point=[-1.05,1,0], P:Point=[-.15,.05,2.65];
const facets:Vertex[][]=[["A","D","C","B"],["A","B","P"],["B","C","P"],["C","D","P"],["D","A","P"]];
const edges:[Vertex,Vertex][]=[["A","B"],["B","C"],["C","D"],["D","A"],["P","A"],["P","B"],["P","C"],["P","D"]];
function along(start:Point,end:Point,t:number): Point {
  return [start[0]+(end[0]-start[0])*t,start[1]+(end[1]-start[1])*t,start[2]+(end[2]-start[2])*t];
}
function normal(a:Point,b:Point,c:Point):Point {
  const u=b.map((v,i)=>v-a[i]),v=c.map((n,i)=>n-a[i]);
  return [u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
}

export default function PyramidLab(){
 const [side,setSide]=useState(false),[parallelBase,setBase]=useState(false);
 const [ratio,setRatio]=useState(.55),[angle,setAngle]=useState(26);
 const C:Point=[parallelBase?1.95:.62,1,0];
 const vertices={A,B,C,D,P},theta=angle*Math.PI/180,elevation=.33;
 const camera=[Math.sin(theta)*Math.cos(elevation),-Math.cos(theta)*Math.cos(elevation),Math.sin(elevation)];
 function project([x,y,z]:Point):Pixel{
   const horizontal=x*Math.cos(theta)+y*Math.sin(theta),depth=-x*Math.sin(theta)+y*Math.cos(theta);
   return [245+horizontal*84,244-84*(z*Math.cos(elevation)+depth*Math.sin(elevation))];
 }
 const visibleFaces=facets.filter(([a,b,c])=>normal(vertices[a],vertices[b],vertices[c]).reduce((sum,v,i)=>sum+v*camera[i],0)>0);
 const sideStart=side?B:A,sideEnd=side?C:B,M=along(P,sideStart,ratio),N=along(P,sideEnd,ratio);
 const baseEdge=side?"BC":"AB",target=side?"AD":"DC",face=side?"PBC":"PAB",exists=!side||parallelBase;
 function line(a:Point,b:Point,color:string,width:number,dash?:string){
   const [x1,y1]=project(a),[x2,y2]=project(b);
   return <line {...{x1,y1,x2,y2}} stroke={color} strokeWidth={width} strokeDasharray={dash} strokeLinecap="round"/>;
 }
 const targetStart=side?A:D,targetEnd=side?D:C;
 const names=["A","B","C","D","P","M","N"];
 const dots=[A,B,C,D,P,M,N].map(project);
 const lines:[Pixel,Pixel][]=edges.map(([a,b])=>[project(vertices[a]),project(vertices[b])]);
 const labels=placePointLabels(dots,[...lines,[project(M),project(N)]],490,312);
 return <section className="py-lab" aria-label="四棱锥平行作图实验">
 <div className="py-main"><div className="py-figure">
 <svg viewBox="0 0 490 312" role="img" aria-label={face+" 面内的线段 MN 与 "+baseEdge+" 平行，目标底边为 "+target}>
  <polygon points={[A,B,C,D].map(v=>project(v).join(",")).join(" ")} fill="#dbe6e4" opacity=".58"/>
  <polygon points={[P,sideStart,sideEnd].map(v=>project(v).join(",")).join(" ")} fill="#ccdfd3" opacity=".84"/>
  {edges.map(([a,b])=>{const visible=visibleFaces.some(f=>f.includes(a)&&f.includes(b));return <g key={a+b}>{line(vertices[a],vertices[b],visible?"#38524d":"#8a9c96",visible?2.1:1.5,visible?undefined:"5 5")}</g>;})}
  {line(targetStart,targetEnd,"#905936",3,side?undefined:"6 3")}{line(M,N,"#09745d",4)}
  {dots.map(([cx,cy],i)=><g key={names[i]}><circle {...{cx,cy}} r="3" fill={i<5?"#24463e":"#096551"}/><PlotMath x={labels[i][0]} y={labels[i][1]} tex={names[i]} size={14}/></g>)}
 </svg><div className="py-key"><span>侧面内的 <Formula tex="MN"/></span><span>目标底边 <Formula tex={target}/></span></div></div>
 <div className="py-controls">
 <label>作图任务<select value={side?"PBC":"PAB"} onChange={e=>setSide(e.target.value==="PBC")}><option value="PAB">在前侧面作后底边的平行线</option><option value="PBC">在右侧面作左底边的平行线</option></select></label>
 <label>底面形状<select value={parallelBase?"parallelogram":"trapezoid"} onChange={e=>setBase(e.target.value==="parallelogram")}><option value="trapezoid">只有一组对边平行的梯形</option><option value="parallelogram">平行四边形</option></select></label>
 <label>从顶点到两分点的比例 <output><Formula tex={Math.round(ratio*100)+"\\%"}/></output><input type="range" min="10" max="90" step="5" value={Math.round(ratio*100)} onChange={e=>setRatio(+e.target.value/100)}/></label>
 <label>水平观察角 <output><Formula tex={angle+"^\\circ"}/></output><input type="range" min="-25" max="65" value={angle} onChange={e=>setAngle(+e.target.value)}/></label>
 <button type="button" className="rl-button" onClick={()=>{setSide(false);setBase(false);setRatio(.55);setAngle(26);}}>重置实验</button>
 </div></div>
 <div className="py-proof"><h2>{exists?"可以作出平行线":"这个侧面内无法作出所求直线"}</h2>
 <p>在侧面 <Formula tex={face}/> 的两条侧棱上取点 <Formula tex="M,N"/>，使两点从顶点 <Formula tex="P"/> 出发所取的比例相同。由相似三角形可得</p>
 <Formula display tex={String.raw`\frac{PM}{P${side?"B":"A"}}=\frac{PN}{P${side?"C":"B"}}=${Number(ratio.toFixed(2))},\qquad MN\parallel ${baseEdge}.`}/>
 {exists?<p>底面内 <Formula tex={baseEdge+"\\parallel "+target}/>，由平行的传递性，直线 <Formula tex="MN"/> 就是所求直线。移动分点，可以得到同一侧面内的另一条解。</p>:<p>假设侧面 <Formula tex="PBC"/> 内有一条直线平行于 <Formula tex="AD"/>。它的方向也属于底面，因此平行于两平面的交线 <Formula tex="BC"/>。但当前底面的这两条侧边相交。切换成平行四边形，再比较这两条边。</p>}
 </div></section>;
}