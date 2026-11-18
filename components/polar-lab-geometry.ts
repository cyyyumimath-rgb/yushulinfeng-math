export type ConicKind = "ellipse" | "hyperbola" | "parabola";
export type XY = [number, number];
export type Line = [number, number, number];
const epsilon = 1e-9;

// F(x,y) = xx*x² + yy*y² + 2*lx*x + c.
export function coefficients(kind: ConicKind, size: number) {
  if (kind === "parabola") return {xx:0, yy:1, lx:-size, c:0};
  return {xx:kind === "ellipse" ? 1/9 : 1/4, yy:(kind === "ellipse" ? 1 : -1)/(size*size), lx:0, c:-1};
}

export function polarLine(kind: ConicKind, size: number, [u,v]: XY): Line {
  const {xx, yy, lx, c} = coefficients(kind, size);
  return [xx*u+lx, yy*v, lx*u+c];
}

/** Intersect the polar with the conic in affine coordinates. One real point
 * can also mean a hyperbola contact at infinity and one finite contact. */
export function contactPoints(kind: ConicKind, size: number, line: Line): XY[] {
  const [a,b,c] = line, len = Math.hypot(a,b);
  if (len < epsilon) return [];
  const x = -a*c/(len*len), y = -b*c/(len*len), dx = -b/len, dy = a/len;
  const f = coefficients(kind, size);
  const A = f.xx*dx*dx+f.yy*dy*dy;
  const B = 2*(f.xx*x*dx+f.yy*y*dy+f.lx*dx);
  const C = f.xx*x*x+f.yy*y*y+2*f.lx*x+f.c;
  const locate = (t:number):XY => [x+t*dx,y+t*dy];
  if (Math.abs(A) < epsilon) return Math.abs(B)<epsilon ? [] : [locate(-C/B)];
  const discriminant = B*B-4*A*C;
  if (discriminant < -epsilon) return [];
  if (Math.abs(discriminant) <= epsilon) return [locate(-B/(2*A))];
  const q = -0.5*(B+(B<0 ? -1 : 1)*Math.sqrt(discriminant));
  return [locate(q/A),locate(C/q)];
}

export function visibleSegment([a,b,c]:Line, xmax:number, ymax:number):XY[] {
  const hits:XY[]=[];
  function include(x:number,y:number) {
    if (Math.abs(x)>xmax+epsilon || Math.abs(y)>ymax+epsilon) return;
    if (!hits.some(([i,j])=>Math.hypot(i-x,j-y)<epsilon)) hits.push([x,y]);
  }
  if (Math.abs(b)>epsilon) for(const x of [-xmax,xmax]) include(x,-(a*x+c)/b);
  if (Math.abs(a)>epsilon) for(const y of [-ymax,ymax]) include(-(b*y+c)/a,y);
  return hits;
}

export function joining([x,y]:XY,[u,v]:XY):Line { return [y-v,u-x,x*v-y*u]; }
function intersection([a,b,c]:Line,[d,e,f]:Line):XY|null {
  const det=a*e-b*d;
  if(Math.abs(det)<1e-9*Math.hypot(a,b)*Math.hypot(d,e)+1e-12)return null;
  return [(b*f-c*e)/det,(c*d-a*f)/det];
}
export type SecantConstruction={A:XY;B:XY;C:XY;D:XY;X:XY;Y:XY};

/** Find two real secants with four distinct finite intersections. The constructed
 * diagonal points are obtained only by joining and intersecting straight lines. */
export function secantConstruction(kind:ConicKind,size:number,pole:XY):SecantConstruction|null {
  const [u,v]=pole,polar=polarLine(kind,size,pole);
  if(Math.hypot(polar[0],polar[1])<epsilon || Math.abs(polar[0]*u+polar[1]*v+polar[2])<epsilon)return null;
  const candidates:XY[][]=[];
  for(let i=0;i<48;i++){
    const theta=i*Math.PI/48, a=Math.cos(theta), b=Math.sin(theta);
    const points=contactPoints(kind,size,[a,b,-a*u-b*v]);
    if(points.length===2&&Math.hypot(points[0][0]-points[1][0],points[0][1]-points[1][1])>.01)candidates.push(points);
  }
  let score=Infinity, best:SecantConstruction|null=null;
  for(let i=0;i<candidates.length;i++)for(let j=i+1;j<candidates.length;j++){
    const [A,B]=candidates[i],[C,D]=candidates[j];
    const X=intersection(joining(A,C),joining(B,D)),Y=intersection(joining(A,D),joining(B,C));
    if(!X||!Y)continue;
    const all=[A,B,C,D,X,Y,pole], extent=Math.max(1,...all.map(([x,y])=>Math.max(Math.abs(x)/4.8,Math.abs(y)/3.1)));
    let gap=Infinity;
    for(let k=0;k<all.length;k++)for(let l=0;l<k;l++)gap=Math.min(gap,Math.hypot(all[k][0]-all[l][0],all[k][1]-all[l][1]));
    const cost=extent+0.4*extent/Math.max(gap,1e-6);
    if(cost<score){score=cost;best={A,B,C,D,X,Y};}
  }
  return best;
}
