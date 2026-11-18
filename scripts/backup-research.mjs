// Snapshot the local SQLite database used by the research preview, including attachment chunks.
import {DatabaseSync,backup} from "node:sqlite";
import {mkdirSync,readdirSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
const root=fileURLToPath(new URL("../",import.meta.url));
const folder=path.join(root,".wrangler","state","v3","d1");
const candidates=readdirSync(folder,{recursive:true}).filter(file=>file.endsWith(".sqlite"));
const matching=candidates.filter(file=>{
 const database=new DatabaseSync(path.join(folder,file),{readOnly:true});
 try{return Boolean(database.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='diagnoses'").get());}
 finally{database.close();}
});
if(matching.length!==1)throw Error("未找到唯一的研究所数据库，请先启动本地预览。");
const backups=path.join(root,".local","backups");mkdirSync(backups,{recursive:true});
const target=path.join(backups,"research-"+new Date().toISOString().replace(/[:.]/g,"-")+".sqlite");
const source=new DatabaseSync(path.join(folder,matching[0]),{readOnly:true});
try{await backup(source,target);}finally{source.close();}
const copy=new DatabaseSync(target,{readOnly:true});
try{if(copy.prepare("PRAGMA integrity_check").get().integrity_check!=="ok"||copy.prepare("PRAGMA foreign_key_check").all().length)throw Error("备份校验失败。");}finally{copy.close();}
console.log("已验证本地备份："+target);
