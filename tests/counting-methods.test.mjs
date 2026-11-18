import test from "node:test";
import assert from "node:assert/strict";
import {count,defaults,generate,isLegal,schemeIndex} from "../lib/counting-methods.ts";

const scenarios = {
  bundle:[{n:4,k:2},{n:5,k:3},{n:4,k:4}],
  gaps:[{n:2,k:1},{n:3,k:4},{n:2,k:4}],
  bars:[{n:5,k:3,limit:1},{n:2,k:4,limit:0},{n:7,k:3,limit:2},{n:2,k:3,limit:1}],
  hats:[{n:2},{n:4},{n:6}],
  paths:[{n:3,k:2},{n:3,k:2,rule:"via"},{n:4,k:3,rule:"avoid",x:4,y:3},{n:4,k:3,rule:"avoid"}],
  displace:[{n:2,limit:1},{n:5,limit:1},{n:6,limit:2}],
};
for(const [method,choices] of Object.entries(scenarios)){
  test(method+" enumerates each legal solution once",()=>{
    for(const choice of choices){
      const p={...defaults(method),...choice};
      const rows=Array.from(generate(method,p));
      assert.equal(rows.length,count(method,p));
      assert.equal(new Set(rows.map(s=>s.join(","))).size,rows.length);
      assert.ok(rows.every(s=>isLegal(method,s,p)));
    }
  });
}
test("small counts agree with hand calculations",()=>{
  const p=defaults("bundle");
  assert.equal(count("bundle",{...p,n:5,k:3}),36);
  assert.equal(count("hats",{...p,n:5}),44);
  assert.equal(count("displace",{...p,n:5}),8);
  assert.equal(count("displace",{...p,n:5,limit:2}),31);
  assert.equal(count("paths",{...p,n:3,k:2,rule:"via"}),6);
  assert.equal(count("bars",{...p,n:7,k:3,limit:2}),3);
  assert.equal(count("gaps",{...p,n:3,k:2}),72);
});

test("the four classroom bundle rows keep the pair together in both orders",()=>{
  const p=defaults("bundle"), at=schemeIndex("bundle",p);
  assert.deepEqual(Array.from({length:count("bundle",p)},(_,i)=>at(i).join("")),["123","213","312","321"]);
});

test("random access on large tables returns the same row as direct enumeration",()=>{
  for(const [m,n,k] of [["bundle",8,2],["gaps",5,3],["hats",8,0]]){
    const p={...defaults(m),n,k}, at=schemeIndex(m,p), total=count(m,p);
    const wanted=new Set([0,5,6,47,2001,Math.floor(total/2),total-1]);
    let index=0;
    for(const row of generate(m,p)){
      if(wanted.delete(index))assert.deepEqual(at(index),row);
      index++;
    }
    assert.equal(index,total);
    assert.equal(wanted.size,0);
  }
  const p={...defaults("gaps"),n:6,k:5};
  const at=schemeIndex("gaps",p);
  assert.ok(isLegal("gaps",at(count("gaps",p)-1),p));
});
