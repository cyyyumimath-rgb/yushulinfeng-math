"use client";
import {useId,useState} from "react";
import {Formula as F} from "./math-text";
import {GeometryPointLabels} from "./geometry-point-labels";
import {dihedralGeometry,type SpatialPoint as P} from "../lib/dihedral";
import type {Pixel} from "../lib/plot-labels";
import "./vector-labs.css";

const names=["定义作角","垂面截线","三垂线法","平移作角","距离与正弦","余弦定理","射影面积","方向向量","法向量"] as const;
type Method=typeof names[number];
const O:P=[0,0,0],C:P=[-1.5,0,0],D:P=[1.5,0,0];
const add=(p:P,q:P):P=>[p[0]+q[0],p[1]+q[1],p[2]+q[2]];
const scale=(s:number,p:P):P=>p.map(x=>x*s) as P;
const f=(x:number)=>String(Number(x.toFixed(3)));
const ink="#233d50",teal="#13745b",rust="#ad5838";

export default function DihedralLab(){
  const [angle,setAngle]=useState(65),[radius,setRadius]=useState(2),[front,setFront]=useState(false);
  const [method,setMethod]=useState<Method>("定义作角");
  const [reverseNormal,setReverseNormal]=useState(false);
  const markerId=useId().replace(/[^A-Za-z0-9_-]/g,"")+"normal";
  const g=dihedralGeometry(angle,radius),{a,b,h}=g;
  const drawnNormal=scale(reverseNormal?-1.25:1.25,g.normalB);
  const project=(p:P):Pixel=>front?[254+55*p[1],235-55*p[2]]:[242+48*(.866*p[1]-.5*p[0]),216+48*(.342*(.866*p[0]+.5*p[1])-.94*p[2])];
  const angleFoot=method==="三垂线法"||method==="距离与正弦"||method==="射影面积";
  const shifted=method==="平移作角"&&!front, base=shifted?D:O;
  const pA=add(a,base),pB=add(b,base);
  const segments:{a:P;b:P;color:string;width:number;dash?:string;arrow?:string}[]=[];
  function line(a:P,b:P,color=ink,width=1.3,dash?:string,arrow?:string){segments.push({a,b,color,width,dash,arrow});}
  const polygons:{pts:P[];fill:string}[]=[];
  function patch(pts:P[],fill:string,color:string){polygons.push({pts,fill});pts.forEach((p,i)=>line(p,pts[(i+1)%pts.length],color,1));}
  if(!front){
    patch([C,D,add(D,a),add(C,a)],"#d6eae0","#93b7a4");
    patch([C,D,add(D,b),add(C,b)],"#e4eaf2","#9aaec3");
    if(method==="垂面截线")patch([[0,-2.8,0],[0,2.8,0],[0,2.8,2.9],[0,-2.8,2.9]],"#ebe5f0","#b8a7bd");
    line(scale(1.35,C),scale(1.35,D),ink,1.8);
  }
  if(method==="射影面积"&&!front){
    patch([C,D,b],"#e5c1ad",rust);patch([C,D,h],"#b3d5c1",teal);
  }
  if(method==="距离与正弦"&&!front){
    patch([C,D,a],"#b5d7c4",teal);
    line(b,C,ink,1,"3 4");line(b,D,ink,1,"3 4");line(b,a,ink,1,"3 4");
  }
  if(shifted){line(O,a,teal,1,"3 4");line(O,b,rust,1,"3 4");}
  line(base,pA,teal,2.2);line(base,pB,rust,2.2);
  if(method==="余弦定理")line(a,b,ink,2,"4 3");
  if(angleFoot){line(b,h,ink,1.7,"4 3");line(O,h,teal,1.5,"3 3");}
  if(method==="法向量"){line(O,scale(1.25,g.normalA),"#6b5283",1.7,undefined,markerId+"a");line(O,drawnNormal,"#536c91",1.7,undefined,markerId+"b");}
  const spots:{p:P;name:string;color?:string}[]=[{p:base,name:shifted?"D":"O"},{p:pA,name:shifted?"A'":"A",color:teal},{p:pB,name:shifted?"B'":"B",color:rust}];
  if(!front&&!shifted)spots.push({p:C,name:"C"},{p:D,name:"D"});
  if(shifted)spots.push({p:O,name:"O"},{p:a,name:"A",color:teal},{p:b,name:"B",color:rust});
  if(angleFoot)spots.push({p:h,name:"H"});
  if(method==="法向量")spots.push({p:scale(1.25,g.normalA),name:"\\vec n_1",color:"#6b5283"},{p:drawnNormal,name:reverseNormal?"\\vec m":"\\vec n_2",color:"#536c91"});
  const arc=Array.from({length:55},(_,i)=>{
    const phi=angle*Math.PI/180*i/54;
    return project(add(base,[0,.52*Math.cos(phi),.52*Math.sin(phi)]));
  });
  const lesson:Record<Method,React.ReactNode>={
    "定义作角":<><p>在棱上取 <F tex="O"/>，从它出发，在两个指定半平面内分别作垂直于棱的射线 <F tex="OA,OB"/>。它们夹成的角就是这个二面角的平面角。</p><F display tex="\theta=\angle AOB,\qquad 0\leqslant\theta\leqslant\pi"/></>,
    "垂面截线":<><p>过 <F tex="O"/> 作垂直于棱的平面。截平面与两个半平面交于两条射线，它们都垂直于棱。切换到沿棱观察，就能看到截面内的真实角度。</p><F display tex="OA\perp CD,\quad OB\perp CD"/></>,
    "三垂线法":<><p>从 <F tex="B"/> 向底面作垂线，垂足为 <F tex="H"/>。{angle===90?<>此时 <F tex="H=O"/>，直线 <F tex="OB"/> 垂直底面，二面角为直角。</>:<>从 <F tex="H"/> 向棱作垂线，垂足为 <F tex="O"/>。由三垂线定理，<F tex="OB"/> 也垂直于棱。在底面内选取指向指定半平面的射线 <F tex="OA"/>。</>}</p><F display tex={angle===90?"\\theta=90^\\circ":angle<90?"\\theta=\\angle HOB":"\\theta=\\pi-\\angle HOB"}/></>,
    "平移作角":<><p>把两条截线沿棱平移到同一棱上点 <F tex="D"/>。两个方向均保持，平面角大小不变。遇到原图难以直接作角时，也可延长面或补形，再作同向平行射线。</p><F display tex="\angle A'DB'=\angle AOB"/></>,
    "距离与正弦":<><p>取 <F tex="B"/> 到底面的距离 <F tex="BH"/>，再取它到棱的距离 <F tex="BO"/>。在垂直棱的截面内，二者之比给出平面角的正弦。结合 <F tex="H"/> 所在的半平面判定锐钝。</p><F display tex={"\\sin\\theta=\\frac{BH}{BO}\\approx\\frac{"+f(g.height)+"}{"+f(radius)+"}\\approx "+f(g.s)}/>
      <p><strong>等体积求高。</strong>若垂距难以直接求出，可先选容易测量的底和高求四面体 <F tex="ABCD"/> 的体积 <F tex="V"/>，再以 <F tex="\triangle ACD"/> 为底，还原高 <F tex="h=BH"/>。</p>
      <F display tex="h=\frac{3V}{S_{ACD}},\qquad\sin\theta=\frac{h}{BO}"/>
      <p>本图 <F tex={"S_{ACD}="+f(g.area)+",\\quad V\\approx "+f(g.area*g.height/3)}/>。</p></>,
    "余弦定理":<><p>在截面三角形 <F tex="AOB"/> 中，量出两条垂线段和两端点的距离。余弦定理直接给出所指定夹角的余弦，保留锐钝信息。</p><F display tex="\cos\theta=\dfrac{OA^2+OB^2-AB^2}{2\,OA\cdot OB}"/><p><F tex={"OA=OB="+f(radius)+",\\quad AB\\approx "+f(g.chord)}/></p></>,
    "射影面积":<><p>把 <F tex="\triangle CDB"/> 正投影到底面，得到 <F tex="\triangle CDH"/>。两三角形共底，面积比等于对应高之比。由 <F tex="H"/> 位于棱的哪一侧区分锐角和钝角。</p><F display tex={"|\\cos\\theta|=\\frac{S_{CDH}}{S_{CDB}}\\approx\\frac{"+f(g.projected)+"}{"+f(g.area)+"}"}/>{angle===90&&<p>垂足与 <F tex="O"/> 重合，投影退化为线段，投影面积为零。</p>}</>,
    "方向向量":<><p>取棱为 <F tex="x"/> 轴，<F tex="OA"/> 沿 <F tex="y"/> 轴正向。为两半平面内的垂棱射线选取同向向量，利用数量积计算夹角。若已知面内斜向量，先减去沿棱的投影即可得到垂棱方向。</p><F display tex="\cos\theta=\dfrac{\overrightarrow{OA}\cdot\overrightarrow{OB}}{\lVert\overrightarrow{OA}\rVert\,\lVert\overrightarrow{OB}\rVert}"/></>,
    "法向量":<><p>把两条垂棱单位向量绕棱同向转过直角，得到两个面的单位法向量。这样选取方向，二者的夹角正是所求平面角。</p><F display tex="\vec n_1=(0,0,1),\quad\vec n_2=(0,-\sin\theta,\cos\theta)"/>
      <F display tex={reverseNormal?"\\vec m=-\\vec n_2,\\quad\\cos\\theta=-\\vec n_1\\cdot\\vec m":"\\cos\\theta=\\vec n_1\\cdot\\vec n_2"}/>
      <p>{reverseNormal?<>反转第二个法向量后，两法向量夹角是平面角的补角，为 <F tex={"180^\\circ-"+angle+"^\\circ="+(180-angle)+"^\\circ"}/>。原来的两个半平面保持原位。</>:<>两法向量夹角为 <F tex={angle+"^\\circ"}/>。若只知道数量积的绝对值，需要结合两半平面在棱旁的位置来判定锐钝。</>}</p>
      <button type="button" aria-pressed={reverseNormal} onClick={()=>setReverseNormal(!reverseNormal)}>{reverseNormal?"恢复法向量方向":"反转第二个法向量"}</button></>,
  };
  return <section className="vec-lab dihedral-lab" aria-label="二面角的平面角与求法"><header><h2>沿棱观察二面角</h2><p>在棱 <F tex="CD"/> 的两侧展开半平面，比较不同方法测得的同一个角。</p></header>
    <div className="vec-study"><figure><svg className="vec-graph" viewBox="0 0 520 320" role="img" aria-label={front?"沿棱正视平面角":"两个半平面的空间示意图"}>
      <defs>{["#6b5283","#536c91"].map((color,i)=><marker key={color} id={markerId+(i?"b":"a")} viewBox="0 0 10 8" refX="8" refY="4" markerWidth="6" markerHeight="5" orient="auto"><path d="M0 0 9 4 0 8Z" fill={color}/></marker>)}</defs>
      {polygons.map((p,i)=><polygon key={i} points={p.pts.map(p=>project(p).join(",")).join(" ")} fill={p.fill} fillOpacity=".65"/>)}
      {segments.map((s,i)=>{const [x1,y1]=project(s.a),[x2,y2]=project(s.b);return <line key={i} {...{x1,y1,x2,y2}} stroke={s.color} strokeWidth={s.width} strokeDasharray={s.dash} markerEnd={s.arrow?"url(#"+s.arrow+")":undefined}/>;})}
      <polyline points={arc.map(p=>p.join(",")).join(" ")} fill="none" stroke="#b47042" strokeWidth="1.8"/>
      {spots.filter(s=>!s.name.startsWith("\\vec")).map(({p,name,color})=><circle key={name} cx={project(p)[0]} cy={project(p)[1]} r="3.2" fill={color??ink}/>)}
      <GeometryPointLabels points={spots.map(s=>({...s,p:project(s.p)}))} edges={[...segments.map(s=>[project(s.a),project(s.b)] as [Pixel,Pixel]),...arc.slice(1).map((p,i)=>[arc[i],p] as [Pixel,Pixel])]} width={520} height={320}/>
    </svg><figcaption>{front?"沿棱方向正视截面，棱投影为一点，所见夹角等于平面角。":"空间斜视会改变屏幕上的表观夹角。沿棱正视可直接观察真实角度。"}</figcaption></figure>
    <div className="vec-steps"><h3>{method}</h3>{lesson[method]}<p>当前平面角 <F tex={"\\theta="+angle+"^\\circ"}/>，{angle===90?"为直角。":angle<90?"为锐角。":"为钝角。"}</p></div></div>
    <div className="vec-body"><div className="vec-actions"><button type="button" aria-pressed={front} onClick={()=>setFront(!front)}>{front?"返回空间视图":"沿棱观察平面角"}</button></div>
      <div className="vec-actions" role="group" aria-label="求二面角的方法">{names.map(m=><button type="button" key={m} aria-pressed={method===m} onClick={()=>setMethod(m)}>{m}</button>)}</div>
      <div className="vec-sliders"><label className="vec-slider">张角 <F tex={"\\theta="+angle+"^\\circ"}/><input type="range" min={10} max={170} value={angle} onChange={e=>setAngle(Number(e.target.value))}/></label>
      <label className="vec-slider">截线段长 <F tex={"OA=OB="+f(radius)}/><input type="range" min={1} max={2.5} step={.1} value={radius} onChange={e=>setRadius(Number(e.target.value))}/></label></div>
    </div></section>;
}
