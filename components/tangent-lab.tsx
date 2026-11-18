"use client";

import { useEffect, useId, useRef, useState, type PointerEvent } from "react";
import {PlotMath} from "./plot-math";
import { Formula } from "./math-text";
import "./tangent-lab.css";

// Equal scales on both axes preserve the geometric meaning of the slope.
const unit = 51;
const sx = (x: number) => 257 + x * unit;
const sy = (y: number) => 218 - y * unit;
const limit = 1.7;
const initialA = 1;
const snap = (a: number) => Math.round(Math.max(-limit, Math.min(limit, a)) * 20) / 20;
const number = (n: number) => String(Number(n.toFixed(4)));
const parabola = `M ${sx(-2.5)} ${sy(6.25)} Q ${sx(0)} ${sy(-6.25)} ${sx(2.5)} ${sy(6.25)}`;

const steps = [
  { title: "确定切点", text: "把横坐标代入函数，得到切点的纵坐标。拖动图中的点，观察它的两个坐标如何变化。", tex: "A=(a,a^2)" },
  { title: "求切线斜率", text: "先连接切点与附近另一点。让两点的横坐标差趋近于零，割线斜率的极限就是切线斜率。", tex: "\\lim_{h\\to0}\\frac{(a+h)^2-a^2}{h}=2a" },
  { title: "写出切线", text: "已知切点与斜率，用直线的点斜式写出切线方程。把切点代回方程，可以核对结果。", tex: "y-a^2=2a(x-a)" },
];

export default function TangentLab({ compact = false }: { compact?: boolean }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [a, setA] = useState(initialA);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const startA = useRef(initialA);
  const root = useRef<HTMLElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<number | null>(null);
  const slope = Number((2 * a).toFixed(2));

  useEffect(() => {
    if (!playing) return;
    const startTime = performance.now();
    const origin = startA.current;
    let frame: number;
    const tick = (now: number) => {
      const phase = (origin + limit + (now - startTime) / 1800) % (4 * limit);
      setA(snap(phase <= 2 * limit ? phase - limit : 3 * limit - phase));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  useEffect(() => {
    const sync = () => setExpanded(document.fullscreenElement === root.current);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function movePoint(event: PointerEvent<SVGCircleElement>) {
    if (event.pointerId !== drag.current || !svg.current) return;
    const transform = svg.current.getScreenCTM();
    if (!transform) return;
    const local = new DOMPoint(event.clientX, event.clientY).matrixTransform(transform.inverse());
    setA(snap((local.x - sx(0)) / unit));
  }

  async function toggleExpanded() {
    if (document.fullscreenElement === root.current && document.fullscreenElement) {
      await document.exitFullscreen();
    } else if (expanded) {
      setExpanded(false);
    } else {
      try {
        if (root.current?.requestFullscreen) await root.current.requestFullscreen();
      } catch {
        // Embedded browsers can restrict fullscreen; the fixed layout also works there.
      }
      setExpanded(true);
    }
  }

  const leftX = -5.2;
  const rightX = 5.2;
  const tangentY = (x: number) => slope * x - a * a;
  const equation = a === 0 ? "y=0" : `y=${slope === 1 ? "" : slope === -1 ? "-" : number(slope)}x-${number(a * a)}`;

  return <section ref={root} className={`tangent-lab${compact ? " tangent-lab--compact" : ""}${expanded ? " tangent-lab--expanded" : ""}`} aria-label="抛物线的切线交互实验">
    <div className="tangent-lab__head">
      <span className="tangent-lab__title">抛物线的切线</span>
      <button type="button" onClick={toggleExpanded} className="tangent-lab__expand" aria-label={expanded ? "退出全屏" : "全屏展示"} title={expanded ? "退出全屏" : "全屏展示"}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d={expanded ? "M3 8h5V3m13 5h-5V3M3 16h5v5m13-5h-5v5" : "M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"}/></svg>
      </button>
    </div>
    <svg ref={svg} className="tangent-lab__plot" viewBox="-30 -22 567 316" role="img" aria-label={`抛物线 y 等于 x 平方，切点横坐标 ${a}，切线斜率 ${slope}`}>
      <defs>
        <pattern id={id+"-fine"} width={unit/2} height={unit/2} x={sx(0)} y={sy(0)} patternUnits="userSpaceOnUse"><path d={`M ${unit/2} 0 H 0 V ${unit/2}`} fill="none" stroke="#dce7e3" strokeWidth=".8"/></pattern>
        <pattern id={id+"-major"} width={unit} height={unit} x={sx(0)} y={sy(0)} patternUnits="userSpaceOnUse"><path d={`M ${unit} 0 H 0 V ${unit}`} fill="none" stroke="#cddad6" strokeWidth=".9"/></pattern>
        <clipPath id={id+"-bounds"}><rect width="516" height="270"/></clipPath>
      </defs>
      <rect width="516" height="270" fill="#f4f8f5"/>
      <rect width="516" height="270" fill={`url(#${id}-fine)`}/>
      <rect width="516" height="270" fill={`url(#${id}-major)`}/>
      <g stroke="#788f89" fill="none" strokeWidth="1.2">
        <path d={`M 12 ${sy(0)} H 498 l -6 -3 m 6 3 l -6 3 M ${sx(0)} 262 V 10 l -3 6 m 3 -6 l 3 6`}/>
        {[-4,-3,-2,-1,1,2,3,4].map(x => <path key={x} d={`M ${sx(x)} ${sy(0)} v 3`}/>)}
      </g>
      <g>
        {[-4,-2,0,2,4].map(x=><PlotMath key={x} x={sx(x)} y={282} tex={String(x)}/>)}
        {[0,2,4].map(y=><PlotMath key={y} x={-15} y={sy(y)} tex={String(y)}/>)}
        <PlotMath x={521} y={sy(0)} tex="x"/><PlotMath x={sx(0)} y={-10} tex="y"/>
      </g>
      <g clipPath={`url(#${id}-bounds)`} fill="none">
        <path d={`M ${sx(a)} ${sy(0)} V ${sy(a*a)} H ${sx(0)}`} stroke="#7d9f95" strokeWidth="1.2" strokeDasharray="4 4"/>
        <path d={parabola} stroke="#203e48" strokeWidth="3.3"/>
        <path d={`M ${sx(leftX)} ${sy(tangentY(leftX))} L ${sx(rightX)} ${sy(tangentY(rightX))}`} stroke="#10806e" strokeWidth="2.6"/>
      </g>
      <circle cx={sx(a)} cy={sy(a*a)} r="12" fill="#16846d" opacity=".16"/>
      <circle cx={sx(a)} cy={sy(a*a)} r="5.4" fill="#0f765f" stroke="white" strokeWidth="2"/>
      <circle cx={sx(a)} cy={sy(a*a)} r="20" fill="transparent" className="tangent-lab__handle"
        onPointerDown={event => {
          drag.current = event.pointerId;
          event.currentTarget.setPointerCapture(event.pointerId);
          setPlaying(false);
        }}
        onPointerMove={movePoint}
        onLostPointerCapture={() => { drag.current = null; }}/>
    </svg>
    <div className="tangent-lab__controls">
      <div className="tangent-lab__legend"><span>曲线 <Formula tex="y=x^2"/></span><span>切点 <Formula tex={`A=(${number(a)},${number(a*a)})`}/></span></div>
      <div className="tangent-lab__readout">
        <label htmlFor={id+"-parameter"}>切点横坐标 <Formula tex={`a=${number(a)}`}/></label>
        <span>斜率 <Formula tex={`k=${number(slope)}`}/></span>
      </div>
      <input id={id+"-parameter"} type="range" min={-limit} max={limit} step="0.05" value={a} aria-label="切点横坐标" onChange={event => { setPlaying(false); setA(Number(event.target.value)); }}/>
      {(!compact || expanded) && <div className="tangent-lab__actions">
        <button type="button" aria-pressed={playing} onClick={() => { startA.current = a; setPlaying(!playing); }}>{playing ? "暂停" : "播放演示"}</button>
        <button type="button" onClick={() => { setPlaying(false); setA(initialA); setStep(0); }}>重置</button>
        <span>切线 <Formula tex={equation}/></span>
      </div>}
    </div>
    {!compact && <div className="tangent-lab__steps">
      <div className="tangent-lab__step-nav" role="group" aria-label="讲解步骤">
        {steps.map((item, i) => <button key={item.title} type="button" aria-pressed={step===i} onClick={() => setStep(i)}>{i+1}. {item.title}</button>)}
      </div>
      <p>{steps[step].text}</p><Formula tex={steps[step].tex} display/>
    </div>}
  </section>;
}
