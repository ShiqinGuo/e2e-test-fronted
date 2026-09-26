# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workbench.spec.ts >> 真实会话、项目环境、场景版本与草稿保护
- Location: e2e\workbench.spec.ts:12:1

# Error details

```
Error: expect(locator).toBeHidden() failed

Locator:  getByRole('dialog', { name: '工作区导航' })
Expected: hidden
Received: visible
Timeout:  12000ms

Call log:
  - Expect "toBeHidden" getByRole('dialog', { name: '工作区导航' }) with timeout 12000ms
  - waiting for getByRole('dialog', { name: '工作区导航' })
    27 × locator resolved to <div role="dialog" tabindex="-1" id="radix-_r_4_" data-state="open" data-slot="sheet-content" aria-labelledby="radix-_r_5_" aria-describedby="radix-_r_6_" class="fixed z-50 flex flex-col gap-4 bg-background shadow-lg transition ease-in-out data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=open]:animate-in data-[state=open]:duration-200 inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm navigation-s…>…</div>
       - unexpected value "visible"

```

```yaml
- dialog "工作区导航":
  - heading "工作区导航" [level=2]
  - paragraph: 选择组织、工作区和项目
  - link "Flowtest":
    - /url: /
  - text: 组织
  - button "创建组织"
  - combobox "选择组织": 协作验收-06fde9fc
  - text: 工作区
  - button "新建工作区"
  - combobox "选择工作区": 默认工作区
  - navigation "主导航"
  - text: 项目
  - button "创建项目"
  - button "前 前端验收-06fde9fc"
  - text: 前
  - strong: 前端浏览器验收
  - text: 所有者
  - button "退出登录"
  - button "关闭导航"
```

# Test source

```ts
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
  56  |   await page.getByRole('button', { name: '在验收流程添加场景', exact: true }).click()
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
  73  |   await page.getByRole('button', { name: '环境', exact: true }).click()
  74  |   await expect(page.getByRole('dialog', { name: '未保存的修改' })).toBeVisible()
  75  |   await page.getByRole('button', { name: '继续编辑', exact: true }).click()
  76  |   await showSource(page)
  77  |   await expect(source).toContainText('toBeVisible')
  78  |   await page.getByRole('button', { name: '保存新版本', exact: true }).click()
  79  |   await page.getByLabel('修改说明', { exact: true }).fill('通过面板增加真实断言')
  80  |   await page.screenshot({
  81  |     path: 'docs/screenshots/web/save-dialog.png',
  82  |     fullPage: true,
  83  |     animations: 'disabled',
  84  |   })
  85  |   await page.getByRole('dialog').getByRole('button', { name: '保存新版本', exact: true }).click()
  86  |   await expect(page.getByLabel('场景版本')).toContainText('v2')
  87  |   await page.getByRole('button', { name: '场景操作', exact: true }).click()
  88  |   const scenarioActions = page.getByRole('dialog', { name: '场景操作', exact: true })
  89  |   await expect(scenarioActions.getByRole('button', { name: '导入代码', exact: true })).toBeVisible()
  90  |   await expect(scenarioActions.getByRole('button', { name: '复用模块', exact: true })).toBeVisible()
  91  |   await page.screenshot({
  92  |     path: 'docs/screenshots/web/workbench-actions.png',
  93  |     fullPage: true,
  94  |     animations: 'disabled',
  95  |   })
  96  |   await scenarioActions.getByRole('button', { name: '版本差异', exact: true }).click()
  97  |   const versionDiff = page.getByRole('dialog', { name: '版本差异 · v1 → v2', exact: true })
  98  |   await expect(versionDiff.locator('tr.added')).toContainText('toBeVisible')
  99  |   await versionDiff.getByRole('button', { name: '关闭', exact: true }).click()
  100 |   await expect(page.getByRole('button', { name: '场景操作', exact: true })).toBeFocused()
  101 |   await page.screenshot({
  102 |     path: 'docs/screenshots/web/workbench.png',
  103 |     fullPage: true,
  104 |     animations: 'disabled',
  105 |   })
  106 |   await page.reload()
  107 |   await expect(page.getByRole('heading', { name: '技术夹具检查' })).toBeVisible()
  108 |   await expect(source).toContainText('toBeVisible')
  109 |   const preserved = (await source.innerText()) + '\n// session-recovery-draft'
  110 |   await source.fill(preserved)
  111 |   await page.request.post('/api/auth/sign-out', { data: {} })
  112 |   const saveTrigger = page.getByRole('button', { name: '保存新版本', exact: true })
  113 |   await saveTrigger.click()
  114 |   await page.getByLabel('修改说明', { exact: true }).fill('会话失效时保存不能自动重试')
  115 |   await page.getByRole('dialog').getByRole('button', { name: '保存新版本', exact: true }).click()
  116 |   await expect(page.getByRole('heading', { name: '登录工作台' })).toBeVisible()
  117 |   await page.getByLabel('密码', { exact: true }).fill(password)
  118 |   await page.getByRole('button', { name: '登录', exact: true }).click()
  119 |   await expect(page.getByRole('heading', { name: '登录工作台' })).toBeHidden()
  120 |   await page.getByRole('button', { name: '取消', exact: true }).click()
  121 |   await expect(saveTrigger).toBeFocused()
  122 |   await expect(source).toContainText('session-recovery-draft')
  123 |   await expect(page.getByText('未保存', { exact: true })).toBeVisible()
  124 |   await page.getByRole('button', { name: '保存新版本', exact: true }).click()
  125 |   await page.getByLabel('修改说明', { exact: true }).fill('会话恢复后保存草稿')
  126 |   await page.getByRole('dialog').getByRole('button', { name: '保存新版本', exact: true }).click()
  127 |   await expect(page.getByRole('dialog', { name: '保存新版本' })).toBeHidden()
  128 |   await expect(page.getByLabel('场景版本')).toContainText('v3')
  129 |   await page.setViewportSize({ width: 810, height: 1000 })
  130 |   const navigationTrigger = page.getByRole('button', { name: '切换导航', exact: true })
  131 |   await navigationTrigger.click()
  132 |   await expect(page.getByRole('dialog', { name: '工作区导航' })).toBeVisible()
  133 |   await page.screenshot({
  134 |     path: 'docs/screenshots/web/workbench-810-navigation.png',
  135 |     fullPage: true,
  136 |     animations: 'disabled',
  137 |   })
  138 |   await page.keyboard.press('Escape')
> 139 |   await expect(page.getByRole('dialog', { name: '工作区导航' })).toBeHidden()
      |                                                             ^ Error: expect(locator).toBeHidden() failed
  140 |   await expect(navigationTrigger).toBeFocused()
  141 |   await showSource(page)
  142 |   await expect(page.getByRole('complementary', { name: '步骤与检查点' })).toBeHidden()
  143 |   await expect(source).toContainText('session-recovery-draft')
  144 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  145 |   await page.screenshot({
  146 |     path: 'docs/screenshots/web/workbench-810.png',
  147 |     fullPage: true,
  148 |     animations: 'disabled',
  149 |   })
  150 |   await page.getByRole('group', { name: '编辑器视图' }).getByRole('button', { name: /^步骤/ }).click()
  151 |   await expect(source).toBeHidden()
  152 |   await expect(page.getByRole('complementary', { name: '步骤与检查点' })).toBeVisible()
  153 |   await page.screenshot({
  154 |     path: 'docs/screenshots/web/workbench-810-steps.png',
  155 |     fullPage: true,
  156 |     animations: 'disabled',
  157 |   })
  158 |   await showSource(page)
  159 |   await expect(source).toContainText('session-recovery-draft')
  160 |   await page.getByRole('combobox', { name: '运行环境' }).click()
  161 |   await page.getByRole('combobox', { name: '搜索环境…' }).fill('浏览器验收环境')
  162 |   await expect(page.getByRole('option', { name: /浏览器验收环境/ })).toBeVisible()
  163 |   await page.screenshot({
  164 |     path: 'docs/screenshots/web/workbench-810-environment.png',
  165 |     fullPage: true,
  166 |     animations: 'disabled',
  167 |   })
  168 |   await page.getByRole('option', { name: /浏览器验收环境/ }).click()
  169 |   await expect(page.getByRole('combobox', { name: '运行环境' })).toBeFocused()
  170 |   await page.setViewportSize({ width: 390, height: 844 })
  171 |   await showSource(page)
  172 |   const environmentSelector = page.getByRole('combobox', { name: '运行环境' })
  173 |   await expect(environmentSelector).toContainText('浏览器验收环境')
  174 |   await expect
  175 |     .poll(() => environmentSelector.evaluate((element) => element.getBoundingClientRect().width))
  176 |     .toBeGreaterThan(100)
  177 |   await page.screenshot({
  178 |     path: 'docs/screenshots/web/workbench-mobile.png',
  179 |     fullPage: true,
  180 |     animations: 'disabled',
  181 |   })
  182 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  183 |   const runButton = page.getByRole('button', { name: '执行此版本', exact: true })
  184 |   await runButton.scrollIntoViewIfNeeded()
  185 |   expect(
  186 |     await runButton.evaluate((element) => {
  187 |       const rect = element.getBoundingClientRect()
  188 |       const top = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)
  189 |       return !!top && (top === element || element.contains(top))
  190 |     }),
  191 |   ).toBe(true)
  192 |   await page.getByRole('button', { name: '切换导航', exact: true }).click()
  193 |   await page
  194 |     .getByRole('dialog', { name: '工作区导航' })
  195 |     .getByRole('button', { name: '退出登录', exact: true })
  196 |     .click()
  197 |   await expect(page.getByRole('heading', { name: '登录工作台' })).toBeVisible()
  198 |   await page.getByLabel('邮箱', { exact: true }).fill(email)
  199 |   await page.getByLabel('密码', { exact: true }).fill(password)
  200 |   await page.getByRole('button', { name: '登录', exact: true }).click()
  201 |   await expect(page.getByRole('heading', { name: '登录工作台' })).toBeHidden()
  202 |   await page.getByRole('button', { name: '切换导航', exact: true }).click()
  203 |   await expect(
  204 |     page.getByRole('dialog', { name: '工作区导航' }).getByRole('button', { name: new RegExp(projectName) }),
  205 |   ).toContainText(projectName)
  206 |   expect(errors).toEqual([])
  207 | })
  208 |
```
