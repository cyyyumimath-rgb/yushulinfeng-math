export function choose(n:number,k:number){
  if(k<0||k>n||n<0) return 0;
  let v=1;
  for(let i=1;i<=Math.min(k,n-k);i++) v=v*(n+1-i)/i;
  return Math.round(v);
}

export function latticePaths(n:number){
  const paths:string[]=[];
  function visit(x:number,y:number,path:string){
    if(x===n&&y===n){paths.push(path);return;}
    if(x<n) visit(x+1,y,path+"R");
    if(y<n) visit(x,y+1,path+"U");
  }
  visit(0,0,"");
  return paths;
}
export function firstCrossing(path:string){
  let level=0;
  for(let i=0;i<path.length;i++){
    level+=path[i]==="U"?1:-1;
    if(level>0)return i;
  }
  return -1;
}
export function reflectPrefix(path:string){
  const end=firstCrossing(path)+1;
  if(!end)return null;
  return Array.from(path.slice(0,end),s=>s==="R"?"U":"R").join("")+path.slice(end);
}
export function catalanCounts(n:number){
  const values=[1];
  for(let m=1;m<=n;m++){
    let count=0;
    for(let i=0;i<m;i++)count+=values[i]*values[m-i-1];
    values.push(count);
  }
  return values;
}
export function tilings(n:number):number[][]{
  if(n===0)return [[]];
  return [1,2].flatMap(tile=>tile<=n?tilings(n-tile).map(rest=>[tile,...rest]):[]);
}
export function tilingCounts(n:number){
  const counts=[1];
  for(let i=1;i<=n;i++)counts.push(counts[i-1]+(counts[i-2]||0));
  return counts;
}
export function subsets(n:number,k:number){
  const members:number[][]=[];
  for(let mask=0;mask<2**n;mask++){
    const set=Array.from({length:n},(_,i)=>i+1).filter(i=>mask & 2**(i-1));
    if(set.length===k)members.push(set);
  }
  return members;
}
export function coinCoefficients(n:number){
  const coefficients=Array<number>(n+1).fill(0); coefficients[0]=1;
  for(const value of [1,2,5])for(let i=value;i<=n;i++)coefficients[i]+=coefficients[i-value];
  return coefficients;
}
export type CoinTriple=[number,number,number];
export function coinWays(n:number){
  const ways:CoinTriple[]=[];
  for(let fives=0;fives*5<=n;fives++)for(let twos=0;2*twos+5*fives<=n;twos++)
    ways.push([n-5*fives-2*twos,twos,fives]);
  return ways;
}
