import {Formula} from "./math-text";

/** A math label centered in a reserved SVG rectangle. Sizes are in viewBox coordinates. */
export function PlotMath({x,y,tex,width=24,height=22,size=13,color="currentColor"}:{
 x:number;y:number;tex:string;width?:number;height?:number;size?:number;color?:string
}){
 return <foreignObject x={x-width/2} y={y-height/2} width={width} height={height} pointerEvents="none">
   <span style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:size,color}}>
     <Formula tex={tex}/>
   </span>
 </foreignObject>;
}
