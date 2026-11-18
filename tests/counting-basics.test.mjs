import test from "node:test";
import assert from "node:assert/strict";
import { arrangements, circleKey, enumerateBasic, inOrder, rotate } from "../lib/counting-basics-math.ts";
import { choose, fact } from "../lib/counting-methods.ts";

test("choosing with and without order gives unique representatives",()=>{
  for(let n=2;n<=7;n++) for(let k=1;k<=n;k++){
    const groups=enumerateBasic("choose-order",n,k,false);
    const ranks=enumerateBasic("choose-order",n,k,true);
    assert.equal(groups.length,choose(n,k));assert.equal(ranks.length,groups.length*fact(k));
    assert.equal(new Set(groups.map(g=>g.slice().sort().join())).size,groups.length);
  }
});
test("direct alternatives have one selected line; connected journeys have both",()=>{
  for(let m=1;m<=4;m++)for(let n=1;n<=4;n++){
    const direct=enumerateBasic("sum-product",m,n,true),via=enumerateBasic("sum-product",m,n,false);
    assert.equal(direct.length,m+n);assert.equal(via.length,m*n);
    assert.ok(direct.every(row=>row.filter(v=>v!==-1).length===1));
    assert.ok(via.every(([i,j])=>i>=0&&i<m&&j>=0&&j<n));
  }
});
test("leading-zero and zero-presence classifications agree, including compulsory zero",()=>{
  for(let n=3;n<=7;n++) for(let k=2;k<=Math.min(n,5);k++){
    const rows=enumerateBasic("first-digit",n,k,false);
    const containsZero=rows.filter(row=>row.includes(0));
    assert.ok(rows.every(row=>row[0]!==0&&new Set(row).size===k));
    const arrangementsAfterFirst=fact(n-1)/fact(n-k);
    assert.equal(rows.length,(n-1)*arrangementsAfterFirst);
    assert.equal(containsZero.length,(k-1)*arrangementsAfterFirst);
    assert.equal(rows.length-containsZero.length,k===n?0:fact(n-1)/fact(n-1-k));
  }
});
test("within each fixed-position family exactly one order is legal",()=>{
  for(let n=3;n<=7;n++)for(const k of [2,3]){
    const rows=enumerateBasic("relative-order",n,k,false);assert.equal(rows.length,fact(n)/fact(k));
    const recovered=new Set();
    for(const row of rows) {
      assert.ok(inOrder(row,k));
      for(const perm of arrangements(k,k)){
        let pos=0;recovered.add(row.map(v=>v<k?perm[pos++]:v).join());
      }
    }
    assert.equal(recovered.size,fact(n));
  }
});
test("rotation classes and mirror pairings distinguish the stated circular equivalence",()=>{
  for(let n=3;n<=7;n++) {
    const rows=enumerateBasic("round-table",n,0,false), bracelets=enumerateBasic("round-table",n,0,true);
    assert.equal(rows.length,fact(n-1));assert.equal(bracelets.length,fact(n-1)/2);
    for(const row of rows) {
      const mirrored=row.slice().reverse();
      assert.equal(circleKey(row,false),circleKey(rotate(row,2),false));
      assert.notEqual(circleKey(row,false),circleKey(mirrored,false));
      assert.equal(circleKey(row,true),circleKey(mirrored,true));
    }
  }
});

