import {env} from "cloudflare:workers";
import {and,count,desc,eq} from "drizzle-orm";
import {z} from "zod";
import {getDb} from "../db";
import * as tables from "../db/schema";
import {isVerifiedTeacher} from "./teacher-identity";
import {getChatGPTUser} from "../app/chatgpt-auth";
import {topics,questions,courses as baseCourses,resources as baseResources,type Course,type Resource} from "./content";

import {ApiError} from "./json-request";
export {ApiError};
const grades=["高一","高二","高三"] as const;
const now=()=>new Date().toISOString();
export async function identity(){const user=await getChatGPTUser();const email=(env as unknown as Record<string,string|undefined>).SITE_ADMIN_EMAIL;return {user,isAdmin:isVerifiedTeacher(user,email)};}
async function requireUser(){const {user}=await identity();if(!user)throw new ApiError(401,"请先登录，再保存学习记录或预约课程。");return user;}
async function requireAdmin(){const auth=await identity();if(!auth.user)throw new ApiError(401,"请先登录。");if(!auth.isAdmin)throw new ApiError(403,"只有网站管理员可以执行此操作。");return auth.user;}
function parse<T>(schema:z.ZodType<T>,data:unknown):T{const r=schema.safeParse(data);if(!r.success)throw new ApiError(400,r.error.issues[0]?.message||"请检查填写的内容。");return r.data;}
function merge<T extends {id:string}>(base:T[],rows:{data:string}[]):T[]{const map=new Map(base.map(x=>[x.id,x]));for(const row of rows){const x=JSON.parse(row.data) as T;map.set(x.id,x);}return [...map.values()];}
async function catalog(){const db=getDb();const [c,r]=await Promise.all([db.select().from(tables.courseOverrides),db.select().from(tables.resourceOverrides)]);return {courses:merge<Course>(baseCourses,c),resources:merge<Resource>(baseResources,r)};}
async function ensureProfile(user:{userId:string;displayName:string}){await getDb().insert(tables.profiles).values({userId:user.userId,name:user.displayName,grade:"高一",updatedAt:now()}).onConflictDoNothing();}
function presentHistory(serialized:string){
  const stored=JSON.parse(serialized) as Array<Record<string,unknown>>;
  // Reuse the current typeset presentation for the unchanged question/answer IDs.
  // Scores and the student's selected answer remain the original saved values.
  return stored.map(result=>{const question=questions.find(q=>q.id===result.id);return question&&question.answer===result.answer?{...result,prompt:question.prompt,options:question.options,explanation:question.explanation}:result;});
}

export async function bootstrap(){
  const db=getDb(),auth=await identity(),{courses,resources}=await catalog();
  const [ar,er,pr]=auth.user?await Promise.all([
    db.select().from(tables.attempts).where(eq(tables.attempts.userId,auth.user.userId)).orderBy(desc(tables.attempts.createdAt)).limit(100),
    db.select().from(tables.enrollments).where(eq(tables.enrollments.userId,auth.user.userId)).orderBy(desc(tables.enrollments.createdAt)),
    db.select().from(tables.profiles).where(eq(tables.profiles.userId,auth.user.userId)).limit(1),
  ]):[[],[],[]];
  return {user:auth.user?{id:auth.user.userId,name:auth.user.displayName,email:auth.user.email}:null,isAdmin:auth.isAdmin,topics,courses,
    resources:resources.map(({content:_content,...r})=>r),questions:questions.map(({answer:_answer,explanation:_explanation,...q})=>q),
    attempts:ar.map(({results,userId:_user,...a})=>({...a,results:presentHistory(results)})),enrollments:er.map(({userId:_user,...r})=>r),profile:pr[0]?{name:pr[0].name,grade:pr[0].grade}:null};
}
export async function submitAttempt(data:unknown){
  const p=parse(z.object({answers:z.array(z.object({id:z.string().min(1).max(80),answer:z.number().int().min(0).max(3)})).min(1).max(20),topicId:z.string().max(80).optional()}),data);
  if(new Set(p.answers.map(x=>x.id)).size!==p.answers.length)throw new ApiError(400,"同一次练习不能重复提交同一道题。");
  const map=new Map(questions.map(q=>[q.id,q]));
  const results=p.answers.map(({id,answer})=>{const q=map.get(id);if(!q)throw new ApiError(400,"题目不存在，请刷新题库。");return {id,correct:q.answer===answer,selectedAnswer:answer,answer:q.answer,explanation:q.explanation,prompt:q.prompt,options:q.options,topicId:q.topicId};});
  const id=crypto.randomUUID(),score=results.filter(r=>r.correct).length,total=results.length,createdAt=now();const topicId=new Set(results.map(x=>x.topicId)).size===1?results[0].topicId:"all";
  const {user}=await identity();if(user){await ensureProfile(user);await getDb().insert(tables.attempts).values({id,userId:user.userId,topicId,score,total,results:JSON.stringify(results),createdAt});}
  return {id,score,total,results,saved:!!user,createdAt,topicId};
}
export async function enroll(data:unknown){
  const user=await requireUser();const p=parse(z.object({courseId:z.string().min(1).max(80),name:z.string().trim().min(1,"请填写姓名或称呼。").max(40),contact:z.string().trim().min(3,"请填写有效的联系方式。").max(120),remark:z.string().trim().max(1000).optional().default("")}),data);
  const {courses}=await catalog();if(!courses.some(c=>c.id===p.courseId))throw new ApiError(404,"课程不存在。");await ensureProfile(user);const db=getDb();
  await db.insert(tables.enrollments).values({id:crypto.randomUUID(),userId:user.userId,...p,status:"pending",createdAt:now()}).onConflictDoNothing();
  const [row]=await db.select().from(tables.enrollments).where(and(eq(tables.enrollments.userId,user.userId),eq(tables.enrollments.courseId,p.courseId))).limit(1);const {userId:_user,...enrollment}=row;return {enrollment};
}
export async function updateProfile(data:unknown){const user=await requireUser();const p=parse(z.object({name:z.string().trim().min(1,"请填写称呼。").max(40),grade:z.enum(grades)}),data);await getDb().insert(tables.profiles).values({userId:user.userId,...p,updatedAt:now()}).onConflictDoUpdate({target:tables.profiles.userId,set:{...p,updatedAt:now()}});return {profile:p};}
export async function downloadResource(id:string){const {resources}=await catalog();const r=resources.find(r=>r.id===id);if(!r)throw new ApiError(404,"资料不存在。");return new Response("\uFEFF"+r.content,{headers:{"content-type":"text/markdown; charset=utf-8","content-disposition":`attachment; filename="yumi-math-${r.id.replace(/[^a-zA-Z0-9_-]/g,"")}.md"; filename*=UTF-8''${encodeURIComponent(r.title+".md")}`,"x-content-type-options":"nosniff","cache-control":"private, no-store"}});}
export async function adminOverview(){
  await requireAdmin();const db=getDb(),{courses,resources}=await catalog();const [rows,s,a,e]=await Promise.all([db.select().from(tables.enrollments).orderBy(desc(tables.enrollments.createdAt)).limit(200),db.select({value:count()}).from(tables.profiles),db.select({value:count()}).from(tables.attempts),db.select({value:count()}).from(tables.enrollments)]);
  return {courses,resources,enrollments:rows.map(({userId:_user,...r})=>r),stats:{students:s[0].value,attempts:a[0].value,enrollments:e[0].value}};
}
export async function editCourse(data:unknown){
  await requireAdmin();const p=parse(z.object({id:z.string().max(80),title:z.string().trim().min(1).max(100).optional(),description:z.string().trim().min(1).max(1000).optional(),grade:z.enum(grades).optional(),lessons:z.number().int().min(1).max(1000).optional(),duration:z.string().trim().max(60).optional(),priceCents:z.number().int().min(0).max(10000000).nullable().optional(),status:z.enum(["planning","open"]).optional(),syllabus:z.array(z.string().trim().min(1).max(200)).min(1).max(50).optional()}),data);
  const {courses}=await catalog();const old=courses.find(c=>c.id===p.id);if(!old)throw new ApiError(404,"课程不存在。");const course={...old,...p};await getDb().insert(tables.courseOverrides).values({id:course.id,data:JSON.stringify(course),updatedAt:now()}).onConflictDoUpdate({target:tables.courseOverrides.id,set:{data:JSON.stringify(course),updatedAt:now()}});return {course};
}
export async function editEnrollment(data:unknown){await requireAdmin();const p=parse(z.object({id:z.string().max(80),status:z.enum(["pending","contacted","confirmed"])}),data);const [enrollment]=await getDb().update(tables.enrollments).set({status:p.status}).where(eq(tables.enrollments.id,p.id)).returning();if(!enrollment)throw new ApiError(404,"报名记录不存在。");return {enrollment};}
export async function editResource(data:unknown){await requireAdmin();const p=parse(z.object({id:z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/).optional(),title:z.string().trim().min(1).max(100),description:z.string().trim().min(1).max(1000),content:z.string().trim().min(10).max(150000),topicId:z.string().max(80),grade:z.enum(grades)}),data);if(!topics.some(t=>t.id===p.topicId))throw new ApiError(400,"请选择有效的专题。");const resource:Resource={...p,id:p.id||crypto.randomUUID(),format:"Markdown"};await getDb().insert(tables.resourceOverrides).values({id:resource.id,data:JSON.stringify(resource),updatedAt:now()}).onConflictDoUpdate({target:tables.resourceOverrides.id,set:{data:JSON.stringify(resource),updatedAt:now()}});return {resource};}
