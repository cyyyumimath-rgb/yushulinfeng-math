"use client";

import {useMemo,useRef,useState} from "react";
import EnumerationTable from "./enumeration-table";
import {Formula} from "./math-text";
import {catalanCounts,choose,coinCoefficients,coinWays,firstCrossing,latticePaths,reflectPrefix,subsets,tilingCounts,tilings,type CoinTriple} from "../lib/counting-patterns";
import "./counting-patterns.css";

const F=({v}:{v:string|number})=><Formula tex={String(v)}/>;
const seq=(n:number)=>Array.from({length:n},(_,i)=>i);
const tuple=(a:number[])=>"("+a.join(",")+")";
function Selector({name,symbol,value,min,max,onChange}:{name:string;symbol:string;value:number;min:number;max:number;onChange:(v:number)=>void}){
  return <label className="cp-range"><span>{name} <F v={symbol+"="+value}/></span><input type="range" min={min} max={max} value={value} onChange={e=>onChange(Number(e.target.value))}/></label>;
}
const pathTex=(s:string)=>s.length?Array.from(s,c=>c==="R"?"\\rightarrow":"\\uparrow").join("\\,"):"\\varnothing";
function pathPoints(path:string){
  let x=0,y=0;
  return [[0,0],...Array.from(path,c=>c==="R"?[++x,y]:[x,++y])];
}
function Catalan({n}:{n:number}){
  const [path,setPath]=useState(""), [reflect,setReflect]=useState(false);
  const pathRef=useRef(path), drag=useRef<number|null>(null);
  const legal=useMemo(()=>latticePaths(n).filter(s=>firstCrossing(s)<0),[n]);
  const counts=catalanCounts(n), points=pathPoints(path);
  const [x,y]=points[points.length-1],cross=firstCrossing(path),bad=cross>=0;
  const reflection=reflect&&bad?reflectPrefix(path):null;
  const size=220/(n+1),px=(x:number)=>24+x*size,py=(y:number)=>238-y*size;
  const coords=(ps:number[][])=>ps.map(([x,y])=>px(x)+","+py(y)).join(" ");
  function update(s:string){pathRef.current=s;setPath(s);setReflect(false);}
  function draw(e:React.PointerEvent<SVGSVGElement>){
    if(drag.current!==e.pointerId)return;
    const matrix=e.currentTarget.getScreenCTM(); if(!matrix)return;
    const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());
    const tx=Math.round((p.x-24)/size),ty=Math.round((238-p.y)/size);
    if(tx<0||ty<0||tx>n||ty>n||Math.hypot(px(tx)-p.x,py(ty)-p.y)>size*.42)return;
    const s=pathRef.current,ps=pathPoints(s),[a,b]=ps[ps.length-1];
    if(tx===a+1&&ty===b)update(s+"R");
    if(tx===a&&ty===b+1)update(s+"U");
  }
  return <div className="cp-layout"><div><p>从 <F v="(0,0)"/> 走到 <F v={tuple([n,n])}/>，每步向右或向上。试着始终保持 <F v={String.raw`y\le x`}/>。</p>
    <div className="cp-paper"><svg className="cp-grid" viewBox="0 0 270 264" role="img" aria-label="格路自由绘制区，可点击或拖过下一格，也可使用右移与上移按钮" onPointerDown={e=>{drag.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);draw(e);}} onPointerMove={draw} onLostPointerCapture={()=>{drag.current=null;}}>
      {seq(n+1).map(i=><path key={i} d={"M"+px(0)+" "+py(i)+" H"+px(n)+" M"+px(i)+" "+py(0)+" V"+py(n)} stroke="#b8cdbf" fill="none"/>)}
      <path d={"M"+px(0)+" "+py(0)+" L"+px(n)+" "+py(n)} stroke="#758d80" strokeDasharray="4 4"/>
      <polyline points={coords(points)} fill="none" stroke={bad?"#a13b30":"#15724e"} strokeWidth="4" strokeLinejoin="round"/>
      <circle cx={px(n)} cy={py(n)} r="4" fill="white" stroke="#586f60"/>
      <circle cx={px(x)} cy={py(y)} r="5" fill={bad?"#a13b30":"#15724e"}/>
      {reflection&&<polyline points={coords(pathPoints(reflection))} stroke="#6a58a5" strokeDasharray="5 3" strokeWidth="3" fill="none"/>}
      {bad&&<circle cx={px(points[cross+1][0])} cy={py(points[cross+1][1])} r="7" stroke="#a13b30" fill="none"/>}
    </svg></div><div className="cp-explain"><h4>{bad?"路径已越线":x===n&&y===n?"合法路径已完成":"当前路径合法"}</h4>
      <p>当前位置 <F v={tuple([x,y])}/>。在格点上拖动，或逐步添加方向。</p>
      <div className="cp-wrap"><button disabled={x===n} onClick={()=>update(path+"R")}>向右</button><button disabled={y===n} onClick={()=>update(path+"U")}>向上</button><button disabled={!path} onClick={()=>update(path.slice(0,-1))}>撤回一步</button><button onClick={()=>update("")}>清空</button></div>
      <button aria-pressed={reflect} onClick={()=>{if(!bad||x!==n||y!==n)update("U"+"R".repeat(n)+"U".repeat(n-1));setReflect(!reflect);}}>演示越线路径的反射</button>
      {reflect&&<p>空心圈标出首次到达 <F v="y=x+1"/> 的位置。把此前各步连同越线这一步沿对角线反射，后段保持原方向，紫色虚线到达 <F v={tuple([n+1,n-1])}/>。逆向在首次到达 <F v="x=y+1"/> 时执行同样的交换。</p>}
    </div></div><aside className="cp-lesson"><h4>怎样计数</h4>
    <p>从全部路径中扣去越线路径，得到 <F v={"B_{"+n+"}=C_{"+2*n+"}^{"+n+"}-C_{"+2*n+"}^{"+(n-1)+"}="+(choose(2*n,n)-choose(2*n,n-1))}/>。逐条枚举得到 <F v={legal.length}/> 条合法路径。</p>
    <details><summary>按首次回到对角线的位置递推</summary><p>合法非空路径可写成“右、合法内段、上、合法余段”，其中第一个上升至对角线的步子决定唯一拆分。</p><div className="cp-formula"><F v={"B_0=1,\\quad B_{"+n+"}=\\sum\\limits_{i=0}^{"+(n-1)+"} B_i B_{"+(n-1)+"-i}="+seq(n).map(i=>counts[i]+"\\cdot "+counts[n-1-i]).join("+")+"="+counts[n]}/></div></details>
    <EnumerationTable title="合法路径枚举" column="每一步的方向" total={legal.length}
      expression={i=>pathTex(legal[i])} onLoad={i=>update(legal[i])}/>
  </aside></div>;
}

type Tile={start:number;length:number};
function Tiling({n}:{n:number}){
  const [tiles,setTiles]=useState<Tile[]>([]),[selected,setSelected]=useState(1),[end,setEnd]=useState<"first"|"last">("first");
  const [status,setStatus]=useState("");
  const board=useRef<HTMLDivElement>(null);
  const rows=useMemo(()=>tilings(n),[n]),counts=tilingCounts(n);
  const used=tiles.reduce((s,t)=>s+t.length,0);
  function place(start:number,length:number){
    if(start+length>n||tiles.some(t=>t.start<start+length&&start<t.start+t.length)){setStatus("这里放不下，试试其他空格。");return;}
    setTiles([...tiles,{start,length}].sort((a,b)=>a.start-b.start));setStatus("");
  }
  function load(row:number[]){
    let start=0;setTiles(row.map(length=>{const tile={start,length};start+=length;return tile;}));setStatus("");
  }
  const ordered=[...rows].sort((a,b)=>end==="first"?a[0]-b[0]:a[a.length-1]-b[b.length-1]);
  return <div className="cp-layout"><div><p>用单格砖和双格砖铺满一条长 <F v={n}/> 的长条。拖动砖块到空格，或选砖后点击起始格。点击已铺的砖可取下。</p>
    <div className="cp-wrap">{[1,2].map(len=><button className="cp-palette" aria-pressed={selected===len} key={len} onClick={()=>setSelected(len)}
      onPointerDown={e=>{setSelected(len);e.currentTarget.setPointerCapture(e.pointerId);}}
      onPointerUp={e=>{const hit=document.elementFromPoint(e.clientX,e.clientY)?.closest<HTMLElement>("[data-cp-slot]");if(hit&&board.current?.contains(hit))place(Number(hit.dataset.cpSlot),len);}}>
      {len===1?"单格砖":"双格砖"} <F v={len}/></button>)}
      <button onClick={()=>load([])}>清空长条</button></div>
    <div ref={board} className="cp-strip" style={{gridTemplateColumns:"repeat("+n+",1fr)"}}>
      {seq(n).map(i=>{const tile=tiles.find(t=>t.start<=i&&i<t.start+t.length);
        return <button key={i} data-cp-slot={i} aria-label={"第 "+(i+1)+" 格"+(tile?"，取下整块砖":"，放砖")} data-kind={tile?.length||0} data-tail={!!tile&&tile.start<i}
          onClick={()=>{if(tile){setTiles(tiles.filter(t=>t!==tile));setStatus("");}else place(i,selected);}}>
          {tile?.start===i?<F v={tile.length}/>:tile?null:<F v={i+1}/>}</button>;})}</div>
    <p role="status">{status|| (used===n?"长条已完整铺满。":"继续填满空格。")} 已铺 <F v={used}/> 格，共 <F v={n}/> 格。</p>
    <div className="cp-wrap"><button aria-pressed={end==="first"} onClick={()=>setEnd("first")}>按第一块分类</button><button aria-pressed={end==="last"} onClick={()=>setEnd("last")}>按最后一块分类</button></div>
    </div><aside className="cp-lesson"><h4>怎样计数</h4><p>取走{end==="first"?"开头":"末尾"}的一块，剩余部分仍是同类长条。初值为 <F v="T_0=T_1=1"/>。{n>=2&&<>因此 <F v={"T_{"+n+"}=T_{"+(n-1)+"}+T_{"+(n-2)+"}="+counts[n-1]+"+"+counts[n-2]+"="+counts[n]}/>。</>} 若 <F v="F_0=0,\ F_1=1"/>，则 <F v="T_n=F_{n+1}"/>。</p>
    <p>逐一生成砖块序列，共找到 <F v={rows.length}/> 种铺法。点选一个序列可在长条上复现。</p>
    <EnumerationTable key={end} total={ordered.length} column="从左到右的砖长" title="铺法枚举"
      hint={end==="first"?"按首砖长度归类。":"按末砖长度归类。"} expression={i=>ordered[i].join("+")} onLoad={i=>load(ordered[i])}/>
  </aside></div>;
}

function Pascal({n,k,onChange}:{n:number;k:number;onChange:(n:number,k:number)=>void}){
  const sets=useMemo(()=>subsets(n,k),[n,k]);
  const [picked,setPicked]=useState<number[]>(sets[0]||[]);
  const [identity,setIdentity]=useState("recurrence");
  const rows=seq(9);
  const cn=(a:number,b:number)=>"C_{"+a+"}^{"+b+"}";
  const included=sets.filter(s=>s.includes(n)),excluded=sets.filter(s=>!s.includes(n));
  return <div className="cp-layout"><div><p>点击三角形中的数字，追踪它由哪两类子集组成。三角形从第 <F v={0}/> 行开始。</p>
    <div className="cp-triangle" aria-label="可选择的杨辉三角">{rows.map(i=><div key={i}>{seq(i+1).map(j=><button key={j} aria-label={"第 "+i+" 行取 "+j+" 个，值 "+choose(i,j)} aria-pressed={i===n&&j===k} data-parent={i===n-1&&(j===k-1||j===k)} onClick={()=>onChange(i,j)}><F v={choose(i,j)}/></button>)}</div>)}</div>
    <div className="cp-wrap">{[["recurrence","分类递推"],["symmetry","对称性"],["sum","行和"],["binomial","二项式展开"]].map(([id,label])=><button key={id} aria-pressed={identity===id} onClick={()=>setIdentity(id)}>{label}</button>)}</div>
    <h4>亲自选一个子集</h4><div className="cp-wrap">{seq(n).map(i=>i+1).map(i=><button key={i} aria-pressed={picked.includes(i)} onClick={()=>setPicked(picked.includes(i)?picked.filter(j=>j!==i):[...picked,i].sort((a,b)=>a-b))}><F v={i}/></button>)}</div>
    <p>已选 <F v={picked.length}/> 个。{picked.length===k?(n===0?"构成空集。":picked.includes(n)?"属于包含指定元素的一类。":"属于不含指定元素的一类。"):"调整所选数量，使其等于目标。"} 枚举全部子集并按大小筛选得到 <F v={sets.length}/> 种。</p>
    </div><aside className="cp-lesson"><h4>怎样计数</h4>
    {identity==="recurrence"?<p>{n===0?<>空集的唯一子集是它自身，故 <F v="C_0^0=1"/>。</>:<>区分是否选入指定元素 <F v={n}/>。选入时还需从其余元素选 <F v={k-1}/> 个，未选入时仍须选 <F v={k}/> 个。越界的组合数记作零。<span className="cp-formula"><F v={cn(n,k)+"="+cn(n-1,k-1)+"+"+cn(n-1,k)+"="+included.length+"+"+excluded.length+"="+sets.length}/></span></>}</p>
    :identity==="symmetry"?<p>把所选集合换成其补集，就得到一一对应。<F v={cn(n,k)+"="+cn(n,n-k)+"="+sets.length}/>。当前补集为 <F v={"\\{"+seq(n).map(i=>i+1).filter(i=>!picked.includes(i)).join(",")+"\\}"}/>。</p>
    :identity==="sum"?<p>按选取的元素个数分类，每个子集恰出现一次。每个元素都可独立决定选与不选，因此 <F v={"\\sum\\limits_{j=0}^{"+n+"}C_{"+n+"}^{j}=2^{"+n+"}="+2**n}/>。</p>
    :<p>每个因式从两项中选一项，选择第二项的那些位置就是一个子集。<span className="cp-formula"><F v={"(a+b)^{"+n+"}=\\sum\\limits_{j=0}^{"+n+"}C_{"+n+"}^{j} a^{"+n+"-j}b^j"}/></span>取 <F v={"j="+k}/> 时，系数为 <F v={sets.length}/>。</p>}
    <EnumerationTable total={sets.length} title="子集枚举" column="选中的元素"
      expression={i=>sets[i].length?"\\{"+sets[i].join(",")+"\\}":"\\varnothing"} onLoad={i=>setPicked(sets[i])}/>
  </aside></div>;
}

function Coins({n,change}:{n:number;change:(v:number)=>void}){
  const [coins,setCoins]=useState<CoinTriple>([0,0,0]);
  const coefficients=useMemo(()=>coinCoefficients(20),[]);
  const ways=coinWays(n),values=[1,2,5];
  const sum=coins.reduce((acc,c,i)=>acc+c*values[i],0);
  function alter(i:number,delta:number){
    const next=coins.slice() as CoinTriple;
    next[i]=Math.max(0,Math.min(30,next[i]+delta));setCoins(next);
  }
  return <div className="cp-layout"><div><p>硬币可重复使用，交换取币顺序视为同一组合。用三种面值凑出目标金额 <F v={n}/>。</p>
    <div className="cp-coins">{values.map((value,i)=><div key={value}><span className="cp-coin"><F v={value}/></span>
      <button type="button" aria-label={"减少面值 "+value+" 的硬币"} disabled={!coins[i]} onClick={()=>alter(i,-1)}>−</button>
      <output><F v={coins[i]}/> 枚</output><button type="button" aria-label={"增加面值 "+value+" 的硬币"} disabled={coins[i]>=30} onClick={()=>alter(i,1)}>＋</button></div>)}
      <p role="status">当前金额 <F v={coins[0]+"+2\\cdot "+coins[1]+"+5\\cdot "+coins[2]+"="+sum}/>。{sum===n?"恰好达到目标。":sum>n?"已超过目标。":"还可继续放币。"}</p></div>
    <p>点击系数查看对应金额的全部方案。第 <F v={n}/> 次项系数为 <F v={"[x^{"+n+"}]G(x)="+coefficients[n]}/>，逐一枚举三种面值的枚数也得到 <F v={ways.length}/> 种。</p>
    <div className="cp-coefficients">{coefficients.map((c,i)=><button key={i} aria-pressed={i===n} onClick={()=>change(i)} aria-label={"选择 "+i+" 次项，系数 "+c}><F v={i===0?1:(c===1?"":String(c))+(i===1?"x":"x^{"+i+"}")}/></button>)}</div>
    </div>
    <aside className="cp-lesson"><h4>每个因子对应一种面值</h4>
      {values.map(v=><div className="cp-formula" key={v}><F v={"G_{"+v+"}(x)=1+x^{"+v+"}+x^{"+2*v+"}+\\cdots=\\frac1{1-x^{"+v+"}}"}/></div>)}
      <div className="cp-formula"><F v="G(x)=G_1(x)G_2(x)G_5(x)"/></div><p>选取各因子中对应枚数的一项，相乘后指数为总金额 <F v={sum}/>。收集同次幂即合并金额相同的所有组合。</p>
    <EnumerationTable total={ways.length} title="硬币组合枚举" column="三种面值的枚数"
      expression={i=>tuple(ways[i])} onLoad={i=>setCoins(ways[i])}/>
  </aside></div>;
}

const titles:Record<string,string>={catalan:"不过对角线的格路",tiling:"长条铺砖",pascal:"杨辉三角与组合恒等式",coins:"硬币组合与母函数"};
function Patterns({method}:{method:string}){
  const [n,setN]=useState(method==="coins"?10:method==="catalan"?3:5),[k,setK]=useState(2);
  const max=method==="catalan"?6:method==="tiling"?9:method==="pascal"?8:20;
  const min=method==="pascal"||method==="coins"?0:1;
  function select(a:number,b:number){setN(a);setK(b);}
  return <section className="counting-pattern"><h3>{titles[method]}</h3>
    <div className="cp-parameters"><Selector name={method==="coins"?"目标金额":method==="tiling"?"长条格数":method==="catalan"?"方格边长":"集合大小"} symbol="n" value={n} min={min} max={max} onChange={a=>select(a,Math.min(k,a))}/>
    {method==="pascal"&&<Selector name="选取个数" symbol="k" value={k} min={0} max={n} onChange={setK}/>}</div>
    {method==="catalan"?<Catalan key={n} n={n}/>:method==="tiling"?<Tiling key={n} n={n}/>:method==="pascal"?<Pascal key={n+"-"+k} n={n} k={k} onChange={select}/>:<Coins key={n} n={n} change={setN}/>}
  </section>;
}
export default function CountingPatterns({method}:{method:string}){
  return titles[method]?<Patterns method={method} key={method}/>:null;
}

