export type MathSegment={kind:"text";value:string}|{kind:"math";value:string;display:boolean};
const pairs=[{left:"$$",right:"$$",display:true},{left:"\\[",right:"\\]",display:true},{left:"\\(",right:"\\)",display:false},{left:"$",right:"$",display:false}];
function escaped(text:string,index:number){let count=0;for(let i=index-1;i>=0&&text[i]==="\\";i--)count++;return count%2===1;}
/** Parse explicit math delimiters without changing the surrounding text or HTML. */
export function splitMath(text:string):MathSegment[]{
  const result:MathSegment[]=[];let cursor=0,plainStart=0;
  while(cursor<text.length){
    const pair=pairs.find(p=>text.startsWith(p.left,cursor)&&!escaped(text,cursor));
    if(!pair){cursor++;continue;}
    let end=cursor+pair.left.length;
    while(end<text.length&&(!text.startsWith(pair.right,end)||escaped(text,end)))end++;
    if(end>=text.length){cursor+=pair.left.length;continue;}
    const value=text.slice(cursor+pair.left.length,end);
    if(!value.trim()){cursor=end+pair.right.length;continue;}
    if(cursor>plainStart)result.push({kind:"text",value:text.slice(plainStart,cursor)});
    result.push({kind:"math",value,display:pair.display});cursor=end+pair.right.length;plainStart=cursor;
  }
  if(plainStart<text.length)result.push({kind:"text",value:text.slice(plainStart)});
  return result;
}
