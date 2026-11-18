"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import EnumerationTable from "./enumeration-table";
import { Formula } from "./math-text";
import { choose, fact } from "../lib/counting-methods";
import { arrangements, circleKey, enumerateBasic, ids, inOrder, person, rotate, type BasicMethod } from "../lib/counting-basics-math";
import styles from "./counting-basics.module.css";

const topics = {
  "choose-order":["排列与组合","从一组不同的成员中选出指定人数，比较组队与分配岗位。"],
  "sum-product":["分类加法与分步乘法","观察一条完整路线需要选一次，还是分两段各选一次。"],
  "first-digit":["首位非零","用给出的数字组成无重复数字的多位正整数。"],
  "relative-order":["定序问题","改变队伍的绝对位置，保持指定成员之间的先后次序。"],
  "round-table":["圆排列","沿圆周观察相邻关系，比较旋转前后是否为同一座次。"],
} satisfies Record<BasicMethod,string[]>;
const form = (tex:string) => <Formula tex={tex}/>;
const population=(n:number,k:number)=>"A_{"+n+"}^{"+k+"}";
const combo=(n:number,k:number)=>"C_{"+n+"}^{"+k+"}";
const word=(row:number[])=>row.map(v=>v<0?"\\square":person(v)).join("\\,");
const marks=(row:number[])=>row.map(v=>v<0?"\\square":v).join("\\,");
const replacePair=(row:number[],a:number,b:number)=>row.map((v,i)=>i===a?row[b]:i===b?row[a]:v);
type SlotDrop=(position:number)=>void;

function Tile({tex,name,onClick,drop,slot,active=false,special=false,invalid=false,style,disabled=false}:{
  tex:string;name:string;onClick:()=>void;drop?:SlotDrop;slot?:number;active?:boolean;special?:boolean;invalid?:boolean;style?:CSSProperties;disabled?:boolean;
}) {
  const start=useRef<{x:number;y:number;id:number}|null>(null),ignoreClick=useRef(false);
  const [offset,setOffset]=useState<{x:number;y:number}|null>(null);
  return <button type="button" className={[styles.tile,special?styles.special:"",invalid?styles.invalid:"",active?styles.selected:""].join(" ")}
    style={{...style,...(offset?{translate:offset.x+"px "+offset.y+"px",zIndex:5}:{}),touchAction:drop?"none":undefined}}
    aria-label={name} aria-pressed={active} data-count-slot={slot} disabled={disabled}
    onClick={()=>{if(!ignoreClick.current)onClick();ignoreClick.current=false;}}
    onPointerDown={e=>{ignoreClick.current=false;if(!drop)return;start.current={x:e.clientX,y:e.clientY,id:e.pointerId};e.currentTarget.setPointerCapture(e.pointerId);}}
    onPointerMove={e=>{const p=start.current;if(!p||p.id!==e.pointerId)return;const x=e.clientX-p.x,y=e.clientY-p.y;
      if(Math.abs(x)+Math.abs(y)>5){setOffset({x,y});ignoreClick.current=true;}}}
    onPointerUp={e=>{
      if(start.current&&ignoreClick.current&&drop){
        const board=e.currentTarget.closest("[data-basic-board]");
        const target=document.elementsFromPoint(e.clientX,e.clientY).find(el=>el!==e.currentTarget&&el instanceof HTMLElement&&el.hasAttribute("data-count-slot")&&board?.contains(el));
        if(target)drop(Number(target.getAttribute("data-count-slot")));
      }
      start.current=null;setOffset(null);
    }}
    onPointerCancel={()=>{start.current=null;setOffset(null);ignoreClick.current=true;}}>
    {form(tex)}
  </button>;
}

function Parameter({label,symbol,min,max,value,change}:{label:string;symbol:string;min:number;max:number;value:number;change:(v:number)=>void}) {
  return <label className={styles.param}><span>{label} {form(symbol+"="+value)}</span>
    <input type="range" aria-label={label} min={min} max={max} value={value} onChange={e=>change(Number(e.target.value))}/></label>;
}
function SvgFormula({x,y,tex}:{x:number;y:number;tex:string}){
  return <foreignObject x={x-18} y={y-11} width="36" height="22" pointerEvents="none"><div className={styles.mathLabel}>{form(tex)}</div></foreignObject>;
}

function Routes({m,n,single,row,pick}:{m:number;n:number;single:boolean;row:number[];pick:(row:number[])=>void}){
  const baseline=single?119:75;
  const dashPatterns=[undefined,"6 3","2 3","9 3 2 3"];
  const chooseRoute=(segment:number,i:number)=>{
    const next=single?[-1,-1]:[...row];next[segment]=i;pick(next);
  };
  function edges(segment:number,count:number){
    const left=single?26:segment?163:26,right=single?302:segment?302:163;
    return ids(count).map(i=>{
      const midpoint=single ? baseline+(segment===0?-22*(count-i):22*(i+1)) : (count===1?75:27+96*i/(count-1));
      const curve="M "+left+" "+baseline+" Q "+((left+right)/2)+" "+(2*midpoint-baseline)+" "+right+" "+baseline;
      const sel=row[segment]===i;
      return <g key={segment+"-"+i} role="button" tabIndex={0} aria-label={(segment?"第二组路线":"第一组路线")+(i+1)}
        aria-pressed={sel} onClick={()=>chooseRoute(segment,i)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();chooseRoute(segment,i);}}}>
        <path d={curve} fill="none" stroke="transparent" strokeWidth={12}/>
        <path d={curve} fill="none" stroke={sel?"#b05a30":segment?"#568a74":"#768ca2"} strokeWidth={sel?3.3:1.7} strokeDasharray={dashPatterns[i]}/>
      </g>;
    });
  }
  return <>
    <svg className={styles.routes} viewBox={"0 0 328 "+(single?245:162)} role="group" aria-label="可选择的路线图，每组线路自上而下编号">
      {edges(0,m)}{edges(1,n)}
      {(single?[[26,"A"],[302,"C"]]:[[26,"A"],[163,"B"],[302,"C"]]).map(([px,label])=>
        <g key={label}><circle cx={Number(px)} cy={baseline} r="5" fill="#294b49"/><SvgFormula x={Number(px)} y={single?231:146} tex={String(label)}/></g>)}
    </svg>
    <div className={styles.routeLegend} aria-label="线路图例，每组自上而下编号">
      {[m,n].map((count,group)=><div key={group}><span>{single?(group?"下方":"上方"):(group?"右段":"左段")}自上而下</span>{ids(count).map(i=>
        <button type="button" key={i} aria-label={"选路线 "+(group?"s":"r")+(i+1)} aria-pressed={row[group]===i} onClick={()=>chooseRoute(group,i)}>
          <svg viewBox="0 0 26 8" width="26" height="8" aria-hidden="true"><path d="M 0 4 H 26" stroke={group?"#568a74":"#768ca2"} strokeWidth="2" strokeDasharray={dashPatterns[i]}/></svg>
          {form((group?"s":"r")+"_{"+(i+1)+"}")}</button>
      )}</div>)}
    </div>
    <details className={styles.tree} open><summary>路线选择树</summary>
      <ul>{single?[0,1].map(group=><li key={group}><span>{group?"第二类":"第一类"}</span><div>
        {ids(group?n:m).map(i=><button key={i} aria-pressed={row[group]===i} onClick={()=>chooseRoute(group,i)}>{form((group?"s":"r")+"_{"+(i+1)+"}")}</button>)}
      </div></li>):ids(m).map(i=><li key={i}><button aria-pressed={row[0]===i} onClick={()=>chooseRoute(0,i)}>{form("r_{"+(i+1)+"}")}</button>
        <div>{ids(n).map(j=><button key={j} aria-pressed={row[0]===i&&row[1]===j} onClick={()=>pick([i,j])}>
          {form("s_{"+(j+1)+"}")}</button>)}</div></li>)}</ul>
    </details>
  </>;
}

function answer(method:BasicMethod,n:number,k:number,alt:boolean){
  const A=population;
  switch(method){
    case "choose-order":return alt ? {tex:A(n,k)+"="+combo(n,k)+"\\cdot "+k+"!",total:choose(n,k)*fact(k)} : {tex:combo(n,k)+"=\\frac{"+A(n,k)+"}{"+k+"!}",total:choose(n,k)};
    case "sum-product":return {tex:n+(alt?"+":"\\times ")+k,total:alt?n+k:n*k};
    case "first-digit":return {tex:alt?(k===n?"0":A(n-1,k))+"+("+k+"-1)"+A(n-1,k-1):"("+n+"-1)"+A(n-1,k-1),total:(n-1)*fact(n-1)/fact(n-k)};
    case "relative-order":return {tex:"\\frac{"+n+"!}{"+k+"!}",total:fact(n)/fact(k)};
    case "round-table":return {tex:alt?"\\frac{("+n+"-1)!}{2}":"\\frac{"+n+"!}{"+n+"}",total:fact(n-1)/(alt?2:1)};
  }
}

function ArrayBoard({method,n,k,row,pick,active,focus}:{
  method:"choose-order"|"first-digit";n:number;k:number;row:number[];pick:(v:number[])=>void;active:number;focus:(v:number)=>void;
}){
  const digits=method==="first-digit",symbol=digits?String:person;
  function place(value:number,target:number){
    if(target<0||target>=k)return;
    const prior=row.indexOf(value);
    const next=prior<0?row.map((v,i)=>i===target?value:v):replacePair(row,prior,target);
    pick(next);
    const empty=next.findIndex(v=>v<0);
    focus(empty<0?(target+1)%k:empty);
  }
  return <>
    <p>点选目标格，再点选或拖入{digits?"数字":"成员"}。拖动已放入的对象可以交换位置。</p>
    <div className={styles.tiles}>{ids(n).map(v=><Tile key={v} name={"放入 "+symbol(v)} tex={symbol(v)} active={row.includes(v)}
      special={digits&&v===0} onClick={()=>place(v,active)} drop={target=>place(v,target)}/>)}</div>
    <div className={styles.slots}>{ids(k).map(i=>{
      const v=row[i],powers=["个位","十位","百位","千位","万位"];
      return <div key={i}><span>{digits?powers[k-1-i]:form("p_{"+(i+1)+"}")}</span>
        <Tile slot={i} tex={v<0?"\\square":symbol(v)} name={"目标格 "+(i+1)} onClick={()=>focus(i)}
          drop={v<0?undefined:target=>place(v,target)} active={active===i} invalid={digits&&i===0&&v===0}/></div>;
    })}</div>
    <button disabled={row[active]<0} onClick={()=>pick(row.map((v,i)=>i===active?-1:v))}>清空选中格</button>
  </>;
}

function RoundBoard({row,pinned,mirror,pick,pin,chosen,chooseSeat,swap}:{
  row:number[];pinned:boolean;mirror:boolean;pick:(s:number[])=>void;pin:(b:boolean)=>void;
  chosen:number|null;chooseSeat:(index:number)=>void;swap:(from:number,to:number)=>void;
}){
  const rooted=rotate(row,row.indexOf(0));
  return <>
    <p>拖动成员，或依次点选两张座位卡交换。旋转整桌，再比较顺时针相邻关系。</p>
    <div className={styles.tableBoard}><div className={styles.tableTop}>圆桌</div>
      {ids(row.length).map(personId=>{
        const i=row.indexOf(personId),angle=2*Math.PI*i/row.length-Math.PI/2;
        return <Tile key={personId} tex={person(personId)} slot={i} name={"座位 "+person(personId)} onClick={()=>chooseSeat(i)}
          drop={to=>swap(i,to)} special={pinned&&personId===0} disabled={pinned&&personId===0} active={chosen===i}
          style={{position:"absolute",left:(50+38*Math.cos(angle))+"%",top:(50+38*Math.sin(angle))+"%"}}/>;
      })}
    </div>
    <div className={styles.actions}>
      <button disabled={pinned} onClick={()=>pick(rotate(row,row.length-1))}>整桌顺时针转一位</button>
      <button onClick={()=>pick([row[0],...row.slice(1).reverse()])}>观察镜像</button>
      <label><input type="checkbox" checked={pinned} onChange={e=>{pin(e.target.checked);if(e.target.checked)pick(rooted);}}/> 固定 {form("A")} 在顶部</label>
    </div>
    <p>从 {form("A")} 起顺时针读数 {form(word(rooted))}。{mirror?"比较时也允许反向读数。":"顺时针方向参与区分方案。"}</p>
  </>;
}

function Workbench({method,n,k,alt,setAlt}:{method:BasicMethod;n:number;k:number;alt:boolean;setAlt:(b:boolean)=>void}){
  const sequence=method==="relative-order"||method==="round-table";
  const initial=()=>sequence?ids(n):method==="sum-product"?[-1,-1]:Array(k).fill(-1) as number[];
  const [row,setRow]=useState<number[]>(initial),[history,setHistory]=useState<number[][]>([]);
  const [active,focus]=useState(0),[chosen,select]=useState<number|null>(null),[pinned,pin]=useState(false);
  const [cursor,setCursor]=useState(0),[auto,play]=useState(false),[speed,setSpeed]=useState(1500),[show,setShow]=useState(true);
  const rows=useMemo(()=>enumerateBasic(method,n,k,alt),[method,n,k,alt]);
  const {tex,total}=answer(method,n,k,alt);
  function edit(next:number[],manual=true){
    select(null);if(manual)play(false);
    if(next.join(",")===row.join(","))return;
    setHistory(h=>[...h.slice(-31),row]);setRow(next);
  }
  function load(index:number,manual=true){
    const next=(index+rows.length)%rows.length;
    const example=rows[next];
    setCursor(next);edit(pinned&&method==="round-table"?rotate(example,example.indexOf(0)):example,manual);
  }
  useEffect(()=>{
    if(!auto)return;
    const timer=window.setTimeout(()=>load(cursor+1,false),speed);
    return ()=>window.clearTimeout(timer);
  });
  function swap(from:number,to:number){
    if(to<0||to>=row.length||from===to)return;
    if(pinned&&method==="round-table"&&(row[from]===0||row[to]===0))return;
    edit(replacePair(row,from,to));
  }
  function chooseSeat(i:number){
    if(chosen===null||chosen===i){select(chosen===i?null:i);return;}
    swap(chosen,i);select(null);
  }
  function switchMode(next:boolean){
    if(next===alt)return;
    setAlt(next);play(false);setCursor(0);select(null);
    if(method==="sum-product"){setRow([-1,-1]);setHistory([]);}
  }
  const complete=method==="sum-product"&&alt?row.some(v=>v>=0):row.every(v=>v>=0);
  const prior=history[history.length-1];
  const pair=method==="relative-order"?row.map(v=>v===0?1:v===1?0:v):[];
  const directions:Record<BasicMethod,string[]>={
    "choose-order":["组合：只选成员","排列：分配岗位"],
    "sum-product":["分步：经中转站","分类：任选直达线"],
    "first-digit":["先安排首位","按是否含零分类"],
    "relative-order":[],
    "round-table":["旋转视为相同","旋转与镜像都相同"],
  };
  let board:ReactNode,reason:ReactNode,status:ReactNode;
  if(method==="choose-order"||method==="first-digit"){
    board=<ArrayBoard method={method} n={n} k={k} row={row} pick={edit} active={active} focus={focus}/>;
    if(method==="choose-order"){
      const chosenSet=row.filter(v=>v>=0).sort((a,b)=>a-b);
      const sameMembers=complete&&prior?.every(v=>chosenSet.includes(v));
      status=alt?<>岗位顺序 {form(word(row))}{sameMembers?"。与上一排法相比，成员相同而岗位不同。":""}</>:
        <>同组成员 {form("\\{"+chosenSet.map(person).join(",")+"\\}")}{sameMembers?"，与上一次是同一组合。":"，位置不影响组合。"}</>;
      reason=<><p>先选出一组成员，再把这组成员分别安排到不同岗位。每个组合恰好对应 {form("k!")} 种排法。</p>
        {form("A_n^k=C_n^k\\,k!")}</>;
    }else{
      status=row[0]===0?"首位是零，不能组成指定位数的正整数。":complete?<>当前整数 {form(marks(row))}</>:"选择数字补全数位，首位应为非零数字。";
      reason=alt?<><p>分成完全不用零和使用零两类。用零时先为它选一个非首位的位置，再把其余数位填满。</p>
        <p>不用零的排法 {form(k===n?"0":population(n-1,k))}，用零的排法 {form("("+k+"-1)"+population(n-1,k-1))}。</p>
        <button onClick={()=>edit(rows.find(r=>r.includes(0))!)}>看含零方案</button>{" "}
        <button disabled={n===k} onClick={()=>{const v=rows.find(r=>!r.includes(0));if(v)edit(v);}}>看无零方案</button></>:
        <><p>先为首位选一个非零数字，共 {form(String(n-1))} 种选择。每选定一个首位，再从剩余数字中依次填写后面的数位。</p>
        <button onClick={()=>{edit([1,...Array(k-1).fill(-1)]);focus(1);}}>只安排首位</button></>;
    }
  }else if(method==="sum-product"){
    board=<><p>{alt?<>从 {form("A")} 直达 {form("C")}。任选一条第一类或第二类线路，任务即完成。</>:
      <>从 {form("A")} 到 {form("C")} 必经 {form("B")}。点击两段路线组成一次完整行程。</>}</p>
      <Routes m={n} n={k} single={alt} row={row} pick={edit}/></>;
    const route=row.flatMap((v,i)=>v<0?[]:[(i?"s":"r")+"_{"+(v+1)+"}"]);
    status=<>{complete?"完整路线":"当前已选"} {form(route.length?route.join("\\to"):"\\varnothing")}</>;
    reason=alt?<p>两类直达路线互不重叠，任取其中一条即可完成任务。把各类路线的条数相加。</p>:
      <p>中转前的每条路线都能与中转后的每条路线配合。树中每个叶节点恰好对应一条完整路线。</p>;
  }else if(method==="relative-order"){
    const ok=inOrder(row,k);
    const family=[...arrangements(k,k)].map(pattern=>{let i=0;return row.map(v=>v<k?pattern[i++]:v);});
    board=<><p>拖动或点选两人交换。绿色成员须按 {form(ids(k).map(person).join("\\prec "))} 的顺序出现。</p>
      <div className={styles.linearLane}>{ids(n).map(id=>{const i=row.indexOf(id);return <Tile key={id} slot={i} tex={person(id)} name={"成员 "+person(id)} special={id<k}
        active={chosen===i} onClick={()=>chooseSeat(i)} drop={to=>swap(i,to)} style={{left:(100*i/n)+"%",width:"calc("+100/n+"% - 3px)"}}/>;})}</div>
      <p>{k===2?"交换指定两人的位置，得到一对排列。":"固定这些成员占用的位置，改变其内部次序。"} 点击一项查看。</p>
      <div className={styles.family}>{family.map(r=><button key={r.join()} className={inOrder(r,k)?styles.good:styles.bad} aria-pressed={r.join()===row.join()} onClick={()=>edit(r)}>{form(word(r))}</button>)}</div></>;
    status=ok?"符合指定先后顺序。":"当前排列改变了指定成员的先后顺序。";
    reason=<><p>先让所有人自由排队。固定其他人和指定成员占用的位置，指定成员的 {form("k!")} 种内部次序中恰有一种合法。</p>
      {k===2&&<p>当前排列的配对方案为 {form(word(pair))}。每对中只有一项满足 {form("A\\prec B")}。</p>}</>;
  }else{
    board=<RoundBoard row={row} pinned={pinned} mirror={alt} pick={edit} pin={pin} chosen={chosen} chooseSeat={chooseSeat} swap={swap}/>;
    status=prior ? circleKey(row,alt)===circleKey(prior,alt)?"与上一次操作前属于同一方案。":"与上一次操作前属于不同方案。" : "当前座次可作为比较起点。";
    reason=<><p>暂给各座位编号，每一种圆排列都被整体旋转数了 {form("n")} 次。固定一人作参照后，余下成员能自由排列。</p>
      {alt&&<p>这里至少三人，成员互异。固定参照人后，顺读与逆读成对，再除以 {form("2")}。</p>}</>;
  }
  function exampleTex(index:number){
    const values=rows[index];
    if(method==="sum-product")return values.flatMap((v,i)=>v<0?[]:[(i?"s":"r")+"_{"+(v+1)+"}"]).join("\\to ");
    if(method==="first-digit")return values.join("");
    if(method==="choose-order"&&!alt)return "\\{"+values.map(person).join(",")+"\\}";
    return word(values);
  }
  return <div className={styles.workspace}>
    <section className={styles.main} data-basic-board>
      {directions[method].length>0&&<div className={styles.actions}>{directions[method].map((s,i)=><button key={s} aria-pressed={alt===Boolean(i)} onClick={()=>switchMode(Boolean(i))}>{s}</button>)}</div>}
      {board}
      <div className={styles.status} role="status">{status}</div>
      <div className={styles.actions}>
        <button disabled={!history.length} onClick={()=>{play(false);setRow(prior);setHistory(h=>h.slice(0,-1));if(method==="round-table"&&prior[0]!==0)pin(false);select(null);}}>撤销</button>
        <button onClick={()=>{play(false);setRow(initial());setHistory([]);select(null);focus(0);pin(false);setCursor(0);}}>重置工作区</button>
        <button aria-expanded={show} onClick={()=>setShow(!show)}>{show?"收起解析":"展开解析"}</button>
      </div>
      <details className={styles.inspect}><summary>逐个查看合法方案</summary>
        <p>枚举共 {form(String(rows.length))} 项。选择编号查看该方案。</p>
        <input type="range" aria-label="方案编号" min={1} max={rows.length} value={Math.min(cursor+1,rows.length)} onChange={e=>load(Number(e.target.value)-1)}/>
        <div className={styles.actions}><button onClick={()=>load(cursor-1)}>上一例</button>
          <button onClick={()=>load(cursor)}>载入第 {form(String(cursor+1))} 例</button><button onClick={()=>load(cursor+1)}>下一例</button>
          <button onClick={()=>{if(!auto)load(cursor);play(!auto);}}>{auto?"暂停":"自动轮播"}</button>
          <label>切换速度 <select value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={2600}>慢速</option><option value={1500}>中速</option><option value={750}>快速</option></select></label>
        </div>
      </details>
    </section>
    {show&&<aside className={styles.proof}><h3>怎样计数</h3>{reason}
      <h3>方案总数</h3><Formula tex={tex+"="+total} display/>
      <p>独立枚举得到 {form(String(rows.length))} 种，{rows.length===total?"与公式一致。":"请核对公式与枚举条件。"}</p>
      <EnumerationTable key={String(alt)} total={rows.length} expression={exampleTex} onLoad={load}
        column={method==="sum-product"?"所选路线":method==="first-digit"?"组成的整数":method==="round-table"?"从参照人顺时针读":"合法方案"}/>
    </aside>}
  </div>;
}

function BasicTopic({method}:{method:BasicMethod}){
  const [n,setN]=useState(method==="sum-product"?2:method==="first-digit"?6:5);
  const [k,setK]=useState(method==="first-digit"?4:method==="sum-product"?3:2);
  const [alt,setAlt]=useState(false);
  const cap=method==="relative-order"?3:method==="first-digit"?Math.min(n,5):method==="sum-product"?4:n;
  return <section className={styles.lab}><h2>{topics[method][0]}</h2><p>{topics[method][1]}</p>
    <div className={styles.params}><Parameter label={method==="sum-product"?"第一组路线数":method==="first-digit"?"可用数字个数":"成员总数"}
      symbol={method==="sum-product"?"m":"n"} min={method==="sum-product"?1:method==="choose-order"?2:3} max={method==="sum-product"?4:7}
      value={n} change={v=>{setN(v);if(method!=="sum-product")setK(old=>Math.min(old,v));}}/>
      {method!=="round-table"&&<Parameter label={method==="sum-product"?"第二组路线数":method==="first-digit"?"整数位数":method==="relative-order"?"定序人数":"选取人数"}
        symbol={method==="sum-product"?"n":"k"} min={method==="relative-order"||method==="first-digit"?2:1} max={cap} value={k} change={setK}/>}</div>
    <Workbench key={n+"-"+k} method={method} n={n} k={k} alt={alt} setAlt={setAlt}/>
  </section>;
}
export default function CountingBasics({method}:{method:string}){
  return Object.hasOwn(topics,method)?<BasicTopic key={method} method={method as BasicMethod}/>:null;
}

