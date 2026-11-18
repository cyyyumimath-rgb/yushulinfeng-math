export type V3 = [number, number, number];
export type V2 = [number, number];

const eps = 1e-9;
const clamp = (x: number, low: number, high: number) => Math.min(high, Math.max(low, x));
export const dot = (a: V3, b: V3) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
export const mix = (a: V3, b: V3, t: number): V3 => [
  a[0] + (b[0]-a[0])*t, a[1] + (b[1]-a[1])*t, a[2] + (b[2]-a[2])*t
];
const cross = (a: V3, b: V3): V3 => [
  a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]
];
const normalized = (a: V3): V3 => {
  const length = Math.hypot(...a);
  return [a[0]/length,a[1]/length,a[2]/length];
};

export const cubeVertices: V3[] = Array.from({length: 8}, (_, i) => [
  i & 1 ? 1 : -1, i & 2 ? 1 : -1, i & 4 ? 1 : -1
]);

export const cubeEdges: [V3,V3][] = cubeVertices.flatMap((a,i) =>
  [1,2,4].filter(bit => !(i & bit)).map((bit): [V3,V3] => [a, cubeVertices[i | bit]])
);

// Intersect n·p=d with the 12 edges. An entire edge in the plane contributes both endpoints.
export function cubeSection(n: V3, d: number) {
  const points: V3[] = [];
  const add = (p: V3) => {
    if (!points.some(q => q.every((v,i) => Math.abs(v-p[i]) < eps))) points.push(p);
  };
  for (const [a,b] of cubeEdges) {
    const da = dot(n,a)-d, db = dot(n,b)-d;
    if (Math.abs(da) < eps) add(a);
    if (Math.abs(db) < eps) add(b);
    if ((da > eps && db < -eps) || (db > eps && da < -eps)) add(mix(a,b,da/(da-db)));
  }
  const normal = normalized(n);
  const u = normalized(cross(Math.abs(normal[2]) < .9 ? [0,0,1] : [0,1,0], normal));
  const v = cross(normal,u);
  const project = (p: V3): V2 => [dot(u,p),dot(v,p)];
  const mean = (values: number[]) => values.reduce((sum,value)=>sum+value,0) / (values.length || 1);
  const cx = mean(points.map(p => dot(u,p))), cy = mean(points.map(p => dot(v,p)));
  const angle = (p: V3) => Math.atan2(dot(v,p)-cy,dot(u,p)-cx);
  points.sort((a,b)=>angle(a)-angle(b));
  return {points, flat:points.map(project)};
}

export const cubeFaces = [
  [0,4,6,2],[1,3,7,5],[0,1,5,4],[2,6,7,3],[0,2,3,1],[4,5,7,6]
].map(indices=>indices.map(i=>cubeVertices[i]));

export function clipFace(face: V3[], normal: V3, offset:number, side: number): V3[] {
  const result: V3[]=[];
  for(let i=0;i<face.length;i++){
    const a=face[i],b=face[(i+1)%face.length];
    const da=side*(dot(a,normal)-offset), db=side*(dot(b,normal)-offset);
    if(da>=-eps) result.push(a);
    if((da>eps && db < -eps)||(da < -eps && db>eps)) result.push(mix(a,b,da/(da-db)));
  }
  return result;
}

export function faceNormal(face:V3[]) {
  return cross([face[1][0]-face[0][0],face[1][1]-face[0][1],face[1][2]-face[0][2]],
    [face[2][0]-face[0][0],face[2][1]-face[0][1],face[2][2]-face[0][2]]);
}

export function splitCube(normal:V3,offset:number,section:V3[]) {
  const support=normal.reduce((sum,value)=>sum+Math.abs(value),0);
  if(Math.abs(offset)>=support-eps || section.length<3) return [];
  return [-1,1].map(side=>{
    const originalFaces=cubeFaces.map(face=>clipFace(face,normal,offset,side)).filter(face=>face.length>=3);
    const cap=side===-1 ? section : [...section].reverse();
    return {side, faces:[...originalFaces.map(points=>({points,cap:false})),{points:cap,cap:true}]};
  });
}
export const halfLength = 1.45;
const pi = Math.PI;

function diskAreaRight(k: number) {
  if (k <= -1) return pi;
  if (k >= 1) return 0;
  return Math.acos(k) - k*Math.sqrt(1-k*k);
}

// Continuous antiderivative of the area of the unit disk to the right of u=k.
function diskIntegral(k: number) {
  if (k <= -1) return pi*k;
  if (k >= 1) return 0;
  const r = Math.sqrt(1-k*k);
  return k*Math.acos(k) - r + r*r*r/3;
}

export function waterFraction(theta: number, h: number) {
  const c = Math.cos(theta), t = Math.sin(theta);
  if (t < eps) return clamp((h+halfLength)/(2*halfLength),0,1);
  if (c < eps) return diskAreaRight(-h)/pi;
  const areaIntegral = diskIntegral((c*halfLength-h)/t) - diskIntegral((-c*halfLength-h)/t);
  return clamp(t*areaIntegral / (c*2*halfLength*pi),0,1);
}

export function cylinderWorld(theta: number, u: number, v: number, s: number): V3 {
  const c = Math.cos(theta), t = Math.sin(theta);
  return [c*u+t*s, v, c*s-t*u];
}

// Cylinder coordinates satisfy u²+v²≤1 and |s|≤L. The surface in world space is z=h.
export function waterSection(degrees: number, fraction: number) {
  const theta = degrees * pi/180, c = Math.cos(theta), t = Math.sin(theta);
  const bound = halfLength*c+t;
  let lo = -bound, hi = bound;
  for (let i = 0; i < 48; i++) {
    const mid = (lo+hi)/2;
    if (waterFraction(theta,mid) < fraction) lo=mid; else hi=mid;
  }
  const h = fraction === .5 ? 0 : (lo+hi)/2;
  const bottomCut = t > eps && h < -halfLength*c+t-eps;
  const topCut = t > eps && h > halfLength*c-t+eps;
  let flat: V2[];
  if (c < eps) {
    const width = Math.sqrt(Math.max(0,1-h*h));
    flat=[[-halfLength,-width],[halfLength,-width],[halfLength,width],[-halfLength,width]];
  } else {
    const minU = t < eps ? -1 : clamp((-halfLength*c-h)/t,-1,1);
    const maxU = t < eps ? 1 : clamp((halfLength*c-h)/t,-1,1);
    const near = Math.acos(maxU), far = Math.acos(minU);
    const arc = Array.from({length:81},(_,i):V2 => {
      const phi = near+(far-near)*i/80;
      return [(Math.cos(phi)+t*h)/c,Math.sin(phi)];
    });
    flat=[...arc,...arc.slice().reverse().map(([x,y]):V2 => [x,-y])];
  }
  const shape = t < eps ? "圆" : c < eps ? "矩形" : bottomCut || topCut ? "被底面截短的椭圆" : "完整椭圆";
  return {theta,h,shape,flat,topCut,bottomCut,points:flat.map(([x,y]): V3 => [x,y,h])};
}

type SurfaceFace={points:V3[]; surface:"wall"|"end"|"section"};

/** One triangulatable, closed mesh per side. Include the exact circular
 * rim/chord contacts in the angular samples so the two new caps fit both shells. */
export function splitCylinder(theta:number,h:number,sides=96) {
  const t=Math.sin(theta), c=Math.cos(theta);
  const circle=2*Math.PI;
  const angles=Array.from({length:sides},(_,i)=>circle*i/sides);
  if(t>eps)for(const s of [-halfLength,halfLength]){
    const u=(c*s-h)/t;
    if(Math.abs(u)<=1){const phi=Math.acos(u);angles.push(phi,(circle-phi)%circle);}
  }
  const az=angles.sort((a,b)=>a-b).filter((a,i,sorted)=>i===0||a-sorted[i-1]>1e-8);
  if(az.length>1 && circle+az[0]-az[az.length-1]<1e-8)az.pop();
  const ring=(s:number)=>az.map(phi=>cylinderWorld(theta,Math.cos(phi),Math.sin(phi),s));
  const bottom=ring(-halfLength),top=ring(halfLength);
  const walls:SurfaceFace[]=bottom.map((p,i)=>{
    const j=(i+1)%az.length;
    return {points:[p,bottom[j],top[j],top[i]],surface:"wall"};
  });
  const shell:SurfaceFace[]=[...walls,{points:[...bottom].reverse(),surface:"end"},{points:top,surface:"end"}];
  const halves=[-1,1].map(side=>{
    const faces:SurfaceFace[]=shell.map(face=>({surface:face.surface,points:clipFace(face.points,[0,0,1],h,side)}))
      .filter(f=>f.points.length>=3);
    const unique=new Map<string,V3>();
    for(const face of faces)for(const p of face.points){
      if(Math.abs(p[2]-h)<1e-8) unique.set(Math.round(p[0]*1e8)+","+Math.round(p[1]*1e8),[p[0],p[1],h]);
    }
    const points=[...unique.values()];
    const cx=points.reduce((s,p)=>s+p[0],0)/points.length,cy=points.reduce((s,p)=>s+p[1],0)/points.length;
    const angle=(p:V3)=>Math.atan2(p[1]-cy,p[0]-cx);
    points.sort((a,b)=>(angle(a)-angle(b))*-side);
    faces.push({points,surface:"section"});
    return {side,faces};
  });
  return {halves,bottom,top};
}

/** Analytic cylinder bounds of a horizontal line through the true water section. */
export function waterChord(theta:number,h:number,y:number):[number,number]|null{
  if(Math.abs(y)>1) return null;
  const c=Math.cos(theta),t=Math.sin(theta),u=Math.sqrt(Math.max(0,1-y*y));
  if(c<eps && Math.abs(h)>u+eps) return null;
  if(t<eps && Math.abs(h)>halfLength+eps) return null;
  const left=Math.max(c<eps?-Infinity:(-u+t*h)/c,t<eps?-Infinity:(-halfLength-c*h)/t);
  const right=Math.min(c<eps?Infinity:(u+t*h)/c,t<eps?Infinity:(halfLength-c*h)/t);
  return left<=right?[left,right]:null;
}

/** Classify in the section's own orthonormal basis, independent of the camera. */
export function sectionName(flat:V2[]){
  const n=flat.length;
  if(n<3)return ["空集","一个点","一条线段"][n];
  const edges=flat.map(([x,y],i):V2=>[flat[(i+1)%n][0]-x,flat[(i+1)%n][1]-y]);
  const lengths=edges.map(e=>Math.hypot(...e));
  const same=(a:number,b:number)=>Math.abs(a-b)<1e-7*Math.max(1e-7,Math.abs(a),Math.abs(b));
  const allEqual=lengths.every(s=>same(s,lengths[0]));
  if(n===3)return allEqual?"等边三角形":lengths.some((s,i)=>same(s,lengths[(i+1)%3]))?"等腰三角形":"不等边三角形";
  if(n===4){
    const parallel=(i:number,j:number)=>Math.abs(edges[i][0]*edges[j][1]-edges[i][1]*edges[j][0])<1e-7*lengths[i]*lengths[j];
    const a=parallel(0,2),b=parallel(1,3);
    const right=Math.abs(edges[0][0]*edges[1][0]+edges[0][1]*edges[1][1])<1e-7*lengths[0]*lengths[1];
    if(a&&b)return right?(allEqual?"正方形":"矩形"):(allEqual?"菱形":"平行四边形");
    return a||b?"梯形":"四边形";
  }
  if(n===6&&allEqual&&edges.every((e,i)=>{
    const j=(i+1)%6;return same((e[0]*edges[j][0]+e[1]*edges[j][1])/(lengths[i]*lengths[j]),.5);
  })) return "正六边形";
  return n===5?"五边形":"一般六边形";
}

/** A standing slosh mode. Mirrored x positions receive opposite heights and 
 * share the lesser wall clearance, giving zero net added volume on each chord. */
export function waveProfile(theta:number,h:number,y:number,halfWidth:number,amplitude:number){
  const chord=waterChord(theta,h,y);
  if(!chord||halfWidth<=0)return [];
  const [left,right]=chord, t=Math.sin(theta),c=Math.cos(theta),r=Math.sqrt(Math.max(0,1-y*y));
  const clearance=(x:number)=>{
    const wall=t>eps?(r-Math.abs(c*x-t*h))/t:Infinity;
    const ends=c>eps?(halfLength-Math.abs(t*x+c*h))/c:Infinity;
    return Math.max(0,Math.min(wall,ends));
  };
  return Array.from({length:25},(_,i):V3=>{
    const u=i/24,x=left+(right-left)*u;
    const mode=Math.sin(2*Math.PI*u)*(1+.18*Math.cos(2*Math.PI*u))*Math.max(0,1-(y/halfWidth)**2);
    const desired=amplitude*mode;
    const bound=.92*Math.min(clearance(x),clearance(left+right-x));
    return [x,y,h+clamp(desired,-bound,bound)];
  });
}

/** Exact underdamped oscillator advance in seconds. */
export function advanceSlosh(x:number,v:number,dt:number){
  const damping=2.05,frequency=8.6,decay=Math.exp(-damping*dt),a=Math.cos(frequency*dt),b=Math.sin(frequency*dt);
  const q=(v+damping*x)/frequency;
  const next=decay*(x*a+q*b);
  return {x:next,v:decay*frequency*(-x*b+q*a)-damping*next};
}



