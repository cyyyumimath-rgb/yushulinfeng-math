import handler from "vinext/server/fetch-handler";
import {handleStandaloneAuth} from "../lib/standalone-auth";

export default {
  async fetch(request:Request, env:Cloudflare.Env, ctx:ExecutionContext) {
    const auth=await handleStandaloneAuth(request,env as unknown as Record<string,unknown>);
    if(auth.response)return auth.response;
    return handler.fetch(auth.request,env,ctx);
  },
};
