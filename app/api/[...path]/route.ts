import {readJsonPayload} from "../../../lib/json-request";
import * as research from "../../../lib/research-service";
import {ApiError,bootstrap,submitAttempt,enroll,updateProfile,downloadResource,adminOverview,editCourse,editEnrollment,editResource} from "../../../lib/learning-service";
export const dynamic="force-dynamic";
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{"cache-control":"private, no-store","x-content-type-options":"nosniff"}});
function handleError(error:unknown){if(error instanceof ApiError)return reply({error:error.message},error.status);console.error("Learning API request failed",error instanceof Error?error.name:"Unknown");return reply({error:"暂时无法完成操作，请稍后重试。"},500);}
type Context={params:Promise<{path:string[]}>};
export async function GET(_request:Request,context:Context){try{const {path}=await context.params;const key=path.join("/");if(key==="research")return reply(await research.researchHome());if(path.length===2&&path[0]==="material")return research.material(path[1]).catch(handleError);if(path.length===2&&path[0]==="versions")return reply(await research.history(path[1]));if(key==="bootstrap")return reply(await bootstrap());if(key==="admin")return reply(await adminOverview());if(path.length===2&&path[0]==="resources")return await downloadResource(path[1]);return reply({error:"页面不存在。"},404);}catch(error){return handleError(error);}}
export async function POST(request:Request,context:Context){
  try{
    const {path}=await context.params,key=path.join("/");
    const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)throw new ApiError(403,"请求来源不匹配，请从本站重新操作。");
    if(key==="diagnoses")return reply(await research.submitDiagnosis(request));
    if(!request.headers.get("content-type")?.includes("application/json"))throw new ApiError(415,"请以 JSON 格式提交。");
    const data=await readJsonPayload(request);
    if(key==="research/erase")return reply(await research.eraseLearningData());
    if(key==="research/save")return reply(await research.saveEntry(data));
    if(key==="research/review")return reply(await research.review(data));
    if(path.length===2&&path[0]==="generate")return reply(await research.generate(path[1]));
    if(path.length===2&&path[0]==="remove")return reply(await research.removeTask(path[1]));
    if(key==="attempts")return reply(await submitAttempt(data));
    if(key==="enrollments")return reply(await enroll(data));
    if(key==="profile")return reply(await updateProfile(data));
    if(key==="admin/courses")return reply(await editCourse(data));
    if(key==="admin/enrollments")return reply(await editEnrollment(data));
    if(key==="admin/resources")return reply(await editResource(data));
    return reply({error:"接口不存在。"},404);
  }catch(error){return handleError(error);}
}
