"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Formula } from "./math-text";
import { advanceSlosh, cubeEdges, cubeFaces, cubeSection, dot, faceNormal, mix, sectionName, splitCube, splitCylinder, waveProfile, waterSection, type V2, type V3 } from "../lib/section-geometry";
import "./solid-section-labs.css";

type Project = (point: V3) => V2;
const coordinates = (points: V2[]) => points.map(p => p.join(",")).join(" ");
const presetPlanes: {title:string; n:V3; offset:number}[] = [
  {title:"等边三角形",n:[1,1,1],offset:1.5},
  {title:"正方形",n:[0,0,1],offset:0},
  {title:"矩形",n:[1,1,0],offset:0},
  {title:"五边形",n:[1,.75,.4],offset:.55},
  {title:"正六边形",n:[1,1,1],offset:0},
  {title:"等腰三角形",n:[1,1,.65],offset:2.1},
  {title:"不等边三角形",n:[1,.75,.4],offset:1.75},
  {title:"菱形",n:[1,.4,.4],offset:0},
  {title:"平行四边形",n:[1,.55,.3],offset:0},
  {title:"梯形",n:[1,.75,.4],offset:.8},
  {title:"一般六边形",n:[1,.85,.65],offset:.05},
];

function Range({label,value,onChange,min,max,unit="",step=1, symbol=""}:{
  label:string; value:number; onChange:(x:number)=>void; min:number; max:number; unit?:string; step?:number; symbol?:string
}) {
  const id=useId();
  return <label htmlFor={id} className="solid-lab__range">
    <span><span>{label} {symbol && <Formula tex={symbol}/>}</span><output><Formula tex={String(Number(value.toFixed(3)))+unit}/></output></span>
    <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))}/>
  </label>;
}

type TiltControl={value:number;change:(value:number)=>void};
function Orbit({title,render,scale=76,tilt}:{title:string; scale?:number; tilt?:TiltControl; render:(p:Project,eye:V3)=>ReactNode}) {
  const [yaw,setYaw]=useState(-29);
  const [pitch,setPitch]=useState(24);
  const drag=useRef<{x:number;y:number;yaw:number;pitch:number;tilt:number}|null>(null);
  const help=tilt?"上下拖动倾斜，左右拖动环视":"拖动旋转视角";
  const az=yaw*Math.PI/180, el=pitch*Math.PI/180;
  const project:Project=([x,y,z]) => [
    200+scale*(x*Math.cos(az)-y*Math.sin(az)),
    146+scale*((x*Math.sin(az)+y*Math.cos(az))*Math.sin(el)-z*Math.cos(el))
  ];
  return <div className="solid-lab__orbit">
    <div className="solid-lab__caption"><strong>{title}</strong><span>{help}</span></div>
    <svg viewBox="0 0 400 292" tabIndex={0} role="img" aria-label={title+"，"+help+"，可用方向键操作"}
      onPointerDown={e=>{
        drag.current={x:e.clientX,y:e.clientY,yaw,pitch,tilt:tilt?.value??0};
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={e=>{
        if(!drag.current) return;
        setYaw(drag.current.yaw+(e.clientX-drag.current.x)*.6);
        const delta=(e.clientY-drag.current.y)*.45;
        if(tilt)tilt.change(Math.round(Math.max(0,Math.min(90,drag.current.tilt+delta))));
        else setPitch(Math.max(-70,Math.min(70,drag.current.pitch+delta)));
      }}
      onLostPointerCapture={()=>{drag.current=null;}}
      onKeyDown={e=>{
        if (e.key==="ArrowLeft" || e.key==="ArrowRight") {
          e.preventDefault(); setYaw(x=>x+(e.key==="ArrowLeft"?-5:5));
        }
        if (e.key==="ArrowUp" || e.key==="ArrowDown") {
          e.preventDefault();
          const delta=e.key==="ArrowUp"?-5:5;
          if(tilt)tilt.change(Math.max(0,Math.min(90,tilt.value+delta)));
          else setPitch(x=>Math.max(-70,Math.min(70,x-delta)));
        }
      }}>{render(project,[Math.sin(az)*Math.cos(el),Math.cos(az)*Math.cos(el),Math.sin(el)])}</svg>
  </div>;
}

function TrueShape({points,title}:{points:V2[];title:string}) {
  const xs=points.map(p=>p[0]), ys=points.map(p=>p[1]);
  const cx=(Math.max(...xs)+Math.min(...xs))/2, cy=(Math.max(...ys)+Math.min(...ys))/2;
  const mapped=points.map(([x,y]):V2=>[120+(x-cx)*49,104-(y-cy)*49]);
  return <div className="solid-lab__true"><div className="solid-lab__caption"><strong>截面真形</strong><span>垂直截面观察</span></div>
    <svg viewBox="0 0 240 208" role="img" aria-label={"截面真形："+title}>
      {mapped.length>=3 && <polygon points={coordinates(mapped)} className="solid-lab__section"/>}
      {mapped.length===2 && <polyline points={coordinates(mapped)} className="solid-lab__cutline"/>}
      {mapped.length<=6 && mapped.map(([x,y],i)=><circle key={i} cx={x} cy={y} r="3.2" className="solid-lab__point"/>)}
    </svg>
    <span className="solid-lab__shape">{title}</span>
  </div>;
}

function useSeparation() {
  const [open,setOpen]=useState(false);
  const [gap,setGap]=useState(0);
  const position=useRef(0);
  useEffect(()=>{
    const from=position.current,target=open?1:0;
    if(from===target)return;
    if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){
      position.current=target;setGap(target);return;
    }
    const duration=Math.max(60,290*Math.abs(target-from)),start=performance.now();
    let frame:number;
    function tick(now:number){
      const t=Math.min(1,(now-start)/duration);
      position.current=from+(target-from)*t*t*(3-2*t);
      setGap(position.current);
      if(t<1)frame=requestAnimationFrame(tick);
    }
    frame=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(frame);
  },[open]);
  return {gap,open,setOpen};
}

function SeparationControls({open,enabled=true,onChange}:{open:boolean;enabled?:boolean;onChange:(next:boolean)=>void}){
  return <div className="solid-lab__buttons solid-lab__cut-actions">
    <button type="button" disabled={!enabled||open} onClick={()=>onChange(true)}>切开并分离</button>
    <button type="button" disabled={!open} onClick={()=>onChange(false)}>合拢</button>
  </div>;
}

const light:V3=[-.45,-.28,.84];
function surfaceColor(normal:V3,hue:number,saturation:number,level:number){
  const illumination=dot(normal,light)/(Math.hypot(...normal)||1);
  return "hsl("+hue+" "+saturation+"% "+Math.min(95,Math.max(24,level+illumination*13))+"%)";
}
export function CubeSectionLab() {
  const [preset,setPreset]=useState(4);
  const [offset,setOffset]=useState(0);
  const {n}=presetPlanes[preset], max=n.reduce((s,v)=>s+Math.abs(v),0);
  const cut=useMemo(()=>cubeSection(n,offset),[n,offset]);
  const pieces=useMemo(()=>splitCube(n,offset,cut.points),[n,offset,cut]);
const {gap,open,setOpen}=useSeparation();
  const direction=n.map(v=>v/Math.hypot(...n)) as V3;
  const travel=([x,y,z]:V3,side:number):V3=>[x+direction[0]*gap*side*.88,y+direction[1]*gap*side*.88,z+direction[2]*gap*side*.88];
  const label=sectionName(cut.flat);
  const equation = n.map((c,i)=> c ? (c===1?"":String(c))+"xyz"[i] : "").filter(Boolean).join("+")+"="+Number(offset.toFixed(2));
  return <section className="solid-lab" aria-label="正方体的平面截面">
    <div className="solid-lab__head"><h3>平面怎样切出五边形？</h3><p>选择一种截法，再平移截面。观察哪些棱上的交点在顶点处相遇。</p></div>
    <div className="solid-lab__diagrams">
<Orbit title="正方体与截面" scale={78/(1+gap*.48)} render={(p,eye)=>{
        const ordered=[...pieces].sort((a,b)=>(a.side-b.side)*dot(n,eye));
        const renderHalf=(piece:typeof pieces[number])=><g key={piece.side}>
          {piece.faces.filter(f=>!f.cap && dot(faceNormal(f.points),eye)>0).map((face,i)=>{
            const normal=faceNormal(face.points);
            return <polygon key={i} points={coordinates(face.points.map(q=>p(travel(q,piece.side))))}
              fill={surfaceColor(normal,piece.side===1?207:40,31,77)} fillOpacity=".87" stroke="#405c65" strokeWidth="1.45" strokeLinejoin="round"/>;
          })}
          <polygon points={coordinates(cut.points.map(q=>p(travel(q,piece.side))))} fill="#21a385"
            fillOpacity={dot(n,eye)*piece.side<0?.74:.18} stroke="#11614f" strokeWidth="1.7"
            strokeDasharray={dot(n,eye)*piece.side<0?undefined:"4 2"}/>
        </g>;
        const seam=<polygon points={coordinates(cut.points.map(p))} fill="#66bb9e" fillOpacity={gap===0?.58:.15}
          stroke="#106e53" strokeWidth={gap===0?2.4:1.55} strokeDasharray={gap===0?undefined:"5 3"}/>;
        if(gap>0 && ordered.length)return <>
          {renderHalf(ordered[0])}{seam}
          {cut.points.map((v,i)=><polyline key={i} points={coordinates([p(travel(v,-1)),p(travel(v,1))])} stroke="#90a99b" strokeWidth=".8" strokeDasharray="3 5" fill="none"/>)}
          {renderHalf(ordered[1])}</>;
        return <>
          {cubeFaces.filter(f=>dot(faceNormal(f),eye)>0).map((f,i)=><polygon key={i} points={coordinates(f.map(p))} fill={surfaceColor(faceNormal(f),197,30,76)} fillOpacity=".68"/>)}
          {cubeEdges.map(([a,b],i)=>{
            const visible=cubeFaces.some(f=>f.includes(a)&&f.includes(b)&&dot(faceNormal(f),eye)>0);
            return <polyline key={i} points={coordinates([p(a),p(b)])} fill="none" stroke={visible?"#36505b":"#8a9e9d"} strokeWidth={visible?2:1.15} strokeDasharray={visible?undefined:"5 4"}/>;
          })}
          {cut.points.length>=3&&seam}
          {cut.points.length===2&&<polyline points={coordinates(cut.points.map(p))} className="solid-lab__cutline"/>}
          {cut.points.map((point,i)=><circle key={i} cx={p(point)[0]} cy={p(point)[1]} r="3" className="solid-lab__point"/>)}
        </>;
      }}/>
      <TrueShape points={cut.flat} title={label}/>
    </div>
    <div className="solid-lab__controls"><div className="solid-lab__buttons" aria-label="截面预设">
{presetPlanes.map((plane,i)=><button type="button" key={plane.title} aria-pressed={preset===i && Math.abs(offset-plane.offset)<1e-8} onClick={()=>{setPreset(i);setOffset(plane.offset);}}>{plane.title}</button>)}
    </div><Range label="平面位置" symbol="d" min={-max} max={max} step={.01} value={offset} onChange={d=>{setOffset(d);if(Math.abs(d)>=max-1e-9)setOpen(false);}}/>
      <SeparationControls open={open} enabled={!!pieces.length} onChange={setOpen}/>
      <p role="status">{!pieces.length?"此位置只接触正方体边界。向中心移动平面，可切出两块有体积的实体。":open?"浅绿色虚线保留原截面，两块实体上的深绿色边界与它全等。":"实线为可见棱，虚线为被遮挡的棱。绿色边界是当前截面。"}</p>
      <p>当前截平面 <Formula tex={equation}/>，与正方体的公共部分是{label}。</p>
      <details><summary>怎样确定截面的边数？</summary><p>把正方体中心作为原点，各顶点坐标的分量均为 <Formula tex="\pm 1"/>。对每条棱，比较两个端点代入平面方程后的值。异号时棱的内部存在一个交点，等于零时端点本身就在平面上。合并重合的点，在同一个面内依次连线，就得到截面。</p>
      <p>每个面至多贡献一条截面边，因此非退化截面最多六条边。用平面 <Formula tex="x+y+z=0"/> 切割时，六个交点是六条棱的中点。各边相等，内角均为 <Formula tex="120^\circ"/>，得到正六边形。</p></details>
    </div>
  </section>;
}

const cylinderPresets = [
  {title:"圆",deg:0,fill:50},
  {title:"完整椭圆",deg:35,fill:50},
  {title:"上底截短",deg:50,fill:75},
  {title:"下底截短",deg:50,fill:25},
  {title:"两底截短",deg:70,fill:50},
  {title:"矩形",deg:90,fill:50},
];

function useSlosh(degrees:number,fill:number,shake:number,freeze:boolean){
  const [height,setHeight]=useState(0);
  const state=useRef({x:0,v:0,degrees,fill,shake});
  useEffect(()=>{
    const s=state.current;
    const impulse=(degrees-s.degrees)*.06+(fill-s.fill)*.035+(shake!==s.shake?1.5:0);
    Object.assign(s,{degrees,fill,shake});
    if(freeze||window.matchMedia("(prefers-reduced-motion: reduce)").matches){s.x=0;s.v=0;setHeight(0);return;}
    s.v=Math.max(-1.8,Math.min(1.8,s.v+impulse));
    if(Math.abs(s.x)+Math.abs(s.v)<.0008){setHeight(0);return;}
    let last=performance.now(),frame:number;
    function tick(now:number){
      Object.assign(s,advanceSlosh(s.x,s.v,Math.max(0,(now-last)/1000)));
      last=now;
      if(Math.abs(s.x)+Math.abs(s.v)/8<.00065){s.x=0;s.v=0;setHeight(0);return;}
      setHeight(s.x);frame=requestAnimationFrame(tick);
    }
    frame=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(frame);
  },[degrees,fill,shake,freeze]);
  return height;
}

function CylinderDrawing({cut,gap,amplitude,tilt}:{cut:ReturnType<typeof waterSection>;gap:number;amplitude:number;tilt?:TiltControl}) {
  const mesh=useMemo(()=>splitCylinder(cut.theta,cut.h),[cut]);
  const width=Math.max(...cut.flat.map(p=>Math.abs(p[1])));
  const waveRows=useMemo(()=>amplitude===0?[]:Array.from({length:13},(_,i)=>waveProfile(cut.theta,cut.h,width*(i/6-1)*.99999,width,amplitude)),[amplitude,cut,width]);
  return <div className="solid-lab__diagrams">
    <Orbit tilt={tilt} title={gap>0?"沿静水面切开的圆柱":"圆柱与水面"} scale={78/(1+.38*gap)} render={(p,eye)=>{
      const halves=eye[2]>=0?mesh.halves:[...mesh.halves].reverse();
      const axis:V3=[Math.sin(cut.theta),0,Math.cos(cut.theta)];
      const silhouette=mesh.bottom.map(q=>{const u=q[0]*Math.cos(cut.theta)-q[2]*Math.sin(cut.theta);
        return q[1]*(axis[2]*eye[0]-axis[0]*eye[2])-u*eye[1];});
      const ends=[silhouette.indexOf(Math.min(...silhouette)),silhouette.indexOf(Math.max(...silhouette))];
      const shifted=(v:V3,side:number)=>p([v[0],v[1],v[2]+side*gap*.84]);
      const guide=gap>0&&<polygon points={coordinates(cut.points.map(p))} fill="#61b0aa" fillOpacity=".14" stroke="#368879" strokeWidth="1.2" strokeDasharray="4 4"/>;
      function half(part:typeof halves[number]){
        const wet=part.side<0,project=(q:V3)=>shifted(q,part.side);
        const shell=part.faces.filter(face=>face.surface!=="section");
        const cap=part.faces[part.faces.length-1];
        function drawShell(front:boolean){
          return shell.map((face,i)=>{
            const normal=faceNormal(face.points);
            if((dot(eye,normal)>0)!==front)return null;
            const end=face.surface==="end";
            const color=surfaceColor(normal,wet?196:194,wet?51:20,wet?50:78);
            const alpha=wet?(front?.62:.37):(front?.16:.09);
            return <polygon key={i} points={coordinates(face.points.map(project))} fill={color} fillOpacity={alpha}
              stroke={end?"#456a73":color} strokeOpacity={end?(front?.78:.5):alpha} strokeWidth={end?1.35:.25}
              strokeDasharray={end&&!front?"4 2":undefined} strokeLinejoin="round"/>;
          });
        }
        return <g key={part.side}>
          {drawShell(false)}
          {(wet||gap>0)&&<polygon points={coordinates(cap.points.map(project))} fill={wet?"#53b7c6":"#d5f0ed"}
            fillOpacity={wet?.88:.57} stroke={wet?"#166a7b":"#3a887c"} strokeWidth="2"/>}
          {wet&&waveRows.map((row,i)=>row.length>0&&<g key={i}>
            {i>0&&waveRows[i-1].length>0&&<polygon points={coordinates([...row,...waveRows[i-1].slice().reverse()].map(project))}
              fill={i%2===0?"#58b3c5":"#83cccf"} fillOpacity=".75"/>}
            <polyline points={coordinates(row.map(project))} fill="none" stroke="#d2f1eb" strokeWidth=".7" strokeOpacity=".72"/>
          </g>)}
          {drawShell(true)}
          {ends.map((j,k)=>{
            let a=mesh.bottom[j],b=mesh.top[j];
            const da=(a[2]-cut.h)*part.side,db=(b[2]-cut.h)*part.side;
            if(da<0&&db<0)return null;
            if(da*db<0){const q=mix(a,b,da/(da-db));if(da<0)a=q;else b=q;}
            return <polyline key={k} points={coordinates([project(a),project(b)])} stroke="#456a73" strokeWidth="1.3" fill="none"/>;
          })}
          {(gap>0||wet)&&<polygon points={coordinates(cap.points.map(project))} fill="none" stroke={wet?"#247889":"#598b81"} strokeOpacity=".72" strokeWidth="1.25"/>}
        </g>;
      }
      return <>{half(halves[0])}{guide}{half(halves[1])}</>;
    }}/>
    <TrueShape points={cut.flat} title={cut.shape}/>
  </div>;
}

export function CylinderSectionLab(){
  const [degrees,setDegrees]=useState(35), [fill,setFill]=useState(50);
  const cut=useMemo(()=>waterSection(degrees,fill/100),[degrees,fill]);
  const {gap,open,setOpen}=useSeparation();
  const [shake,setShake]=useState(0);
  const amplitude=useSlosh(degrees,fill,shake,open);
  const boundaries=[cut.bottomCut?"下底":"",cut.topCut?"上底":""].filter(Boolean).join("和");
  let explanation="水面只与侧面相交，边界是一条完整的椭圆。";
  if(degrees===0) explanation="轴线垂直于水面，水面平行于两个底面，截面是与底面等大的圆。";
  else if(degrees===90) explanation="轴线平行于水面，两条母线和两个底面上的弦围成矩形。";
  else if(boundaries) explanation="水面穿过"+boundaries+"的内部，底面上的弦取代了椭圆边界的一部分。";
  return <section className="solid-lab" aria-label="密闭圆柱的水面截形">
    <div className="solid-lab__head"><h3>倾斜水瓶，水面还是椭圆吗？</h3><p>上下拖动密闭圆柱来改变倾角，左右拖动环视。待水静止后，沿水面切开观察。</p></div>
    <CylinderDrawing cut={cut} gap={gap} amplitude={amplitude} tilt={open?undefined:{value:degrees,change:setDegrees}}/>
    <div className="solid-lab__controls"><div className="solid-lab__buttons" aria-label="水面预设">
      {cylinderPresets.map(p=><button type="button" key={p.title} aria-pressed={degrees===p.deg&&fill===p.fill} onClick={()=>{setDegrees(p.deg);setFill(p.fill);}}>{p.title}</button>)}
    </div><div className="solid-lab__ranges">
      <Range label="轴线与竖直方向的夹角" min={0} max={90} value={degrees} symbol="\theta" unit="^\circ" onChange={setDegrees}/>
      <Range label="水量占容积" min={10} max={90} value={fill} unit="\%" onChange={setFill}/>
    </div><SeparationControls open={open} onChange={setOpen}/>
    <div className="solid-lab__buttons"><button type="button" disabled={open} onClick={()=>setShake(s=>s+1)}>轻晃水面</button></div>
    <p role="status">{open?"两部分沿静水面分开，中央虚线保留原水面的位置。":"倾斜或轻晃容器，可观察水面起伏并逐渐平静。真形图显示静止后的截面。"}{explanation}</p>
    <details><summary>水面高度怎样确定？</summary><p>设底面半径为 <Formula tex="r=1"/>，圆柱高为 <Formula tex="2L=2.9"/>。沿轴取坐标 <Formula tex="s"/>，在圆形横截面内取坐标 <Formula tex="(u,v)"/>。当轴线倾角为 <Formula tex="\theta"/> 时，点的竖直高度为 <Formula tex="z=s\cos\theta-u\sin\theta"/>。</p>
    <p>对于候选水位 <Formula tex="h"/>，沿轴累加每片圆盘内满足 <Formula tex="z\le h"/> 的面积，可得浸水体积。体积随水位单调增加，因此可用二分法求出对应水量的水位。半瓶水时，中心对称性保证水面始终经过圆柱中心。</p>
    <p>真形图取水平面内的等比例坐标。斜切时要同时检验侧面 <Formula tex="u^2+v^2=1"/> 和两端 <Formula tex="|s|\le1.45"/> 的限制，才知道能否得到完整的椭圆。</p></details>
    </div>
  </section>;
}
