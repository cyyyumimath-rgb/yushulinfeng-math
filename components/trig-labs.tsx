"use client";

import { useEffect, useId, useMemo, useRef, useState, type PointerEvent } from "react";
import MathText, { Formula } from "./math-text";
import {trackedTip} from "../lib/trig-path";
import styles from "./trig-labs.module.css";

const tau = 2 * Math.PI;
const radians = (degrees: number) => degrees * Math.PI / 180;
const format = (value: number, places = 2) => String(Number(value.toFixed(places)) || 0);
const degrees = (n: number) => format(n) + "^\\circ";
const measurement = (n: number, unit: string, places = 3) => unit === "°" ? degrees(n) : format(n, places) + "\\,\\mathrm{" + unit + "}";

// KaTeX needs HTML layout; keep its viewports independent of the plotted strokes.
function DiagramMath({x,y,width,tex,color,height=20}: {x:number; y:number; width:number; tex:string; color?:string;height?:number}) {
  return <foreignObject x={x} y={y} width={width} height={height} pointerEvents="none">
    <div className={styles.diagramMath} style={{color,height}}><Formula tex={tex}/></div>
  </foreignObject>;
}

type Model = "spring" | "tone" | "current";
const models = {
  spring: {
    title: "弹簧振子", variable: "x", quantity: "位移", unit: "cm", maxAmp: 4, initialAmp: 3, ampStep: 0.1,
    minHz: 0.5, maxHz: 2, initialHz: 1, hzStep: 0.1, duration: 2, initialPhase: 0,
    description: "水平轻弹簧服从胡克定律，忽略摩擦。取平衡位置为原点，向右为正。",
    experiment: "保持频率，把振幅减半。滑块离平衡位置的最远距离怎样改变？相邻两个波峰的时间差呢？",
  },
  tone: {
    title: "音叉纯音", variable: "p", quantity: "声压", unit: "Pa", maxAmp: 1, initialAmp: 0.6, ampStep: 0.05,
    minHz: 200, maxHz: 800, initialHz: 440, hzStep: 10, duration: 0.01, initialPhase: 0,
    description: "近似只取音叉的基频，忽略衰减。色带表示 $0.5\\,\\mathrm{m}$ 内的行波，取声速 $343\\,\\mathrm{m/s}$。麦克风测量固定位置的气压相对静压的变化量。",
    experiment: "保持振幅，提高频率。数一数 $10\\,\\mathrm{ms}$ 内的完整振动次数，再判断这个纯音的音调如何变化。",
  },
  current: {
    title: "交流发电", variable: "i", quantity: "电流", unit: "A", maxAmp: 4, initialAmp: 2, ampStep: 0.1,
    minHz: 25, maxHz: 75, initialHz: 50, hzStep: 1, duration: 0.04, initialPhase: 90,
    description: "线圈在匀强磁场内匀速转动，接纯电阻，忽略自感。幅值和频率可独立设定，相当于可另调磁场或电阻。",
    experiment: "重置后，电流从正峰值开始。将时间从 $0$ 调到 $5\\,\\mathrm{ms}$，线圈转过多少度？此刻电流是多少？",
  },
} as const;

function Range({label, unit, value, min, max, step, change}: {
  label: string; unit: string; value: number; min: number; max: number; step: number; change: (value: number) => void;
}) {
  return <label className={styles.range}>
    <span><MathText text={label}/><output><Formula tex={measurement(value,unit)}/></output></span>
    <input type="range" aria-label={label.replace(/\$.*?\$/g,"").trim()} aria-valuetext={format(value,3)+" "+unit}
      min={min} max={max} step={step} value={value} onChange={e => change(Number(e.target.value))}/>
  </label>;
}

function Spring({value}: {value: number}) {
  const center = 161 + 16 * value;
  const left = center - 17;
  let coil = "M 29 54 H 39";
  for (let i = 0; i < 17; i++) {
    coil += " L " + (39 + (left - 45) * (i + 1) / 18) + " " + (i % 2 ? 45 : 63);
  }
  return <svg viewBox="0 0 280 102" role="img" aria-label={'弹簧振子相对平衡位置的位移为 ' + format(value) + ' 厘米'}>
    <path d="M 29 33 V 73 H 260" fill="none" stroke="#69827f" strokeWidth="2"/>
    <path d="M 29 37 l-7 7 m7 1 l-7 7 m7 1 l-7 7 m7 1 l-7 7" stroke="#a8bbb7"/>
    <path d="M 161 20 V 82" stroke="#7e9491" strokeDasharray="3 3"/>
    <path d={coil + " L " + (left - 4) + " 54 H " + left} fill="none" stroke="#31585a" strokeWidth="2"/>
    <rect x={left} y="39" width="34" height="33" rx="4" fill="#17776b"/>
    <circle cx={center} cy="55" r="2.5" fill="white"/>
    <text x="161" y="97" textAnchor="middle">平衡位置</text>
    <DiagramMath x={219} y={8} width={45} tex="+x\;\to"/>
  </svg>;
}

function Tone({value, frequency, phase}: {value: number; frequency: number; phase: number}) {
  // A fixed 0.5 m window sampled in a right-travelling plane wave. The microphone is at its midpoint.
  const bars = Array.from({length: 77}, (_, i) => {
    const position = (i / 76 - 0.5) * 0.5;
    const normalizedPressure = Math.sin(phase - tau * frequency * position / 343);
    return <rect key={i} x={29 + i * 2.9} y="31" width="3" height="33" fill="#176e63" opacity={0.42 + 0.4 * value * normalizedPressure}/>;
  });
  return <svg viewBox="0 0 280 102" role="img" aria-label="传播中的声压分布，颜色越深声压越高，竖线标记固定的麦克风">
    <text x="28" y="21">声波传播 →</text>
    {bars}
    <path d="M 139.2 26 V 74" stroke="#934b25" strokeWidth="2"/>
    <path d="M 135.2 74 h8 l-4 -6 z" fill="#934b25"/>
    <text x="139.2" y="93" textAnchor="middle">麦克风</text>
    <text x="251" y="85" textAnchor="end">深色为高压</text>
  </svg>;
}

function Generator({phase}: {phase: number}) {
  return <svg viewBox="0 0 280 115" role="img" aria-label="线圈端视图，绿色箭头表示法线，磁场向右">
    {[24,48,72].map(y => <g key={y} stroke="#abc1ba" fill="none">
      <path d={'M 31 ' + y + ' H 241 l-5 -3 m5 3 l-5 3'}/>
    </g>)}
    <circle cx="138" cy="49" r="35" fill="none" stroke="#bbcac5" strokeDasharray="3 3"/>
    <g transform={'translate(138 49) rotate(' + (-phase * 180 / Math.PI) + ')'}>
      <path d="M 0 -34 V 34" stroke="#98532f" strokeWidth="5" strokeLinecap="round"/>
      <path d="M 0 0 H 28 l-5 -3 m5 3 l-5 3" fill="none" stroke="#12695d" strokeWidth="2"/>
    </g>
    <circle cx="138" cy="49" r="3" fill="#253e3b"/>
    <text x="198" y="19">磁场</text><DiagramMath x={223} y={4} width={23} tex="\vec B"/>
    <path d="M 23 99 h12" stroke="#98532f" strokeWidth="3"/><text x="40" y="103">线圈端视图</text>
    <path d="M 149 99 h16 l-4 -2 m4 2 l-4 2" fill="none" stroke="#12695d" strokeWidth="2"/>
    <text x="170" y="103">法线</text><DiagramMath x={198} y={89} width={24} tex="\vec n"/>
  </svg>;
}

function SignalChart({model, amplitude, frequency, initialPhase, time}: {
  model: Model; amplitude: number; frequency: number; initialPhase: number; time: number;
}) {
  const info = models[model];
  const x = (t: number) => 43 + 292 * t / info.duration;
  const y = (v: number) => 76 - 48 * v / info.maxAmp;
  const path = useMemo(() => {
    const points = [];
    for (let i = 0; i <= 352; i++) {
      const fraction = i / 352;
      const v = amplitude * Math.sin(tau * frequency * fraction * info.duration + radians(initialPhase));
      points.push((i === 0 ? "M" : "L") + (43 + 292*fraction).toFixed(2) + " " + (76 - 48*v/info.maxAmp).toFixed(2));
    }
    return points.join(" ");
  }, [amplitude, frequency, initialPhase, info]);
  const current = amplitude * Math.sin(tau * frequency * time + radians(initialPhase));
  const scale = model === "spring" ? 1 : 1000;
  return <svg viewBox="0 0 356 166" role="img" aria-label={info.quantity + "随时间的曲线，圆点对应当前时刻"}>
    <DiagramMath x={13} y={0} width={69} tex={info.variable+"/\\mathrm{"+info.unit+"}"}/>
    <g stroke="#d1ded8" strokeWidth="0.8">
      {[0,1,2,3,4].map(i => <path key={i} d={'M 43 ' + (28+24*i) + ' H 335 M ' + (43+73*i) + ' 24 V 128'}/>)}
    </g>
    <path d="M 43 24 V 128 M 43 76 H 338" stroke="#738c83" fill="none"/>
    {[-1,0,1].map(k => <DiagramMath key={k} x={7} y={y(k*info.maxAmp)-10} width={30} tex={format(k*info.maxAmp)}/>)}
    {[0,1,2,3,4].map(i => <DiagramMath key={i} x={24+73*i} y={127} width={38} tex={format(info.duration*scale*i/4)}/>)}
    <path d={path} fill="none" stroke="#1c7365" strokeWidth="2.15"/>
    <path d={'M ' + x(time) + ' 24 V 128'} stroke="#ab653e" strokeDasharray="3 3"/>
    <circle cx={x(time)} cy={y(current)} r="4.5" fill="#a54e27" stroke="#fff" strokeWidth="1.5"/>
    <DiagramMath x={286} y={146} width={58} tex={"t/\\mathrm{"+(scale === 1 ? "s" : "ms")+"}"}/>
  </svg>;
}

function PeriodicExperiment({model,selectModel}: {model: Model; selectModel:(model:Model)=>void}) {
  const info = models[model];
  const [amp, setAmp] = useState<number>(info.initialAmp);
  const [frequency, setFrequency] = useState<number>(info.initialHz);
  const [phase, setPhase] = useState<number>(info.initialPhase);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const startAt = useRef(0);
  useEffect(() => {
    if (!playing) return;
    const start = performance.now(), initial = startAt.current;
    let frame: number;
    function tick(now: number) {
      const next = initial + (now - start) * info.duration / 10000;
      setTime(Math.min(next, info.duration));
      if (next >= info.duration) setPlaying(false);
      else frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [info.duration, playing]);
  const angle = tau*frequency*time + radians(phase);
  const value = amp * Math.sin(angle);
  const scale = model === "spring" ? 1 : 1000;
  const timeUnit = scale === 1 ? "s" : "ms";
  function reset() {
    setPlaying(false); setTime(0); setPhase(info.initialPhase); setAmp(info.initialAmp); setFrequency(info.initialHz);
  }
  return <>
    <p className={styles.explain}><MathText text={info.description}/></p>
    <div className={styles.periodicLayout}>
    <div className={styles.views}>
      <figure><figcaption>物理模型</figcaption>
        {model === "spring" ? <Spring value={value}/> : model === "tone" ?
          <Tone value={amp} frequency={frequency} phase={angle}/> : <Generator phase={angle}/>}
        <span className={styles.measure}>当前{info.quantity} <Formula tex={info.variable+"(t)\\approx "+measurement(value,info.unit)}/></span>
      </figure>
      <figure><figcaption>同一时刻的函数值</figcaption>
        <SignalChart model={model} amplitude={amp} frequency={frequency} initialPhase={phase} time={time}/>
      </figure>
    </div>
    <div className={styles.lesson}>
      <h4>从模型读函数</h4>
      <Formula tex={info.variable + "(t)=A\\sin(\\omega t+\\varphi)"}/>
      <p>振幅决定峰值，频率决定每秒重复的次数。初相确定从周期中的哪一刻开始计时。</p>
      <div><Formula tex={"T=\\frac1f\\approx "+measurement(scale/frequency,timeUnit)}/></div>
      <div><Formula tex={"\\omega=2\\pi f="+format(2*frequency)+"\\pi\\,\\mathrm{rad/s}"}/></div>
      <h4>动手验证</h4><p><MathText text={info.experiment}/></p>
    </div>
    </div>
    <div className={styles.deck}>
    <div className={styles.selector} role="group" aria-label="选择物理模型">
      {(Object.keys(models) as Model[]).map(key => <button key={key} type="button" aria-pressed={key === model}
        onClick={() => selectModel(key)}>{models[key].title}</button>)}
    </div>
    <div className={styles.controls}>
      <Range label="振幅 $A$" unit={info.unit} value={amp} min={info.ampStep} max={info.maxAmp} step={info.ampStep} change={setAmp}/>
      <Range label="频率 $f$" unit="Hz" value={frequency} min={info.minHz} max={info.maxHz} step={info.hzStep} change={setFrequency}/>
      <Range label="初相 $\varphi$" unit="°" value={phase} min={-180} max={180} step={1} change={setPhase}/>
      <Range label="时间 $t$" unit={timeUnit} value={time*scale} min={0} max={info.duration*scale} step={info.duration*scale/400}
        change={v => {setPlaying(false); setTime(v / scale);}}/>
    </div>
    <div className={styles.actions}>
      <button type="button" onClick={() => {
        if (!playing) {
          startAt.current = time >= info.duration ? 0 : time;
          setTime(startAt.current);
        }
        setPlaying(!playing);
      }}>{playing ? "暂停" : "播放演示"}</button>
      <button type="button" onClick={reset}>重置参数</button><small>用 <Formula tex="10\,\mathrm{s}"/> 演示整个时间窗</small>
    </div>
    </div>
  </>;
}

export function PeriodicLab() {
  const [model, setModel] = useState<Model>("spring");
  return <section className={styles.lab} aria-label="正弦函数与周期物理模型">
    <PeriodicExperiment key={model} model={model} selectModel={setModel}/>
  </section>;
}


const transforms = [
  {label:"关于 $x$ 轴对称", beta:"-\\alpha", from:(a:number)=>-a, x:"\\cos\\alpha", y:"-\\sin\\alpha", image:"(x,-y)",
    note:"沿横轴翻折。两点到横轴等距，因此横坐标保持，纵坐标互为相反数。", rotation:0},
  {label:"关于原点对称", beta:"\\alpha+\\pi", from:(a:number)=>a+Math.PI, x:"-\\cos\\alpha", y:"-\\sin\\alpha", image:"(-x,-y)",
    note:"以圆心为中心把半径转过半圈。终点移到直径的另一端，两个坐标同时变号。", rotation:Math.PI},
  {label:"关于 $y$ 轴对称", beta:"\\pi-\\alpha", from:(a:number)=>Math.PI-a, x:"-\\cos\\alpha", y:"\\sin\\alpha", image:"(-x,y)",
    note:"沿纵轴翻折。两点到纵轴等距，因此纵坐标保持，横坐标互为相反数。", rotation:0},
  {label:"关于 $y=x$ 对称", beta:"\\frac\\pi2-\\alpha", from:(a:number)=>Math.PI/2-a, x:"\\sin\\alpha", y:"\\cos\\alpha", image:"(y,x)",
    note:"沿直线 $y=x$ 翻折。观察点到两条坐标轴的距离，横、纵坐标正好互换。", rotation:0},
  {label:"逆时针转 $90^\\circ$", beta:"\\frac\\pi2+\\alpha", from:(a:number)=>Math.PI/2+a, x:"-\\sin\\alpha", y:"\\cos\\alpha", image:"(-y,x)",
    note:"逆时针转四分之一圈。原来的横坐标成为纵坐标，原来的纵坐标取相反数后成为横坐标。", rotation:Math.PI/2},
  {label:"转动一整圈", beta:"2\\pi+\\alpha", from:(a:number)=>tau+a, x:"\\cos\\alpha", y:"\\sin\\alpha", image:"(x,y)",
    note:"逆时针转一整圈，两个终点重合。再转任意整数圈，横、纵坐标仍保持原值。", rotation:tau},
] as const;

type Point = readonly [number, number];
const center: Point = [160,126];
const radius = 85;
const polar = (a:number, r=radius): Point => [center[0]+r*Math.cos(a),center[1]-r*Math.sin(a)];
const toPoint = (p:Point) => p.map(v=>v.toFixed(2)).join(" ");
const interpolate = (p:Point,q:Point,u:number): Point => [p[0]+(q[0]-p[0])*u,p[1]+(q[1]-p[1])*u];

function arc(start: number, sweep: number, r: number) {
  // A full circle requires at least two SVG arc segments.
  const n = Math.max(1,Math.ceil(Math.abs(sweep)/Math.PI));
  let path = "M " + toPoint(polar(start,r));
  for (let i=1;i<=n;i++) path += " A "+r+" "+r+" 0 0 "+(sweep<0 ? 1 : 0)+" "+toPoint(polar(start+sweep*i/n,r));
  return path;
}

function AngleArc({value,r,color,dashed}: {value:number;r:number;color:string;dashed?:boolean}) {
  const sweep = Math.abs(value)>tau ? value%tau || Math.sign(value)*tau : value;
  if(Math.abs(sweep)<1e-8) return null;
  const end=polar(sweep,r);
  const tangent:Point=[-Math.sin(sweep)*Math.sign(sweep),-Math.cos(sweep)*Math.sign(sweep)];
  const wing=(side:number):Point=>[end[0]-3*tangent[0]+side*1.7*tangent[1],end[1]-3*tangent[1]-side*1.7*tangent[0]];
  return <g stroke={color} fill="none">
    <path d={arc(0,sweep,r)} strokeWidth="1" strokeDasharray={dashed?"3 2":undefined}/>
    {Math.abs(sweep)*r>6&&<path d={"M "+toPoint(wing(1))+" L "+toPoint(end)+" L "+toPoint(wing(-1))} strokeWidth="1.4"/>}
  </g>;
}

const special = [
  [0,"0"],[0.5,"\\tfrac12"],[Math.SQRT1_2,"\\tfrac{\\sqrt2}2"],[Math.sqrt(3)/2,"\\tfrac{\\sqrt3}2"],[1,"1"],
] as const;
function pointFormula(name:string,angle:number) {
  const pair = [Math.cos(angle),Math.sin(angle)];
  const exact = pair.map(value => special.find(([n])=>Math.abs(Math.abs(value)-n)<1e-10)?.[1]);
  const values = pair.map((value,i) => exact[i] ? ((value < -1e-10 ? "-" : "") + exact[i]) : format(value,3));
  return name+(exact.every(Boolean) ? "=" : "\\approx")+"\\left("+values.join(",\\,")+"\\right)";
}

function UnitGraph({a,b,index,progress,mode,labels,angles,guides,dragAngle}: {
  a:number; b:number; index:number; progress:number; mode:"path"|"projection";
  labels:boolean; angles:boolean; guides:boolean; dragAngle:(angle:number)=>void;
}) {
  const pointer = useRef<number | null>(null);
  const gridId=useId().replace(/[^a-z0-9_]/gi,"")+"circlegrid";
  const p=polar(a),q=polar(b),transform=transforms[index];
  const coincident = Math.hypot(p[0]-q[0],p[1]-q[1])<0.1;
  const projectionPhase = mode==="projection" && progress<1;
  const pathPhase = mode==="path" && progress<1;
  const [wx,wy]=trackedTip(a,b,transform.rotation,progress);
  const position:Point=[center[0]+radius*wx,center[1]-radius*wy];
  const tip=pathPhase?position:q;
  const movingAngle=pathPhase?(transform.rotation?a+transform.rotation*progress:Math.atan2(center[1]-tip[1],tip[0]-center[0])):b;
  function move(event:PointerEvent<SVGSVGElement>) {
    if(event.pointerId!==pointer.current) return;
    const ctm=event.currentTarget.getScreenCTM();
    if(!ctm) return;
    const loc=new DOMPoint(event.clientX,event.clientY).matrixTransform(ctm.inverse());
    if(loc.y<0||loc.y>246||Math.hypot(loc.x-center[0],loc.y-center[1])<14) return;
    dragAngle(Math.round(Math.atan2(center[1]-loc.y,loc.x-center[0])*180/Math.PI));
  }
  function projection(point:Point,stroke:string) {
    const horizontalFoot:Point=[point[0],center[1]], verticalFoot:Point=[center[0],point[1]];
    const u = projectionPhase ? Math.min(1,2*progress) : 1;
    const v = projectionPhase ? Math.max(0,2*progress-1) : 1;
    return <g fill="none" stroke={stroke} strokeWidth={projectionPhase ? 1.2 : .7} strokeDasharray="3 3">
      <path d={"M "+toPoint(point)+" L "+toPoint(interpolate(point,horizontalFoot,u))}/>
      {v>0&&<path d={"M "+toPoint(point)+" L "+toPoint(interpolate(point,verticalFoot,v))}/>}
      {u===1&&<circle cx={horizontalFoot[0]} cy={horizontalFoot[1]} r="2" fill={stroke}/>}
      {v===1&&<circle cx={verticalFoot[0]} cy={verticalFoot[1]} r="2" fill={stroke}/>}
    </g>;
  }
  // Keep labels on the outer annulus; choose anchors clear of both axes and the other name.
  function labelAnchor(angle:number,used?:Point): Point {
    for(const offset of [0,.17,-.17,.3,-.3,.43,-.43]) {
      const candidate=polar(angle+offset,107);
      if(Math.abs(candidate[0]-center[0])<16 || Math.abs(candidate[1]-center[1])<10) continue;
      if(used&&Math.abs(candidate[0]-used[0])<29&&Math.abs(candidate[1]-used[1])<18) continue;
      return candidate;
    }
    return polar(angle,113);
  }
  const pLabel=labelAnchor(a),qLabel=labelAnchor(b,pLabel);
  function pointLabel(anchor:Point,name:string) {
    const width=name==="P=Q"?76:38;
    return <DiagramMath x={Math.max(2,Math.min(318-width,anchor[0]-width/2))} y={anchor[1]-15} width={width} height={30} tex={name} color={name==="Q"?"#9c4c2b":"#176b58"}/>;
  }
  return <figure className={styles.circleFigure}>
    <svg className={styles.circle} viewBox="0 -29 320 318" role="img" aria-label="绿色点是原角终点，橙色点是像点。可拖动或使用下方的角度滑块。"
      onPointerDown={e=>{pointer.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);move(e);}}
      onPointerMove={move} onLostPointerCapture={()=>{pointer.current=null;}}>
      <defs><clipPath id={gridId}><circle cx={center[0]} cy={center[1]} r={radius}/></clipPath></defs>
      <path d="M 31 126 H 290 l-5 -3 m5 3 l-5 3 M 160 237 V 15 l-3 5 m3 -5 l3 5" fill="none" stroke="#83998c"/>
      {index===3&&<path clipPath={`url(#${gridId})`} d="M 69 217 L 251 35" stroke="#79708d" strokeDasharray="5 4"/>}
      <circle cx={160} cy={126} r={radius} fill="none" stroke="#8ca193" strokeWidth="1"/>
      {angles&&<g>
        <AngleArc value={a} r={22} color="#27816f"/>
        {Math.hypot(tip[0]-center[0],tip[1]-center[1])>1e-6&&<AngleArc value={movingAngle} r={31} color="#b86539" dashed/>}
      </g>}
      {guides&&<>{projection(p,"#227961")}{projection(tip,"#aa5d35")}</>}
      <path d={"M "+toPoint(center)+" L "+toPoint(p)} stroke="#1b7664" strokeWidth="1.25"/>
      <path d={"M "+toPoint(center)+" L "+toPoint(tip)} data-terminal-ray="" stroke="#aa582f" strokeDasharray="5 3" strokeWidth="1.45"/>
      {pathPhase&&<g>
        <path d={transform.rotation ? arc(a,transform.rotation*progress,radius) : "M "+toPoint(p)+" L "+toPoint(position)}
          fill="none" stroke="#68436f" strokeWidth="1.4" strokeLinecap="round"/>
        <circle cx={position[0]} cy={position[1]} r="4.5" fill="white" stroke="#aa582f" strokeWidth="1.4"/>
      </g>}
      <circle cx={160} cy={126} r="2.7" fill="#526a60"/>
      <circle cx={p[0]} cy={p[1]} r={coincident?6.5:4.5} fill="#187762"/>
      <circle cx={q[0]} cy={q[1]} r={coincident?3:4.5} fill="#b56033"/>
      <DiagramMath x={293} y={116} width={18} tex="x"/><DiagramMath x={172} y={0} width={18} tex="y"/>
      {labels&&(coincident?pointLabel(pLabel,"P=Q"):<>{pointLabel(pLabel,"P")}{pointLabel(qLabel,"Q")}</>)}
      {angles&&<foreignObject x="3" y="-28" width="314" height="26" pointerEvents="none"><div className={styles.angleStrip}>
        <Formula tex={"\\alpha\\longmapsto\\beta="+transform.beta}/><Formula tex={degrees(a*180/Math.PI)+"\\longmapsto"+degrees(b*180/Math.PI)}/>
      </div></foreignObject>}
      {labels&&<foreignObject x="3" y="250" width="314" height="38" pointerEvents="none"><div className={styles.pointStrip}>
        <span><i/><Formula tex={pointFormula("P",a)}/></span><span><i/><Formula tex={pointFormula("Q",b)}/></span>
      </div></foreignObject>}
    </svg>
  </figure>;
}

export function UnitCircleLab() {
  const [alpha,setAlpha]=useState(30);
  const [index,setIndex]=useState(0);
  const [labels,setLabels]=useState(true),[angles,setAngles]=useState(true),[guides,setGuides]=useState(true);
  const [mode,setMode]=useState<"path"|"projection">("path");
  const [progress,setProgress]=useState(1),[playing,setPlaying]=useState(false),[run,setRun]=useState(0);
  const origin=useRef(0);
  const transform=transforms[index],a=radians(alpha),b=transform.from(a);
  useEffect(()=>{
    if(!playing) return;
    const start=performance.now(),from=origin.current;
    let frame:number;
    const tick=(now:number)=>{
      const next=Math.min(1,from+(now-start)/2400);
      setProgress(next);
      if(next<1) frame=requestAnimationFrame(tick); else setPlaying(false);
    };
    frame=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(frame);
  },[playing,run]);
  function animate(from:number) {
    origin.current=from; setProgress(from); setPlaying(true); setRun(n=>n+1);
  }
  function finishAnimation() { setPlaying(false); setProgress(1); }
  function changeAngle(value:number) { finishAnimation(); setAlpha(value); }
  function reset() {
    finishAnimation(); setIndex(0);setAlpha(30);setMode("path");setLabels(true);setAngles(true);setGuides(true);
  }
  return <section className={styles.lab} aria-label="单位圆上的诱导公式">
    <div className={styles.circleLayout}>
      <UnitGraph a={a} b={b} index={index} progress={progress} mode={mode} labels={labels} angles={angles} guides={guides}
        dragAngle={principal=>{
          const equivalents=[principal,principal-360,principal+360].filter(v=>Math.abs(v)<=360);
          changeAngle(equivalents.reduce((best,v)=>Math.abs(v-alpha)<Math.abs(best-alpha)?v:best));
        }}/>
      <div className={styles.lesson}>
        <h4><MathText text={transform.label}/></h4>
        <p><MathText text={transform.note}/></p>
        <div className={styles.rule}><Formula tex={"P(x,y)\\longmapsto Q"+transform.image}/></div>
        <h4>从坐标读公式</h4>
        <p><MathText text={"在单位圆上，$P=(\\cos\\alpha,\\sin\\alpha)$。读出像点 $Q$ 的横、纵坐标，分别得到余弦与正弦。"}/></p>
        <div className={styles.identities}><Formula display tex={"\\cos\\!\\left("+transform.beta+"\\right)="+transform.x}/>
        <Formula display tex={"\\sin\\!\\left("+transform.beta+"\\right)="+transform.y}/></div>
      </div>
    </div>
    <div className={styles.deck}>
      <fieldset><legend>选择变换</legend><div className={styles.selector}>{transforms.map((t,i)=>
        <button type="button" key={i} aria-pressed={i===index} onClick={()=>{setIndex(i);if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)finishAnimation();else animate(0);}}><MathText text={t.label}/></button>)}</div></fieldset>
      <Range label="原角 $\alpha$" unit="°" value={alpha} min={-360} max={360} step={1} change={changeAngle}/>
      <fieldset><legend>图上标注</legend><div className={styles.options}>
        <label><input type="checkbox" checked={labels} onChange={e=>setLabels(e.target.checked)}/> 点名与坐标</label>
        <label><input type="checkbox" checked={angles} onChange={e=>setAngles(e.target.checked)}/> 有向角与变换</label>
        <label><input type="checkbox" checked={guides} onChange={e=>setGuides(e.target.checked)}/> 坐标投影</label>
      </div></fieldset>
      <fieldset><legend>动画演示</legend><div className={styles.selector}>
        <button type="button" aria-pressed={mode==="path"} onClick={()=>{setMode("path");animate(0);}}>追踪变换路径</button>
        <button type="button" aria-pressed={mode==="projection"} onClick={()=>{setMode("projection");setGuides(true);animate(0);}}>依次投影到两轴</button>
      </div></fieldset>
      <p className={styles.hint}>{mode==="projection"?"先沿竖直方向读横坐标，再沿水平方向读纵坐标。":
        transform.rotation?"沿圆周观察半径逆时针转动到目标终点。":"沿垂直于对称轴的线段追踪对应点，线段中点落在对称轴上。"}</p>
      <div className={styles.actions}>
        <button type="button" onClick={()=>playing?setPlaying(false):animate(progress>=1?0:progress)}>
          {playing?"暂停":progress>0&&progress<1?"继续播放":"播放动画"}</button>
        <button type="button" onClick={()=>animate(0)}>重播</button>
        <button type="button" onClick={reset}>重置角度与变换</button>
      </div>
    </div>
  </section>;
}

