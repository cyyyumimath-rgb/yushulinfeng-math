import test from "node:test";
import assert from "node:assert/strict";
import {placePointLabels,crosses} from "../lib/plot-labels.ts";

test("pyramid label boxes stay off every edge at all supported views",()=>{
  for(const parallel of [false,true]) for(const side of [false,true]) for(let angle=-25;angle<=65;angle+=3) for(let ratio=10;ratio<=90;ratio+=5){
    const vertices=[[-1.5,-1,0],[1.5,-1,0],[parallel?1.95:.62,1,0],[-1.05,1,0],[-.15,.05,2.65]];
    const p=vertices[4];
    for(const v of [vertices[side?1:0],vertices[side?2:1]]) vertices.push(v.map((x,i)=>p[i]+ratio/100*(x-p[i])));
    const t=angle*Math.PI/180;
    const points=vertices.map(([x,y,z])=>[245+84*(x*Math.cos(t)+y*Math.sin(t)),244-84*(z*Math.cos(.33)+(-x*Math.sin(t)+y*Math.cos(t))*Math.sin(.33))]);
    const edges=[[0,1],[1,2],[2,3],[3,0],[4,0],[4,1],[4,2],[4,3],[5,6]].map(([a,b])=>[points[a],points[b]]);
    const labels=placePointLabels(points,edges,490,312);
    for(const [x,y] of labels) assert.ok(edges.every(e=>!crosses({x:x-11,y:y-11,w:22,h:22},e)));
  }
});
