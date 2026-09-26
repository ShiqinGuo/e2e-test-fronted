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

```

# Page snapshot

```yaml
- generic [ref=e4]:
  - complementary [ref=e5]:
    - generic [ref=e6]:
      - generic [ref=e7]:
        - combobox "选择组织" [ref=e13] [cursor=pointer]:
          - generic [ref=e14]: 协作验收-6ca5d5c1
        - button "创建组织" [ref=e15] [cursor=pointer]
      - generic [ref=e16]: 团队
      - navigation "主导航" [ref=e17]:
        - button "全部项目" [ref=e18] [cursor=pointer]
        - button "成员与权限" [ref=e19] [cursor=pointer]
      - generic [ref=e20]:
        - combobox "选择工作区" [ref=e21] [cursor=pointer]:
          - generic [ref=e22]: 默认工作区
        - button "新建工作区" [ref=e23] [cursor=pointer]
      - generic [ref=e24]:
        - text: 项目
        - button "创建项目" [ref=e25] [cursor=pointer]
      - button "前 前端验收-6ca5d5c1" [ref=e27] [cursor=pointer]:
        - generic [ref=e28]: 前
        - generic [ref=e29]: 前端验收-6ca5d5c1
      - generic [ref=e30]:
        - generic [ref=e31]: 前
        - generic [ref=e32]:
          - strong [ref=e33]: 前端浏览器验收
          - generic [ref=e34]: 所有者
        - button "退出登录" [ref=e35] [cursor=pointer]
  - main [ref=e36]:
    - generic [ref=e37]:
      - strong [ref=e39]: 前端验收-6ca5d5c1
      - navigation "项目导航" [ref=e40]:
        - button "业务场景" [ref=e41] [cursor=pointer]
        - button "运行记录" [ref=e42] [cursor=pointer]
        - button "环境" [ref=e43] [cursor=pointer]: 测试环境
    - region "业务场景列表" [ref=e45]:
      - generic [ref=e46]:
        - button "筛选" [ref=e47] [cursor=pointer]
        - textbox "搜索场景" [ref=e52]:
          - /placeholder: 搜索场景…
        - button "显示" [ref=e53] [cursor=pointer]
        - button "新建测试组" [active] [ref=e54] [cursor=pointer]
        - button "新建场景" [ref=e55] [cursor=pointer]
      - generic [ref=e57]:
        - generic [ref=e58]: 场景名称
        - generic [ref=e59]: 版本
        - generic [ref=e60]: 最近更新
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
> 56  |   await page.getByRole('button', { name: '在验收流程添加场景', exact: true }).click()
      |                                                                      ^ Error: locator.click: Test timeout of 90000ms exceeded.
  57  |   await page.getByLabel('名称', { exact: true }).fill('技术夹具检查')
  58  |   await page.getByRole('button', { name: '创建', exact: true }).click()
  59  |   await expect(page.getByRole('heading', { name: '技术夹具检查' })).toBeVisible()
  60  |   const source = page.locator('.cm-content[contenteditable="true"]').first()
  61  |   const initial = `import { test, expect } from '@playwright/test';\n\ntest('技术夹具', async ({ page }) => {\n  await page.goto('/');\n});\n`
  62  |   await source.fill(initial)
  63  |   await page.getByRole('button', { name: '保存新版本', exact: true }).click()
  64  |   await page.getByLabel('修改说明', { exact: true }).fill('浏览器创建首版')
  65  |   await page.getByRole('dialog').getByRole('button', { name: '保存新版本', exact: true }).click()
  66  |   await expect(page.getByLabel('场景版本')).toContainText('v1')
  67  |   await page.getByRole('button', { name: '检查点', exact: true }).click()
  68  |   await page.getByLabel('目标表达式').fill("page.getByRole('heading', { name: '技术夹具' })")
  69  |   await page.getByRole('button', { name: '插入源码', exact: true }).click()
  70  |   await showSource(page)
  71  |   await expect(source).toContainText('toBeVisible')
  72  |   await expect(page.getByText('未保存', { exact: true })).toBeVisible()
  73  |   const draftUrl = page.url()
  74  |   await page.goBack()
  75  |   await expect(page.getByRole('dialog', { name: '未保存的修改' })).toBeVisible()
  76  |   await page.getByRole('button', { name: '继续编辑', exact: true }).click()
  77  |   await expect(page).toHaveURL(draftUrl)
  78  |   await expect(source).toContainText('toBeVisible')
  79  |
  80  |   await page.getByRole('button', { name: '环境', exact: true }).click()
  81  |   await expect(page.getByRole('dialog', { name: '未保存的修改' })).toBeVisible()
  82  |   await page.getByRole('button', { name: '继续编辑', exact: true }).click()
  83  |   await showSource(page)
  84  |   await expect(source).toContainText('toBeVisible')
  85  |   await page.getByRole('button', { name: '保存新版本', exact: true }).click()
  86  |   await page.getByLabel('修改说明', { exact: true }).fill('通过面板增加真实断言')
  87  |   await page.screenshot({
  88  |     path: 'docs/screenshots/web/save-dialog.png',
  89  |     fullPage: true,
  90  |     animations: 'disabled',
  91  |   })
  92  |   await page.getByRole('dialog').getByRole('button', { name: '保存新版本', exact: true }).click()
  93  |   await expect(page.getByLabel('场景版本')).toContainText('v2')
  94  |   await page.getByRole('button', { name: '场景操作', exact: true }).click()
  95  |   const scenarioActions = page.getByRole('dialog', { name: '场景操作', exact: true })
  96  |   await expect(scenarioActions.getByRole('button', { name: '导入代码', exact: true })).toBeVisible()
  97  |   await expect(scenarioActions.getByRole('button', { name: '复用模块', exact: true })).toBeVisible()
  98  |   await page.screenshot({
  99  |     path: 'docs/screenshots/web/workbench-actions.png',
  100 |     fullPage: true,
  101 |     animations: 'disabled',
  102 |   })
  103 |   await scenarioActions.getByRole('button', { name: '版本差异', exact: true }).click()
  104 |   const versionDiff = page.getByRole('dialog', { name: '版本差异 · v1 → v2', exact: true })
  105 |   await expect(versionDiff.locator('tr.added')).toContainText('toBeVisible')
  106 |   await versionDiff.getByRole('button', { name: '关闭', exact: true }).click()
  107 |   await expect(page.getByRole('button', { name: '场景操作', exact: true })).toBeFocused()
  108 |   await page.screenshot({
  109 |     path: 'docs/screenshots/web/workbench.png',
  110 |     fullPage: true,
  111 |     animations: 'disabled',
  112 |   })
  113 |   await page.reload()
  114 |   await expect(page.getByRole('heading', { name: '技术夹具检查' })).toBeVisible()
  115 |   await expect(source).toContainText('toBeVisible')
  116 |   const preserved = (await source.innerText()) + '\n// session-recovery-draft'
  117 |   await source.fill(preserved)
  118 |   await page.request.post('/api/auth/sign-out', { data: {} })
  119 |   const saveTrigger = page.getByRole('button', { name: '保存新版本', exact: true })
  120 |   await saveTrigger.click()
  121 |   await page.getByLabel('修改说明', { exact: true }).fill('会话失效时保存不能自动重试')
  122 |   await page.getByRole('dialog').getByRole('button', { name: '保存新版本', exact: true }).click()
  123 |   await expect(page.getByRole('heading', { name: '登录工作台' })).toBeVisible()
  124 |   await page.getByLabel('密码', { exact: true }).fill(password)
  125 |   await page.getByRole('button', { name: '登录', exact: true }).click()
  126 |   await expect(page.getByRole('heading', { name: '登录工作台' })).toBeHidden()
  127 |   await page.getByRole('button', { name: '取消', exact: true }).click()
  128 |   await expect(saveTrigger).toBeFocused()
  129 |   await expect(source).toContainText('session-recovery-draft')
  130 |   await expect(page.getByText('未保存', { exact: true })).toBeVisible()
  131 |   await page.getByRole('button', { name: '保存新版本', exact: true }).click()
  132 |   await page.getByLabel('修改说明', { exact: true }).fill('会话恢复后保存草稿')
  133 |   await page.getByRole('dialog').getByRole('button', { name: '保存新版本', exact: true }).click()
  134 |   await expect(page.getByRole('dialog', { name: '保存新版本' })).toBeHidden()
  135 |   await expect(page.getByLabel('场景版本')).toContainText('v3')
  136 |   await page.setViewportSize({ width: 810, height: 1000 })
  137 |   const navigationTrigger = page.getByRole('button', { name: '切换导航', exact: true })
  138 |   await navigationTrigger.click()
  139 |   await expect(page.getByRole('dialog', { name: '工作区导航' })).toBeVisible()
  140 |   await page.screenshot({
  141 |     path: 'docs/screenshots/web/workbench-810-navigation.png',
  142 |     fullPage: true,
  143 |     animations: 'disabled',
  144 |   })
  145 |   await page.keyboard.press('Escape')
  146 |   await expect(page.getByRole('dialog', { name: '工作区导航' })).toBeHidden()
  147 |   await expect(navigationTrigger).toBeFocused()
  148 |   await showSource(page)
  149 |   await expect(page.getByRole('complementary', { name: '步骤与检查点' })).toBeHidden()
  150 |   await expect(source).toContainText('session-recovery-draft')
  151 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  152 |   await page.screenshot({
  153 |     path: 'docs/screenshots/web/workbench-810.png',
  154 |     fullPage: true,
  155 |     animations: 'disabled',
  156 |   })
```
