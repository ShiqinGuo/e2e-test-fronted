# 第三方 UI 来源与适配

本轮主视觉依据为 Supabase Studio Design System；Flowtest 的尺寸、颜色和响应式断点为本项目实施选择。实际 React primitives 复用固定版本的 shadcn/ui Radix 源码。研究依据见 [design-research.md](design-research.md)。

| 来源 | 固定版本与许可 | 本地文件 | 适配 |
| --- | --- | --- | --- |
| [shadcn/ui registry](https://github.com/shadcn-ui/ui/tree/2b3e6d4f8d9161fe5c19340dc383aade392012dd/apps/v4/registry/new-york-v4/ui) | `2b3e6d4f8d9161fe5c19340dc383aade392012dd` · MIT | 原文 `docs/upstream/shadcn/`；实现 `src/components/primitives/` | Button、Select、Dialog、Popover、Command、DropdownMenu、Tooltip、Input、Textarea、Sheet 共10文件。仅修正本地导入；具体调整见下文。 |
| [Supabase Combobox example](https://github.com/supabase/supabase/blob/26585dd4a4d6db8910a595214c9f6e8fdd206768/apps/design-system/registry/default/example/combobox-demo.tsx) | `26585dd4a4d6db8910a595214c9f6e8fdd206768` · Apache-2.0 | 原文 `docs/upstream/supabase/combobox-demo.tsx`；组合实现 `src/components/ui.tsx` 的 SearchSelect | 沿用 Popover + Command/cmdk 组合，替换演示数据与触发按钮，增加描述、禁用及会话挂起行为。 |

许可原文分别保存在 `docs/upstream/shadcn/LICENSE.md` 与 `docs/upstream/supabase/LICENSE`。上游原始文件未经过格式化或本地适配，便于逐项核对。

## 具体调整

- `cn` 是上游导入别名，映射到本地 `src/lib/utils.ts`，由 clsx 和 tailwind-merge 组合；没有安装名为 cn 的包。registry 组件互引改为相对路径。
- Button 默认与图标尺寸为34px。将 `transition-all` 收窄到颜色、边框、阴影和透明度，避免响应式 flex/width 也被动画，造成短暂挤空文字。
- Dialog、Sheet 关闭文案使用中文；Sheet进退场统一200ms。保留上游Radix portal、滚动、焦点范围与开关状态机制。
- SelectControl 将业务空值映射到内部哨兵值，保留 Radix Select 的键盘与选项标记；业务层12处原生选择器均已迁移。
- SearchSelect 保留 Radix 非模态 Popover 的外部点选焦点规则；只有会话挂起时阻止焦点恢复。整体 disabled 或 suspended 时关闭菜单并守卫选项回调。
- 受控 Modal 在关闭时记录外部焦点，覆盖创建表单 `autoFocus` 先于 Radix 开场焦点事件的情况；401重新登录期间保留原触发器。既有草稿保护流程保持不变。
- 共享 IconButton 基于 Button + Tooltip，继续保留 accessible name。短枚举使用 Select，项目/环境使用 SearchSelect，运行选项使用 Popover，窄屏导航使用 Sheet。
- Tailwind v4通过Vite官方插件接入。root保持16px；正文和表单13–14px，辅助信息至少12px。共享token、34px输入尺寸及菜单140ms/弹窗200ms在 `src/styles.css` 中统一。
- `prefers-reduced-motion: reduce` 禁用动画与过渡，保留定位所需的布局变换。浅灰边框与键盘焦点ring分开定义。

## 依赖与维护

实际版本锁定在 `package-lock.json`。本次新增 radix-ui、cmdk、class-variance-authority、clsx、tailwind-merge、tailwindcss、@tailwindcss/vite、tw-animate-css。未引入 Base UI、Supabase客户端、托管服务或远程字体。

升级时先比对固定原文与本地adaptation，再运行共享控件边界和真实业务回归；不直接使用latest命令覆盖现有组件。
