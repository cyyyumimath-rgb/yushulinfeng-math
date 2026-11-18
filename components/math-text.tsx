import {Fragment,useMemo} from "react";
import katex from "katex";
import {splitMath} from "../lib/math-segments";

export function Formula({tex,display=false}:{tex:string;display?:boolean}){
  const rendered=useMemo(()=>{try{return katex.renderToString(tex,{displayMode:display,output:"htmlAndMathml",throwOnError:true,trust:false,maxExpand:1000,maxSize:20,strict:"warn"});}catch{return null;}},[tex,display]);
  if(rendered===null)return <span className="math-fallback" title="公式格式有误，请检查 LaTeX 语法">{tex}</span>;
  // Only KaTeX's restricted output enters this HTML boundary. User text stays in React text nodes.
  return <span className={`math-formula ${display?"math-display":"math-inline"}`} dangerouslySetInnerHTML={{__html:rendered}}/>;
}
export default function MathText({text,className=""}:{text:string;className?:string}){
  return <span className={`math-text ${className}`}>{splitMath(text).map((part,index)=>part.kind==="text"?<Fragment key={index}>{part.value}</Fragment>:<Formula key={index} tex={part.value} display={part.display}/>)}</span>;
}
