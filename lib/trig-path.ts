/** Unit-scaled point on the displayed transformation path, before projection
 * into SVG coordinates. Reflection travels along the perpendicular chord. */
export function trackedTip(alpha:number,beta:number,rotation:number,progress:number):[number,number]{
  if(rotation) return [Math.cos(alpha+rotation*progress),Math.sin(alpha+rotation*progress)];
  return [
    (1-progress)*Math.cos(alpha)+progress*Math.cos(beta),
    (1-progress)*Math.sin(alpha)+progress*Math.sin(beta),
  ];
}
