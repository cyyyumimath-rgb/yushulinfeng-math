import test from "node:test";
import assert from "node:assert/strict";
import {drawingLesson,projectDrawing} from "../lib/drawing-models.ts";

test("oblique and orthographic isometric axes have textbook lengths and angles",()=>{
  const [x,y,z]=[[1,0,0],[0,1,0],[0,0,1]].map(p=>projectDrawing(p,"oblique"));
  assert.deepEqual(x,[1,-0]);
  assert.ok(Math.abs(Math.hypot(...y)-.5)<1e-10);
  assert.ok(Math.abs(y[0]+y[1])<1e-10 && y[0]>0);
  assert.deepEqual(z,[0,-1]);
  const axes=[[1,0,0],[0,1,0],[0,0,1]].map(p=>projectDrawing(p,"isometric"));
  axes.forEach((a,i)=>{
    const b=axes[(i+1)%3];
    assert.ok(Math.abs(Math.hypot(...a)-Math.sqrt(2/3))<1e-10);
    assert.ok(Math.abs((a[0]*b[0]+a[1]*b[1])/(2/3)+.5)<1e-10);
  });
});

test("both methods produce a complete drawing with visible and hidden outlines",()=>{
  for(const method of ["oblique","isometric"]) for(const [solid,n] of [["cube",12],["pyramid",8],["prism",9],["cylinder",6]]) {
    const {strokes,guides}=drawingLesson(solid,method);
    assert.equal(strokes.length,n);
    assert.ok(strokes.some(s=>s.hidden) && strokes.some(s=>!s.hidden));
    for(const path of [...strokes,...guides]) for(const [x,y] of path.points) {
      assert.ok(x>=0 && x<=420 && y>=0 && y<=278);
    }
    if(solid==="cube") assert.equal(strokes.filter(s=>s.hidden).length,3);
    if(solid==="cylinder") {
      assert.deepEqual(strokes.map(s=>s.hidden),[false,true,false,false,false,false]);
      const [near,far,left,right,topNear,topFar]=strokes.map(s=>s.points);
      for(const [lower,upper] of [[near,topNear],[far,topFar]]) {
        assert.ok(Math.abs(lower[0][0]-right[0][0])<1e-8);
        assert.ok(Math.abs(lower.at(-1)[0]-left[0][0])<1e-8);
        for(let i=0;i<lower.length;i++){
          assert.ok(Math.abs(lower[i][0]-upper[i][0])<1e-8);
          assert.ok(Math.abs(lower[i][1]-upper[i][1]-(left[0][1]-left[1][1]))<1e-8);
        }
      }
    }
  }
});
