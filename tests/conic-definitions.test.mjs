import test from "node:test";
import assert from "node:assert/strict";
import {conicMeasurements,cutExtent,cutKind,cutPoint,projectCut} from "../components/conic-definitions-geometry.ts";
import {coefficients,polarLine,joining,secantConstruction} from "../components/polar-lab-geometry.ts";
const close=(a,b,tol=1e-8)=>assert.ok(Math.abs(a-b)<=tol*(1+Math.abs(b)),a+" != "+b);

test("two-secant construction obtains the polar from opposite-side intersections",()=>{
  for(const kind of ["ellipse","parabola","hyperbola"])for(const size of [1,1.5,2,3])for(const pole of [[.1,.1],[1.8,.6],[3,.2],[0,2],[-1,1],[4,1],[2,size],[4.5,3]]){
    const line=polarLine(kind,size,pole);
    if(Math.abs(line[0]*pole[0]+line[1]*pole[1]+line[2])<1e-8)continue;
    const result=secantConstruction(kind,size,pole);
    assert.ok(result,JSON.stringify({kind,size,pole}));
    const {A,B,C,D,X,Y}=result, f=coefficients(kind,size);
    for(const [x,y] of [A,B,C,D])close(f.xx*x*x+f.yy*y*y+2*f.lx*x+f.c,0);
    function incident(p,line){close(line[0]*p[0]+line[1]*p[1]+line[2],0);}
    incident(pole,joining(A,B));incident(pole,joining(C,D));
    incident(X,joining(A,C));incident(X,joining(B,D));incident(Y,joining(A,D));incident(Y,joining(B,C));
    assert.ok(Math.hypot(X[0]-Y[0],X[1]-Y[1])>1e-6);
    incident(X,line);incident(Y,line);
  }
});
test("on-conic poles and centers bypass degenerate four-point construction",()=>{
  for(const [kind,pole] of [["ellipse",[3,0]],["ellipse",[0,0]],["hyperbola",[2,0]],["hyperbola",[0,0]],["parabola",[0,0]],["parabola",[1,2]]])assert.equal(secantConstruction(kind,2,pole),null);
});
test("distance loci, focus-directrix ratios, slope products and vertex exclusions",()=>{
  for(const kind of ["ellipse","parabola","hyperbola"])for(const size of [.8,1.6,2.4])for(const t of [-1,-.63,0,.25,.68,1])for(const side of [-1,1]){
    const d=conicMeasurements(kind,size,t,side);
    close(d.pf/d.ph,d.e);
    if(kind==="ellipse")close(d.pf+d.pg,2*d.a);
    if(kind==="hyperbola")close(Math.abs(d.pf-d.pg),2*d.a);
    if(d.slopeProduct!==null)close(d.slopeProduct,d.e*d.e-1);
    if(kind!=="parabola"&&t===0)assert.equal(d.slopeProduct,null);
  }
});
test("rendered spatial intersections satisfy both cone and plane and classify correctly",()=>{
  for(const [m,kind] of [[.15,"ellipse"],[.95,"ellipse"],[1,"parabola"],[1.05,"hyperbola"],[2,"hyperbola"]]){
    assert.equal(cutKind(m),kind);
    const sheets=new Set();
    for(let j=0;j<360;j++){
      const p=cutPoint(m,1,j*Math.PI/180);
      if(!p)continue;
      const [x,y,z]=p;
      close(x*x+y*y,z*z);close(z,1+m*x);
      sheets.add(Math.sign(z));
    }
    assert.equal(sheets.size,kind==="hyperbola"?2:1);
  }
  assert.equal(cutPoint(1,1,0),null);
});

test("near a parabolic cut, the default local plot retains visible extent at every tested azimuth",()=>{
  for(const m of [.95,.99999,1,1.00001,1.05]){
    const extent=cutExtent(m,false);
    assert.equal(extent,3.5);
    const world=Array.from({length:1000},(_,i)=>cutPoint(m,1,Math.PI*i/500)).filter(p=>p&&Math.abs(p[2])<=extent);
    for(let angle=0;angle<360;angle+=5){
      const projected=world.map(p=>projectCut(p,angle,extent));
      const xs=projected.map(p=>p[0]),ys=projected.map(p=>p[1]);
      const span=Math.max(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys));
      assert.ok(span>=70,"local curve shrank at slope "+m+" and azimuth "+angle);
    }
    if(m!==1)assert.ok(cutExtent(m,true)>1/Math.abs(1-m));
  }
});

