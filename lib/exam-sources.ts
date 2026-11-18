/** Catalog pointers to specific questions discussed in the examination publications. */
export type ExamSource = {
  id: string;
  title: string;
  year: number;
  paper: string;
  number: number;
  type: "单选" | "多选" | "填空" | "解答";
  category: string;
  methods: string[];
  topicId: string;
  sourceTitle: string;
  sourceUrl: string;
};

const review2016 = {
  year: 2016,
  sourceTitle: "教育部考试中心《2016年高考数学试题评析》",
  sourceUrl: "https://gaokao.neea.edu.cn/res/Home/report/16093/f5c47de7c516b44bc84e044d8ee3fedf.pdf",
};

const review2015 = {
  year: 2015,
  sourceTitle: "中国教育考试网《2015年高考数学试题评析》",
  sourceUrl: "https://www.neea.edu.cn/res/Home/report/16093/c3a368d467d5d9286f7af535ada48a7c.pdf",
};

export const examSources: ExamSource[] = [
  {
    ...review2016,
    id: "gaokao-2016-i-science-21",
    title: "用函数零点的位置比较两根之和",
    paper: "全国Ⅰ卷理科",
    number: 21,
    type: "解答",
    category: "函数与方程",
    methods: ["分类讨论", "构造辅助函数"],
    topicId: "functions",
  },
  {
    ...review2016,
    id: "gaokao-2016-ii-science-17",
    title: "从等差数列到取整后的分段求和",
    paper: "全国Ⅱ卷理科",
    number: 17,
    type: "解答",
    category: "几何与代数",
    methods: ["分段求和", "分类讨论"],
    topicId: "sequences",
  },
  {
    ...review2016,
    id: "gaokao-2016-ii-science-18",
    title: "用出险次数估算下一年的保费",
    paper: "全国Ⅱ卷理科",
    number: 18,
    type: "解答",
    category: "概率与统计",
    methods: ["条件概率", "数学期望"],
    topicId: "probability",
  },
  {
    ...review2016,
    id: "gaokao-2016-i-science-12",
    title: "用对称轴、零点和单调区间约束频率",
    paper: "全国Ⅰ卷理科",
    number: 12,
    type: "单选",
    category: "函数与方程",
    methods: ["数形结合", "约束参数"],
    topicId: "trigonometry",
  },
  {
    ...review2016,
    id: "gaokao-2016-i-science-16",
    title: "在材料与工时限制下求最大利润",
    paper: "全国Ⅰ卷理科",
    number: 16,
    type: "填空",
    category: "几何与代数",
    methods: ["线性规划", "数形结合"],
    topicId: "analytic-geometry",
  },
  {
    ...review2015,
    id: "gaokao-2015-i-arts-4",
    title: "随机选数恰好构成勾股数的概率",
    paper: "全国Ⅰ卷文科",
    number: 4,
    type: "单选",
    category: "概率与统计",
    methods: ["枚举计数", "古典概型"],
    topicId: "probability",
  },
  {
    ...review2015,
    id: "gaokao-2015-ii-science-20",
    title: "椭圆中的四边形能否成为平行四边形",
    paper: "全国Ⅱ卷理科",
    number: 20,
    type: "解答",
    category: "几何与代数",
    methods: ["数形结合", "代数论证"],
    topicId: "analytic-geometry",
  },
];
