# Flowtest 前端重设计依据

## 当前方向：Linear 风格与 Web 团队协作（2026-09-27）

用户确认采用本次 Refero 中实际查看的 [Linear 项目列表](https://refero.design/pages/409eadeb-a66b-45ee-a379-88909adabdbb) 风格及交互。参考的是浅灰侧栏、内嵌白色工作区、低权重工具条、按行对齐的信息与按需展开的显示设置；没有复制 Linear 的私有代码。

应用层级改为组织 → 工作区 → 项目。组织统一管理成员与角色，工作区归集项目，项目内通过场景／运行／环境标签切换。组织名直接作为侧栏首行入口，工作区作为分组标题选择器；项目名与视图切换合并在同一条顶部导航。场景移入主区域列表，提供搜索、测试组筛选、分组和排序。源码编辑时收起场景列表，给编辑器与步骤面板完整宽度。

沿用现有 Radix/shadcn 基础控件与可访问交互，替换原有应用壳层；共享浅灰表面、细边框和中性深灰操作色。运行状态仍使用语义颜色，首次失败与每次重试保留。窄屏主导航收进抽屉，Escape 关闭并把焦点还给触发器，组织切换与浏览器后退受统一草稿保护。

注册后创建组织（附带默认工作区）或用邀请加入已有组织。owner/admin 管理团队，member 编辑执行，viewer 查看测试和证据。页面可用性来自服务端返回的 role，最终授权由服务端执行。邀请链接使用 fragment，登录／注册后继续确认加入；不发送邮件。

首轮仅检查了可用性与响应式，用户指出视觉没有复刻到位。已重新对照原始截图，去掉多层顶部、表单式侧栏、默认分组条和逐行边框；桌面采用 244px 侧栏、40px 顶部导航、40px 筛选条与 48px 列表行。显示面板包含实际可操作的分组、排序和属性开关，不添加无实现的看板等占位项。原图与当前实现的同尺寸视觉对照见 [对照页](verification/web/linear-comparison.html)。

新版截图和验证见 [Web 协作重构验收](web-refactor-verification.md)。以下保留 2026-09-13 的设计研究及其当时结论，不再代表当前主视觉选择。

## 2026-09-13 历史设计决策

主参考采用 **Supabase Studio 的官方 Design System**，统一布局、控件、浮层、表单和空状态。实际组件从固定版本的 shadcn/ui Radix 源码复用；可搜索选择器采用 Supabase 已公开的 Popover + Command 组合。配色采用低饱和中性色表面与一种蓝色操作强调色，保留 Flowtest 名称。运行结果的红、黄、绿只承担状态含义。

这次重设计覆盖应用壳层、全部业务选择器、按钮与表单、场景编辑、运行详情、环境设置和录制弹层。Python/FastAPI/PostgreSQL、API 契约、场景版本和已有真实执行证据保持当前业务语义。目标是在桌面和约 810px 的嵌入工作区内形成同一套可操作界面。

Supabase 的布局规范明确区分设置表单、列表与全宽日志/编辑器，并要求父页面保持紧凑，操作放在相应内容的工具条内。它比只参考一张后台截图更适合持续扩展的测试工作台。[1]

## 当前界面的具体问题

截图与前端源码共同显示，问题不止是颜色。

| 问题 | 已观察的事实 | 本轮处理 |
| --- | --- | --- |
| 控件不统一 | 用户截图中的环境菜单是浏览器原生下拉；源码有 12 处原生 select。项目仅引入 Radix Dialog，尚无共享 Select、Popover、Tooltip | 全部业务选择器替换为同一体系；项目和环境支持搜索，短枚举采用 Select |
| 导航重复 | 左图标栏与顶部标签都控制工作台、运行记录、环境 | 只保留一套主导航；页面标题、环境上下文和主要操作分工明确 |
| 嵌入宽度失控 | 810px viewport 下，旧样式仍预留图标栏、场景侧栏、历史栏或编辑器步骤列；各模块断点不一致 | 依据工作区可用宽度切换布局；810px 下侧栏进入抽屉，详情不再被多列挤压 |
| 空白不表达状态 | 已有场景但未选中时，主区仍是大面积居中空态；旧 Empty 有 min-height 300 与 64px 垂直 padding | 有场景时展示可打开的场景列表；真正无数据、未选中、搜索无结果分别处理 |
| 字号和颜色分散 | 4 份样式中存在大量局部字号、硬编码颜色；运行时间最低 9px，部分颜色变量未定义而依赖 fallback | 建立语义 token，统一主文字、辅助文字、背景、边框、焦点和状态 |
| 操作反馈缺少体系 | 原有 tooltip 多为 title；动效仅局部颜色变化和淡入 | 使用成熟 Tooltip、菜单和 Dialog 的状态、焦点与进退场行为 |
| 文案误导 | 侧栏“全部运行”实际进入运行记录 | 文案与实际行为一致；整组执行仍通过明确组选择触发 |

盘点范围为业务 JSX：80 个 button、12 个 select、15 个 input、5 个 textarea、9 处 Modal 调用和 8 处 Empty 调用；不含第三方内部 DOM 或循环渲染后的数量。来源为本轮对 `e2e-test-fronted/src` 的只读检查。这些数量用于确定迁移范围，不作为美观或完成度指标。

## 成熟产品比较与取舍

| 产品或体系 | 一手证据 | 可采用的部分 | 取舍 |
| --- | --- | --- | --- |
| Supabase Studio | 官方可交互 Design System、实际组件源码、布局/颜色/空态/弹层规范 | 主视觉、紧凑工具条、分层表面、设置表单、搜索选择器 | 作为唯一主视觉参考；不接入 Supabase 后端业务块 |
| shadcn/ui | 官方 Radix registry、Select/Dialog 源码和 Vite 接入说明 | 可直接复用的 React 组件、portal、焦点、选中态、样式结构 | 固定源码版本后迁移；不混用不同底层组件版本 |
| Linear | 2026-03-12 官方改版说明与前后对照图 | 导航降低视觉权重、操作位置稳定、边框和图标收敛 | 作为结构精简的交叉依据，不声称可取得其私有组件源码 |
| Playwright UI / Trace | 官方文档和测试树源码 | 组/场景行内运行、步骤与证据联动、保留用户选中项 | 采用行为；继续使用官方 Trace，不复制其完整工具外壳 |
| Hoppscotch | 官方环境选择器与集合空态 Vue 源码 | 搜索环境、当前项勾选、Escape 关闭、不同空态 | 采用交互，使用 React 组件实现，不移植 Vue 运行时 |
| Postman | 官方 v12 结果页截图与 Collection Runner 文档 | 紧凑运行摘要、状态过滤、结果列表和右侧详情 | 采用结果组织方式，不搬多色 HTTP 标签和额外功能 |
| Checkly | 官方结果截图与组文档 | 历史行、不同尝试的结果入口 | 不加入监控图表或可用率首页；其 group 语义不替代 Flowtest 整组运行 |

Supabase 的平台 UI Library 与 Studio Design System 需要区分：前者包含依赖 Supabase Management API 的业务能力，后者提供本次需要的 UI 规范与基础组件。现有后端没有迁移到 Supabase 的必要。[2][3]

Linear 的近期改版强调减少导航与内容争夺注意力、弱化无必要分隔线，并让相关操作出现在稳定位置。这支持删除 Flowtest 重复导航，但不意味着照搬它的桌面标签栏。[4]

Playwright、Postman、Hoppscotch 与 Checkly 在此承担交互参照，视觉仍遵守同一套 token。[5][6][7][8]

## 组件如何直接复用

固定的上游版本：

- Supabase：`26585dd4a4d6db8910a595214c9f6e8fdd206768`。
- shadcn/ui：`2b3e6d4f8d9161fe5c19340dc383aade392012dd`。

| Flowtest 用途 | 组件来源 | 适配内容 |
| --- | --- | --- |
| 角色、版本、重试次数、断言类型 | shadcn Radix Select | 名称、空值转换、禁用条件；保留 portal、滚动边界、选中标记和键盘行为 |
| 项目、环境选择 | Supabase Combobox 示例 + shadcn Popover/Command | 环境项显示名称及主站域名；搜索、无结果、已选勾选与关闭后返回焦点 |
| 主按钮、次按钮、图标按钮 | shadcn Button 变体 | 统一尺寸及 loading/disabled；保留 submit 与链接语义 |
| 新建、保存版本、导入、确认 | shadcn Dialog / AlertDialog | 控制现有草稿保护流程；短表单居中，长设置按内容分区 |
| 长表单、窄屏导航 | 同体系 Sheet / Dialog primitives | 受控开关、可滚动内容、固定操作区、关闭时恢复焦点 |
| 行内更多、运行选项 | DropdownMenu / Popover | 菜单项真实调用原有动作；不通过裸 details 模拟菜单 |
| 图标提示 | Tooltip | hover 与键盘聚焦均可识别；按钮继续提供可访问名称 |

shadcn Select 的固定源码确实基于 `radix-ui`，含 Portal、ItemIndicator、滚动按钮与 open/closed 状态样式；Dialog 同样采用 Radix 的焦点和挂载机制。[9][10]

一个需要明确处理的版本差异：当前 shadcn 的 `/radix/combobox` 文档页面已经出现 `items / ComboboxInput` 接口并链接 Base UI；Supabase 固定版本示例仍是 Popover + Command/cmdk。实施使用已核实的组合源码，避免直接运行 latest 命令后无意混入另一套底层组件。[11][12]

复制或改造的组件应在项目中记录来源 URL、commit 和修改范围，保留对应许可。已核对 shadcn 为 MIT、Supabase 根许可证为 Apache-2.0；若具体文件带单独声明，应一并保留。[13][14]

## 布局与交互规格

以下尺寸是 Flowtest 的实施目标，除明确标记外，不宣称是某产品的原始设计数值。

**应用壳层。** 顶部只保留品牌、项目入口和账号动作。主导航集中为场景、运行记录、环境。大屏侧栏展示紧凑场景组树；在约 810px 的工作区中折叠为可访问的抽屉，不同时留下图标栏与树栏。当前页面标题和主要动作处于可预测位置。取消不提供用户决策价值的版本/执行器常驻页脚。

**场景入口。** 没有选中场景而已有数据时，以紧凑列表展示真实场景和组，点击打开原编辑器；不伪造成功率或最近运行状态。没有任何场景时显示一个明确的新建动作；搜索无匹配时保留列表结构并提供清除搜索。Supabase 的空态规范明确区分初始无数据与零搜索结果，避免加载和空态造成布局跳动。[15]

**环境选择。** 使用可搜索浮层，首行名称，次行主站域名；选中项以勾选标记。按钮、列表宽度和阴影统一。环境设置入口放在同一上下文附近。查看历史运行时展示其环境快照，不让当前环境选择器看起来能修改历史记录。

**场景编辑。** 版本、保存、录制和运行有明确主次。主操作使用同一种强调色，导入和更多选项降低权重。宽屏可显示源码与检查点分栏；空间不足时采用标签切换或纵向布局，保留编辑状态。仅标题变大或添加介绍卡片不能替代结构调整。

**运行详情。** 紧凑摘要后直接进入结果与证据。状态筛选、场景/测试/尝试列表和选中证据形成连续路径。断言仍明确显示预期与实际；场景和固定版本可见，原始事件放次级折叠区域。工件用类型、场景、版本和尝试识别，长目录名作为可展开或提示信息。跳过、重试后通过和未验证继续独立呈现，不能只显示绿色通过。

**环境配置。** 网站、API 基址、角色、变量、前置/后置请求按现有数据结构分区；普通输入、添加行、移除行、上传入口使用一致控件。敏感值仍只写入且不回显。长表单滚动时保存动作可达。Supabase 对短任务使用 Dialog、较长内容使用 Sheet，并以统一关闭入口处理脏表单；这与 Flowtest 已有草稿保护需要共同保留。[16]

## 颜色、文字与动效

| 项目 | 目标 |
| --- | --- |
| 画布与表面 | 浅中性色画布、略有区别的侧栏、白色工作表面；层级来自背景与间距，不是满屏描边 |
| 操作颜色 | 一种蓝色，用于主按钮、选中和焦点；普通图标采用中性色 |
| 状态颜色 | 红色失败、黄色需要注意、绿色已验证；必须同时有图标或文字 |
| 文字 | 正文 13–14px，辅助信息最低 12px，标题 16–20px；运行数字采用等宽数字 |
| 字体 | 统一无衬线，显式中文 fallback；代码保持等宽。验收实际浏览器中的中文渲染，不能只看 CSS 声明 |
| 间距 | 4/8/12/16/24px；控件默认 32–36px，紧凑列表约 32px；触屏下适当扩大目标 |
| 圆角 | 控件约 6px，浮层与面板约 8px；减少不同模块各自定义 |
| 图标 | 同一 Lucide SVG 图标集，常用 16px；图标按钮有 Tooltip 和 accessible name |
| 菜单动效 | 采用上游 open/closed fade/scale/方向位移模式，约 120–160ms 的目标时长 |
| 对话框与抽屉 | 采用上游状态驱动动效，目标约 180–200ms；避免业务页面整体滑入 |
| 减少动态效果 | `prefers-reduced-motion: reduce` 下关闭非必要缩放和位移；结果变化保持可感知的静态提示 |

本轮亲自操作 Supabase 的 Combobox 示例，验证了搜索 `svelte` 后按 Enter 选中、菜单关闭与焦点回到触发器。DOM 样式测得：触发器高 34px、字号 13px、圆角 6px；选项高 28px、字号 12px。浅色与深色浮层均已目视检查。这些是该示例在本次浏览器中的实际值，不要求逐像素锁死中文产品。

固定 shadcn Dialog 源码使用 `duration-200` 与 fade/zoom 状态类。Radix 官方支持 CSS 进入和退出动画，并在退出期间延迟卸载，因此不需要为常规菜单另外创建动画状态机。[10][17] Supabase 的颜色规范也区分画布、控件、浮层和多级文字，强调少量使用警告/错误强调色。[18]

## 实施与验收

先建立共享基础组件与语义 token，再调整壳层和各业务视图。每个旧选择器都必须经过迁移检查，不能只修截图中的环境菜单。引用原有状态/模型/请求函数，避免视觉重构改变业务行为。

| 验收面 | 必须看到的实际结果 |
| --- | --- |
| 810px 嵌入窗口 | 无重复导航；环境菜单完整可见；主要按钮不挤出；详情可阅读；侧栏可打开和关闭 |
| 1440px 桌面与 390px 手机 | 布局稳定，无页面级横向溢出；中文可读；长名称能截断并查看完整值 |
| 选择器与浮层 | 鼠标选择、搜索、键盘上下/Enter/Escape、选中态、关闭后焦点恢复；Dialog 内不发生 portal/focus 冲突 |
| 草稿与账号 | 保存、离开保护、会话过期重新登录继续编辑；原有 submit 与 pending 行为正确 |
| 真实运行 | 单场景、整组、原快照重跑和取消仍可操作；失败、未验证、跳过、重试证据保留 |
| 同名场景测试 | 步骤、断言、截图与 Trace 仍精确关联固定版本，不因布局变化丢失 |
| 动效 | 实际触发菜单、Dialog、抽屉进退场；减少动态效果设置下对应行为正确 |

复用当前 workbench、runs、groups 三条浏览器回归，并将原 `selectOption` 操作改成真实组件交互。增加约 810px 这一此前缺失的尺寸。视觉验收必须打开菜单、弹窗和有数据的页面；仅构建通过、测试截图存在或无溢出不能证明设计质量。最终保存新旧界面证据和变更来源表，交付实际页面。

## 来源与证据边界

访问与源码核对发生于 2026-09-13。Supabase 的浅/深色组件示例及搜索选择行为为实际浏览器观察；Postman、Checkly 的视觉结论来自官方发布截图。Playwright/Hoppscotch 交互结论来自官方文档和源码，并未登录它们的生产账号。设计 token、810px 断点和 Flowtest 页面安排属于本报告的实施判断。

1. Supabase. [Layout](https://supabase.com/design-system/docs/ui-patterns/layout).
2. Supabase. [Design System](https://supabase.com/design-system).
3. Supabase, Saxon Fletcher. [Supabase UI: Platform Kit](https://supabase.com/blog/supabase-ui-platform-kit), 2025-07-14.
4. Linear, Charlie Aufmann and Maxime Heckel. [A calmer interface for a product in motion](https://linear.app/now/behind-the-latest-design-refresh), 2026-03-12.
5. Microsoft. [Playwright UI mode](https://playwright.dev/docs/test-ui-mode), [Trace Viewer](https://playwright.dev/docs/trace-viewer), [测试树源码](https://github.com/microsoft/playwright/blob/main/packages/trace-viewer/src/ui/uiModeTestListView.tsx).
6. Postman. [Collection runs](https://learning.postman.com/docs/tests-and-scripts/running-collections/intro-to-collection-runs), [官方 v12 结果截图](https://assets.postman.com/postman-docs/v12/intro-to-collection-runs-debug-v12-01.png).
7. Hoppscotch. [环境选择器源码](https://github.com/hoppscotch/hoppscotch/blob/main/packages/hoppscotch-common/src/components/environments/Selector.vue), [集合与空态源码](https://github.com/hoppscotch/hoppscotch/blob/main/packages/hoppscotch-common/src/components/collections/MyCollections.vue), [Runner](https://docs.hoppscotch.io/documentation/features/runner).
8. Checkly. [Results](https://www.checklyhq.com/docs/concepts/results/), [Groups](https://www.checklyhq.com/docs/platform/groups/).
9. shadcn/ui. [固定版本 Select 源码](https://github.com/shadcn-ui/ui/blob/2b3e6d4f8d9161fe5c19340dc383aade392012dd/apps/v4/registry/new-york-v4/ui/select.tsx).
10. shadcn/ui. [固定版本 Dialog 源码](https://github.com/shadcn-ui/ui/blob/2b3e6d4f8d9161fe5c19340dc383aade392012dd/apps/v4/registry/new-york-v4/ui/dialog.tsx).
11. Supabase. [Combobox 示例固定源码](https://github.com/supabase/supabase/blob/26585dd4a4d6db8910a595214c9f6e8fdd206768/apps/design-system/registry/default/example/combobox-demo.tsx), [可交互示例](https://supabase.com/design-system/docs/components/combobox).
12. shadcn/ui. [当前 Combobox 文档](https://ui.shadcn.com/docs/components/radix/combobox), [Vite 接入](https://ui.shadcn.com/docs/installation/vite).
13. shadcn/ui. [固定版本 MIT 许可证](https://github.com/shadcn-ui/ui/blob/2b3e6d4f8d9161fe5c19340dc383aade392012dd/LICENSE.md).
14. Supabase. [固定版本 Apache-2.0 许可证](https://github.com/supabase/supabase/blob/26585dd4a4d6db8910a595214c9f6e8fdd206768/LICENSE).
15. Supabase. [Empty states](https://supabase.com/design-system/docs/ui-patterns/empty-states).
16. Supabase. [Modality](https://supabase.com/design-system/docs/ui-patterns/modality).
17. Radix. [Animation](https://www.radix-ui.com/primitives/docs/guides/animation).
18. Supabase. [Color usage](https://supabase.com/design-system/docs/color-usage), [Typography](https://supabase.com/design-system/docs/typography).
