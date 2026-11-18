"use client";
import {useId,useState} from "react";
import {Formula} from "./math-text";

const pageSize=6;
type Props={
  total:number;
  expression:(index:number)=>string;
  onLoad?:(index:number)=>void;
  title?:string;
  column?:string;
  hint?:string;
};

export default function EnumerationTable({total,expression,onLoad,title="枚举结果",column="方案",hint}:Props){
  const id=useId();
  const [index,setIndex]=useState(0);
  const pages=Math.ceil(total/pageSize);
  const page=Math.min(index,Math.max(0,pages-1));
  const start=page*pageSize, end=Math.min(start+pageSize,total);
  return <section className="enum-panel" aria-labelledby={id}>
    <header><h4 id={id}>{title}</h4><span>共 <Formula tex={String(total)}/> 项</span></header>
    {hint&&<p>{hint}</p>}
    {total===0?<p>当前条件下没有符合要求的方案。</p>:<>
      <div className="enum-scroll"><table aria-labelledby={id}>
        <thead><tr><th scope="col">序号</th><th scope="col">{column}</th></tr></thead>
        <tbody>{Array.from({length:end-start},(_,i)=>{
          const item=start+i, formula=<Formula tex={expression(item)}/>;
          return <tr key={item}><th scope="row"><Formula tex={String(item+1)}/></th><td>{onLoad?
            <button type="button" aria-label={"在演示区查看第 "+(item+1)+" 项"} onClick={()=>onLoad(item)}>{formula}</button>:formula}</td></tr>;
        })}</tbody>
      </table></div>
      {pages>1&&<div className="enum-nav">
        <button type="button" disabled={!page} onClick={()=>setIndex(page-1)}>上一页</button>
        <span aria-live="polite"><Formula tex={String(page+1)+" / "+pages}/></span>
        <button type="button" disabled={page>=pages-1} onClick={()=>setIndex(page+1)}>下一页</button>
        {pages>5&&<form key={page} onSubmit={e=>{
          e.preventDefault();
          const value=Number(new FormData(e.currentTarget).get("page"));
          if(Number.isInteger(value)&&value>=1&&value<=pages)setIndex(value-1);
        }}><input type="number" aria-label="目标页码" name="page" min={1} max={pages} required defaultValue={page+1}/><button type="submit">跳页</button></form>}
      </div>}
    </>}
  </section>;
}
