import assert from "node:assert/strict";
import test from "node:test";
import {createJiti} from "jiti";
import {choose,fact,range} from "../lib/counting-methods.ts";

const {allowed,boxTotal,endMask,endpointTotal,enumerateContainers,groupLegal,groupTotal,pairing,permutations,vennRows} =
  createJiti(import.meta.url,{fsCache:false})("../components/counting-sets-model.ts");

test("equal and unequal group sizes under exchange",()=>{
  for(let n=3;n<=8;n++)for(let a=1;a<n;a++)for(const named of [true,false]){
    assert.equal(groupTotal(n,a,named),enumerateContainers(n,2,true,named,g=>groupLegal(g,a,n)).length);
  }
  assert.equal(groupTotal(6,3,false),10);
  assert.equal(groupTotal(6,3,true),20);
  assert.equal(groupTotal(6,2,true),30);
  assert.equal(groupTotal(6,2,true,true),15);
  assert.equal(enumerateContainers(6,2,true,true,g=>groupLegal(g,2,6,true)).length,15);
});

test("capacity-weighted sums agree with direct assignments under all four box restrictions",()=>{
  for(let n=1;n<=6;n++)for(let k=2;k<=4;k++)
    for(const numbered of [true,false])for(const named of [true,false])
      for(const rule of ["free","nonempty","one","two"]){
        const rows=enumerateContainers(n,k,numbered,named,g=>g.every(s=>allowed(s.length,rule)));
        assert.equal(boxTotal(n,k,numbered,named,rule),rows.length);
      }
});

test("endpoint classes are disjoint and exhaust the full queue space",()=>{
  for(let n=3;n<=7;n++){
    const counts=[0,0,0,0];
    for(const row of permutations(range(n)))counts[endMask(row)]++;
    assert.equal(counts[1],counts[2]);
    assert.equal(counts[3],2*fact(n-2));
    assert.equal(counts[0],(n-2)*(n-3)*fact(n-2));
    assert.equal(counts.slice(1).reduce((a,b)=>a+b),endpointTotal(n));
  }
});

test("three-event inclusion-exclusion matches exhaustive unions",()=>{
  for(const model of ["integers","boxes"])for(let n=model==="boxes"?1:15;n<=(model==="boxes"?5:60);n++){
    const rows=vennRows(model,n);
    const term=mask=>model==="integers"?Math.floor(n/[1,2,3,6,5,10,15,30][mask]):(3-[1,2,4].filter(b=>mask&b).length)**n;
    assert.equal(term(1)+term(2)+term(4)-term(3)-term(5)-term(6)+term(7),rows.filter(r=>r.mask).length);
  }
});

test("each of the three encodings has unique domain and image",()=>{
  for(const model of ["subset","path","queue"])for(let n=2;n<=(model==="queue"?3:5);n++){
    const pairs=pairing(model,n),expected=model==="queue"?fact(n):choose(n,Math.floor(n/2));
    assert.equal(new Set(pairs.map(p=>p.left)).size,expected);
    assert.equal(new Set(pairs.map(p=>p.right)).size,expected);
  }
});
