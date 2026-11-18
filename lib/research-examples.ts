import { examSources } from "./exam-sources";
import type { Entry } from "./research-types";

// The 2016 review includes the mathematical conditions. Link to the example
// on the relevant PDF page and keep the site's explanations separately authored.
function example(id: string, page: number, body: string, answer: string): Entry {
  const item = examSources.find(source => source.id === id);
  if (!item) throw new Error("Missing exam source: " + id);
  return {
    id, kind: "exam", version: 0, status: "public",
    title: item.title, category: item.category, tags: item.methods,
    year: item.year, paper: item.paper, number: String(item.number), type: item.type,
    source: item.sourceUrl + "#page=" + page, body, answer,
  };
}

export const verifiedExamples: Entry[] = [
  example("gaokao-2016-ii-science-17", 2, String.raw`## 题意重述

一个等差数列的第一项是 $1$，前七项之和是 $28$。把每一项 $a_n$ 的常用对数向下取整，得到新数列 $b_n=\lfloor\log_{10}a_n\rfloor$。先分别求下标为 $1,11,101$ 的三个 $b_n$，再求 $b_1$ 到 $b_{1000}$ 的和。

数学条件据教育部考试中心《2016年高考数学试题评析》例 3，载《中国考试》2016 年第 7 期，第 13—14 页。`, String.raw`## 本站解析

设公差为 $d$。前七项之和等于七倍中间项，因此 $a_4=28/7=4$。由 $1+3d=4$ 可得 $d=1$，故 $a_n=n$。

向下取整后的数值，只在 $n$ 到达下一个 $10$ 的整数次幂时才会改变。因此 $b_1=0$，$b_{11}=1$，$b_{101}=2$。

把相同的项集中计算。在 $1$ 至 $9$ 中有 $9$ 个零，在 $10$ 至 $99$ 中有 $90$ 个一，在 $100$ 至 $999$ 中有 $900$ 个二。第 $1000$ 项单独取值 $3$。

$$\sum_{n=1}^{1000} b_n=9\cdot0+90\cdot1+900\cdot2+3=1893.$$

边界检查：$9+90+900+1=1000$，正好覆盖全部下标。`),
  example("gaokao-2016-i-science-16", 3, String.raw`## 题意重述

工厂安排两种产品的产量。每件 A 需要甲材料 $1.5$ 千克、乙材料 $1$ 千克、工时 $5$ 小时，利润 $2100$ 元。每件 B 对应的四个数字依次为 $0.5$ 千克、$0.3$ 千克、$3$ 小时、$900$ 元。可用的甲、乙材料分别为 $150$、$90$ 千克，最多能投入 $600$ 小时。问总利润最高是多少元。

数学条件据教育部考试中心《2016年高考数学试题评析》例 5，载《中国考试》2016 年第 7 期，第 14 页。`, String.raw`## 本站解析

记两种产量为 $x,y$。甲材料限制给出 $3x+y\le300$。乙材料与工时限制分别为 $10x+3y\le900$、$5x+3y\le600$。

目标是 $2100x+900y$。后两个不等式中的 $y$ 系数相同，可以先尝试给它们分配权重，让加权后的左侧恰好等于目标式。若取权重 $120$ 和 $180$，便得到

$$2100x+900y=120(10x+3y)+180(5x+3y)\le216000.$$

要检验这个上界能否达到，让这两个约束同时取等号。相减得 $5x=300$，故 $x=60$，再代回得 $y=100$。这时 $3x+y=280\le300$，甲材料也够用，且两个产量都是非负整数。

上界有可行方案达到，所以最大总利润为 $216000$ 元。`),
  example("gaokao-2016-i-science-21", 4, String.raw`## 题意重述

考虑实参数 $a$ 和方程 $(2-x)e^x=a(x-1)^2$。找出使方程恰有两个不同实根的全部 $a$。对这样的 $a$，证明两根的算术平均数小于 $1$。

这是把原题的函数零点条件移项后所得的等价设问。数学条件据教育部考试中心《2016年高考数学试题评析》例 7，载《中国考试》2016 年第 7 期，第 15 页。`, String.raw`## 本站解析

先检验 $x=1$：方程左侧为 $e$，右侧为零，故它不可能是根。可在其余点上分离参数，令 $g(x)=(2-x)e^x/(x-1)^2$，数方程 $g(x)=a$ 的解。

$$g'(x)=-\frac{e^x\bigl((x-2)^2+1\bigr)}{(x-1)^3}.$$

在 $x<1$ 时，$g$ 严格递增，取值从趋近 $0$ 到趋近正无穷。在 $x>1$ 时，$g$ 严格递减，取值从趋近正无穷到趋近负无穷，并且 $g(2)=0$。因此恰有两根的充要条件是 $a>0$，两根满足 $x_1<1<x_2<2$。

两根平均数小于 $1$，等价于 $x_1<2-x_2$。这个写法提示我们把右根关于 $1$ 反射到左支，在同一单调区间比较。

设 $x_2=1+t$，则 $0<t<1$。比较对称位置可得

$$\frac{g(1-t)}{g(1+t)}=\frac{1+t}{1-t}e^{-2t}.$$

其对数为 $h(t)=\ln(1+t)-\ln(1-t)-2t$。由 $h(0)=0$ 及 $h'(t)=2t^2/(1-t^2)>0$，可知该比值大于 $1$。

故 $g(1-t)>g(1+t)=a=g(x_1)$。左支严格递增，因此 $1-t>x_1$。把 $1-t=2-x_2$ 代回，便有 $(x_1+x_2)/2<1$。`),
];
