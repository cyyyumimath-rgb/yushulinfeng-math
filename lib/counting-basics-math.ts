export type BasicMethod = "choose-order"|"sum-product"|"first-digit"|"relative-order"|"round-table";
export const ids=(n:number)=>Array.from({length:n},(_,i)=>i);
export const person=(v:number)=>String.fromCharCode(65+v);
export const rotate=(row:number[],shift:number)=>row.length ? row.slice(shift).concat(row.slice(0,shift)) : [];
export function circleKey(row:number[],mirror:boolean) {
  const rooted=rotate(row,row.indexOf(0));
  const forward=rooted.join(","), reverse=[0,...rooted.slice(1).reverse()].join(",");
  return mirror && reverse<forward ? reverse : forward;
}
export function inOrder(row:number[],k:number) {
  return row.filter(v=>v<k).every((v,i)=>v===i);
}
export function* arrangements(n:number,k:number,prior:number[]=[]):Generator<number[]> {
  if(prior.length===k){ yield prior; return; }
  for(let v=0;v<n;v++) if(!prior.includes(v))yield* arrangements(n,k,[...prior,v]);
}
export function enumerateBasic(method:BasicMethod,n:number,k:number,alternate:boolean) {
  if(method==="sum-product"){
    if(alternate)return [...ids(n).map(i=>[i,-1]),...ids(k).map(j=>[-1,j])];
    return ids(n).flatMap(i=>ids(k).map(j=>[i,j]));
  }
  const result:number[][]=[],seen=new Set<string>();
  const size=method==="round-table"||method==="relative-order"?n:k;
  for(const row of arrangements(n,size)){
    if(method==="first-digit"&&row[0]===0)continue;
    if(method==="relative-order"&&!inOrder(row,k))continue;
    const key=method==="choose-order"&&!alternate ? [...row].sort((a,b)=>a-b).join(",") :
      method==="round-table" ? circleKey(row,alternate) : row.join(",");
    if(seen.has(key))continue;
    seen.add(key);result.push(row);
  }
  return result;
}
