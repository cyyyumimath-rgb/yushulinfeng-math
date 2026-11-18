import type {V2,V3} from "./section-geometry";

export type ProjectionMethod = "oblique"|"isometric";
export const projectionNames={oblique:"斜二测",isometric:"正等轴测"};
export const solidNames={cube:"正方体",pyramid:"四棱锥",prism:"三棱柱",cylinder:"圆柱"};
export type DrawingSolid=keyof typeof solidNames;
export type Stroke={caption:string; tip:string; points:V2[]; hidden:boolean};

export function projectDrawing([x,y,z]:V3,method:ProjectionMethod):V2{
  if(method==="oblique"){
    const depth=y*Math.SQRT1_2/2;
    return [x+depth,-z-depth];
  }
  return [(x-y)*Math.SQRT1_2,(x+y-2*z)/Math.sqrt(6)];
}

function towardViewer(method:ProjectionMethod):V3 {
  return method==="oblique" ? [Math.SQRT1_2/2,-1,Math.SQRT1_2/2] : [1,1,1];
}
type Polyhedron={vertices:V3[]; names:string[]; faces:number[][]; order:[number,number,string][]};
const square:V3[]=[[0,0,0],[2,0,0],[2,2,0],[0,2,0]];
const triangle:V3[]=[[0,0,0],[2.35,0,0],[.65,1.85,0]];
function prism(base:V3[],height:number):Polyhedron {
  const n=base.length,faces:number[][]=[],order:Polyhedron["order"]=[];
  const ring=base.map((_,i)=>i);
  faces.push(ring,ring.map(i=>i+n));
  for(const i of ring){
    const j=(i+1)%n;
    faces.push([i,j,j+n,i+n]);
    order.push([i,j,i===0 ? "先画底面的一边，确定大小与位置。" : "沿底面轮廓接着画，核对端点使底面闭合。"]);
  }
  for(const i of ring) order.push([i,i+n,"从底面顶点竖直向上作等长侧棱。"]);
  for(const i of ring) order.push([i+n,(i+1)%n+n,"连接上底对应顶点，保持与下底对应边平行、等长。"]);
  const names=ring.map(i=>"ABCD"[i]);
  return {vertices:[...base,...base.map(([x,y]):V3=>[x,y,height])],names:[...names,...names.map(n=>n+"_1")],faces,order};
}

const pyramid:Polyhedron={
  vertices:[...square,[1,1,2.45]], names:["A","B","C","D","S"],
  faces:[[0,1,2,3],[0,1,4],[1,2,4],[2,3,4],[3,0,4]],
  order:[[0,1,"先画底面的一边。"],[1,2,"从端点向纵深方向画相邻边。"],[2,3,"画出与首边平行的对边。"],[3,0,"闭合底面。轻画两条底面对角线，交点是底面中心。"],
    [0,4,"从底面中心竖直向上量取高，标出锥顶，再把锥顶与第一个底面顶点连起。"],
    [1,4,"向同一锥顶连线。"],[2,4,"辨认棱所在的两个侧面，确定虚实。"],[3,4,"连接最后一个顶点，擦去辅助线。"]]
};
const polyhedra={cube:prism(square,2),pyramid,prism:prism(triangle,2)};

function centroid(points:V3[]):V3{
  return [0,1,2].map(k=>points.reduce((v,p)=>v+p[k],0)/points.length) as V3;
}
function facing(vertices:V3[],face:number[],center:V3,eye:V3) {
  const [a,b,c]=face.map(i=>vertices[i]);
  const u=b.map((x,i)=>x-a[i]), v=c.map((x,i)=>x-a[i]);
  const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
  const orient=n.reduce((s,x,i)=>s+x*(a[i]-center[i]),0);
  return Math.sign(orient)*n.reduce((s,x,i)=>s+x*eye[i],0)>1e-9;
}
function polyhedronStrokes(model:Polyhedron,method:ProjectionMethod):Stroke[]{
  const {vertices,faces,order,names}=model;
  const center=centroid(vertices),eye=towardViewer(method);
  const visible=faces.filter(face=>facing(vertices,face,center,eye));
  return order.map(([from,to,tip])=>({
    points:[projectDrawing(vertices[from],method),projectDrawing(vertices[to],method)],
    caption:"连接 $"+names[from]+"$ 与 $"+names[to]+"$", tip,
    hidden:!visible.some(face=>face.includes(from)&&face.includes(to))
  }));
}

function cylinderStrokes(method:ProjectionMethod):Stroke[]{
  const p=(phi:number,h:number)=>projectDrawing([Math.cos(phi),Math.sin(phi),h],method);
  // z projects vertically. The extreme horizontal points of the projected base
  // are exactly its tangencies to the two vertical silhouette generators.
  const right=Math.atan2(projectDrawing([0,1,0],method)[0],projectDrawing([1,0,0],method)[0]);
  const [vx,vy]=towardViewer(method);
  const nearDirection=(-Math.sin(right)*vx+Math.cos(right)*vy)>0?1:-1;
  function arc(h:number,sign:number){
    return Array.from({length:65},(_,i)=>p(right+nearDirection*sign*Math.PI*i/64,h));
  }
  const height=2.2;
  return [
    {caption:"画下底的近半弧",tip:"在纸上轻画投影后的外切平行四边形。找四边中点作为椭圆切点，顺着模板勾出近侧弧，弧线在左右端与竖直母线相切。",points:arc(0,1),hidden:false},
    {caption:"补下底的远半弧",tip:"保持同一椭圆的曲率，在被柱面遮住的远侧改用虚线。",points:arc(0,-1),hidden:true},
    {caption:"从左端向上画母线",tip:"在下底最左端作竖直线，沿投影竖轴量取柱高。",points:[p(right+Math.PI,0),p(right+Math.PI,height)],hidden:false},
    {caption:"从右端向上画母线",tip:"另一条轮廓线与左侧母线平行、等长。",points:[p(right,0),p(right,height)],hidden:false},
    {caption:"画上底的近半弧",tip:"将下底椭圆竖直平移到上方，两端分别与母线平滑相接。",points:arc(height,1),hidden:false},
    {caption:"闭合上底椭圆",tip:"从上方能看到整个上底面，上底远侧的弧也画成实线。",points:arc(height,-1),hidden:false}
  ];
}

export function drawingLesson(solid:DrawingSolid,method:ProjectionMethod){
  const strokes=solid==="cylinder"?cylinderStrokes(method):polyhedronStrokes(polyhedra[solid],method);
  const points=strokes.flatMap(s=>s.points), xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
  const scale=Math.min(323/(x1-x0),212/(y1-y0));
  const map=([x,y]:V2):V2=>[210+scale*(x-(x0+x1)/2),139+scale*(y-(y0+y1)/2)];
  const projected=(points:V3[])=>points.map(p=>map(projectDrawing(p,method)));
  const guides:{from:number;until:number;points:V2[]}[]=[];
  if(solid==="pyramid"){
    guides.push(...[[square[0],square[2]],[square[1],square[3]],[[1,1,0],[1,1,2.45]] as V3[]]
      .map(vertices=>({from:3,until:7,points:projected(vertices)})));
  }
  if(solid==="cylinder"){
    for(const h of [0,2.2]){
      const from=h===0?0:4,until=h===0?1:5;
      guides.push({from,until,points:projected([[-1,-1,h],[1,-1,h],[1,1,h],[-1,1,h],[-1,-1,h]])});
    }
  }
  return {strokes:strokes.map(stroke=>({...stroke,points:stroke.points.map(map)})),guides};
}
