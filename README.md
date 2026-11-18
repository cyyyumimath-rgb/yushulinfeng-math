# 钰数临风｜数学研究所

面向高中数学课堂的知识库与交互实验室。学生可以拖动单位圆上的点推导诱导公式，沿平面切开正方体或圆柱，从枚举表中选取一种排法回到演示区，也可以提交错题和试卷供教师诊断。

## 本地运行

使用 Node.js 22.16 或更高版本及其附带的 npm。在仓库根目录运行以下命令。

```sh
npm ci
npm run build
npm start
```

浏览器打开 [本地首页](http://127.0.0.1:5173/) 或 [数学可视化案例库](http://127.0.0.1:5173/#visual)。首次启动会创建本地 D1 数据库和会话签名密钥。浏览公开内容和运行交互实验无需账户或 AI 密钥。更新源码后重新构建并启动。端口已占用时可设置环境变量 `PREVIEW_PORT`。

## 内容与代码

| 入口 | 功能 |
| --- | --- |
| 知识库与真题库 | 导入 Obsidian Markdown，用本地 KaTeX 显示公式，录入题目并保留来源与修改记录 |
| 数学可视化 | 13 个案例入口，含二面角、圆锥曲线、截面以及 20 个排列组合专题 |
| 学习诊断 | 学生提交材料，教师生成、修改和审核诊断报告，学生查看已交付的报告 |

`components/` 保存实验界面，`lib/` 保存数学模型和业务逻辑，`app/` 与 `worker/` 处理页面和请求，`drizzle/` 保存数据库结构。提交修改前可运行以下检查。

```sh
npm test
npm run typecheck
```

## 登录与诊断

学生使用邮箱和自己选择的学习口令登录。请保留原口令和部署的签名密钥，以便再次访问同一份学习档案。本地教师可复制 `.dev.vars.example` 为 `.dev.vars`，填写以下需要的值并重启。

| 变量 | 用途 |
| --- | --- |
| `STANDALONE_AUTH_SECRET` | 长期保留的随机会话签名密钥。本地首次启动可自动生成，线上实例请自行生成并保管 |
| `SITE_ADMIN_EMAIL`、`SITE_ADMIN_PASSWORD` | 教师管理账户 |
| `DIAGNOSIS_API_KEY`、`DIAGNOSIS_MODEL` | 可选。教师需要生成 AI 初稿时，配置支持图像或 PDF 输入的服务密钥和模型 |

学生提交材料与报告保存在运行实例的 D1 中。本机预览的数据位于 `.wrangler/state/`。首次运行预览后，`npm run backup` 可将本地数据库快照保存到 `.local/backups/`。

## 部署完整网站

完整站点需要 Cloudflare Workers 与 D1。以下命令用于首次部署到自己的 Cloudflare 账户，使用一个新建的空数据库。

1. 运行 `npx wrangler login`，再运行 `npx wrangler d1 create math-learning-db`。记录返回的数据库名称和 UUID。
2. 运行 `npm run build` 和 `npm run prepare:deployment`。打开生成的 `dist/server/wrangler.deploy.json`，把 Worker 名称和 D1 占位值换成自己的值，保留绑定名称 `DB`。重新构建后需重新准备部署配置。
3. 在仓库根目录依次执行以下命令，初始化两份表结构。第一份仅在空库执行一次。

   ```sh
   npx wrangler d1 execute DB --remote --config dist/server/wrangler.deploy.json --file drizzle/0000_lazy_proemial_gods.sql
   npx wrangler d1 execute DB --remote --config dist/server/wrangler.deploy.json --file drizzle/0001_research.sql
   ```

4. 运行 `npx wrangler deploy --config dist/server/wrangler.deploy.json` 发布 Worker。在 Cloudflare 控制台打开该 Worker 的 **Settings → Variables and Secrets**，以 Secret 形式设置签名密钥和教师账号配置，并使配置生效。实际密钥只填写在部署环境中。
5. 打开部署返回的网址验证可视化、学生登录与教师审核，再把网址分享给学生。[Cloudflare Workers 部署文档](https://developers.cloudflare.com/workers/get-started/guide/)

## 许可状态与教学来源

项目自身代码的许可证待维护者选定。保留的第三方文件遵循其随附声明，安装的依赖各有自己的许可证。题目来源、教学笔记、讲义与品牌标识的使用范围需分别确认。真题条目保留原始出处，转载题面或教材插图前请核对来源授权。
