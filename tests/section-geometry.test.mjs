import assert from "node:assert/strict";
import test from "node:test";
import {cubeSection, dot, halfLength, waterSection, waterFraction, splitCube} from "../lib/section-geometry.ts";

test("two cut solids are closed, carry opposite caps, and preserve the cube volume",()=>{
  const key=v=>v.map(x=>Math.round(x*1e8)).join(",");
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  for(const n of [[1,1,1],[1,1,0],[0,0,1],[1,.75,.4]]) {
    const support=n.reduce((sum,x)=>sum+Math.abs(x),0);
    for(let i=-100;i<=100;i++){
      const d=support*i/100;
      const pieces=splitCube(n,d,cubeSection(n,d).points);
      if(Math.abs(i)===100){assert.deepEqual(pieces,[]);continue;}
      assert.equal(pieces.length,2);
      let totalVolume=0;
      for(const {side,faces} of pieces) {
        const edges=new Map();
        let volume=0;
        for(const {cap,points} of faces) {
          for(let j=0;j<points.length;j++){
            const a=points[j], b=points[(j+1)%points.length];
            const value=(dot(n,a)-d)*side;
            assert.ok(value > -1e-8 && (!cap||Math.abs(value)<1e-8));
            const pair=[key(a),key(b)].sort().join("|");
            edges.set(pair,(edges.get(pair)||0)+1);
          }
          for(let j=1;j<points.length-1;j++)volume+=dot(points[0],cross(points[j],points[j+1]))/6;
        }
        assert.ok([...edges.values()].every(count=>count===2));
        assert.ok(volume>0);
        totalVolume+=volume;
      }
      assert.ok(Math.abs(totalVolume-8)<1e-9);
    }
  }
});

test("cube presets, face coincidence and point/edge contacts", () => {
  for(const [n,d,count] of [
    [[1,1,1],0,6],[[1,.75,.4],.55,5],[[1,1,1],1.5,3],[[0,0,1],1,4],
    [[1,1,0],2,2],[[1,1,1],3,1],[[1,1,1],3.01,0]
  ]) {
    const {points,flat}=cubeSection(n,d);
    assert.equal(points.length,count);
    for(let i=0;i<points.length;i++) {
      const p=points[i],j=(i+1)%points.length;
      assert.ok(Math.abs(dot(p,n)-d)<1e-10);
      assert.ok(p.filter(x=>Math.abs(Math.abs(x)-1)<1e-10).length>=2);
      const length3=Math.hypot(...p.map((x,k)=>x-points[j][k]));
      const length2=Math.hypot(flat[i][0]-flat[j][0],flat[i][1]-flat[j][1]);
      assert.ok(Math.abs(length3-length2)<1e-10);
    }
  }
});

test("cylinder cap clipping is correctly classified",()=>{
  for (const [theta,fraction,shape,top,bottom] of [
    [0,.7,"圆",false,false],[35,.5,"完整椭圆",false,false],
    [50,.75,"被底面截短的椭圆",true,false],[50,.25,"被底面截短的椭圆",false,true],
    [70,.5,"被底面截短的椭圆",true,true],[90,.7,"矩形",true,true]
  ]) {
    const cut=waterSection(theta,fraction);
    assert.equal(cut.shape,shape); assert.equal(cut.topCut,top); assert.equal(cut.bottomCut,bottom);
  }
});

test("water volume is conserved and every boundary point lies in the finite cylinder",()=>{
  for(let tilt=0;tilt<=90;tilt+=3) for(let q=10;q<=90;q+=10) {
    const {theta,h,points}=waterSection(tilt,q/100), c=Math.cos(theta),t=Math.sin(theta);
    assert.ok(Math.abs(waterFraction(theta,h)-q/100)<1e-10);
    // Independently integrate vertical wetted length across slices of the circular base.
    let vol=0;
    const strips=1024;
    for(let i=0;i<strips;i++) {
      const u=-1+(i+.5)*2/strips, chord=2*Math.sqrt(1-u*u);
      const length=tilt===90 ? (h>=-u?2*halfLength:0) : Math.max(0,Math.min(2*halfLength,halfLength+(h+t*u)/c));
      vol+=length*chord*2/strips;
    }
    assert.ok(Math.abs(vol/(2*halfLength*Math.PI)-q/100)<.0007);
    for(const [x,v,z] of points) {
      const u=c*x-t*z,s=t*x+c*z;
      assert.equal(z,h);
      assert.ok(u*u+v*v<1+1e-8 && Math.abs(s)<halfLength+1e-8);
      assert.ok(Math.abs(u*u+v*v-1)<1e-8 || Math.abs(Math.abs(s)-halfLength)<1e-8);
    }
  }
});

test("cube presets are classified by intrinsic lengths and angles",async()=>{
  const {sectionName}=await import("../lib/section-geometry.ts");
  for(const [n,d,name] of [
    [[1,1,1],1.5,"等边三角形"],[[1,1,.65],2.1,"等腰三角形"],[[1,.75,.4],1.75,"不等边三角形"],
    [[0,0,1],0,"正方形"],[[1,1,0],0,"矩形"],[[1,.4,.4],0,"菱形"],[[1,.55,.3],0,"平行四边形"],
    [[1,.75,.4],.8,"梯形"],[[1,.75,.4],.55,"五边形"],[[1,.85,.65],.05,"一般六边形"],[[1,1,1],0,"正六边形"]
  ])assert.equal(sectionName(cubeSection(n,d).flat),name);
});

test("the two closed cylinder meshes share their exact circular rim and chord contacts",async()=>{
  const {splitCylinder}=await import("../lib/section-geometry.ts");
  const key=p=>p.map(x=>Math.round(x*1e7)).join(",");
  for(let degrees=0;degrees<=90;degrees+=5)for(const fraction of [.1,.25,.5,.75,.9]){
    const cut=waterSection(degrees,fraction), {halves}=splitCylinder(cut.theta,cut.h);
    const c=Math.cos(cut.theta),t=Math.sin(cut.theta);
    const compare=[];
    for(const half of halves){
      const edges=new Map();
      let volume=0;
      for(const {points,surface} of half.faces){
        for(let i=0;i<points.length;i++){
          const a=points[i],b=points[(i+1)%points.length],pair=[key(a),key(b)].sort().join("|");
          edges.set(pair,(edges.get(pair)||0)+1);
          assert.ok((a[2]-cut.h)*half.side>-1e-8);
          if(surface==="section"){
            assert.ok(Math.abs(a[2]-cut.h)<1e-8);
            const u=c*a[0]-t*a[2],v=a[1],s=t*a[0]+c*a[2];
            assert.ok(Math.abs(u*u+v*v-1)<1e-7||Math.abs(Math.abs(s)-halfLength)<1e-7);
          }
        }
        if(surface==="section")compare.push(points.map(key).sort());
        for(let i=1;i<points.length-1;i++){
          const a=points[0],b=points[i],c=points[i+1];
          volume+=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;
        }
      }
      assert.ok([...edges.values()].every(count=>count===2));
      // polygonal approximation of the circular wall: relative full-volume error below 0.08%
      assert.ok(Math.abs(volume/(2*Math.PI*halfLength)-(half.side<0?fraction:1-fraction))<.0008);
    }
    assert.deepEqual(compare[0],compare[1]);
  }
});

test("transient water waves are bounded, conserve volume, pin the rim and damp to rest",async()=>{
  const {waveProfile,advanceSlosh}=await import("../lib/section-geometry.ts");
  for(let degrees=0;degrees<=90;degrees+=9)for(const fraction of [.1,.5,.9]){
    const cut=waterSection(degrees,fraction), c=Math.cos(cut.theta),t=Math.sin(cut.theta);
    const width=Math.max(...cut.flat.map(p=>Math.abs(p[1])));
    for(let i=-5;i<=5;i++){
      const row=waveProfile(cut.theta,cut.h,width*i/5,width,.23);
      if(!row.length)continue;
      assert.ok(Math.abs(row[0][2]-cut.h)<1e-8 && Math.abs(row.at(-1)[2]-cut.h)<1e-8);
      assert.ok(Math.abs(row.reduce((sum,p)=>sum+p[2]-cut.h,0))<1e-8);
      for(const [x,y,z] of row)assert.ok((x*c-z*t)**2+y*y<=1+1e-8 && Math.abs(x*t+z*c)<=halfLength+1e-8);
    }
  }
  const initial=advanceSlosh(0,1,0);
  assert.deepEqual(initial,{x:0,v:1});
  assert.ok(advanceSlosh(0,1,.1).x>0);
  assert.ok(advanceSlosh(0,1,.5).x<0);
  assert.ok(Math.abs(advanceSlosh(0,1,6).x)<1e-5);
});

