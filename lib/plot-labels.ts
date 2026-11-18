export type Pixel=[number,number];
type Segment=[Pixel,Pixel];
type Rect={x:number;y:number;w:number;h:number};

// Slab intersection also handles vertical, horizontal and zero-length segments.
export function crosses(rect:Rect,[a,b]:Segment){
 let lo=0,hi=1;
 for(const j of [0,1] as const){
   const min=j===0?rect.x:rect.y,max=min+(j===0?rect.w:rect.h),delta=b[j]-a[j];
   if(Math.abs(delta)<1e-8){if(a[j]<min||a[j]>max)return false;continue;}
   const r=(min-a[j])/delta,s=(max-a[j])/delta;
   lo=Math.max(lo,Math.min(r,s));hi=Math.min(hi,Math.max(r,s));
   if(lo>hi)return false;
 }
 return true;
}
export function placePointLabels(points:Pixel[],edges:Segment[],width:number,height:number):Pixel[]{
 const occupied:Rect[]=[];
 return points.map(([x,y])=>{
   for(let radius=17;radius<width;radius+=5){
     for(let i=0;i<24;i++){
       const angle=(i*7%24)*Math.PI/12-Math.PI/4;
       const cx=x+Math.cos(angle)*radius,cy=y+Math.sin(angle)*radius;
       const r:Rect={x:cx-12,y:cy-12,w:24,h:24};
       if(r.x<0||r.y<0||r.x+r.w>width||r.y+r.h>height)continue;
       if(occupied.some(s=>r.x<s.x+s.w&&s.x<r.x+r.w&&r.y<s.y+s.h&&s.y<r.y+r.h))continue;
       if(edges.some(edge=>crosses(r,edge))||points.some(p=>crosses(r,[p,p])))continue;
       occupied.push(r);return [cx,cy];
     }
   }
   // All supported projections leave space around the diagram.
   throw new Error("图内没有足够的标注空间。");
 });
}
