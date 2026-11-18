import { choose, fact, range } from "../lib/counting-methods";

export type BoxRule="free"|"nonempty"|"one"|"two";
export const rules:Record<BoxRule,string>={free:"允许空盒",nonempty:"每盒至少一个",one:"每盒最多一个",two:"每盒至少两个"};
export function allowed(n:number,r:BoxRule){
  return r==="free"||(r==="nonempty"&&n>=1)||(r==="one"&&n<=1)||(r==="two"&&n>=2);
}
export function* placements(n:number,k:number):Generator<number[]> {
  for(let code=0;code<k**n;code++){
    let next=code;
    yield range(n).map(()=>{const box=next%k;next=Math.floor(next/k);return box;});
  }
}
export function containers(row:number[],k:number) {
  const result:number[][]=Array.from({length:k},()=>[]);
  row.forEach((bucket,index)=>result[bucket].push(index+1));
  return result;
}
export function groupTotal(n:number,a:number,named:boolean,fixedFirst=false){
  return named&&fixedFirst?choose(n,a):choose(n,a)*(named?2:1)/(2*a===n?2:1);
}
export function groupLegal(groups:number[][],a:number,n:number,fixedFirst=false){
  return groups[0].length===a||(!fixedFirst&&groups[0].length===n-a);
}
function key(groups:number[][],numbered:boolean,named:boolean) {
  const ids=groups.map(g=>numbered?g.join(","):String(g.length));
  return (named?ids:ids.sort()).join("|");
}
export function enumerateContainers(n:number,k:number,numbered:boolean,named:boolean,legal:(groups:number[][])=>boolean) {
  const found=new Map<string,number[]>();
  for(const row of placements(n,k)){
    const g=containers(row,k);
    if(legal(g)){const id=key(g,numbered,named);if(!found.has(id))found.set(id,row);}
  }
  return [...found.values()];
}
export function boxTotal(n:number,k:number,numbered:boolean,named:boolean,rule:BoxRule){
  let total=0;
  function visit(rest:number,parts:number[]){
    if(parts.length===k){
      if(rest!==0)return;
      let multiplicity=1;
      if(numbered){
        multiplicity=fact(n)/parts.reduce((d,x)=>d*fact(x),1);
        if(!named){
          const frequencies=new Map<number,number>();
          parts.filter(x=>x>0).forEach(x=>frequencies.set(x,(frequencies.get(x)??0)+1));
          multiplicity/=[...frequencies.values()].reduce((d,x)=>d*fact(x),1);
        }
      }
      total+=multiplicity;return;
    }
    for(let x=named?0:(parts.at(-1)??0);x<=rest;x++)
      if(allowed(x,rule))visit(rest-x,[...parts,x]);
  }
  visit(n,[]);return total;
}
export function* permutations(pool:number[]):Generator<number[]>{
  if(!pool.length){yield [];return;}
  for(const x of pool)for(const tail of permutations(pool.filter(i=>i!==x)))yield [x,...tail];
}
export function endMask(row:number[]){
  const ends=[row[0],row[row.length-1]];return Number(ends.includes(1))+2*Number(ends.includes(2));
}
export function endpointTotal(n:number){return fact(n)-(n-2)*(n-3)*fact(n-2);}
export function vennRows(model:"integers"|"boxes",n:number){
  if(model==="integers")return range(n).map(i=>({tex:String(i),mask:[2,3,5].reduce((m,d,j)=>m+(i%d===0?1<<j:0),0)}));
  return Array.from(placements(n,3),r=>({tex:"("+r.map(x=>x+1).join(",")+")",mask:[0,1,2].reduce((m,b)=>m+(r.includes(b)?0:1<<b),0)}));
}
export type PairModel="subset"|"path"|"queue";
export type Pair={left:string;right:string};
export function pairing(model:PairModel,n:number):Pair[]{
  if(model==="queue"){
    return Array.from(permutations(range(n)),p=>({left:p.map(i=>"ABC"[i-1]).join("\\,"),right:"("+range(n).map(i=>p.indexOf(i)+1).join(",")+")"}));
  }
  const pairs:Pair[]=[];
  for(let word=0;word<2**n;word++){
    const digits=range(n).map(i=>Math.floor(word/2**(n-i))%2);
    const chosen=range(n).filter(i=>digits[i-1]);
    if(chosen.length!==Math.floor(n/2))continue;
    const subset="\\{"+chosen.join(",")+"\\}";
    pairs.push(model==="subset"?{left:subset,right:digits.join("")}:{left:digits.map(d=>d?"\\rightarrow":"\\uparrow").join("\\,"),right:subset});
  }
  return pairs;
}
