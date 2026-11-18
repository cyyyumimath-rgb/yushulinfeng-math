export const methods = [
  {id:"bundle",title:"捆绑法",goal:"指定的几人必须站在一起"},
  {id:"gaps",title:"插空法",goal:"指定的一组人彼此不相邻"},
  {id:"bars",title:"隔板法",goal:"将相同物品分给有区别的组"},
  {id:"hats",title:"错位排列",goal:"每个人都领到别人的帽子"},
  {id:"paths",title:"网格路径",goal:"只向右或向上走到终点"},
  {id:"displace",title:"有限位移排列",goal:"每个人只在原位附近移动"},
] as const;
export type Method = typeof methods[number]["id"];
export type Options = {n:number;k:number;limit:number;rule:"free"|"via"|"avoid";x:number;y:number};
export type Scheme = number[];

export function defaults(method:Method):Options {
  return {n:method==="bundle"?3:method==="bars"?7:method==="paths"?4:method==="gaps"?3:5,k:method==="bars"||method==="paths"?3:2,limit:1,rule:"free",x:1,y:1};
}
export function range(n:number){return Array.from({length:n},(_,i)=>i+1);}
export function fact(n:number):number{return range(n).reduce((p,v)=>p*v,1);}
export function choose(n:number,k:number):number {
  if(k<0||k>n||n<0) return 0;
  const r=Math.min(k,n-k);return range(r).reduce((p,i)=>p*(n-r+i)/i,1);
}
export function derangement(n:number){
  let before=1,last=0;
  if(!n)return before;
  for(let i=2;i<=n;i++){const next=(i-1)*(last+before);before=last;last=next;}
  return last;
}
export function displacementCount(n:number,bound:number){
  const ways=Array<number>(1<<n).fill(0);ways[0]=1;
  for(let mask=0;mask<ways.length;mask++){
    if(!ways[mask])continue;
    let placed=0;for(let bits=mask;bits;bits&=bits-1)placed++;
    for(let v=Math.max(0,placed-bound);v<=Math.min(n-1,placed+bound);v++)
      if(!(mask&(1<<v))) ways[mask|(1<<v)]+=ways[mask];
  }
  return ways[ways.length-1];
}
export function count(method:Method,p:Options):number{
  const {n,k,limit}=p;
  switch(method){
    case "bundle":return fact(n-k+1)*fact(k);
    case "gaps":return fact(n)*choose(n+1,k)*fact(k);
    case "bars":return choose(n-limit*k+k-1,k-1);
    case "hats":return derangement(n);
    case "displace":return displacementCount(n,limit);
    case "paths":{
      const all=choose(n+k,k),via=choose(p.x+p.y,p.x)*choose(n+k-p.x-p.y,n-p.x);
      return p.rule==="avoid"?all-via:p.rule==="via"?via:all;
    }
  }
}
export function counterFormula(m:Method,p:Options){
  const {n,k,limit,x,y}=p;
  switch(m){
    case "bundle":return `(${n}-${k}+1)!\\cdot ${k}!`;
    case "gaps":return k>n+1?"0":`${n}!\\, C_{${n+1}}^{${k}}\\, ${k}!`;
    case "bars":return n<k*limit?"0":`C_{${n-k*limit+k-1}}^{${k-1}}`;
    case "hats":return `D_{${n}}`;
    case "displace":return `F_{${n}}^{(${limit})}`;
    case "paths":{
      const all=`C_{${n+k}}^{${k}}`,via=`C_{${x+y}}^{${x}} C_{${n+k-x-y}}^{${n-x}}`;
      return p.rule==="free"?all:p.rule==="via"?via:all+"-"+via;
    }
  }
}
export function visits(s:Scheme,p:Options){
  let x=0,y=0;if(x===p.x&&y===p.y)return true;
  return s.some(v=>{if(v===0)x++;else y++;return x===p.x&&y===p.y;});
}
export function isLegal(m:Method,s:Scheme,p:Options){
  const {n,k,limit}=p;
  if(m==="bars")return s.length===k&&s.every(v=>Number.isInteger(v)&&v>=limit)&&s.reduce((a,b)=>a+b,0)===n;
  if(m==="paths"){
    if(s.length!==n+k||s.filter(v=>v===0).length!==n||s.filter(v=>v===1).length!==k)return false;
    return p.rule==="free"||(visits(s,p)===(p.rule==="via"));
  }
  const size=m==="gaps"?n+k:n;
  if(s.length!==size||new Set(s).size!==size||s.some(v=>!Number.isInteger(v)||v<1||v>size))return false;
  if(m==="bundle"){const indices=s.flatMap((v,i)=>v<=k?[i]:[]);return indices[k-1]-indices[0]===k-1;}
  if(m==="gaps")return s.every((v,i)=>!i||v<=n||s[i-1]<=n);
  return m==="hats"?s.every((v,i)=>v!==i+1):s.every((v,i)=>Math.abs(v-i-1)<=limit);
}

function* permutations(pool:number[],allow:(v:number,prior:number[])=>boolean=()=>true,prior:number[]=[]):Generator<Scheme>{
  if(!pool.length){yield prior;return;}
  for(const v of pool)if(allow(v,prior))yield* permutations(pool.filter(x=>x!==v),allow,[...prior,v]);
}
function* distributions(remaining:number,groups:number,minimum:number,prior:number[]=[]):Generator<Scheme>{
  if(remaining<minimum*groups)return;
  if(groups===1){yield [...prior,remaining];return;}
  for(let i=minimum;i<=remaining-minimum*(groups-1);i++)yield* distributions(remaining-i,groups-1,minimum,[...prior,i]);
}
function* walks(p:Options,x=0,y=0,visited=false,prior:number[]=[]):Generator<Scheme>{
  const touched=visited||(x===p.x&&y===p.y);
  if(p.rule==="avoid"&&touched)return;
  if(x===p.n&&y===p.k){if(p.rule!=="via"||touched)yield prior;return;}
  if(x<p.n)yield* walks(p,x+1,y,touched,[...prior,0]);
  if(y<p.k)yield* walks(p,x,y+1,touched,[...prior,1]);
}
export function* generate(m:Method,p:Options):Generator<Scheme>{
  const {n,k,limit}=p;
  switch(m){
    case "bars":yield* distributions(n,k,limit);return;
    case "paths":yield* walks(p);return;
    case "bundle":{
      for(const out of permutations([0,...range(n).slice(k)]))
        for(const inside of permutations(range(k)))yield out.flatMap(v=>v===0?inside:[v]);
      return;
    }
    case "gaps":{
      if(k>n+1)return;
      yield* permutations(range(n+k),(v,prior)=>v<=n||!prior.length||prior[prior.length-1]<=n);return;
    }
    case "hats":yield* permutations(range(n),(v,prior)=>v!==prior.length+1);return;
    case "displace":yield* permutations(range(n),(v,prior)=>Math.abs(v-prior.length-1)<=limit);return;
  }
}
export function examples(m:Method,p:Options,max:number):Scheme[]{
  const rows:Scheme[]=[];for(const s of generate(m,p)){rows.push(s);if(rows.length===max)break;}return rows;
}
// Choose a permutation by its factorial-number-system rank without generating earlier rows.
function permutationAt(pool:number[],rank:number):number[]{
  const available=[...pool], row:number[]=[];
  while(available.length){
    const group=fact(available.length-1);
    const position=Math.floor(rank/group);
    row.push(available.splice(position,1)[0]);
    rank%=group;
  }
  return row;
}

export function schemeIndex(m:Method,p:Options){
  const total=count(m,p);
  if(total<=2000||m==="bars"||m==="paths"){
    const rows=Array.from(generate(m,p));
    return (index:number)=>rows[index];
  }
  if(m==="bundle"){
    const insideCount=fact(p.k);
    return (index:number)=>{
      const inner=permutationAt(range(p.k),index%insideCount);
      const outer=permutationAt([0,...range(p.n).slice(p.k)],Math.floor(index/insideCount));
      return outer.flatMap(v=>v===0?inner:[v]);
    };
  }
  // Large queue examples share suffixes. Their counts let the table jump to any page.
  const size=m==="gaps"?p.n+p.k:p.n;
  const complete=(1<<size)-1, cache=new Map<number,number>();
  function allowedNext(member:number,seat:number,previousGreen:boolean){
    if(m==="gaps")return !(previousGreen&&member>p.n);
    return m==="hats"?member!==seat:Math.abs(member-seat)<=p.limit;
  }
  function suffix(mask:number,seat:number,green:boolean):number{
    if(mask===complete)return 1;
    const key=mask*2+Number(green);
    const saved=cache.get(key);
    if(saved!==undefined)return saved;
    let ways=0;
    for(let i=1;i<=size;i++){
      const bit=1<<(i-1);
      if(!(mask&bit)&&allowedNext(i,seat,green))ways+=suffix(mask|bit,seat+1,m==="gaps"&&i>p.n);
    }
    cache.set(key,ways);
    return ways;
  }
  return (index:number)=>{
    const row:number[]=[];
    let mask=0,green=false;
    for(let seat=1;seat<=size;seat++){
      for(let i=1;i<=size;i++){
        const bit=1<<(i-1),nextGreen=m==="gaps"&&i>p.n;
        if((mask&bit)||!allowedNext(i,seat,green))continue;
        const ways=suffix(mask|bit,seat+1,nextGreen);
        if(index<ways){row.push(i);mask|=bit;green=nextGreen;break;}
        index-=ways;
      }
    }
    return row;
  };
}
export function initialScheme(m:Method,p:Options):Scheme{
  if(m==="bars"){
    const base=Math.floor(p.n/p.k),remainder=p.n%p.k;return range(p.k).map(i=>base+Number(i<=remainder));
  }
  if(m==="paths")return [];
  return range(p.n+(m==="gaps"?p.k:0));
}

export const lessons:Record<Method,{steps:string[];pitfall:string;general:string}>={
 bundle:{steps:["选出必须相邻的成员。","将这些成员合成一个整体，确定整体和其余成员的顺序。","展开整体，在内部给成员排序。","从任一合法队列都能唯一还原外部顺序和内部顺序。"],pitfall:"整体内部仍有顺序，交换其中两人会得到新方案。",general:"(n-k+1)!\\,k!"},
 gaps:{steps:["先排好没有间隔限制的一组人。","两端和相邻两人之间各留一个空位。","选择不同的空位，放入另一组人。","抽出所有插入的人，可以唯一还原原队、所选空位和插入顺序。"],pitfall:"队首和队尾各有一个空位。每个空位最多插入一人。",general:"m!\\,C_{m+1}^{k}\\,k!\\quad(0\\le k\\le m+1)"},
 bars:{steps:["相同的物品分给有名称的各组。","先给每组发足最低份额。","给剩余物品与隔板排成一行；两端或连续隔板表示余量为零。","从各组的余量可唯一恢复隔板位置。"],pitfall:"物品相同，交换物品不会产生新分法。允许空组时要计入相邻隔板。",general:"C_{n-km+k-1}^{k-1}\\quad(n\\ge km)"},
 hats:{steps:["按人的原编号对齐帽子。","先把第一人的帽子换成其他人的帽子。","按对方是否恰好领取第一人的帽子分类，得到两个较小的错排问题。","检查每一列，所有人都应拿到其他人的帽子。"],pitfall:"每列避开原编号，还必须保证每顶帽子只出现一次。",general:"D_n=(n-1)(D_{n-1}+D_{n-2}),\\quad D_0=1,\\ D_1=0"},
 paths:{steps:["从起点出发，每一步只能向右或向上。","选出哪些步向上，剩余的步只能向右。","有必经点时在该点断开路径；有禁行点时剔除经过该点的路线。","读出每一步的方向就能唯一还原整条路线。"],pitfall:"经过指定点的路径数来自两段选择数的乘积。",general:"N(m,n)=C_{m+n}^{n}"},
 displace:{steps:["每个人先站在原位。","位移上限为一时，最左边的人只能原地或与下一人互换。","把原位者画成单格砖，把互换的一对画成双格砖。","依次剥去最左的砖，就得到铺满整排的唯一铺法。"],pitfall:"位移上限为二时还可能出现三人循环，需要按已用编号重新计数。",general:"F_n^{(1)}=F_{n-1}^{(1)}+F_{n-2}^{(1)},\\quad F_0^{(1)}=F_1^{(1)}=1"},
};
