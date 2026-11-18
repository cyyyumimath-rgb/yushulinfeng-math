import {existsSync,readFileSync,writeFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import path from "node:path";

const root=fileURLToPath(new URL("../",import.meta.url));
const source=path.join(root,"dist/server/wrangler.json");
const target=path.join(root,"dist/server/wrangler.deploy.json");
if(!existsSync(source))throw Error("请先执行 npm run build。");
const config=JSON.parse(readFileSync(source,"utf8"));
config.name="replace-with-your-worker-name";
config.d1_databases=[{
  binding:"DB",
  database_name:"REPLACE_WITH_YOUR_DATABASE_NAME",
  database_id:"REPLACE_WITH_YOUR_DATABASE_UUID",
}];
delete config.routes;
delete config.account_id;
writeFileSync(target,JSON.stringify(config,null,2)+"\n",{flag:"wx"});
console.log("已生成 dist/server/wrangler.deploy.json。请填写自己的 Worker 名称和 D1 名称、UUID。");
