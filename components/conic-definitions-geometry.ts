import type { ConicKind, XY } from "./polar-lab-geometry";
export const fixedA=(kind:ConicKind)=>kind==="ellipse"?2.8:1.5;
export function conicMeasurements(kind:ConicKind,size:number,t:number,branch:number) {
  const a=fixedA(kind),b=size,ell=kind==="ellipse",para=kind==="parabola";
  const c=para?size/2:Math.sqrt(a*a+(ell?-1:1)*b*b),e=para?1:c/a;
  const directrix=para?-size/2:a*a/c;
  const height=2.7*t;
  const P:XY=ell?[a*Math.cos(Math.PI*t),b*Math.sin(Math.PI*t)]:
    para?[height*height/(2*size),height]:[branch*a*Math.sqrt(1+(height/b)**2),height];
  const F:XY=[c,0],G:XY=[-c,0],H:XY=[directrix,P[1]];
  const pf=Math.hypot(P[0]-c,P[1]),pg=Math.hypot(P[0]+c,P[1]),ph=Math.abs(P[0]-directrix);
  const slopesDefined=!para&&Math.min(Math.abs(P[0]-a),Math.abs(P[0]+a))>1e-8;
  return {a,b,c,e,P,F,G,H,pf,pg,ph,directrix,slopeProduct:slopesDefined?P[1]**2/((P[0]-a)*(P[0]+a)):null};
}
export type XYZ=[number,number,number];
/** Intersect a cone generator (z cos t, z sin t, z) with z=h+mx. */
export function cutPoint(m:number,h:number,t:number):XYZ|null {
  const denominator=1-m*Math.cos(t);
  if(Math.abs(denominator)<1e-10)return null;
  const z=h/denominator;
  return [z*Math.cos(t),z*Math.sin(t),z];
}
export function cutKind(m:number):ConicKind {return m===1?"parabola":m<1?"ellipse":"hyperbola";}
export function cutExtent(m:number,overview:boolean) {
  // The distant vertex tends to infinity as the cut approaches a parabola.
  // Keep the local window fixed across that transition; enlarge only on request.
  return overview&&m!==1 ? Math.max(3.5,1.5/Math.abs(1-m)) : 3.5;
}
export function projectCut([x,y,z]:XYZ,angle:number,length:number):XY {
  const pan=angle*Math.PI/180,scale=112/length,elevation=.38;
  const depth=x*Math.sin(pan)+y*Math.cos(pan);
  return [220+(x*Math.cos(pan)-y*Math.sin(pan))*scale,158-(z*Math.cos(elevation)+depth*Math.sin(elevation))*scale];
}

