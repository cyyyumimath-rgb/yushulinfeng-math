export class ApiError extends Error {
  readonly status:number;

  constructor(status:number,message:string) {
    super(message);
    this.status=status;
  }
}

export const maxJsonBytes=220_000;

export async function readJsonPayload(request:Request,limit=maxJsonBytes):Promise<unknown> {
  if(Number(request.headers.get("content-length")||0)>limit) {
    throw new ApiError(413,"提交内容过长。");
  }

  const reader=request.body?.getReader();
  if(!reader)throw new ApiError(400,"提交内容不能为空。");
  const decoder=new TextDecoder();
  let bytes=0;
  let text="";
  try {
    while(true) {
      const {done,value}=await reader.read();
      if(done)break;
      bytes+=value.byteLength;
      if(bytes>limit)throw new ApiError(413,"提交内容过长。");
      text+=decoder.decode(value,{stream:true});
    }
    return JSON.parse(text+decoder.decode());
  } catch(error) {
    if(error instanceof ApiError)throw error;
    throw new ApiError(400,"提交内容格式无效。");
  } finally {
    reader.releaseLock();
  }
}
