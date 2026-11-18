import assert from "node:assert/strict";
import test from "node:test";
import {ApiError,readJsonPayload} from "../lib/json-request.ts";

const encoder=new TextEncoder();
const fixture="http://localhost/json-reader-test";

// Requests are constructed in memory. No listener or network fetch is involved.
function segmented(chunks,headers={}) {
  let index=0;
  const body=new ReadableStream({
    pull(controller) {
      if(index===chunks.length)controller.close();
      else controller.enqueue(chunks[index++]);
    },
  });
  return new Request(fixture,{method:"POST",headers,body,duplex:"half"});
}
const status=expected=>error=>error instanceof ApiError && error.status===expected;

test("an ordinary fixed-length JSON body is accepted exactly at its byte limit",async()=>{
  const json=JSON.stringify({text:"你好"});
  const size=encoder.encode(json).length;
  const request=new Request(fixture,{method:"POST",body:json,headers:{"content-length":String(size)}});
  assert.deepEqual(await readJsonPayload(request,size),{text:"你好"});
});

test("a declared size over the limit is rejected before reading the body",async()=>{
  const request=new Request(fixture,{method:"POST",body:"null",headers:{"content-length":"4"}});
  await assert.rejects(readJsonPayload(request,3),status(413));
  assert.equal(request.bodyUsed,false);
});

test("multiple chunks without a length header decode split UTF-8 at the exact limit",async()=>{
  const bytes=encoder.encode('{"q":"求和"}');
  const request=segmented(Array.from(bytes,byte=>Uint8Array.of(byte)));
  assert.equal(request.headers.has("content-length"),false);
  assert.deepEqual(await readJsonPayload(request,bytes.length),{q:"求和"});
  assert.equal(request.body.locked,false);
});

test("the same unlabelled chunks receive 413 when the cumulative byte count is one over",async()=>{
  const bytes=encoder.encode('{"q":"求和"}');
  const request=segmented([bytes.slice(0,3),bytes.slice(3,7),bytes.slice(7)]);
  assert.equal(request.headers.has("content-length"),false);
  await assert.rejects(readJsonPayload(request,bytes.length-1),status(413));
  assert.equal(request.body.locked,false);
});

test("malformed input and a missing body report 400",async()=>{
  await assert.rejects(readJsonPayload(segmented([encoder.encode('{"q"')]),16),status(400));
  await assert.rejects(readJsonPayload(new Request(fixture,{method:"POST"}),16),status(400));
});
