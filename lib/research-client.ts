export async function request<T=unknown>(path:string, data?:unknown):Promise<T>{
 const form=data instanceof FormData;
 const response=await fetch("/api/"+path,{method:data===undefined?"GET":"POST",cache:"no-store",
 headers:form||data===undefined?undefined:{"Content-Type":"application/json"},body:form?data:JSON.stringify(data)});
 const result=await response.json();if(!response.ok)throw Error((result as {error?:string})?.error||"操作未完成。");return result as T;
}
export function message(e:unknown){return e instanceof Error?e.message:"操作未完成，请重试。";}
