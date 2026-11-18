"use client";
import {lazy,Suspense,useEffect,useMemo,useState} from "react";
import EnumerationTable from "./enumeration-table";
import {Formula} from "./math-text";
import {QueueBoard,BarBoard,PathBoard,letter} from "./counting-boards";
import {methods,defaults,count,counterFormula,initialScheme,isLegal,lessons,schemeIndex,range,visits,type Options,type Method,type Scheme} from "../lib/counting-methods";
import "./counting-lab.css";

const Basics=lazy(()=>import("./counting-basics"));
const Sets=lazy(()=>import("./counting-sets"));
const Patterns=lazy(()=>import("./counting-patterns"));
const topics=[
 {group:"排队与选取",list:[["bundle","捆绑法"],["gaps","插空法"],["choose-order","排列与组合"],["first-digit","特殊位置优先"],["relative-order","定序问题"],["hats","错位排列"],["round-table","圆排列"],["displace","有限位移排列"]]},
 {group:"分配与分类",list:[["bars","隔板法"],["sum-product","分类加法与分步乘法"],["groups","分组与分配"],["boxes","球入盒子"],["inclusion","容斥原理"],["complement","分类与补集"],["bijection","一一对应"]]},
 {group:"路径与递推",list:[["paths","网格路径"],["catalan","卡特兰数"],["tiling","铺砖递推"],["pascal","杨辉三角与组合恒等式"],["coins","硬币与母函数"]]},
];
const basicIds=["choose-order","sum-product","first-digit","relative-order","round-table"];
const setIds=["groups","boxes","inclusion","complement","bijection"];
function methodFromUrl():string{
  if(typeof window==="undefined")return "bundle";
  const value=new URLSearchParams(location.hash.split("?")[1]).get("method");
  return value&&topics.some(group=>group.list.some(([id])=>id===value))?value:"bundle";
}
function Param({label,value,min,max,update}:{label:string;value:number;min:number;max:number;update:(n:number)=>void}){
  return <label className="ct-param"><span>{label} <Formula tex={String(value)}/></span><input type="range" min={min} max={max} value={value} aria-label={label} onChange={e=>update(Number(e.target.value))}/></label>;
}
function schemeTex(m:Method,s:Scheme,p:Options){
  if(m==="bars")return `(${s.join(",")})`;
  if(m==="paths")return s.length?s.map(v=>v?"\\uparrow":"\\rightarrow").join("\\,"):"\\varnothing";
  return s.map(v=>m==="bundle"?letter(v):m==="gaps"?(v<=p.n?`B_{${v}}`:`G_{${v-p.n}}`):String(v)).join("\\,");
}

function frame(m:Method,p:Options,i:number,rows:Scheme[]):Scheme{
  const start=initialScheme(m,p);
  if(!rows.length||i===0)return start;
  const last=rows[rows.length-1],first=rows[0];
  switch(m){
    case "paths":return first.slice(0,Math.ceil(first.length*i/3));
    case "bundle":{const outside=range(p.n).slice(p.k),block=range(p.k);
      return i===1?[...outside,...block]:i===2?[...outside,...block.reverse()]:last;}
    case "gaps":{if(i===3)return first;const boys=range(p.n),girls=range(p.k).map(v=>p.n+v);
      if(i===1)return [...boys.reverse(),...girls];boys.splice(0,0,girls.shift()!);return [...boys,...girls];}
    case "bars":{if(i===1)return Array.from({length:p.k},(_,j)=>j===0?p.n:0);return i===2?first:last;}
    case "hats":{if(i===1){[start[0],start[1]]=[start[1],start[0]];return start;}return i===2?first:last;}
    case "displace":{if(i===1){[start[0],start[1]]=[start[1],start[0]];return start;}if(i===2&&p.n>=4){[start[0],start[1]]=[start[1],start[0]];[start[2],start[3]]=[start[3],start[2]];return start;}return last;}
  }
}

function Workshop({m}:{m:Method}){
  const [p,setP]=useState(()=>defaults(m)),[s,setS]=useState(()=>initialScheme(m,defaults(m)));
  const [mode,setMode]=useState("教师演示"),[step,setStep]=useState(-1),[play,playing]=useState(false),[speed,setSpeed]=useState(1600);
  const [show,setShow]=useState(true),[marks,mark]=useState(true),[panel,expand]=useState(true),[bound,bind]=useState(false);
  const [history,setHistory]=useState<Scheme[]>([]),[epoch,resetBoard]=useState(0);
  const total=count(m,p), rowAt=useMemo(()=>schemeIndex(m,p),[m,p]);
  const rows=useMemo(()=>total?[rowAt(0),rowAt(total-1)]:[],[rowAt,total]);
  const valid=isLegal(m,s,p);
  const method=methods.find(v=>v.id===m)!,guide=lessons[m],guideSteps=m==="displace"&&p.limit===2?[
    "每人从自己的编号位置开始。","尝试交换相邻成员，检查每人移动的格数。","允许移动两格后，三人循环也可能合法。","用已安排的成员集合记录状态，把符合距离限制的候选人逐个放入下一格。"
  ]:guide.steps;
  function clear(next:Options){
    setP(next);setS(initialScheme(m,next));setStep(-1);playing(false);setHistory([]);bind(false);resetBoard(e=>e+1);
  }
  function update(key:keyof Options,value:number|string){
    const next={...p,[key]:value};
    if(m==="bundle")next.k=Math.min(next.k,next.n);
    if(m==="paths"){next.x=Math.min(next.x,next.n);next.y=Math.min(next.y,next.k);}
    clear(next);
  }
  function edit(next:Scheme){
    if(next.join()===s.join())return;
    setHistory(h=>[...h.slice(-39),s]);setS(next);setStep(-1);playing(false);
  }
  function go(i:number){
    if(i<0||i>3)return;setS(frame(m,p,i,rows));setStep(i);bind(m==="bundle"&&i===1);setHistory([]);
  }
  useEffect(()=>{
    if(!play)return;
    if(step===3){playing(false);return;}
    const timer=window.setTimeout(()=>{const i=step+1;setStep(i);setS(frame(m,p,i,rows));bind(m==="bundle"&&i===1);},speed);
    return ()=>window.clearTimeout(timer);
  },[m,p,step,rows,speed,play]);
  const board={p,s,change:edit,marks};
  const negative=m==="hats"?"有人领到了自己的帽子。":m==="displace"?"有成员越过了允许的位移。":m==="bundle"?"指定成员还没有全部相邻。":m==="gaps"?"有两名插入成员相邻。":m==="bars"?"有组未达到最低份额。":"路径不满足指定点条件。";
  const incomplete=m==="paths"&&s.length!==p.n+p.k;
  const status=valid?"当前方案合法":incomplete&&(p.rule!=="avoid"||!visits(s,p))?"路径尚未走到终点":negative;
  function loadRow(i:number){edit(rowAt(i));bind(false);playing(false);}
  return <div className={"ct-work"+(panel?"":" folded")}>
    <section className="ct-workspace"><header className="ct-title"><div><p>{method.goal}</p><h2>{method.title}</h2></div>
    <button type="button" onClick={()=>expand(!panel)} aria-expanded={panel}>{panel?"收起解析":"展开解析"}</button></header>
    <div className="ct-tabs">{["自由探索","教师演示","数学研究"].map(v=><button key={v} aria-pressed={mode===v} onClick={()=>{setMode(v);setShow(v!=="自由探索");if(v==="数学研究")expand(true);playing(false);}}>{v}</button>)}</div>
    <div className="ct-board" key={epoch}>{m==="bars"?<BarBoard {...board}/>:m==="paths"?<PathBoard {...board} point={(x,y)=>clear({...p,x,y})}/>:<QueueBoard {...board} m={m} bound={bound} setBound={bind}/>}</div>
    <div className={"ct-status "+(valid?"ok":incomplete?"":"warn")} role="status">{status}</div>
    <div className="ct-tools">
      <button disabled={!history.length} onClick={()=>{setS(history[history.length-1]);setHistory(h=>h.slice(0,-1));bind(false);}}>撤销</button>
      <button onClick={()=>clear(p)}>重置工作区</button><label><input type="checkbox" checked={marks} onChange={e=>mark(e.target.checked)}/> 辅助标记</label>
      <label><input type="checkbox" checked={show} onChange={e=>{setShow(e.target.checked);if(e.target.checked)expand(true);}}/> 显示公式</label>
    </div>
    <div className="ct-parameters">
      <Param label={m==="paths"?"向右步数":m==="gaps"?"蓝色成员人数":m==="bars"?"物品数":"总人数"} min={m==="bundle"||m==="hats"||m==="displace"?2:1} max={m==="bars"?12:m==="paths"?6:m==="gaps"?6:8} value={p.n} update={v=>update("n",v)}/>
      {["bundle","gaps","bars","paths"].includes(m)&&<Param label={m==="bundle"?"捆绑人数":m==="gaps"?"绿色成员人数":m==="bars"?"组数":"向上步数"} min={m==="bundle"||m==="bars"?2:1} max={m==="paths"?6:m==="bundle"?Math.min(p.n,5):5} value={p.k} update={v=>update("k",v)}/>}
      {m==="bars"&&<Param label="每组最低份额" min={0} max={3} value={p.limit} update={v=>update("limit",v)}/>}
      {m==="displace"&&<Param label="允许的最大位移" min={1} max={2} value={p.limit} update={v=>update("limit",v)}/>}
      {m==="paths"&&<label>路径限制<select value={p.rule} onChange={e=>update("rule",e.target.value)}><option value="free">无</option><option value="via">指定必经点</option><option value="avoid">指定禁行点</option></select></label>}
    </div>
    {mode!=="自由探索"&&<section className="ct-demo"><h3>分步演示</h3><p aria-live="polite">{step<0?"从初始状态开始，观察每一步如何构造方案。":guideSteps[step]}</p>
      <div className="ct-tools"><button disabled={step<1} onClick={()=>{playing(false);go(step-1);}}>上一步</button>
      <button disabled={step===3||!total} onClick={()=>{playing(false);go(step+1);}}>下一步</button>
      <button disabled={!total} onClick={()=>{if(play){playing(false);return;}if(step<0||step===3)go(0);playing(true);}}>{play?"暂停":step>=0&&step<3?"继续演示":"自动演示"}</button>
      <select aria-label="演示速度" value={speed} onChange={e=>setSpeed(+e.target.value)}><option value={2600}>慢速</option><option value={1600}>常速</option><option value={850}>快速</option></select></div></section>}
    </section>
    {panel&&<aside className="ct-analysis"><h3>怎样计数</h3><ol>{guideSteps.map((t,i)=><li key={t} aria-current={step===i?"step":undefined}>{t}</li>)}</ol>
      {show&&<><h3>计数公式</h3><Formula display tex={counterFormula(m,p)+"="+total}/><h3>一般情形</h3>
      <Formula display tex={m==="displace"&&p.limit===2?String.raw`f(S)=\sum\limits_{j\in S,\ |j-|S||\le 2} f(S\setminus\{j\})`:guide.general}/>
      {m==="displace"&&p.limit===2&&<p>空集合有一种排法。每项按最后放入的编号分类。</p>}</>}
      <EnumerationTable key={JSON.stringify(p)} total={total} expression={i=>schemeTex(m,rowAt(i),p)} onLoad={loadRow}
        column={m==="bars"?"各组份额":m==="paths"?"行走方向":m==="hats"?"依次领取的帽号":"从左到右的顺序"}/>
      <h3>容易漏掉什么</h3><p>{guide.pitfall}</p>{total===0&&<p className="ct-nil">当前要求超出可分配的位置或份额。</p>}
    </aside>}
  </div>;
}

export default function CountingLab(){
 const [m,setM]=useState(methodFromUrl);
 const [copied,shareStatus]=useState("");
 useEffect(()=>{const sync=()=>{setM(methodFromUrl());shareStatus("");};sync();window.addEventListener("hashchange",sync);return()=>window.removeEventListener("hashchange",sync);},[]);
 const core=methods.find(method=>method.id===m);
 async function share(){
   try{await navigator.clipboard.writeText(location.href.split("#")[0]+"#visual/counting?method="+m);shareStatus("专题链接已复制。");}
   catch{shareStatus("此浏览器可通过地址栏复制当前专题链接。");}
 }
 return <section className="ct-lab"><nav aria-label="排列组合方法" className="ct-nav">
   <label className="ct-mobile-nav">选择方法<select value={m} onChange={e=>{location.hash="visual/counting?method="+e.target.value;}}>{topics.map(group=><optgroup key={group.group} label={group.group}>{group.list.map(([id,label])=><option key={id} value={id}>{label}</option>)}</optgroup>)}</select></label>
   {topics.map(group=><div className="ct-navgroup" key={group.group}><strong>{group.group}</strong>{group.list.map(([id,label])=><a href={"#visual/counting?method="+id} key={id} aria-current={id===m?"page":undefined}>{label}</a>)}</div>)}
   <button className="ct-share" onClick={share}>复制本专题链接</button>{copied&&<small role="status">{copied}</small>}
 </nav><div className="ct-current"><Suspense fallback={<p role="status">正在加载计数实验…</p>}>{core?<Workshop key={m} m={core.id}/>:basicIds.includes(m)?<Basics key={m} method={m}/>:setIds.includes(m)?<Sets key={m} method={m}/>:<Patterns key={m} method={m}/>}</Suspense></div></section>;
}
