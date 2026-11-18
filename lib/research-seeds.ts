import {verifiedExamples} from "./research-examples";
import {examSources} from "./exam-sources";
import {resources} from "./content";
import type {Entry} from "./research-types";
export const seedNotes:Entry[]=resources.map(r=>({id:r.id,version:0,kind:"note",status:"public",title:r.title,body:r.content,
 category:({functions:"函数与方程",probability:"概率与统计","analytic-geometry":"几何与代数","solid-geometry":"几何与代数"} as Record<string,string>)[r.topicId]||"数学思想与方法",
 tags:[r.grade],caseId:r.topicId==="functions"?"tangent":""}));

const publicIndexes:Entry[]=examSources.map(x=>({id:x.id,version:0,kind:"exam",status:"public",title:x.title,body:"",paper:x.paper,year:x.year,number:String(x.number),type:x.type,category:x.category,tags:x.methods,source:x.sourceUrl}));
export const seedEntries:Entry[]=[...seedNotes,...publicIndexes.map(e=>verifiedExamples.find(v=>v.id===e.id)||e)];
