"use client";
import {useRef,useState,type PointerEvent} from "react";
import {Formula} from "./math-text";
import {range,type Options,type Method,type Scheme} from "../lib/counting-methods";

export const letter=(i:number)=>String.fromCharCode(64+i);
type BoardProps={p:Options;s:Scheme;change:(s:Scheme)=>void;marks:boolean};

export function QueueBoard({m,p,s,change,marks,bound,setBound}:{m:Method;bound:boolean;setBound:(b:boolean)=>void}&BoardProps){
  const lane=useRef<HTMLDivElement>(null),[picked,pick]=useState<number|null>(null),[alert,say]=useState("");
  const [drag,setDrag]=useState<{id:number;dx:number;start:number}|null>(null);
  const length=s.length;
  const group=bound&&m==="bundle";
  const name=(id:number)=>m==="gaps"?(id<=p.n?`B_{${id}}`:`G_{${id-p.n}}`):m==="bundle"?letter(id):String(id);
  function move(id:number,to:number){
    const from=s.indexOf(id);if(from===to||from<0)return;
    if(m==="displace"&&Math.abs(from-to)!==1){say("每次只可交换相邻的两格。");return;}
    let next=s.slice();
    if(group){
      const block=s.filter(v=>v<=p.k),moving=id<=p.k?block:[id],target=s[to];
      if(moving.includes(target)){say("交换整体内部的顺序，请使用下方按钮。");return;}
      next=next.filter(v=>!moving.includes(v));
      let idx=next.indexOf(target)+(from<to?1:0);
      if(target<=p.k)idx=from<to?next.indexOf(block[block.length-1])+1:next.indexOf(block[0]);
      next.splice(idx,0,...moving);
    }else if(m==="gaps"||m==="bundle"){next.splice(from,1);next.splice(to,0,id);}
    else [next[to],next[from]]=[next[from],next[to]];
    say("");pick(null);change(next);
  }
  function choose(id:number){
    if(picked===null||picked===id){pick(picked===id?null:id);return;}
    move(picked,s.indexOf(id));pick(null);
  }
  function drop(e:PointerEvent<HTMLButtonElement>,id:number){
    if(!drag)return;
    const dx=e.clientX-drag.start,cell=(lane.current?.clientWidth||1)/length;
    setDrag(null);
    if(Math.abs(dx)<5){choose(id);return;}
    move(id,Math.min(length-1,Math.max(0,s.indexOf(id)+Math.round(dx/cell))));
  }
  function bundle(){
    if(bound){setBound(false);return;}
    const block=s.filter(v=>v<=p.k),idx=s.findIndex(v=>v<=p.k),rest=s.filter(v=>v>p.k);
    rest.splice(idx,0,...block);change(rest);setBound(true);pick(null);say("");
  }
  function insertGirl(gap:number){
    if(picked===null||picked<=p.n){say("先选一个绿色插入成员，再选择空位。");return;}
    const rest=s.filter(v=>v!==picked),boys=rest.filter(v=>v<=p.n);
    const idx=gap<p.n?rest.indexOf(boys[gap]):rest.length;
    rest.splice(idx,0,picked);change(rest);pick(null);say("");
  }
  const invalid=(id:number,index:number)=>m==="hats"?id===index+1:m==="displace"?Math.abs(id-index-1)>p.limit:false;
  const allAdjacent=s.filter(v=>v<=p.k).every((v,i,arr)=>!i||s.indexOf(v)===s.indexOf(arr[i-1])+1);
  const tileable=m==="displace"&&p.limit===1&&s.every((v,i)=>Math.abs(v-i-1)<=1);
  return <div className="ct-queue">
    <p className="ct-caption">{m==="hats"?"上排是领帽人，下排是帽子。交换两顶帽子，观察匹配关系。":m==="displace"?"交换相邻两格，比较每个人的编号与当前位置。":m==="gaps"?"先排蓝色成员，再将绿色成员插入队列的不同空位。":"拖动队员调整队列，或依次点选起点和目标位置。"}</p>
    <div className="ct-scroll"><div className="ct-track" style={{minWidth:length*42}}>
    {(m==="hats"||m==="displace")&&<div className="ct-seats">{range(length).map(i=><span key={i}><Formula tex={m==="hats"?"P_{"+i+"}":String(i)}/></span>)}</div>}
    {m==="hats"&&<svg className="ct-wires" viewBox={`0 0 ${length*40} 66`} preserveAspectRatio="none" aria-label="每个人与所领帽子的连线">{s.map((hat,i)=><line key={hat} x1={(i+.5)*40} x2={(hat-.5)*40} y1="0" y2="65" stroke={hat===i+1?"#b75243":"#478a70"} strokeWidth="1.5"/>)}</svg>}
    {m==="hats"&&<div className="ct-seats ct-hatkeys">{range(length).map(i=><span key={i}><Formula tex={"H_{"+i+"}"}/></span>)}</div>}
    <div ref={lane} className="ct-lane">
      {range(length).map(id=>{const index=s.indexOf(id),moving=!!drag&&(drag.id===id||(group&&drag.id<=p.k&&id<=p.k));
        const kind=invalid(id,index)?"bad":m==="bundle"&&id<=p.k?"special":m==="gaps"&&id>p.n?"good":"";
        return <button type="button" key={id} className={`ct-person ${kind} ${picked===id?"picked":""} ${group&&id<=p.k&&allAdjacent?"bundled":""}`} aria-label={"移动成员 "+id} aria-pressed={picked===id}
          style={{width:`calc(${100/length}% - 4px)`,left:`calc(${index*100/length}% + 2px)`,transform:moving?`translateX(${drag?.dx}px)`:undefined,transition:moving?"none":undefined,zIndex:moving?3:1}}
          onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);setDrag({id,start:e.clientX,dx:0});}}
          onPointerMove={e=>{if(drag?.id===id)setDrag({...drag,dx:e.clientX-drag.start});}}
          onPointerUp={e=>drop(e,id)} onPointerCancel={()=>setDrag(null)} onClick={e=>{if(e.detail===0)choose(id);}}>
          <Formula tex={m==="hats"?"H_{"+id+"}":name(id)}/>
        </button>;})}
    </div>
    {marks&&m==="displace"&&<div className="ct-seats">{s.map((v,i)=><span key={i}><Formula tex={`\\Delta=${v-i-1}`}/></span>)}</div>}</div></div>
    {m==="bundle"&&<div className="ct-tools"><button onClick={bundle}>{group?"解除捆绑":"捆成一个整体"}</button><button disabled={!group} onClick={()=>{const block=s.filter(v=>v<=p.k);block.unshift(block.pop()!);let i=0;change(s.map(v=>v<=p.k?block[i++]:v));}}>轮换内部顺序</button></div>}
    {m==="gaps"&&<div className="ct-tools"><span>插入空位</span>{range(p.n+1).map(i=><button key={i} onClick={()=>insertGirl(i-1)}><Formula tex={`g_{${i-1}}`}/></button>)}</div>}
    {tileable&&marks&&<div className="ct-tiles" aria-label="对应的单格砖与双格砖">{s.map((v,i)=>v<i+1?null:<span key={i} style={{flex:v===i+1?1:2}}>{v===i+1?"单":"双"}</span>)}</div>}
    {alert&&<p role="status">{alert}</p>}
  </div>;
}

export function BarBoard({p,s,change,marks}:BoardProps){
  const lane=useRef<HTMLDivElement>(null),[selected,select]=useState(0);
  const [dragging,start]=useState<number|null>(null);
  const total=p.n+p.k-1;
  const bars=s.slice(0,-1).map((_,i)=>s.slice(0,i+1).reduce((a,b)=>a+b,0)+i);
  function moveBar(i:number,position:number){
    const left=i?bars[i-1]+1:0,right=i+1<bars.length?bars[i+1]-1:total-1;
    const dest=Math.max(left,Math.min(right,position)),delta=dest-bars[i];
    if(!delta)return;
    const result=s.slice();result[i]+=delta;result[i+1]-=delta;change(result);
  }
  function movePointer(e:PointerEvent<HTMLButtonElement>,i:number){
    if(dragging!==i||!lane.current)return;
    const rect=lane.current.getBoundingClientRect();moveBar(i,Math.floor((e.clientX-rect.left)/rect.width*total));
  }
  return <div><p className="ct-caption">拖动隔板，或先选一块隔板再用左右键移动。相邻两块隔板之间的物品属于同一组。</p>
    <div className="ct-scroll"><div className="ct-beads" ref={lane} style={{minWidth:total*22}}>
      {range(total).map(t=><span key={t} className={bars.includes(t-1)?"empty":"bead"}/>)}
      {bars.map((pos,i)=><button key={i} className={"ct-bar"+(selected===i?" active":"")} style={{left:(pos+.5)/total*100+"%",transition:dragging===i?"none":undefined}}
        aria-label={"第 "+(i+1)+" 块隔板"} onFocus={()=>select(i)}
        onPointerDown={e=>{select(i);start(i);e.currentTarget.setPointerCapture(e.pointerId);}}
        onPointerMove={e=>movePointer(e,i)} onPointerUp={()=>start(null)} onPointerCancel={()=>start(null)}
        onKeyDown={e=>{if(e.key==="ArrowLeft"||e.key==="ArrowRight"){e.preventDefault();moveBar(i,pos+(e.key==="ArrowLeft"?-1:1));}}}/>)}
    </div></div>
    <div className="ct-tools"><button onClick={()=>moveBar(selected,bars[selected]-1)}>隔板左移</button><button onClick={()=>moveBar(selected,bars[selected]+1)}>隔板右移</button></div>
    {marks&&<div className="ct-sum">{s.map((v,i)=><span key={i} className={v<p.limit?"bad":""}><Formula tex={`x_{${i+1}}=${v}`}/></span>)}</div>}</div>;
}

export function PathBoard({p,s,change,marks,point}:{point:(x:number,y:number)=>void}&BoardProps){
  const [setPoint,setMode]=useState(false),[note,tell]=useState("");
  const gap=42,width=(p.n+1)*gap,height=(p.k+1)*gap;
  const pos=(x:number,y:number)=>[(x+.5)*gap,(p.k-y+.5)*gap];
  let x=0,y=0;const poly=[pos(0,0)];
  for(const step of s){if(step)y++;else x++;poly.push(pos(x,y));}
  const drawing=useRef<number|null>(null);
  function visit(a:number,b:number){
    if(setPoint&&p.rule!=="free"){point(a,b);setMode(false);tell("");return;}
    if((a===x+1&&b===y)||(b===y+1&&a===x)){change([...s,Number(b!==y)]);tell("");}
    else if(a!==x||b!==y)tell("请点选当前点正右或正上方相邻的格点。");
  }
  function trace(e:PointerEvent<SVGSVGElement>){
    const ctm=e.currentTarget.getScreenCTM();
    if(!ctm)return;
    const loc=new DOMPoint(e.clientX,e.clientY).matrixTransform(ctm.inverse());
    const a=Math.round(loc.x/gap-.5),b=p.k-Math.round(loc.y/gap-.5);
    if(a<0||a>p.n||b<0||b>p.k)return;
    const [cx,cy]=pos(a,b);if(Math.hypot(cx-loc.x,cy-loc.y)<13)visit(a,b);
  }
  // Track routes that have visited the marked point separately from the rest.
  const totals=Array.from({length:p.k+1},()=>Array.from({length:p.n+1},()=>[0,0]));
  for(let j=0;j<=p.k;j++)for(let i=0;i<=p.n;i++){
    const cell=totals[j][i];
    if(!i&&!j)cell[0]=1;
    for(const state of [0,1])cell[state]+=(totals[j-1]?.[i]?.[state]||0)+(totals[j][i-1]?.[state]||0);
    if(i===p.x&&j===p.y){cell[1]+=cell[0];cell[0]=0;}
  }
  return <div><p className="ct-caption">从左下角出发，点选或拖过相邻格点。空心方框标出终点。</p>
    <svg className="ct-grid" viewBox={`0 0 ${width} ${height}`} role="group" aria-label="可点击的网格路径" style={{touchAction:"none"}}
      onPointerDown={e=>{drawing.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);trace(e);}} onPointerMove={e=>{if(drawing.current===e.pointerId)trace(e);}} onLostPointerCapture={()=>{drawing.current=null;}}>
      {range(p.n+1).map(i=><line key={i} x1={pos(i-1,0)[0]} x2={pos(i-1,0)[0]} y1={gap/2} y2={height-gap/2}/>)}
      {range(p.k+1).map(i=><line key={i} y1={pos(0,i-1)[1]} y2={pos(0,i-1)[1]} x1={gap/2} x2={width-gap/2}/>)}
      <polyline points={poly.map(v=>v.join(",")).join(" ")} fill="none" stroke="#158064" strokeWidth="4"/>
      <rect x={width-gap/2-9} y={gap/2-9} width="18" height="18" fill="none" stroke="#4b5e82" strokeWidth="2"/>
      {range(p.n+1).flatMap(a=>range(p.k+1).map(b=>{const u=a-1,v=b-1,[cx,cy]=pos(u,v);
        const special=p.rule!=="free"&&u===p.x&&v===p.y;
        return <g key={u+"-"+v} role="button" tabIndex={0} aria-label={"格点 "+u+"，"+v} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();visit(u,v);}}}>
         <circle {...{cx,cy}} r="15" fill="transparent"/><circle {...{cx,cy}} r={special||u===x&&v===y?6:3} fill={special?(p.rule==="via"?"#82609e":"#b14f42"):u===x&&v===y?"#188264":"#607b70"}/>
        </g>;}))}
    </svg>
    <div className="ct-tools"><button disabled={x===p.n} onClick={()=>visit(x+1,y)}>向右</button><button disabled={y===p.k} onClick={()=>visit(x,y+1)}>向上</button><button disabled={!s.length} onClick={()=>{change(s.slice(0,-1));tell("");}}>退回一格</button>{p.rule!=="free"&&<button aria-pressed={setPoint} onClick={()=>setMode(!setPoint)}>{setPoint?"请点选格点":"移动限制点"}</button>}</div>
    {marks&&<p>当前 <Formula tex={`(${x},${y})`}/>　终点 <Formula tex={`(${p.n},${p.k})`}/>{p.rule!=="free"&&<>　{p.rule==="via"?"必经":"禁行"} <Formula tex={`(${p.x},${p.y})`}/></>}</p>}
    {marks&&<details><summary>查看各格点的路径数</summary><div className="ct-scroll"><table className="ct-gridcounts"><caption>纵坐标自下而上，横坐标自左向右</caption><tbody>{[...totals].reverse().map((row,j)=><tr key={j}>{row.map(([miss,hit],i)=><td key={i}><Formula tex={String(p.rule==="via"?hit:p.rule==="avoid"?miss:hit+miss)}/></td>)}</tr>)}</tbody></table></div><p>每格累加左邻、下邻的可行路径。必经点模式只列已经过标记点的路线。</p></details>}
    {note&&<p role="status">{note}</p>}</div>;
}
