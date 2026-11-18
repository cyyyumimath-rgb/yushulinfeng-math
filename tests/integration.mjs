import assert from 'node:assert/strict';
import {questions} from '../lib/content.ts';
const port=Number(process.env.PREVIEW_PORT||5173);
if(!Number.isInteger(port)||port<1||port>65535)throw Error("Invalid PREVIEW_PORT");
const origin="http://127.0.0.1:"+port;
const testEmail="teacher@example.test";
if(!process.env.TEST_ADMIN_PASSWORD)throw Error("Configure the local test teacher account and set TEST_ADMIN_PASSWORD before running the integration test.");
let cookie='';
let checks=0;
async function request(path,{method='GET',data,signed=false,headers={}}={}){
  const r=await fetch(origin+path,{method,headers:{...(data?{'Content-Type':'application/json'}:{}),...(signed?{cookie}:{}),...headers},body:data?JSON.stringify(data):undefined,redirect:'manual'});
  const body=r.headers.get('content-type')?.includes('application/json')?await r.json():await r.text();return {r,body};
}
function check(ok,message){assert.ok(ok,message);checks++;}
let {r,body}=await request('/api/bootstrap');check(r.ok&&body.questions.length===24&&body.courses.length===6,'catalog loads from the real API');check(!('answer' in body.questions[0])&&!('explanation' in body.questions[0]),'answer key is not exposed before submission');check(body.user===null,'anonymous session has no user');
const resourceId=body.resources[0].id,course=body.courses[0];
({r,body}=await request('/api/attempts',{method:'POST',data:{answers:[{id:questions[0].id,answer:questions[0].answer}],score:999}}));check(r.ok&&body.score===1&&body.total===1&&!body.saved&&body.results[0].explanation,'anonymous grading is server-calculated and returns explanations');
({r}=await request('/api/attempts',{method:'POST',data:{answers:[{id:questions[0].id,answer:0},{id:questions[0].id,answer:0}]}}));check(r.status===400,'duplicate question IDs are rejected');
({r}=await request('/api/admin'));check(r.status===401,'anonymous visitors cannot access the administration data');
({r}=await request('/api/enrollments',{method:'POST',data:{courseId:course.id,name:'测试学生',contact:'test@example.invalid'}}));check(r.status===401,'enrollment requires identity');
({r}=await request('/api/profile',{method:'POST',data:{name:'测试',grade:'高一'},headers:{origin:'https://other.invalid'}}));check(r.status===403,'cross-origin mutations are rejected');
({r,body}=await request('/api/resources/'+resourceId));check(r.ok&&typeof body==='string'&&body.length>400&&r.headers.get('content-disposition')?.startsWith('attachment;'),'resource download has substantive content and attachment headers');
const sign=await fetch(origin+"/login",{
  method:"POST",redirect:"manual",headers:{origin,"content-type":"application/x-www-form-urlencoded"},
  body:new URLSearchParams({name:"Integration teacher",email:testEmail,passcode:process.env.TEST_ADMIN_PASSWORD,return_to:"/"})
});
check(sign.status===303,"the test teacher must be configured in this local preview");
cookie=sign.headers.getSetCookie().map(x=>x.split(";")[0]).join("; ");
check(!!cookie,"standalone login establishes a signed test session");
({r,body}=await request('/api/profile',{method:'POST',signed:true,data:{name:'集成验证学生',grade:'高二'}}));check(r.ok&&body.profile.grade==='高二','profile is saved');
({r,body}=await request('/api/attempts',{method:'POST',signed:true,data:{answers:[{id:questions[0].id,answer:questions[0].answer},{id:questions[1].id,answer:(questions[1].answer+1)%4}]}}));const attemptId=body.id;check(r.ok&&body.score===1&&body.total===2&&body.saved,'signed-in grading persists the correct score');
({r,body}=await request('/api/enrollments',{method:'POST',signed:true,data:{courseId:course.id,name:'集成验证学生',contact:'test@example.invalid',remark:'仅本地测试'}}));const enrollmentId=body.enrollment?.id;check(r.ok&&!!enrollmentId&&['pending','contacted','confirmed'].includes(body.enrollment.status),'course reservation creates or returns a valid enrollment');
({r,body}=await request('/api/enrollments',{method:'POST',signed:true,data:{courseId:course.id,name:'集成验证学生',contact:'test@example.invalid'}}));check(r.ok&&body.enrollment.id===enrollmentId,'repeated enrollment is idempotent');
({r,body}=await request('/api/bootstrap',{signed:true}));check(r.ok&&body.attempts.some(x=>x.id===attemptId)&&body.enrollments.some(x=>x.id===enrollmentId)&&body.profile.name==='集成验证学生','records survive a fresh API load');check(body.isAdmin,'the configured local owner is recognized as admin');
({r,body}=await request('/api/bootstrap'));check(r.ok&&body.attempts.length===0&&body.enrollments.length===0&&body.profile===null,'the anonymous session cannot read saved personal records');
({r,body}=await request('/api/admin',{signed:true}));check(r.ok&&body.enrollments.some(x=>x.id===enrollmentId),'admin can review course reservations');
({r,body}=await request('/api/admin/enrollments',{method:'POST',signed:true,data:{id:enrollmentId,status:'contacted'}}));check(r.ok&&body.enrollment.status==='contacted','admin can update enrollment status');
({r,body}=await request('/api/admin/courses',{method:'POST',signed:true,data:{id:course.id,title:course.title+' · 本地验证'}}));check(r.ok&&body.course.title.endsWith('本地验证'),'admin can edit a course');
({r,body}=await request('/api/admin/resources',{method:'POST',signed:true,data:{id:'local-integration-guide',title:'本地验证资料',description:'仅用于本地接口验证',topicId:'functions',grade:'高一',content:'# 练习资料\n这是一份验证用资料。'}}));check(r.ok&&body.resource.id==='local-integration-guide','admin can publish a downloadable resource');
({r,body}=await request('/api/resources/local-integration-guide'));check(r.ok&&body.includes('验证用资料'),'newly published material is downloadable');
console.log(`${checks} business integration checks passed (local database only).`);

const knownLength=await request("/api/profile",{method:"POST",data:{padding:"x".repeat(230000)}});
check(knownLength.r.status===413 && typeof knownLength.body?.error==="string",
  "a fixed-length JSON POST receives the application limit error (HTTP "+knownLength.r.status+")");
console.log("Fixed-length HTTP payload check passed (413 with application JSON).");

if(process.argv.includes("--known-length-only")) {
  console.log("This command checked fixed-length HTTP. Run npm run test:integration for the separate chunked HTTP assertion.");
} else {
  const largeStream=new ReadableStream({
    start(controller){
      controller.enqueue(new TextEncoder().encode('{"padding":"'+'x'.repeat(230000)+'"}'));
      controller.close();
    },
  });
  const oversized=await fetch(origin+"/api/profile",{
    method:"POST",headers:{"Content-Type":"application/json"},body:largeStream,duplex:"half",
  });
  check(oversized.status===413,"expected 413 for chunked HTTP without Content-Length, received "+oversized.status);
  console.log(`${checks} integration checks passed, including fixed-length and chunked HTTP.`);
}
