> 从原 README 保留的开发与运行指南。以下命令均在仓库根目录执行。产品入口见 [README](../README.md)。

# Flowtest Web 工作台

基于 React、TypeScript 与 Vite 的 Web 业务流程测试平台前端。界面参考已确认的 Linear 浅色工作台，复用固定版本的 shadcn/ui 与 Radix 组件，使用 Lucide SVG 和 CodeMirror。设计依据见 [设计调研](design-research.md)，组件来源与许可见 [第三方 UI 说明](third-party-ui.md)。生产页面只调用真实后端 API。

## 启动

需要 Node.js 22.12+（本次使用 Node.js 24）以及对应的 FastAPI 后端。

```powershell
git clone https://github.com/ShiqinGuo/e2e-test-fronted.git
cd e2e-test-fronted
npm ci
npm run dev
```

打开 <http://127.0.0.1:5173/>。开发服务器将 `/api` HTTP 和 WebSocket 请求代理到 `http://localhost:4100`，请求携带 HttpOnly 会话 Cookie。后端应允许 `http://127.0.0.1:5173` 与 `http://localhost:5173` 来源。

需要覆盖代理目标时，在启动命令前设置：

```powershell
$env:API_PROXY_TARGET = 'http://localhost:4100'
npm run dev
```

后端启动、PostgreSQL 和 Playwright Worker 的准备参见 [e2e-test-svc](https://github.com/ShiqinGuo/e2e-test-svc)。前端不启动或替代后端，也不部署被测应用。

## 检查与构建

```powershell
npm test
npm run build
```

后端启动且共享技术夹具就绪后，可重跑真实浏览器验收：

```powershell
npx playwright install chromium
npm run test:e2e
```

`e2e/workbench.spec.ts` 创建独立验收账号，经过真实注册、项目/环境/组/场景 API，检查版本持久化、源码检查点、草稿保护、退出/登录和窄屏布局。截图写入 `docs/screenshots/`。可用 `FRONTEND_URL` 与 `TEST_WEBSITE_URL` 覆盖前端和夹具地址；默认夹具为后端提供的 `http://host.docker.internal:18080/`。验收账号的数据保留在该本地数据库中，便于复查。

`e2e/groups.spec.ts` 补充两个独立场景的真实 Web 分组执行，检查浏览器提交的 `groupId`、两份固化源码、组汇总和逐场景断言、截图及 Trace 工件。单独复跑使用 `npx playwright test e2e/groups.spec.ts --output group-test-results --reporter=list`，证据索引写入 `docs/group-acceptance.json`。

构建产物位于 `dist/`。部署时由同一域名的反向代理提供静态文件，将 `/api`（包括 WebSocket upgrade）转发到后端。`vite preview` 只用于检查构建产物，业务 API 需另外配置同源反向代理；不应将前端静态预览视为完整可用平台。

生产静态路由需要将 `/join` 和应用路由回退到 `index.html`；`/api` 保持独立代理，不能把 API 404 变成 HTML。后端 `E2E_APP_URL` 指向前端的公开 HTTPS origin，用于生成 `/join#token=...`。邀请 token 仅从 fragment 取出并通过 POST body 交给后端。组织、工作区、项目和资源选择保存在可分享的 URL，未保存草稿只保存在内存。

`e2e/organizations.spec.ts` 检查组织创建、工作区隔离、邮箱邀请、注册继续加入、角色调整、最后 owner 保护、只读配置、移除成员、错邮箱切换账号和撤销邀请。运行用户只使用浏览器，Docker、Chromium 和 noVNC 都在服务端。

## 操作流程

1. 注册或登录，创建组织或通过邀请链接加入团队。在工作区内创建项目。
2. 添加测试环境：已部署的网站、API 基址、角色、变量与前置/后置请求。
3. 新建测试组及场景，使用浏览器录制器或导入 Playwright 文件。
4. 在 CodeMirror 或检查点面板编辑，填写修改说明并保存新版本。
5. 选择环境和角色，执行单场景或测试组。
6. 在运行记录中查看步骤、断言、原始事件、工件与官方 Trace Viewer；重新执行产生独立记录。

环境与场景的未保存修改有离开保护。会话过期时工作台留在当前页面，重新登录原账号后继续编辑。录制会话 ID 保留在页面 URL，也可从录制面板恢复已有会话。

## 数据与证据边界

- 所有请求经过 `src/api.ts`，Cookie 会话与组织 RBAC 由后端执行。项目列表必须指定 workspaceId，创建项目必须包含 workspaceId。
- Playwright 源码是唯一权威。可视化面板使用 Babel AST 的源码位置局部修改；未知结构、注释及模块保持原文。不可靠的修改留在代码编辑器处理。
- 场景版本只新增，运行绑定的源码与脱敏环境快照来自后端。检查点元数据不能替代实际断言。
- 运行状态与验证状态分别呈现；只有操作、跳过与重试后通过不会伪装为完全验证。事件按序号追加，首次失败和各次尝试均保留。
- 浏览器点选发生在后端提供的官方录制器内。前端没有将截图包装成自定义目标选择器。
- 敏感变量与角色认证数据只写入；服务端返回配置存在标记，前端不回显凭据。前置/后置请求中的敏感头使用变量引用。
- 工件、录制器与 Trace 使用同源私有链接。真实运行、录制依赖及当前验收范围见 `docs/verification.md`。

API 契约由后端维护：[api-contract.md](https://github.com/ShiqinGuo/e2e-test-svc/blob/main/docs/api-contract.md)，运行时 OpenAPI 为 `/api/openapi.json`。

## 参考

- [Supabase Design System](https://supabase.com/design-system)
- [shadcn/ui](https://ui.shadcn.com/)
- [Playwright Test generator](https://playwright.dev/docs/codegen)
- [Playwright Trace Viewer](https://playwright.dev/docs/trace-viewer)
