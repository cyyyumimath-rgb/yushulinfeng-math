import assert from "node:assert/strict";
import test from "node:test";
import {catalanCounts,choose,coinCoefficients,coinWays,firstCrossing,latticePaths,reflectPrefix,subsets,tilingCounts,tilings} from "../lib/counting-patterns.ts";

test("first-crossing reflection bijects bad paths with paths to (n+1,n-1)",()=>{
  for(let n=1;n<=6;n++){
    const all=latticePaths(n),good=all.filter(p=>firstCrossing(p)<0),bad=all.filter(p=>firstCrossing(p)>=0);
    const transformed=bad.map(reflectPrefix);
    for(const p of transformed) assert.equal(p.split("R").length-1,n+1);
    assert.equal(new Set(transformed).size,choose(2*n,n-1));
    assert.equal(bad.length,choose(2*n,n-1));
    assert.equal(all.length,choose(2*n,n));
    assert.equal(good.length,catalanCounts(n)[n]);
    assert.equal(good.length,choose(2*n,n)/(n+1));
  }
});

test("each tiling has the requested length and admits both disjoint partitions",()=>{
  for(let n=1;n<=9;n++){
    const all=tilings(n);
    assert.equal(all.length,tilingCounts(n)[n]);
    assert.equal(new Set(all.map(s=>s.join(""))).size,all.length);
    for(const row of all) assert.equal(row.reduce((s,x)=>s+x,0),n);
    for(const size of [1,2])for(const index of [0,-1])assert.equal(all.filter(row=>row.at(index)===size).length,n<size?0:tilingCounts(n-size)[n-size]);
  }
});

test("subset enumeration confirms Pascal recurrence, reflection and row sums",()=>{
  for(let n=0;n<=8;n++){
    let sum=0;
    for(let k=0;k<=n;k++){
      const all=subsets(n,k);sum+=all.length;
      assert.equal(all.length,choose(n,k));assert.equal(all.length,choose(n,n-k));
      if(n){
        assert.equal(all.filter(s=>s.includes(n)).length,choose(n-1,k-1));
        assert.equal(all.filter(s=>!s.includes(n)).length,choose(n-1,k));
      }
    }
    assert.equal(sum,2**n);
  }
});

test("every coefficient equals the number of unordered coin combinations",()=>{
  const coefficients=coinCoefficients(20);
  for(let n=0;n<=20;n++){
    const all=coinWays(n);
    assert.equal(coefficients[n],all.length);
    assert.equal(new Set(all.map(s=>s.join(","))).size,all.length);
    for(const [a,b,c] of all)assert.equal(a+2*b+5*c,n);
  }
});
