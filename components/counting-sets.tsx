"use client";
import {useEffect,useId,useMemo,useState,type ReactNode} from "react";
import EnumerationTable from "./enumeration-table";
import {Formula as F} from "./math-text";
import {choose,fact,range} from "../lib/counting-methods";
import {allowed,boxTotal,containers,endMask,endpointTotal,enumerateContainers,groupLegal,groupTotal,pairing,permutations,rules,vennRows,type BoxRule,type PairModel} from "./counting-sets-model";
import "./counting-sets.css";

const letter=(x:number)=>String.fromCharCode(64+x);
function Param({name,value,low,high,change}:{name:string;value:number;low:number;high:number;change:(n:number)=>void}){
  return <label className="cs-param">{name} <select value={value} onChange={e=>change(Number(e.target.value))}>{range(high-low+1).map(i=><option key={i} value={low+i-1}>{low+i-1}</option>)}</select></label>;
}
function Check({label,value,change}:{label:string;value:boolean;change:(s:boolean)=>void}){
  return <label className="cs-check"><input type="checkbox" checked={value} onChange={e=>change(e.target.checked)}/>{label}</label>;
}
function Count({count,actual}:{count:number;actual:number}){
  return <div className="cs-count"><span>公式得 <F tex={String(count)}/> 种</span><span>逐项枚举 <F tex={String(actual)}/> 种</span></div>;
}
function Pager({index,length,onChange}:{index:number;length:number;onChange:(i:number)=>void}){
  return <div className="cs-tools"><button type="button" disabled={!length||index<=0} onClick={()=>onChange(index-1)}>上一方案</button>
    <span>{length?<F tex={(index+1)+"/"+length}/>:"无合法方案"}</span>
    <button type="button" disabled={index>=length-1} onClick={()=>onChange(index+1)}>下一方案</button></div>;
}
function Layout({title,lead,controls,board,lesson}:{title:string;lead:ReactNode;controls:ReactNode;board:ReactNode;lesson:ReactNode}){
  return <section className="cs-lab"><header><h3>{title}</h3><p>{lead}</p></header><div className="cs-options">{controls}</div><div className="cs-study"><div className="cs-board">{board}</div><aside>{lesson}</aside></div></section>;
}

function Containers({isGroup}:{isGroup:boolean}){
  const [n,setN]=useState(isGroup?6:4),[k,setK]=useState(3),[a,setA]=useState(3);
  const [named,setNamed]=useState(true),[numbered,setNumbered]=useState(true),[rule,setRule]=useState<BoxRule>("free");
  const [fixedFirst,setFixedFirst]=useState(false);
  const [picked,setPicked]=useState<number|null>(null),[custom,setCustom]=useState<number[]|null>(null),[page,setPage]=useState(0),[swapped,setSwapped]=useState(false);
  const bins=isGroup?2:k, target=Math.min(n-1,a);
  const fixed=isGroup&&named&&fixedFirst&&target*2!==n;
  const list=useMemo(()=>enumerateContainers(n,bins,numbered,named,g=>isGroup?groupLegal(g,target,n,fixed):g.every(x=>allowed(x.length,rule))),[n,bins,numbered,named,isGroup,target,rule,fixed]);
  const total=isGroup?groupTotal(n,target,named,fixed):boxTotal(n,bins,numbered,named,rule);
  const index=Math.min(page,Math.max(0,list.length-1)), row=custom??list[index]??range(n).map(i=>(i-1)%bins);
  const groups=containers(row,bins);
  const legal=isGroup?groupLegal(groups,target,n,fixed):groups.every(g=>allowed(g.length,rule));
  function reset(){setCustom(null);setPicked(null);setPage(0);setSwapped(false);}
  function place(i:number|null,b:number){
    if(i===null||!Number.isInteger(i)||i<0||i>=n)return;
    setCustom(row.map((current,j)=>i===j?b:current));setPicked(null);setSwapped(false);
  }
  const boxLabel=isGroup?"组":"盒";
  const capacity=target+"+"+(n-target);
  return <Layout title={isGroup?"分组与分配":"球入盒子"} lead={isGroup?<>把 <F tex={String(n)}/> 个不同的人分成两组，组大小为 <F tex={capacity}/>。{named&&(fixed?"第一组的人数已固定。":"两组可交换整组成员。")}</>:<>将 <F tex={String(n)}/> 个球全部放入 <F tex={String(k)}/> 个盒子，每个球恰好进入一个盒子。</>}
    controls={<><Param name={isGroup?"人数":"球数"} value={n} low={isGroup?3:1} high={isGroup?8:6} change={x=>{setN(x);setA(Math.min(x-1,a));reset();}}/>
      {isGroup?<Param name="其中一组的人数" value={target} low={1} high={n-1} change={x=>{setA(x);reset();}}/>:<><Param name="盒数" value={k} low={2} high={4} change={x=>{setK(x);reset();}}/>
      <label className="cs-param">放置条件 <select value={rule} onChange={e=>{setRule(e.target.value as BoxRule);reset();}}>{(Object.keys(rules) as BoxRule[]).map(r=><option key={r} value={r}>{rules[r]}</option>)}</select></label>
      <Check label="小球有编号" value={numbered} change={x=>{setNumbered(x);reset();}}/></>}
      <Check label={isGroup?"小组有名称":"盒子有名称"} value={named} change={x=>{setNamed(x);reset();}}/>
      {isGroup&&named&&2*target!==n&&<Check label="将指定人数固定给第一组" value={fixedFirst} change={x=>{setFixedFirst(x);reset();}}/>}</>}
    board={<><p>拖动{isGroup?"成员":"小球"}到容器，或先点选{isGroup?"成员":"小球"}再点“移入”。</p>
    <div className="cs-bins">{groups.map((g,b)=><div key={b} className="cs-bin" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();place(picked,b);}}>
      <div className="cs-bin-title">{named?<>{boxLabel} <F tex={letter(b+1)}/></>:<>无名{boxLabel}</>}<small><F tex={String(g.length)}/>{isGroup?" 人":" 球"}</small></div>
      <div className="cs-pieces">{g.map(i=><button key={i} type="button" draggable className={"cs-piece "+(!isGroup?"ball":"person")} aria-label={"选取"+(numbered?"编号 "+i:"相同的球")} aria-pressed={picked===i-1}
        style={{background:numbered?["#e0efe3","#dce8f4","#f1e6db","#ebe4f5","#d5eee9","#f1dfe4","#e7eace","#dce6dc"][i-1]:"#dfede3"}}
        onDragStart={e=>{e.dataTransfer.setData("text/plain",String(i));setPicked(i-1);}} onClick={()=>setPicked(picked===i-1?null:i-1)}>{numbered?<F tex={isGroup?letter(i):String(i)}/>:<span aria-hidden="true">●</span>}</button>)}</div>
      <button type="button" className="cs-move" disabled={picked===null||row[picked]===b} onClick={()=>place(picked,b)}>移入</button></div>)}</div>
      {isGroup&&<button type="button" onClick={()=>{setCustom(row.map(x=>1-x));setPicked(null);setSwapped(true);}}>交换两个完整小组</button>}
      <p aria-live="polite">{legal?"当前方案符合条件。":"当前方案不符合容量限制。"}{swapped&&legal&&(named?"交换后，各组名下的成员改变，是另一种分配。":"交换后成员划分完全相同，仍是同一方案。")}</p>
      {!custom&&<Pager index={index} length={list.length} onChange={i=>{setPage(i);setCustom(null);setPicked(null);setSwapped(false);}}/>}
      {custom&&list.length>0&&<button type="button" onClick={()=>{setCustom(null);setPicked(null);setSwapped(false);}}>回到枚举方案</button>}</>}
    lesson={<><h4>{isGroup?"交换是否产生新方案？":"先固定各盒的球数"}</h4>
      {isGroup?<><p>先选出一组，其余人进入另一组。两组人数相等时，这一步会把同一无名划分数两遍。</p>
        <F display tex={fixed?"N=C_{"+n+"}^{"+target+"}="+total:"N="+(named?"2\\cdot ":"")+"\\frac{C_{"+n+"}^{"+target+"}}{"+(2*target===n?2:1)+"}="+total}/>
        <p>{fixed?"两种容量已经指定给各组，选定第一组成员就唯一确定了分配。":named?"给两个非空组分配名称有两种方式。":"人数不同的两组可用人数区分，同一划分只计一次。"}</p></>:<>
        <p>取满足条件的一组容量 <F tex="(x_1,\ldots,x_k)"/>，其总和为 <F tex="n"/>。{named?"逐个有名盒子记录容量。":"把容量从小到大排列，先消去盒子的顺序。"}</p>
        <F display tex={"N=\\sum\\limits_{\\text{合法容量}}"+(numbered?(named?"\\frac{n!}{\\prod\\limits_i x_i!}":"\\frac{n!}{\\prod\\limits_i x_i!\\prod\\limits_{j\\ge1}m_j!}"):"1")}/>
        <p>{numbered?(named?"每组容量固定后，依次选择进入各盒的球。":"同容量的非空组调换位置会重复计数。这里的"):"球相同时，容量本身就唯一决定一种放法。"}{numbered&&!named&&<><F tex="m_j"/> 表示恰有 <F tex="j"/> 个球的盒数。</>}</p></>}
      <Count count={total} actual={list.length}/><p>枚举器逐个指定每个{isGroup?"人所在的组":"球所在的盒"}，筛选合法方案，再依当前规则去重。</p>
      <EnumerationTable key={[n,bins,target,numbered,named,fixed,rule].join(":")} total={list.length}
        column={numbered?(isGroup?"各组成员":"各盒球号"):"各盒球数"}
        expression={i=>{
          const grouped=containers(list[i],bins);
          if(!numbered)return "("+grouped.map(g=>g.length).join(",")+")";
          return grouped.map(g=>g.length?"\\{"+g.map(v=>isGroup?letter(v):v).join(",")+"\\}":"\\varnothing").join("\\mid ");
        }}
        onLoad={i=>{setCustom(null);setPage(i);setPicked(null);setSwapped(false);}}/></>}/>;
}

function Complement(){
  const [n,setN]=useState(5),[mode,setMode]=useState<"direct"|"other">("direct"),[filter,setFilter]=useState(-1),[page,setPage]=useState(0);
  const rows=useMemo(()=>Array.from(permutations(range(n))),[n]);
  const subset=useMemo(()=>rows.filter(row=>filter===-2|| (filter===-1?endMask(row)>0:endMask(row)===filter)),[rows,filter]);
  const count=endpointTotal(n),overlap=2*fact(n-2),only=2*(n-2)*fact(n-2), bad=(n-2)*(n-3)*fact(n-2);
  const index=Math.min(page,Math.max(0,subset.length-1)),current=subset[index];
  function select(f:number){setFilter(f);setPage(0);}
  return <Layout title="分类讨论与补集" lead={<>不同的 <F tex="n"/> 人排队，要求 <F tex="A,B"/> 至少一人在队首或队尾。</>}
    controls={<><Param name="人数" low={3} high={7} value={n} change={x=>{setN(x);setPage(0);}}/>
      <button type="button" aria-pressed={mode==="direct"} onClick={()=>{setMode("direct");select(-1);}}>直接分类</button>
      <button type="button" aria-pressed={mode==="other"} onClick={()=>{setMode("other");select(-2);}}>补集计数</button></>}
    board={<><h4>{mode==="direct"?"选择互斥的情形":"先看全集，再剔除两人都不在两端的排列"}</h4><div className="cs-tools">{(mode==="direct"?[[-1,"所有合法"],[1,"仅第一人"],[2,"仅第二人"],[3,"两人都在两端"]]:[[-2,"全集"],[0,"须剔除"],[-1,"保留下来"]]).map(([id,label])=><button type="button" key={id} aria-pressed={filter===id} onClick={()=>select(Number(id))}>{label}</button>)}</div>
      {current?<><div className="cs-queue">{current.map((i,j)=><span key={i} className={(j===0||j===n-1)?"end":""}><F tex={letter(i)}/></span>)}</div>
      <p>当前排列{["两人都不在两端。","仅第一人在端点。","仅第二人在端点。","两人都在端点，同时满足两个条件。"][endMask(current)]}</p></>:<p>此情形没有排列。</p>}
      <Pager index={index} length={subset.length} onChange={setPage}/></>}
    lesson={<><h4>{mode==="direct"?"把重叠情形单列":"从全集减去反面"}</h4>{mode==="direct"?<>
      <p>仅 <F tex="A"/> 在端点时，先选左端或右端，再从其余人中选一位占另一端。仅 <F tex="B"/> 在端点时同理。</p><F display tex={"N_A=N_B=2(n-2)(n-2)!="+only}/>
      <p>两人都在端点单独计数。若直接相加“两端有 <F tex="A"/>”与“两端有 <F tex="B"/>”，这一类会被算两次。</p><F display tex={"N_{AB}=2(n-2)!="+overlap}/>
      <F display tex={"N="+only+"+"+only+"+"+overlap+"="+count}/></>:<>
      <p>队首和队尾依次从其他 <F tex="n-2"/> 人中选，再排中间各位。补集有 <F tex={String(bad)}/> 种。</p>
      <F display tex={"N=n!-(n-2)(n-3)(n-2)!="+count}/></>}
      <Count count={count} actual={rows.filter(r=>endMask(r)!==0).length}/>
      <EnumerationTable key={n+":"+filter} total={subset.length} title={filter===-1?"合法排列枚举":filter===-2?"全集枚举":"当前分类的枚举"}
        column="从队首到队尾" expression={i=>subset[i].map(letter).join("\\,")} onLoad={setPage}/></>}/>;
}

const centers=[[113,82],[185,82],[149,138]];
const vennRadius=54;
const regionTitle=["三个集合之外","仅属第一集合","仅属第二集合","仅属前两个集合","仅属第三集合","仅属第一和第三集合","仅属第二和第三集合","三个集合的交集"];
function Inclusion(){
  const prefix=useId().replace(/[^a-zA-Z0-9_-]/g,"")+"venn";
  const [model,setModel]=useState<"integers"|"boxes">("integers"),[n,setN]=useState(30),[mask,setMask]=useState(7),[step,setStep]=useState(3),[play,setPlay]=useState(false),[page,setPage]=useState(0);
  const rows=useMemo(()=>vennRows(model,n),[model,n]);
  const legalRows=rows.filter(r=>model==="boxes"?r.mask===0:r.mask!==0);
  const selected=rows.filter(r=>r.mask===mask);
  const divisors=[1,2,3,6,5,10,15,30];
  const cardinal=(bits:number)=>model==="integers"?Math.floor(n/divisors[bits]):(3-[1,2,4].filter(b=>b&bits).length)**n;
  const singles=cardinal(1)+cardinal(2)+cardinal(4),pairs=cardinal(3)+cardinal(5)+cardinal(6),triple=cardinal(7);
  const total=singles-pairs+triple;
  const hits=[1,2,4].filter(b=>mask&b).length;
  const contribution=step===1?hits:step===2?hits-choose(hits,2):Number(hits>0);
  const index=Math.min(page,Math.max(0,selected.length-1));
  function region(m:number){setMask(m);setPage(0);}
  useEffect(()=>{
    if(!play)return;
    const timer=window.setTimeout(()=>{if(step<3)setStep(step+1);else setPlay(false);},1200);
    return ()=>window.clearTimeout(timer);
  },[step,play]);
  return <Layout title="容斥原理" lead={model==="integers"?<>从 <F tex={"1,\\ldots,"+n}/> 中找出至少能被 <F tex="2,3,5"/> 中一个数整除的整数。</>:<>编号各异的球放进三个有名盒子。以“第一个、第二个、第三个盒子为空”为三个集合。</>}
    controls={<><label className="cs-param">模型 <select value={model} onChange={e=>{const m=e.target.value as typeof model;setModel(m);setN(m==="integers"?30:3);region(m==="integers"?7:1);setStep(3);setPlay(false);}}><option value="integers">整数的整除性</option><option value="boxes">三个盒子全非空</option></select></label>
      <Param name={model==="integers"?"整数上界":"不同球数"} low={model==="integers"?15:1} high={model==="integers"?60:5} value={n} change={x=>{setN(x);setPage(0);}}/></>}
    board={<><p>点击图中区域，查看恰好属于这些集合的对象。</p>
      <svg className="cs-venn" viewBox="0 0 300 208" role="img" aria-label={"三集合区域，选中"+regionTitle[mask]}
        onClick={e=>{const mat=e.currentTarget.getScreenCTM();if(!mat)return;const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(mat.inverse());
          region(centers.reduce((s,[x,y],i)=>s+(Math.hypot(x-p.x,y-p.y)<=vennRadius?1<<i:0),0));}}>
        <defs>{centers.map(([x,y],i)=><g key={i}><clipPath id={prefix+"in"+i}><circle cx={x} cy={y} r={vennRadius}/></clipPath><mask id={prefix+"out"+i} maskUnits="userSpaceOnUse" x="0" y="0" width="300" height="208"><rect width="300" height="208" fill="white"/><circle cx={x} cy={y} r={vennRadius} fill="black"/></mask></g>)}</defs>
        <rect width="300" height="208" fill="#f4f8f4"/>
        {Array.from({length:8},(_,area)=>{
          const sets=[1,2,4].filter(bit=>area&bit).length;
          const weight=step===1?sets:step===2?sets-choose(sets,2):Number(sets>0);
          const fill=["#f4f8f4","#e0efe4","#c1d9c8","#99bca3"][weight];
          return <g key={area}>{centers.reduce<ReactNode>((node,_,i)=>(area&(1<<i))?<g clipPath={"url(#"+prefix+"in"+i+")"}>{node}</g>:<g mask={"url(#"+prefix+"out"+i+")"}>{node}</g>,<g><rect width="300" height="208" fill={fill} style={{transition:"fill .35s"}}/>{mask===area&&<rect width="300" height="208" fill="#dd981e" opacity=".35"/>}</g>)}</g>;
        })}
        {centers.map(([x,y],i)=><circle key={i} cx={x} cy={y} r={vennRadius} stroke={["#475b88","#21735a","#a2673c"][i]} strokeWidth="2.5" fill="none"/>)}</svg>
      <div className="cs-key">{[0,1,2].map(i=><span key={i} style={{borderColor:["#475b88","#21735a","#a2673c"][i]}}><F tex={letter(i+1)}/> {model==="integers"?<><F tex={String([2,3,5][i])}/> 的倍数</>:<>第 <F tex={String(i+1)}/> 盒为空</>}</span>)}</div>
      <label className="cs-param">选中区域 <select value={mask} onChange={e=>region(Number(e.target.value))}>{regionTitle.map((r,i)=><option key={i} value={i}>{r}</option>)}</select></label>
      <div className="cs-elements">{selected.length?selected.slice(Math.floor(index/8)*8,Math.floor(index/8)*8+8).map(r=><span key={r.tex}><F tex={r.tex}/></span>):"此区域为空。"} </div>
      {selected.length>8&&<div className="cs-tools"><button type="button" disabled={index<8} onClick={()=>setPage(index-8)}>上一页</button><button type="button" disabled={index+8>=selected.length} onClick={()=>setPage(index+8)}>下一页</button></div>}
      <p>金色为所选区域，绿色越深表示当前计算次数越多。此区域共有 <F tex={String(selected.length)}/> 个对象。{model==="boxes"&&"元组依次记录每个球进入的盒号。"}</p></>}
    lesson={<><h4>同一个对象被算了几次？</h4><div className="cs-tools">{["加入单集","减去两两交","补回三重交"].map((l,i)=><button type="button" key={l} aria-pressed={step===i+1} onClick={()=>{setStep(i+1);setPlay(false);}}>{l}</button>)}
      <button type="button" onClick={()=>{if(play)setPlay(false);else{setStep(1);setPlay(true);}}}>{play?"暂停":"播放三步"}</button></div>
      <p aria-live="polite">{["先将三个集合大小相加。","再减去三个两两交集的大小。","最后补回三重交集。"][step-1]} 在选中区域，一个对象目前的计数权重为 <F tex={String(contribution)}/>。</p>
      <F display tex={step===1?String(singles):step===2?singles+"-"+pairs+"="+(singles-pairs):singles+"-"+pairs+"+"+triple+"="+total}/>
      <p>{model==="integers"?"每个交集对应几个除数的公倍数。完成三步后，并集中的每个整数恰好留下一个计数。":"并集恰好是存在空盒的分配。从所有分配中扣去并集，就得到三个盒子全非空的分配。"}</p>
      {model==="boxes"&&<F display tex={"3^{"+n+"}-"+total+"="+(3**n-total)}/>}
      <Count count={model==="boxes"?3**n-total:total} actual={legalRows.length}/>
      <EnumerationTable key={model+":"+n} total={legalRows.length} expression={i=>legalRows[i].tex}
        column={model==="integers"?"并集中的整数":"每个球的盒号"} onLoad={i=>{
          const item=legalRows[i];setMask(item.mask);setPage(rows.filter(r=>r.mask===item.mask).indexOf(item));
        }}/></>}/>;
}

const mappings:Record<PairModel,string>={subset:"选人 ↔ 二进制串",path:"路径 ↔ 横步位置",queue:"排列 ↔ 座位表"};
function Bijection(){
  const [model,setModel]=useState<PairModel>("subset"),[n,setN]=useState(4),[short,setShort]=useState(false),[active,setActive]=useState<number|null>(null),[edges,setEdges]=useState<string[]>([]);
  const id=useId().replace(/[^A-Za-z0-9_-]/g,"")+"edges";
  const pairs=useMemo(()=>pairing(model,n),[model,n]), m=pairs.length, right=Array.from({length:m-Number(short)},(_,i)=>m-1-i);
  const coords=edges.map(e=>e.split(":").map(Number));
  const leftCount=pairs.map((_,i)=>coords.filter(([l])=>l===i).length),rightCount=right.map(j=>coords.filter(([,r])=>r===j).length);
  const multipleLeft=leftCount.some(v=>v>1),multipleRight=rightCount.some(v=>v>1);
  const complete=!multipleLeft&&!multipleRight&&leftCount.every(x=>x===1)&&rightCount.every(x=>x===1);
  const pairedByRule=complete&&coords.every(([l,r])=>l===r);
  const k=Math.floor(n/2), rows=m, height=rows*42;
  function clear(){setEdges([]);setActive(null);}
  function link(l:number|null,r:number){if(l===null)return;const key=l+":"+r;setEdges(old=>old.includes(key)?old.filter(e=>e!==key):[...old,key]);setActive(null);}
  return <Layout title="一一对应" lead={model==="queue"?<>左侧是队列，右侧按字母顺序记录各人的座位号。</>:model==="path"?<>每条路径含 <F tex={String(k)}/> 个横步，右侧记录这些横步在全部 <F tex={String(n)}/> 步中的位置。</>:<>从 <F tex={String(n)}/> 个编号中选 <F tex={String(k)}/> 个，把入选位置记为 <F tex="1"/>，其余记为 <F tex="0"/>。</>}
    controls={<><label className="cs-param">双射实例 <select value={model} onChange={e=>{const t=e.target.value as PairModel;setModel(t);setN(t==="queue"?3:4);clear();}}>{(Object.keys(mappings) as PairModel[]).map(t=><option key={t} value={t}>{mappings[t]}</option>)}</select></label>
    <Param name={model==="path"?"总步数":model==="queue"?"人数":"编号数"} low={2} high={model==="queue"?3:5} value={n} change={x=>{setN(x);clear();}}/>
    <Check label="暂移除一个右侧元素" value={short} change={x=>{setShort(x);clear();}}/></>}
    board={<><p>从左侧拖到右侧，或依次点选两侧端点来连线。重复连接可删除这条线。</p>
      <div className="cs-map" style={{gridTemplateRows:"repeat("+m+",42px)"}}>
        <svg aria-label="当前连线" viewBox={"0 0 100 "+height} preserveAspectRatio="none" style={{height:height}}>
        <defs><marker id={id} markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0 0 5 2.5 0 5Z" fill="#56866f"/></marker></defs>
        {coords.map(([l,r])=><line key={l+":"+r} x1="1" y1={l*42+21} x2="98" y2={right.indexOf(r)*42+21} stroke={leftCount[l]>1||rightCount[right.indexOf(r)]>1?"#ad573b":"#56866f"} strokeWidth="1.5" vectorEffect="non-scaling-stroke" markerEnd={"url(#"+id+")"}/>)}</svg>
        {pairs.map((p,i)=><button className="cs-left" type="button" draggable key={i} style={{gridRow:i+1}} aria-pressed={active===i} aria-label={"选择左侧第 "+(i+1)+" 项"} onDragStart={e=>{e.dataTransfer.setData("text/plain",String(i));setActive(i);}} onClick={()=>setActive(active===i?null:i)}><F tex={p.left}/></button>)}
        {right.map((j,i)=><button className="cs-right" type="button" key={j} style={{gridRow:i+1}} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();link(active,j);}} onClick={()=>link(active,j)} aria-label={"连接右侧第 "+(i+1)+" 项"}><F tex={pairs[j].right}/></button>)}</div>
      <div className="cs-tools"><button type="button" onClick={()=>{setEdges(right.map(j=>j+":"+j));setActive(null);}}>按编码规则连线</button><button type="button" onClick={clear}>清除连线</button></div></>}
    lesson={<><h4>逐项检查对应关系</h4>
      <p>每个左侧元素恰好连一个右侧元素，每个右侧元素也恰好收到一条线，才建立了双射。</p>
      <p role="status">{complete?(pairedByRule?"已建立双射，且符合当前编码规则。":"已建立双射，使用了另一种配对规则。"):[multipleLeft?"有一对多。":"",multipleRight?"有多对一。":"",short?"右侧缺少一个元素，两边无法建立双射。":"",!short&&(leftCount.includes(0)||rightCount.includes(0))?"还有未对应的元素。":""].join("")}</p>
      <p>{model==="queue"?"逆向还原时，把每个人放回所列座位，每个座位恰好出现一次。":model==="path"?"逆向还原时，在所列位置向右走，其余位置向上走，得到唯一的路径。":"逆向还原时，读取所有取值为一的位置，得到唯一的子集。"}</p>
      <F display tex={model==="queue"?n+"!="+fact(n):"C_{"+n+"}^{"+k+"}="+choose(n,k)}/>
      <Count count={model==="queue"?fact(n):choose(n,k)} actual={pairs.length}/><p>当前左侧有 <F tex={String(m)}/> 个元素，右侧有 <F tex={String(right.length)}/> 个元素。</p>
      <EnumerationTable key={model+":"+n+":"+short} total={m} title="编码对应表" column="对象与编码"
        expression={i=>pairs[i].left+"\\;\\longleftrightarrow\\;"+(right.includes(i)?pairs[i].right:"\\text{缺项}")}/></>}/>;
}

export default function CountingSets({method}:{method:string}){
  switch(method){
    case "groups":return <Containers key="groups" isGroup/>;
    case "boxes":return <Containers key="boxes" isGroup={false}/>;
    case "inclusion":return <Inclusion/>;
    case "complement":return <Complement/>;
    case "bijection":return <Bijection/>;
    default:return null;
  }
}
