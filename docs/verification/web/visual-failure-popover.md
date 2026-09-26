# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workbench.spec.ts >> 真实会话、项目环境、场景版本与草稿保护
- Location: e2e\workbench.spec.ts:12:1

# Error details

```
Test timeout of 90000ms exceeded.
```

```
Error: locator.click: Test timeout of 90000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: '在验收流程添加场景', exact: true })
    - locator resolved to <button data-size="sm" data-slot="button" data-variant="ghost" aria-label="在验收流程添加场景" class="inline-flex shrink-0 items-center justify-center text-sm font-medium whitespace-nowrap transition-[background-color,color,border-color,box-shadow,opacity] duration-150 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&…>…</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div role="dialog" tabindex="-1" data-align="end" data-state="open" id="radix-_r_1q_" data-side="bottom" data-slot="popover-content" class="z-50 w-72 origin-(--radix-popover-content-transform-origin) rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-hidden data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 da…>…</div> from <div data-radix-popper-content-wrapper="">…</div> subtree intercepts pointer events
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div role="dialog" tabindex="-1" data-align="end" data-state="open" id="radix-_r_1q_" data-side="bottom" data-slot="popover-content" class="z-50 w-72 origin-(--radix-popover-content-transform-origin) rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-hidden data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 da…>…</div> from <div data-radix-popper-content-wrapper="">…</div> subtree intercepts pointer events
    - retrying click action
      - waiting 100ms
    136 × waiting for element to be visible, enabled and stable
        - element is visible, enabled and stable
        - scrolling into view if needed
        - done scrolling
        - <div role="dialog" tabindex="-1" data-align="end" data-state="open" id="radix-_r_1q_" data-side="bottom" data-slot="popover-content" class="z-50 w-72 origin-(--radix-popover-content-transform-origin) rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-hidden data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 da…>…</div> from <div data-radix-popper-content-wrapper="">…</div> subtree intercepts pointer events
      - retrying click action
        - waiting 500ms
  - element was detached from the DOM, retrying

```

# Page snapshot

```yaml
- generic [ref=f1e4]:
  - complementary [ref=f1e5]:
    - generic [ref=f1e6]:
      - generic [ref=f1e7]:
        - combobox "选择组织" [ref=f1e13] [cursor=pointer]:
          - generic [ref=f1e14]: 协作验收-8492b27b
        - button "创建组织" [ref=f1e15] [cursor=pointer]
      - generic [ref=f1e16]: 团队
      - navigation "主导航" [ref=f1e17]:
        - button "全部项目" [ref=f1e18] [cursor=pointer]
        - button "成员与权限" [ref=f1e19] [cursor=pointer]
      - generic [ref=f1e20]:
        - combobox "选择工作区" [ref=f1e21] [cursor=pointer]:
          - generic [ref=f1e22]: 默认工作区
        - button "新建工作区" [ref=f1e23] [cursor=pointer]
      - generic [ref=f1e24]:
        - text: 项目
        - button "创建项目" [ref=f1e25] [cursor=pointer]
      - button "前 前端验收-8492b27b" [ref=f1e27] [cursor=pointer]:
        - generic [ref=f1e28]: 前
        - generic [ref=f1e29]: 前端验收-8492b27b
      - generic [ref=f1e30]:
        - generic [ref=f1e31]: 前
        - generic [ref=f1e32]:
          - strong [ref=f1e33]: 前端浏览器验收
          - generic [ref=f1e34]: 所有者
        - button "退出登录" [ref=f1e35] [cursor=pointer]
  - main [ref=f1e36]:
    - generic [ref=f1e37]:
      - strong [ref=f1e39]: 前端验收-8492b27b
      - navigation "项目导航" [ref=f1e40]:
        - button "业务场景" [ref=f1e41] [cursor=pointer]
        - button "运行记录" [ref=f1e42] [cursor=pointer]
        - button "环境" [ref=f1e43] [cursor=pointer]: 测试环境
    - region "业务场景列表" [ref=f1e45]:
      - generic [ref=f1e46]:
        - button "筛选" [ref=f1e47] [cursor=pointer]
        - textbox "搜索场景" [ref=f1e52]:
          - /placeholder: 搜索场景…
        - button "显示" [ref=f1e53] [cursor=pointer]
        - button "新建测试组" [ref=f1e54] [cursor=pointer]
        - button "新建场景" [ref=f1e55] [cursor=pointer]
      - generic [ref=f1e57]:
        - generic [ref=f1e58]: 场景名称
        - generic [ref=f1e59]: 版本
        - generic [ref=f1e60]: 最近更新
```

# Test source

```ts
  1   | import { randomUUID } from 'node:crypto'
  2   | import { expect, test } from '@playwright/test'
  3   | import type { Page } from '@playwright/test'
  4   |
  5   | async function showSource(page: Page) {
  6   |   const viewSwitch = page.getByRole('group', { name: '编辑器视图' })
  7   |   if (await viewSwitch.isVisible())
  8   |     await viewSwitch.getByRole('button', { name: '源码', exact: true }).click()
  9   |   await expect(page.locator('.cm-content[contenteditable="true"]').first()).toBeVisible()
  10  | }
  11  |
  12  | test('真实会话、项目环境、场景版本与草稿保护', async ({ page }) => {
  13  |   const unique = randomUUID().slice(0, 8)
  14  |   const email = `front-${unique}@example.com`
  15  |   const password = `${randomUUID()}Aa7!`
  16  |   const projectName = `前端验收-${unique}`
  17  |   const errors: string[] = []
  18  |   page.on('pageerror', (error) => errors.push(error.message))
  19  |   await page.goto('/')
  20  |   await page.getByRole('button', { name: '创建账号', exact: true }).click()
  21  |   await page.getByLabel('姓名', { exact: true }).fill('前端浏览器验收')
  22  |   await page.getByLabel('邮箱', { exact: true }).fill(email)
  23  |   await page.getByLabel('密码', { exact: true }).fill(password)
  24  |   await page.getByRole('button', { name: '创建账号', exact: true }).click()
  25  |   await expect(page.getByRole('heading', { name: '建立你的团队工作区' })).toBeVisible()
  26  |   await page.getByRole('button', { name: '创建组织', exact: true }).last().click()
  27  |   await page.getByLabel('名称', { exact: true }).fill(`协作验收-${unique}`)
  28  |   await page.getByRole('button', { name: '创建', exact: true }).click()
  29  |   await expect(page.getByRole('heading', { name: '创建第一个项目' })).toBeVisible()
  30  |   await page.getByRole('button', { name: '创建项目', exact: true }).last().click()
  31  |   await page.getByLabel('名称', { exact: true }).fill(projectName)
  32  |   await page.screenshot({
  33  |     path: 'docs/screenshots/web/create-dialog.png',
  34  |     fullPage: true,
  35  |     animations: 'disabled',
  36  |   })
  37  |   await page.getByRole('button', { name: '创建', exact: true }).click()
  38  |   await expect(page.locator('.breadcrumbs')).toContainText(projectName)
  39  |   await page.getByRole('button', { name: '环境', exact: true }).click()
  40  |   await page.getByLabel('环境名称', { exact: true }).fill('浏览器验收环境')
  41  |   await page
  42  |     .getByLabel('网站 1 地址')
  43  |     .fill(process.env.TEST_WEBSITE_URL || 'http://host.docker.internal:18080/')
  44  |   await page.getByRole('button', { name: '保存环境', exact: true }).first().click()
  45  |   await expect(page.getByRole('status').filter({ hasText: '已保存' })).toBeVisible()
  46  |   await page.getByRole('button', { name: '返回工作台', exact: true }).click()
  47  |   const createGroupTrigger = page.getByRole('button', { name: '新建测试组', exact: true }).last()
  48  |   await createGroupTrigger.click()
  49  |   await page.getByLabel('名称', { exact: true }).fill('验收流程')
  50  |   await page.keyboard.press('Escape')
  51  |   await expect(page.getByRole('dialog', { name: '新建测试组', exact: true })).toBeHidden()
  52  |   await expect(createGroupTrigger).toBeFocused()
  53  |   await createGroupTrigger.click()
  54  |   await page.getByLabel('名称', { exact: true }).fill('验收流程')
  55  |   await page.getByRole('button', { name: '创建', exact: true }).click()
  56  |   await page.getByRole('button', { name: '显示', exact: true }).click()
  57  |   await page.getByRole('combobox', { name: '分组方式', exact: true }).click()
  58  |   await page.getByRole('option', { name: '按测试组', exact: true }).click()
  59  |   await page.keyboard.press('Escape')
> 60  |   await page.getByRole('button', { name: '在验收流程添加场景', exact: true }).click()
      |                                                                      ^ Error: locator.click: Test timeout of 90000ms exceeded.
  61  |   await page.getByLabel('名称', { exact: true }).fill('技术夹具检查')
  62  |   await page.getByRole('button', { name: '创建', exact: true }).click()
  63  |   await expect(page.getByRole('heading', { name: '技术夹具检查' })).toBeVisible()
  64  |   const source = page.locator('.cm-content[contenteditable="true"]').first()
  65  |   const initial = `import { test, expect } from '@playwright/test';\n\ntest('技术夹具', async ({ page }) => {\n  await page.goto('/');\n});\n`
  66  |   await source.fill(initial)
  67  |   await page.getByRole('button', { name: '保存新版本', exact: true }).click()
  68  |   await page.getByLabel('修改说明', { exact: true }).fill('浏览器创建首版')
  69  |   await page.getByRole('dialog').getByRole('button', { name: '保存新版本', exact: true }).click()
  70  |   await expect(page.getByLabel('场景版本')).toContainText('v1')
  71  |   await page.getByRole('button', { name: '检查点', exact: true }).click()
  72  |   await page.getByLabel('目标表达式').fill("page.getByRole('heading', { name: '技术夹具' })")
  73  |   await page.getByRole('button', { name: '插入源码', exact: true }).click()
  74  |   await showSource(page)
  75  |   await expect(source).toContainText('toBeVisible')
  76  |   await expect(page.getByText('未保存', { exact: true })).toBeVisible()
  77  |   const draftUrl = page.url()
  78  |   await page.goBack()
  79  |   await expect(page.getByRole('dialog', { name: '未保存的修改' })).toBeVisible()
  80  |   await page.getByRole('button', { name: '继续编辑', exact: true }).click()
  81  |   await expect(page).toHaveURL(draftUrl)
  82  |   await expect(source).toContainText('toBeVisible')
  83  |
  84  |   await page.getByRole('button', { name: '环境', exact: true }).click()
  85  |   await expect(page.getByRole('dialog', { name: '未保存的修改' })).toBeVisible()
  86  |   await page.getByRole('button', { name: '继续编辑', exact: true }).click()
  87  |   await showSource(page)
  88  |   await expect(source).toContainText('toBeVisible')
  89  |   await page.getByRole('button', { name: '保存新版本', exact: true }).click()
  90  |   await page.getByLabel('修改说明', { exact: true }).fill('通过面板增加真实断言')
  91  |   await page.screenshot({
  92  |     path: 'docs/screenshots/web/save-dialog.png',
  93  |     fullPage: true,
  94  |     animations: 'disabled',
  95  |   })
  96  |   await page.getByRole('dialog').getByRole('button', { name: '保存新版本', exact: true }).click()
  97  |   await expect(page.getByLabel('场景版本')).toContainText('v2')
  98  |   await page.getByRole('button', { name: '场景操作', exact: true }).click()
  99  |   const scenarioActions = page.getByRole('dialog', { name: '场景操作', exact: true })
  100 |   await expect(scenarioActions.getByRole('button', { name: '导入代码', exact: true })).toBeVisible()
  101 |   await expect(scenarioActions.getByRole('button', { name: '复用模块', exact: true })).toBeVisible()
  102 |   await page.screenshot({
  103 |     path: 'docs/screenshots/web/workbench-actions.png',
  104 |     fullPage: true,
  105 |     animations: 'disabled',
  106 |   })
  107 |   await scenarioActions.getByRole('button', { name: '版本差异', exact: true }).click()
  108 |   const versionDiff = page.getByRole('dialog', { name: '版本差异 · v1 → v2', exact: true })
  109 |   await expect(versionDiff.locator('tr.added')).toContainText('toBeVisible')
  110 |   await versionDiff.getByRole('button', { name: '关闭', exact: true }).click()
  111 |   await expect(page.getByRole('button', { name: '场景操作', exact: true })).toBeFocused()
  112 |   await page.screenshot({
  113 |     path: 'docs/screenshots/web/workbench.png',
  114 |     fullPage: true,
  115 |     animations: 'disabled',
  116 |   })
  117 |   await page.reload()
  118 |   await expect(page.getByRole('heading', { name: '技术夹具检查' })).toBeVisible()
  119 |   await expect(source).toContainText('toBeVisible')
  120 |   const preserved = (await source.innerText()) + '\n// session-recovery-draft'
  121 |   await source.fill(preserved)
  122 |   await page.request.post('/api/auth/sign-out', { data: {} })
  123 |   const saveTrigger = page.getByRole('button', { name: '保存新版本', exact: true })
  124 |   await saveTrigger.click()
  125 |   await page.getByLabel('修改说明', { exact: true }).fill('会话失效时保存不能自动重试')
  126 |   await page.getByRole('dialog').getByRole('button', { name: '保存新版本', exact: true }).click()
  127 |   await expect(page.getByRole('heading', { name: '登录工作台' })).toBeVisible()
  128 |   await page.getByLabel('密码', { exact: true }).fill(password)
  129 |   await page.getByRole('button', { name: '登录', exact: true }).click()
  130 |   await expect(page.getByRole('heading', { name: '登录工作台' })).toBeHidden()
  131 |   await page.getByRole('button', { name: '取消', exact: true }).click()
  132 |   await expect(saveTrigger).toBeFocused()
  133 |   await expect(source).toContainText('session-recovery-draft')
  134 |   await expect(page.getByText('未保存', { exact: true })).toBeVisible()
  135 |   await page.getByRole('button', { name: '保存新版本', exact: true }).click()
  136 |   await page.getByLabel('修改说明', { exact: true }).fill('会话恢复后保存草稿')
  137 |   await page.getByRole('dialog').getByRole('button', { name: '保存新版本', exact: true }).click()
  138 |   await expect(page.getByRole('dialog', { name: '保存新版本' })).toBeHidden()
  139 |   await expect(page.getByLabel('场景版本')).toContainText('v3')
  140 |   await page.setViewportSize({ width: 810, height: 1000 })
  141 |   const navigationTrigger = page.getByRole('button', { name: '切换导航', exact: true })
  142 |   await navigationTrigger.click()
  143 |   await expect(page.getByRole('dialog', { name: '工作区导航' })).toBeVisible()
  144 |   await page.screenshot({
  145 |     path: 'docs/screenshots/web/workbench-810-navigation.png',
  146 |     fullPage: true,
  147 |     animations: 'disabled',
  148 |   })
  149 |   await page.keyboard.press('Escape')
  150 |   await expect(page.getByRole('dialog', { name: '工作区导航' })).toBeHidden()
  151 |   await expect(navigationTrigger).toBeFocused()
  152 |   await showSource(page)
  153 |   await expect(page.getByRole('complementary', { name: '步骤与检查点' })).toBeHidden()
  154 |   await expect(source).toContainText('session-recovery-draft')
  155 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  156 |   await page.screenshot({
  157 |     path: 'docs/screenshots/web/workbench-810.png',
  158 |     fullPage: true,
  159 |     animations: 'disabled',
  160 |   })
```
