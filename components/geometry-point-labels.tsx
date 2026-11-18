import {placePointLabels,type Pixel} from "../lib/plot-labels";
import {Formula} from "./math-text";

export type PointName={p:Pixel;name:string;color?:string};
export function GeometryPointLabels({points,edges,width,height}:{points:PointName[];edges:[Pixel,Pixel][];width:number;height:number}) {
  const centers=placePointLabels(points.map(v=>v.p),edges,width,height);
  return <g aria-hidden="true" pointerEvents="none">{points.map(({name,color},i)=><foreignObject key={name} x={centers[i][0]-12} y={centers[i][1]-12} width="24" height="24">
    <div className="vec-point-name" style={{color}}><Formula tex={name}/></div></foreignObject>)}</g>;
}
