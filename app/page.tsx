import LearningApp from "./learning-app";
import ResearchApp from "./research-app";
import {seedEntries} from "../lib/research-seeds";
export default async function Home({searchParams}:{searchParams:Promise<{view?:string}>}){
 const {view}=await searchParams;
 return view&&["courses","practice","resources","dashboard","admin"].includes(view)?<LearningApp/>:<ResearchApp initialEntries={seedEntries}/>;
}