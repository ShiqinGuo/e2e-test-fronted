# 前端重设计验收索引

日期：2026-09-13。当前页面：[Flowtest](http://127.0.0.1:5173/)。本轮以固定版本 Supabase/shadcn 官方源码重建基础控件与页面布局，源码/API/状态模型和真实执行流程继续使用现有实现。

## 完成结果

- 全部12处业务原生选择器已替换。项目、环境可搜索；版本、角色和其他短枚举使用 Radix Select。运行选项与场景操作使用 Popover，窄屏导航使用 Sheet。
- 主导航合并为一组。1440px侧栏240px，810px和390px进入抽屉。编辑页上方保留环境执行、场景版本、内容工具三层，源码从约160–175px开始并伸展到页面底部。
- 环境表单按工作区宽度换列；保存区滚动时可达。运行详情窄处将历史横排、事件与详情纵排，选中状态保持。工件显示类型、场景、固定版本和执行尝试，完整路径可展开。
- 已有场景而未选择时显示真实可打开的场景列表。未加入虚构统计、运行结果或演示业务数据。
- 修复三项交互缺陷：搜索菜单点外部输入不抢焦点；动态disabled关闭菜单并阻止选择；带autoFocus的创建弹窗及401恢复后取消均返回原触发按钮。

## 验证结果

| 检查 | 最终结果 | 范围 |
| --- | --- | --- |
| TypeScript + Vite生产构建 | 通过 | 最新三层布局、所有业务视图及共享组件 |
| 单元测试 | 38/38通过 | AST局部编辑与未知代码保留、环境敏感配置、结果语义、精确证据归属 |
| Playwright完整回归 | 15/15通过，57.3秒 | 3条真实业务流程 + 810/390px各6项控件边界 |
| 实际页面目视检查 | 1440/810/390完成 | 编辑器、可搜索菜单、创建/保存弹窗、环境、运行摘要与选中断言 |
| 动效实测 | 菜单140ms、Dialog/overlay200ms | reduced-motion下animation:none与transition:0s；[computed原始数据](redesign-motion.json) |

完整浏览器结果：[文本日志](redesign-e2e.log)、[机器可读索引](redesign-verification.json)。HTML 报告在本地生成于 `redesign-final-report/index.html`，未纳入 Git。

三条业务回归使用独立测试账号与真实后端/API/数据库/Playwright运行器。仅共享控件边界测试使用专门的React fixture，用来控制pending、禁用及媒体偏好；它不替代业务回归。

工作台覆盖：创建环境/组/场景、v1–v3保存、检查点插入、源码保留、离开草稿保护、真实401重新登录、普通及会话恢复后取消回焦、810源码/步骤切换、抽屉Escape、版本差异Popover→Dialog转场、390控件可见与退出重登。

运行测试覆盖：真实页面下单和API断言、失败/跳过/未验证/重试后通过的独立状态、原版本和原环境快照重跑、取消、官方Trace可打开。最终混合运行 `56f9ff27-9a91-4130-bda9-7c27c9f1a883` 为预期失败/部分验证：5测试、3通过、1失败、1跳过、1重试后通过、1未验证；不是全绿造假。[原始验收](run-acceptance.json)

整组最终运行 `12ca7771-a04b-4b60-988c-4baa20adb5b5` 通过且已验证：2场景、2固定版本、142事件。两场景同名test的步骤、断言、截图、Trace归属分别核对，提交body确实使用groupId。[原始验收](group-acceptance.json)

## 最终画面

| 页面 | 桌面/宽工作区 | 810px | 390px |
| --- | --- | --- | --- |
| 编辑器 | [1440](screenshots/redesign/shell-1440.png) | [810](screenshots/redesign/workbench-810.png) | [390](screenshots/redesign/workbench-mobile.png) |
| 环境 | [1440](screenshots/redesign/environment-1440.png) | [810](screenshots/redesign/environment-810.png) | [390](screenshots/redesign/environment-390.png) |
| 运行 | [1440断言](screenshots/redesign/run-1440.png) | [810摘要](screenshots/redesign/run-810.png)、[选中断言](screenshots/redesign/run-810-evidence.png) | [390摘要](screenshots/redesign/run-390.png)、[选中断言](screenshots/redesign/run-390-evidence.png) |

其他状态：[项目搜索菜单](screenshots/redesign/project-menu-1440.png)、[环境搜索菜单](screenshots/redesign/environment-menu-810.png)、[抽屉](screenshots/redesign/workbench-810-navigation.png)、[创建弹窗](screenshots/redesign/create-dialog.png)、[保存弹窗](screenshots/redesign/save-dialog.png)、[场景操作](screenshots/redesign/workbench-actions.png)、[真实场景入口](screenshots/redesign/scenario-overview-1440.png)、[工件](screenshots/redesign/group-artifact-identities.png)、[官方Trace](screenshots/redesign/trace-viewer.png)。

重设计前的截图仍保存在 `docs/screenshots/` 原路径，最终新图集中在 `docs/screenshots/redesign/`。根字体实际16px、正文14px；中文沿用系统 Noto Sans SC fallback，没有下载字体。

## 来源与边界

[研究依据](design-research.md)、[固定源码/许可/适配清单](third-party-ui.md)。本轮未更改或重启后端；只重启前端以装载Tailwind插件。生产构建仍提示一个约509.5kB的编辑器依赖分块；没有为视觉重构扩大到打包性能改造。

本轮录制面板和弹层控件已迁移，未重新发起真实远程录制；既有真实录制证据保留于 [recording-acceptance.json](recording-acceptance.json)。运行、Trace、历史版本/环境快照和组证据均在本轮重新验证。

历史受保护的 `test-results/.last-run.json` 保留原状；本轮最终结果全部使用独立的 `redesign-final-results` 与 `redesign-final-report`。

本轮中间目录清理未执行：自动审批在创建命令进程前返回 `blocked by policy`，未说明更具体原因。`redesign-controls-results`、`redesign-run-results`、`redesign-run-final-results`、`redesign-workbench-results`、`redesign-workbench-report` 五个目录保留；未重试删除。最终索引请使用本页的 `redesign-final-*` 结果。
