import assert from "node:assert/strict";
import test from "node:test";
import {dihedralGeometry} from "../lib/dihedral.ts";
import {trackedTip} from "../lib/trig-path.ts";

const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10, `expected ${a} and ${b} to agree`);
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);

test("dihedral measurements agree for acute, right and obtuse openings",()=>{
  for(let degrees=10;degrees<=170;degrees++)for(let t=10;t<=25;t++){
    const r=t/10,g=dihedralGeometry(degrees,r),cos=Math.cos(degrees*Math.PI/180);
    close(g.height/r,Math.sin(degrees*Math.PI/180));
    close(g.projected/g.area,Math.abs(cos));close(Math.sign(g.h[1])*g.projected/g.area,cos);
    close((2*r*r-g.chord*g.chord)/(2*r*r),cos);
    close(dot(g.normalA,g.normalB),cos);close(dot(g.a,g.b)/(r*r),cos);
    close(dot(g.normalA,g.a),0);close(dot(g.normalB,g.b),0);
  }
});

test("terminal ray follows rotations on the circle and reflections along the chord",()=>{
  for(let degrees=-360;degrees<=360;degrees+=10){
    const a=degrees*Math.PI/180;
    for(const [b,rotation] of [[-a,0],[Math.PI-a,0],[Math.PI/2-a,0],[a+Math.PI,Math.PI],[a+Math.PI/2,Math.PI/2],[a+2*Math.PI,2*Math.PI]]){
      for(let t=0;t<=10;t++){
        const [x,y]=trackedTip(a,b,rotation,t/10);
        if(rotation){close(Math.hypot(x,y),1);close(Math.cos(a+rotation*t/10),x);}
        else {
          close(x,Math.cos(a)+(Math.cos(b)-Math.cos(a))*t/10);
          close(y,Math.sin(a)+(Math.sin(b)-Math.sin(a))*t/10);
        }
        if(t===10){close(x,Math.cos(b));close(y,Math.sin(b));}
      }
    }
  }
});
