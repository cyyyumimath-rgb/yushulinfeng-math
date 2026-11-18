import {readFileSync,writeFileSync,mkdirSync,existsSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import path from "node:path";
import {parseEnv} from "node:util";
import {randomBytes} from "node:crypto";
const root=fileURLToPath(new URL("../",import.meta.url));
process.chdir(root);
const local=".local/preview";
mkdirSync(local,{recursive:true});
const wrangler="./node_modules/wrangler/bin/wrangler.js";
function run(args,options={}) {
 const result=spawnSync(process.execPath,["--import","./scripts/sites-env.mjs",wrangler,...args],{stdio:"inherit",...options});
 if(result.error)throw result.error;
 if(result.status!==0)throw Error("本地 Wrangler 操作失败。");
 return result;
}
if(!existsSync("dist/server/wrangler.json"))throw Error("请先构建网站。");
const config=JSON.parse(readFileSync("dist/server/wrangler.json","utf8"));
config.main=path.resolve("dist/server/index.js");
config.assets.directory=path.resolve("dist/client");
const configPath=path.join(local,"wrangler.json");
writeFileSync(configPath,JSON.stringify(config));
const vars=path.join(local,".dev.vars");
const overrides=existsSync(".dev.vars")?parseEnv(readFileSync(".dev.vars","utf8")):{};
const settings={};
const names=["STANDALONE_AUTH_SECRET","SITE_ADMIN_EMAIL","SITE_ADMIN_PASSWORD","DIAGNOSIS_API_KEY","DIAGNOSIS_MODEL"];
for(const name of names) {
  const value=process.env[name] || overrides[name];
  if(value)settings[name]=value;
}
if(!settings.STANDALONE_AUTH_SECRET) {
  const keyPath=path.join(local,"session.key");
  try{writeFileSync(keyPath,randomBytes(32).toString("hex"),{flag:"wx",mode:0o600});}
  catch(error){if(error.code!=="EEXIST")throw error;}
  settings.STANDALONE_AUTH_SECRET=readFileSync(keyPath,"utf8").trim();
}
const lines=Object.entries(settings).map(([key,value])=>key+"="+JSON.stringify(value));
writeFileSync(vars,lines.join("\n")+"\n",{mode:0o600});
const port=Number(process.env.PREVIEW_PORT||5173);
if(!Number.isInteger(port)||port<1||port>65535)throw Error("Invalid PREVIEW_PORT");
const flags=["--local","--config",configPath,"--persist-to",".wrangler/state"];
const check=run(["d1","execute","DB",...flags,"--command","SELECT count(*) AS n FROM sqlite_master WHERE type='table' AND name='profiles'","--json"],{stdio:"pipe",encoding:"utf8"});
const result=JSON.parse(check.stdout);
if(result[0].results[0].n===0)run(["d1","execute","DB",...flags,"--file","drizzle/0000_lazy_proemial_gods.sql"]);
run(["d1","execute","DB",...flags,"--file","drizzle/0001_research.sql"]);
run(["dev",...flags,"--ip","127.0.0.1","--port",String(port),"--inspector-port","0"]);
