export type SpatialPoint=[number,number,number];
export function dihedralGeometry(degrees:number, radius:number, halfEdge=1.5) {
  const radians=degrees*Math.PI/180, c=Math.cos(radians), s=Math.sin(radians);
  const a:SpatialPoint=[0,radius,0], b:SpatialPoint=[0,radius*c,radius*s], h:SpatialPoint=[0,b[1],0];
  const normalA:SpatialPoint=[0,0,1], normalB:SpatialPoint=[0,-s,c];
  return {c,s,a,b,h,normalA,normalB,chord:Math.hypot(a[1]-b[1],b[2]),
    height:b[2],area:halfEdge*radius,projected:halfEdge*Math.abs(b[1])};
}
