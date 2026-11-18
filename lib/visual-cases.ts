import type {Entry} from "./research-types";

type CaseInfo = {
  id: string;
  title: string;
  topic: string;
  question: string;
  note: string;
  exam?: string;
};

export const visualCases: CaseInfo[] = [
  {id:"periodic", title:"三角函数与周期现象", topic:"三角函数", question:"同一个正弦模型，怎样描述振子的位移、音叉的振动与交变电流？", note:"resource-trigonometry", exam:"gaokao-2016-i-science-12"},
  {id:"unit-circle", title:"单位圆与诱导公式", topic:"三角函数", question:"对称或旋转以后，单位圆上点的两个坐标分别发生了什么变化？", note:"resource-trigonometry", exam:"gaokao-2016-i-science-12"},
  {id:"projection", title:"投影向量的求法", topic:"向量", question:"从向量端点作垂线，怎样读出投影的方向和大小？", note:"resource-solid-geometry"},
  {id:"cube-section", title:"正方体的截面", topic:"立体几何", question:"沿同一个平面切开、分离再复原，两个新面的形状有什么关系？", note:"resource-solid-geometry"},
  {id:"vector-distance", title:"用向量求距离", topic:"向量", question:"选定垂直方向后，怎样提取点、直线或平面之间的距离？", note:"resource-solid-geometry"},
  {id:"dihedral-angle", title:"二面角的平面角与求法", topic:"立体几何", question:"怎样沿棱找出代表二面角的平面角，再用几何或向量算出它？", note:"resource-solid-geometry"},
  {id:"pyramid", title:"四棱锥中的平行问题", topic:"立体几何", question:"给定一条底边，能在指定侧面内作出与它平行的直线吗？", note:"resource-solid-geometry"},
  {id:"cylinder-section", title:"圆柱体的截面", topic:"立体几何", question:"转动装水的密闭圆柱，水面的真实形状怎样随倾角改变？", note:"resource-solid-geometry"},
  {id:"conic-definitions", title:"圆锥曲线的定义", topic:"解析几何", question:"同一条曲线，怎样用焦点、准线或圆锥的截平面来确定？", note:"resource-analytic-geometry"},
  {id:"polar", title:"圆锥曲线的极点与极线", topic:"解析几何", question:"拖动极点，观察它的极线、切点与曲线之间的关系。", note:"resource-analytic-geometry", exam:"gaokao-2015-ii-science-20"},
  {id:"drawing", title:"立体几何的纸笔画法", topic:"立体几何", question:"从第一笔开始，怎样把空间的方向和遮挡关系准确地画在纸上？", note:"resource-solid-geometry"},
  {id:"counting", title:"看得见的排列组合", topic:"排列组合", question:"拖动队员、移动隔板或画一条路径，检验每种计数方法究竟在数什么。", note:"resource-probability"},
  {id:"tangent", title:"抛物线的切线", topic:"函数与导数", question:"沿抛物线移动切点。切点经过原点时，斜率的符号如何改变？", note:"resource-functions", exam:"gaokao-2016-i-science-21"},
];

export function linkedVisuals(entry:Entry) {
  return visualCases.filter(lab => entry.caseId===lab.id || entry.id===lab.note || entry.id===lab.exam);
}
