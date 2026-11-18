export const sections = ["函数与方程","几何与代数","概率与统计","数学思想与方法","专题研究与教研笔记"];
export type Entry = {
  id: string; version: number; kind: "note" | "exam"; status: "draft" | "public";
  title: string; body: string; category: string; tags: string[];
  year?: number; paper?: string; number?: string; type?: string; source?: string;
  answer?: string; caseId?: string;
};
export type Material = {id:string; name:string; role:string};
export type Diagnosis = {
  id:string; mode:"single"|"paper"; title:string; problem:string; work:string;
  details:string; status:"submitted"|"draft"|"reviewed"; report:string; draft?:string;
  created:string; revision:number; files:Material[];
};
export type ResearchData = {user:string|null; isAdmin:boolean; aiReady:boolean; entries:Entry[]; tasks:Diagnosis[]};
