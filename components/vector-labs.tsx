"use client";

import { useId, useState, type ReactNode } from "react";
import MathText, { Formula } from "./math-text";
import {GeometryPointLabels} from "./geometry-point-labels";
import "./vector-labs.css";

type Vec = [number, number, number];
type Screen = [number, number];
type Project = (p: Vec) => Screen;
type Mode = "line" | "plane" | "skew" | "points" | "parallelLines" | "linePlane" | "parallelPlanes";
const origin: Vec = [0, 0, 0];
const u: Vec = [2, 1, 0], v: Vec = [0, 1, 1], n: Vec = [1, -2, 2];
const add = (a: Vec, b: Vec): Vec => [a[0]+b[0], a[1]+b[1], a[2]+b[2]];
const mul = (s: number, a: Vec): Vec => [s*a[0], s*a[1], s*a[2]];
const dot = (a: Vec, b: Vec) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const minus = (a: Vec, b: Vec) => add(a, mul(-1, b));
const magnitude = (a: Vec) => Math.sqrt(dot(a, a));
const fmt = (x: number) => String(Number(x.toFixed(2)));
const triple = (a: Vec) => "(" + a.map(fmt).join(", ") + ")";
const colors = { ink: "#253e52", teal: "#16765f", rust: "#ab5335", axis: "#7e8e86" };

function Slider({label, value, min, max, step=1, unit="", change}: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string; change: (x: number) => void;
}) {
  return <label className="vec-slider"><span className="vec-slider-head"><MathText text={label}/> <b><Formula tex={fmt(value)+(unit==="°"?"^\\circ":"")}/></b></span>
    <input type="range" min={min} max={max} step={step} value={value} onChange={e=>change(Number(e.target.value))}/>
  </label>;
}

function Line({project, a, b, color=colors.ink, width=2, dash, arrow}: {
  project: Project; a: Vec; b: Vec; color?: string; width?: number; dash?: string; arrow?: string;
}) {
  const [x1,y1]=project(a), [x2,y2]=project(b);
  return <line {...{x1,y1,x2,y2}} stroke={color} strokeWidth={width} strokeDasharray={dash}
    markerEnd={arrow ? "url(#"+arrow+")" : undefined} strokeLinecap="round"/>;
}

function Point({p, label, project, color=colors.ink}: {
  p: Vec; label: string; project: Project; color?: string;
}) {
  const [x,y]=project(p);
  return <circle cx={x} cy={y} r="4" fill={color} stroke="white" strokeWidth="1.5"><title>{label}</title></circle>;
}

function Key({color,tex,desc,dash=false}:{color:string;tex:string;desc:string;dash?:boolean}){
  return <span className="vec-key"><i style={{borderColor:color,borderTopStyle:dash?"dashed":"solid"}}/><Formula tex={tex}/>{desc}</span>;
}

function Graph({id, label, children}: {id:string; label:string; children:ReactNode}) {
  return <svg className="vec-graph" role="img" aria-label={label} viewBox="0 0 520 320">
    <defs>{Object.entries(colors).map(([key,color])=><marker key={key} id={id+key} viewBox="0 0 10 8" refX="8" refY="4" markerWidth="6" markerHeight="5" orient="auto">
      <path d="M0 0 9 4 0 8 2 4Z" fill={color}/></marker>)}</defs>
    <rect width="520" height="320" fill="#f6f9f6"/>{children}
  </svg>;
}

function Reading({label, value, color}: {label:string; value:string; color?:string}) {
  return <div><dt><MathText text={label}/></dt><dd style={{color}}><Formula tex={value}/></dd></div>;
}

export function ProjectionLab() {
  const id=useId().replace(/[^A-Za-z0-9_-]/g,"")+"proj";
  const [angle,setAngle]=useState(25), [x,setX]=useState(2.5), [y,setY]=useState(1.8);
  const radians=angle*Math.PI/180, unit:Vec=[Math.cos(radians),Math.sin(radians),0], a:Vec=[x,y,0];
  const signed=dot(a,unit), foot=mul(signed,unit), remainder=minus(a,foot);
  const scale=34;
  const project:Project=p=>[260+scale*p[0],160-scale*p[1]];
  const edges:[Vec,Vec][]=[[[-8,0,0],[8,0,0]],[[0,-5,0],[0,5,0]],[mul(-10,unit),mul(10,unit)],[origin,a],[foot,a]];
  return <section className="vec-lab" aria-label="向量的正交投影">
    <header><h2>一个向量沿指定方向留下多少分量？</h2></header>
    <div className="vec-study"><figure>
    <Graph id={id} label={"向量 OA 沿单位向量 e 的数量投影为 "+fmt(signed)}>
      {Array.from({length:15},(_,i)=> <Line key={"x"+i} project={project} a={[i-7,-5,0]} b={[i-7,5,0]} color="#dbe6df" width={1}/>)}
      {Array.from({length:9},(_,i)=> <Line key={"y"+i} project={project} a={[-8,i-4,0]} b={[8,i-4,0]} color="#dbe6df" width={1}/>)}
      <Line project={project} a={[-7.3,0,0]} b={[7.3,0,0]} color={colors.axis} width={1} arrow={id+"axis"}/>
      <Line project={project} a={[0,-4.3,0]} b={[0,4.3,0]} color={colors.axis} width={1} arrow={id+"axis"}/>
      <Line project={project} a={mul(-10,unit)} b={mul(10,unit)} color={colors.teal} width={1.3} dash="6 5"/>
      <Line project={project} a={origin} b={a} width={3} arrow={id+"ink"}/>
      <Line project={project} a={foot} b={a} color={colors.rust} width={2} dash="4 4"/>
      <Line project={project} a={origin} b={foot} color={colors.rust} width={3} arrow={Math.abs(signed)>0.08?id+"rust":undefined}/>
      <Line project={project} a={origin} b={unit} color={colors.teal} width={2.5} arrow={id+"teal"}/>
      <Point project={project} p={origin} label="原点"/>
      <Point project={project} p={unit} label="单位向量终点" color={colors.teal}/>
      {magnitude(a)>0.01&&<Point project={project} p={a} label="原向量终点"/>}
      {Math.abs(signed)>0.01&&<Point project={project} p={foot} label="垂足" color={colors.rust}/>}
      <GeometryPointLabels width={520} height={320} edges={edges.map(([a,b])=>[project(a),project(b)])} points={[
        {name:"O",p:project(origin)},{name:"A",p:project(a),color:colors.ink},{name:"H",p:project(foot),color:colors.rust},
        {name:"x",p:project([7.1,0,0])},{name:"y",p:project([0,4.1,0])}]}/>
    </Graph>
    <figcaption><Key color={colors.ink} tex="\overrightarrow{OA}" desc="原向量"/><Key color={colors.teal} tex="\vec{e}" desc="正方向"/>
      <Key color={colors.rust} tex="\overrightarrow{OH}" desc="投影"/><Key color={colors.rust} tex="HA" desc="垂线段" dash/></figcaption>
    </figure><div className="vec-steps"><h3>从垂足读出分解</h3>
      <ol><li><strong>定方向。</strong>取非零向量 <Formula tex="\vec{b}"/>，沿它的方向取单位向量 <Formula tex="\vec{e}=\dfrac{\vec{b}}{\lVert\vec{b}\rVert}"/>。</li>
      <li><strong>作投影。</strong>过 <Formula tex="A"/> 作垂线，与投影直线交于 <Formula tex="H"/>。数量投影 <Formula tex="s=\overrightarrow{OA}\cdot\vec{e}"/> 有正负。</li>
      <li><strong>分解向量。</strong><Formula tex="\overrightarrow{OH}=s\vec{e}"/>，长度为 <Formula tex="|s|"/>。余量 <Formula tex="\overrightarrow{HA}=\overrightarrow{OA}-s\vec{e}"/> 垂直于投影直线。</li></ol>
    </div></div>
    <div className="vec-body"><div className="vec-sliders">
      <Slider label="点 $A$ 的横坐标" value={x} min={-3} max={3} step={0.1} change={setX}/>
      <Slider label="点 $A$ 的纵坐标" value={y} min={-3} max={3} step={0.1} change={setY}/>
      <Slider label="正方向与 $x$ 轴的角度" value={angle} min={-180} max={180} unit="°" change={setAngle}/>
    </div><div className="vec-actions">
      <button onClick={()=>setAngle(angle<=0?angle+180:angle-180)}>反转正方向</button>
      <button onClick={()=>{setX(0);setY(2);setAngle(0);}}>试一组垂直向量</button>
      <button onClick={()=>{setX(2.5);setY(1.8);setAngle(25);}}>重置</button>
    </div>
    <dl className="vec-readings"><Reading label="数量投影 $s$" value={fmt(signed)}/><Reading label="投影向量 $\overrightarrow{OH}$" value={"("+fmt(foot[0])+", "+fmt(foot[1])+")"} color={colors.rust}/><Reading label="投影长度 $|s|$" value={fmt(Math.abs(signed))}/></dl>
    <p>余量坐标约为 <Formula tex={"("+fmt(remainder[0])+", "+fmt(remainder[1])+")"}/>。试着反转正方向，比较三项读数。</p>
    <h3>点到直线的距离</h3><p>点 <Formula tex="A"/> 到过原点、方向为 <Formula tex="\vec b"/> 的直线 <Formula tex="\ell"/> 的距离，就是余量向量的长度。</p>
    <Formula display tex={"d(A,\\ell)=\\lVert\\overrightarrow{HA}\\rVert=\\sqrt{\\lVert\\overrightarrow{OA}\\rVert^2-s^2}\\approx "+fmt(magnitude(remainder))}/>
    <p>如果直线写成 <Formula tex="mx+ny+c=0"/>，其单位法向量为 <Formula tex="\vec{n}_0=(m,n)/\sqrt{m^2+n^2}"/>。把线上任一点到 <Formula tex="A(x_A,y_A)"/> 的向量投到它上面，再取绝对值，即得</p>
    <Formula display tex="d(A,\ell)=\dfrac{|mx_A+ny_A+c|}{\sqrt{m^2+n^2}},\qquad m^2+n^2>0."/>
    </div>
  </section>;
}

const modes:Record<Mode,string>={line:"点到直线",plane:"点到平面",skew:"异面直线",points:"两点间",parallelLines:"平行直线间",linePlane:"平行直线与平面间",parallelPlanes:"平行平面间"};
const baseModes:Mode[]=["line","plane","skew"];
const derived:Mode[]=["points","parallelLines","linePlane","parallelPlanes"];
const planePoint=(s:number,t:number)=>add(mul(s,u),mul(t,v));

export function VectorDistanceLab() {
  const id=useId().replace(/[^A-Za-z0-9_-]/g,"")+"dist";
  const [mode,setMode]=useState<Mode>("line"), [s,setS]=useState(1), [h,setH]=useState(2), [view,setView]=useState(32);
  const b:Vec=[s,1,h];
  const k=dot(b,n)/dot(n,n);
  const lineFoot=mul(dot(b,u)/dot(u,u),u);
  const planeFoot=minus(b,mul(k,n));
  const q=mul((s-k)/2,u), r=add(q,mul(k,n));
  const hasBaseLine=mode==="line"||mode==="parallelLines"||mode==="skew";
  const hasBasePlane=mode==="plane"||mode==="linePlane"||mode==="parallelPlanes";
  const from=mode==="points"?origin:mode==="skew"?q:hasBasePlane?planeFoot:lineFoot;
  const to=mode==="skew"?r:b;
  const length=magnitude(minus(to,from));
  const yaw=view*Math.PI/180, c=Math.cos(yaw), sin=Math.sin(yaw);
  const project:Project=p=>[260+32*(c*p[0]-sin*p[1]),166+32*(0.5*(sin*p[0]+c*p[1])-Math.sqrt(3)/2*p[2])];
  const axes:Vec[]=[[3.8,0,0],[0,3.8,0],[0,0,3.6]];
  const corners=[planePoint(-1.55,-2.6),planePoint(1.55,-2.6),planePoint(1.55,2.6),planePoint(-1.55,2.6)];
  const edges:[Vec,Vec][]=[[origin,b],[from,to],...axes.map((p):[Vec,Vec]=>[origin,p])];
  const secondLine:[Vec,Vec]|null=mode==="skew"?[add(b,mul(Math.min(-2,2*k-h-.5),v)),add(b,mul(Math.max(2,2*k-h+.5),v))]:
    mode==="linePlane"||mode==="parallelLines"?[add(b,mul(-1.65,u)),add(b,mul(1.65,u))]:null;
  if(hasBaseLine)edges.push([mul(-2,u),mul(2,u)]);
  if(secondLine)edges.push(secondLine);
  const upper=corners.map(p=>add(p,mul(k,n)));
  if(mode==="parallelPlanes")upper.forEach((p,i)=>edges.push([p,upper[(i+1)%4]]));
  if(hasBasePlane){
    corners.forEach((p,i)=>edges.push([p,corners[(i+1)%4]]));
    for(const i of [-1,0,1])edges.push([planePoint(i,-2.6),planePoint(i,2.6)]);
    for(const i of [-2,-1,0,1,2])edges.push([planePoint(-1.55,i),planePoint(1.55,i)]);
  }
  const names:{name:string;p:Screen;color?:string}[]=[{name:"O",p:project(origin)},{name:"B",p:project(b)},...axes.map((p,i)=>({name:"xyz"[i],p:project(p)}))];
  if(mode!=="points")names.push({name:mode==="skew"?"Q":"H",p:project(from),color:colors.rust});
  if(mode==="skew")names.push({name:"R",p:project(to),color:colors.rust});
  return <section className="vec-lab" aria-label="用向量求距离">
    <header><h2>用向量测量空间距离</h2><p>调节点 <Formula tex="B"/> 的坐标，观察表示距离的橙色线段。旋转视图可从另一个方向核对空间位置。</p></header>
    <div className="vec-tabs" role="group" aria-label="距离类型">{baseModes.map(m=><button key={m} aria-pressed={mode===m} onClick={()=>setMode(m)}>{modes[m]}</button>)}
      <label className="vec-extra-mode">其他距离怎样化归 <select value={derived.includes(mode)?mode:""} onChange={e=>setMode(e.target.value as Mode)}><option value="" disabled>选择情形</option>{derived.map(m=><option key={m} value={m}>{modes[m]}</option>)}</select></label>
    </div>
    <Graph id={id} label={modes[mode]+"示意图，空间距离为 "+fmt(length)}>
      {hasBasePlane&&<><polygon points={corners.map(p=>project(p).join(",")).join(" ")} fill="#d6eade" stroke="#91b59e"/>
        {[-1,0,1].map(i=><Line key={i} project={project} a={planePoint(i,-2.6)} b={planePoint(i,2.6)} color="#a8c7b4" width={1}/>)}
        {[-2,-1,0,1,2].map(i=><Line key={i} project={project} a={planePoint(-1.55,i)} b={planePoint(1.55,i)} color="#a8c7b4" width={1}/>)}</>}
      {mode==="parallelPlanes"&&<polygon points={upper.map(p=>project(p).join(",")).join(" ")} fill="#a9c3df" fillOpacity=".35" stroke="#597da3" strokeDasharray="6 3"/>}
      {axes.map((p,i)=><Line key={i} project={project} a={origin} b={p} color={colors.axis} width={1} dash={[undefined,"5 4","1 4"][i]} arrow={id+"axis"}/>)}
      {hasBaseLine&&<Line project={project} a={mul(-2.0,u)} b={mul(2.0,u)} color={colors.teal} width={3} arrow={id+"teal"}/>}
      {secondLine&&<Line project={project} a={secondLine[0]} b={secondLine[1]} width={3} arrow={id+"ink"}/>}
      {mode!=="points"&&<Line project={project} a={origin} b={b} dash="4 4" width={1.5}/>}
      <Line project={project} a={from} b={to} color={colors.rust} width={4}/>
      <Point project={project} p={origin} label="O"/>
      <Point project={project} p={b} label="B"/>
      {mode==="skew"&&length>0.001&&<Point project={project} p={to} label="R" color={colors.rust}/>}
      {mode!=="points"&&<Point project={project} p={from} label={mode==="skew"?"Q":"H"} color={colors.rust}/>}
      <GeometryPointLabels points={names} edges={edges.map(([a,b])=>[project(a),project(b)])} width={520} height={320}/>
    </Graph>
    <div className="vec-legend">{mode!=="points"&&<Key color={colors.ink} tex="\overrightarrow{OB}" desc="连接向量" dash/>}
      {hasBaseLine&&<Key color={colors.teal} tex="\ell_1" desc="过原点的直线"/>}
      {secondLine&&<Key color={colors.ink} tex="\ell_2" desc="过动点的直线"/>}
      {hasBasePlane&&<Key color="#91b59e" tex="\alpha" desc="过原点的平面"/>}
      {mode==="parallelPlanes"&&<Key color="#597da3" tex="\beta" desc="平行动平面" dash/>}
      <Key color={colors.rust} tex={mode==="skew"?"QR":mode==="points"?"OB":"BH"} desc={mode==="points"?"两点连线":"垂线段"}/>
      <span><Formula tex="x,y,z"/> 轴依次为灰色实线、虚线、点线。</span>
    </div>
    <div className="vec-body"><div className="vec-sliders"><Slider label="点 $B$ 的横坐标 $s$" min={-2} max={2} step={0.1} value={s} change={setS}/>
      <Slider label="点 $B$ 的高度 $h$" min={-2} max={2} step={0.1} value={h} change={setH}/>
      <Slider label="观察方向" unit="°" min={-155} max={165} value={view} change={setView}/></div>
      <div className="vec-actions"><button onClick={()=>{setS(mode==="points"?0:2);setH(0);}}>{mode==="points"?"观察单位距离":"观察距离为零时"}</button><button onClick={()=>{setS(1);setH(2);setView(32);}}>重置参数</button></div>
      <dl className="vec-readings"><Reading label="点 $B$ 的坐标" value={triple(b)}/>
      <Reading label={mode==="points"?"另一端点 $O$":mode==="skew"?"第一条直线上的 $Q$":"垂足 $H$"} value={triple(from)}/>
      <Reading label="空间距离" value={fmt(length)} color={colors.rust}/></dl>
      {length<1e-8&&mode!=="skew"&&<p>此时 <Formula tex="B=H"/>，{mode==="parallelLines"?"两条直线重合":mode==="parallelPlanes"?"两个平面重合":mode==="linePlane"?"直线落在平面内":mode==="line"?"点落在直线上":"点落在平面上"}，距离为零。</p>}
      {mode==="points"?<><h3>两点间 · 连接向量取模</h3>
        <p>线段 <Formula tex="OB"/> 直接连接 <Formula tex="O(0,0,0)"/> 和 <Formula tex="B(s,1,h)"/>。在三个互相垂直的坐标方向上分解，再用勾股定理求长度。</p>
        <Formula display tex={"d(O,B)=\\lVert\\overrightarrow{OB}\\rVert=\\sqrt{s^2+1+h^2}\\approx "+fmt(length)}/>
      </>:mode==="parallelLines"?<><h3>平行直线间 · 化为点到直线</h3>
        <p>两条直线的方向均为 <Formula tex="\vec u=(2,1,0)"/>。在第二条线上取 <Formula tex="B"/>，向第一条线作垂线，垂足为 <Formula tex="H"/>。沿任一条线平移，不会改变垂线段的长度。</p>
        <Formula display tex={"d(\\ell_1,\\ell_2)=BH=\\left\\lVert\\overrightarrow{OB}-\\frac{\\overrightarrow{OB}\\cdot\\vec u}{\\vec u\\cdot\\vec u}\\vec u\\right\\rVert\\approx "+fmt(length)}/>
      </>:mode==="linePlane"||mode==="parallelPlanes"?<><h3>{mode==="linePlane"?"平行直线与平面间":"平行平面间"} · 化为点到平面</h3>
        <p>{mode==="linePlane"?<>直线 <Formula tex="\ell_2"/> 经过 <Formula tex="B"/>。方向 <Formula tex="\vec u=(2,1,0)"/> 垂直于平面 <Formula tex="\alpha"/> 的法向量 <Formula tex="\vec n=(1,-2,2)"/>，线上各点到平面的有符号高度相同。</>:<>平面 <Formula tex="\beta"/> 经过 <Formula tex="B"/>，与 <Formula tex="\alpha"/> 有公共法向量 <Formula tex="\vec n=(1,-2,2)"/>。第二个平面各点沿法向量的分量相同。</>}
        从 <Formula tex="B"/> 沿法向量向 <Formula tex="\alpha"/> 作垂线，取垂线段 <Formula tex="BH"/>。</p>
        <Formula display tex={"d("+(mode==="linePlane"?"\\ell_2":"\\beta")+",\\alpha)=BH=\\frac{|\\overrightarrow{OB}\\cdot\\vec n|}{\\lVert\\vec n\\rVert}=\\frac{|s-2+2h|}{3}\\approx "+fmt(length)}/>
      </>:mode==="line"?<><h3>点到直线 · 减去沿线分量</h3>
        <p>直线经过原点，方向向量为 <Formula tex="\vec{u}=(2,1,0)"/>。把 <Formula tex="\overrightarrow{OB}"/> 沿直线分解，投影向量的终点就是垂足 <Formula tex="H"/>。</p>
        <Formula tex="\overrightarrow{OH}=\frac{\overrightarrow{OB}\cdot\vec{u}}{\vec{u}\cdot\vec{u}}\vec{u}" display/>
        <p>余量 <Formula tex="\overrightarrow{HB}=\overrightarrow{OB}-\overrightarrow{OH}"/> 垂直于这条直线。勾股定理说明，<Formula tex="B"/> 连到线上其他任何点的线段都不比 <Formula tex="BH"/> 短。</p>
        <Formula tex={"d=\\sqrt{(s-2)^2/5+h^2}\\approx "+fmt(length)} display/>
      </>:mode==="plane"?<><h3>点到平面 · 沿法向量测量</h3>
        <p>平面经过原点，方程为 <Formula tex="x-2y+2z=0"/>。它的法向量 <Formula tex="\vec{n}=(1,-2,2)"/> 长度为 <Formula tex="3"/>。把 <Formula tex="\overrightarrow{OB}"/> 投向单位法向量得到有符号高度，取绝对值即为距离。</p>
        <Formula tex={"d=\\frac{|\\overrightarrow{OB}\\cdot\\vec{n}|}{|\\vec{n}|}=\\frac{|s-2+2h|}{3}\\approx "+fmt(length)} display/>
        <p>沿法向从 <Formula tex="B"/> 退回平面，得到 <Formula tex="\overrightarrow{OH}=\overrightarrow{OB}-\frac{s-2+2h}{9}\vec{n}"/>，即 <Formula tex="\overrightarrow{OB}"/> 在此平面内的正交投影。</p>
      </>:<><h3>两条直线 · 只保留公法线分量</h3>
        <p>绿线过 <Formula tex="O"/>，方向 <Formula tex="\vec{u}=(2,1,0)"/>。蓝线过 <Formula tex="B"/>，方向 <Formula tex="\vec{v}=(0,1,1)"/>。两方向不平行，叉积 <Formula tex="\vec{u}\times\vec{v}=(1,-2,2)"/> 同时垂直于它们。</p>
        <Formula tex={"d=\\frac{|\\overrightarrow{OB}\\cdot(\\vec{u}\\times\\vec{v})|}{|\\vec{u}\\times\\vec{v}|}=\\frac{|s-2+2h|}{3}\\approx "+fmt(length)} display/>
        <p>{length<1e-8?<MathText text="此时两线相交，$Q$ 与 $R$ 重合，距离为零。"/>:<MathText text={"这两条直线异面。公垂线段 $QR$ 同时垂直于两线，$R$ 的坐标约为 $"+triple(r)+"$。"}/>}在两条直线上分别移动端点，连接向量只增减沿两线的分量，其公法线分量保持不变。</p>
      </>}
    </div>
  </section>;
}
