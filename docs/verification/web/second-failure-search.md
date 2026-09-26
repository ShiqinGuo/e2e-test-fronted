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
Error: locator.fill: Test timeout of 90000ms exceeded.
Call log:
  - waiting for getByRole('combobox', { name: '搜索环境…' })

```

# Page snapshot

```yaml
- main [ref=f2e5]:
  - generic [ref=f2e6]:
    - generic [ref=f2e7]:
      - button "切换导航" [ref=f2e8] [cursor=pointer]
      - generic [ref=f2e13]: 协作验收-2700c069
      - generic [ref=f2e16]: 默认工作区
      - strong [ref=f2e19]: 前端验收-2700c069
    - generic [ref=f2e20]: 团队工作台
  - navigation "项目导航" [ref=f2e22]:
    - button "业务场景" [ref=f2e23] [cursor=pointer]
    - button "运行记录" [ref=f2e24] [cursor=pointer]
    - button "环境" [ref=f2e25] [cursor=pointer]: 测试环境
  - generic [ref=f2e26]:
    - button "全部场景" [ref=f2e28] [cursor=pointer]
    - generic [ref=f2e29]:
      - generic [ref=f2e30]:
        - combobox "运行环境" [ref=f2e36] [cursor=pointer]:
          - generic [ref=f2e37]: 浏览器验收环境
        - button "管理环境" [ref=f2e38] [cursor=pointer]
        - combobox "运行角色" [ref=f2e39] [cursor=pointer]:
          - generic: 默认会话
      - generic [ref=f2e40]:
        - button "录制" [ref=f2e41] [cursor=pointer]
        - button "运行" [ref=f2e42] [cursor=pointer]
        - button "运行选项" [ref=f2e43] [cursor=pointer]
    - generic [ref=f2e44]:
      - generic [ref=f2e45]:
        - generic [ref=f2e46]:
          - generic [ref=f2e47]:
            - heading "技术夹具检查" [level=1] [ref=f2e54]
            - status [ref=f2e55]: 已保存
          - combobox "场景版本" [ref=f2e59] [cursor=pointer]:
            - generic: v3 · 会话恢复后保存草稿
        - generic [ref=f2e60]:
          - button "场景操作" [ref=f2e61] [cursor=pointer]
          - button "导入 Playwright 文件" [ref=f2e62]
          - button "执行此版本" [ref=f2e63] [cursor=pointer]
          - button "保存新版本" [disabled]
      - region "场景编辑器" [ref=f2e64]:
        - generic [ref=f2e65]:
          - group "编辑器视图" [ref=f2e66]:
            - button "源码" [pressed] [ref=f2e67] [cursor=pointer]
            - button "步骤 2" [ref=f2e68] [cursor=pointer]:
              - text: 步骤
              - generic [ref=f2e69]: "2"
          - button "检查点" [ref=f2e71] [cursor=pointer]
        - generic [ref=f2e73]:
          - generic "Playwright 场景源码" [ref=f2e74]:
            - generic [ref=f2e76]:
              - generic [aria-hidden] [ref=f2e77]:
                - generic [ref=f2e78]:
                  - generic [ref=f2e79]: "1"
                  - generic [ref=f2e80]: "2"
                  - generic [ref=f2e81]: "3"
                  - generic [ref=f2e82]: "4"
                  - generic [ref=f2e83]: "5"
                  - generic [ref=f2e84]: "6"
                  - generic [ref=f2e85]: "7"
                  - generic [ref=f2e86]: "8"
                  - generic [ref=f2e87]: "9"
                  - generic [ref=f2e88]: "10"
                - generic [ref=f2e89]: ⌄
              - textbox "Playwright 场景源码" [ref=f2e92]:
                - generic [ref=f2e93]: "import { test, expect } from '@playwright/test';"
                - generic [ref=f2e96]: "test('技术夹具', async ({ page }) => {"
                - generic [ref=f2e97]: await page.goto('/');
                - generic [ref=f2e98]: "await expect(page.getByRole('heading', { name: '技术夹具' })).toBeVisible();"
                - generic [ref=f2e99]: "});"
                - generic [ref=f2e102]: // session-recovery-draft
          - generic [ref=f2e103]: 源码为唯一数据源 · 未识别代码保留
```

# Test source

```ts
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
  157 |   await page.getByRole('group', { name: '编辑器视图' }).getByRole('button', { name: /^步骤/ }).click()
  158 |   await expect(source).toBeHidden()
  159 |   await expect(page.getByRole('complementary', { name: '步骤与检查点' })).toBeVisible()
  160 |   await page.screenshot({
  161 |     path: 'docs/screenshots/web/workbench-810-steps.png',
  162 |     fullPage: true,
  163 |     animations: 'disabled',
  164 |   })
  165 |   await showSource(page)
  166 |   await expect(source).toContainText('session-recovery-draft')
  167 |   await page.getByRole('combobox', { name: '运行环境' }).click()
> 168 |   await page.getByRole('combobox', { name: '搜索环境…' }).fill('浏览器验收环境')
      |                                                       ^ Error: locator.fill: Test timeout of 90000ms exceeded.
  169 |   await expect(page.getByRole('option', { name: /浏览器验收环境/ })).toBeVisible()
  170 |   await page.screenshot({
  171 |     path: 'docs/screenshots/web/workbench-810-environment.png',
  172 |     fullPage: true,
  173 |     animations: 'disabled',
  174 |   })
  175 |   await page.getByRole('option', { name: /浏览器验收环境/ }).click()
  176 |   await expect(page.getByRole('combobox', { name: '运行环境' })).toBeFocused()
  177 |   await page.setViewportSize({ width: 390, height: 844 })
  178 |   await showSource(page)
  179 |   const environmentSelector = page.getByRole('combobox', { name: '运行环境' })
  180 |   await expect(environmentSelector).toContainText('浏览器验收环境')
  181 |   await expect
  182 |     .poll(() => environmentSelector.evaluate((element) => element.getBoundingClientRect().width))
  183 |     .toBeGreaterThan(100)
  184 |   await page.screenshot({
  185 |     path: 'docs/screenshots/web/workbench-mobile.png',
  186 |     fullPage: true,
  187 |     animations: 'disabled',
  188 |   })
  189 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  190 |   const runButton = page.getByRole('button', { name: '执行此版本', exact: true })
  191 |   await runButton.scrollIntoViewIfNeeded()
  192 |   expect(
  193 |     await runButton.evaluate((element) => {
  194 |       const rect = element.getBoundingClientRect()
  195 |       const top = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)
  196 |       return !!top && (top === element || element.contains(top))
  197 |     }),
  198 |   ).toBe(true)
  199 |   await page.getByRole('button', { name: '切换导航', exact: true }).click()
  200 |   await page
  201 |     .getByRole('dialog', { name: '工作区导航' })
  202 |     .getByRole('button', { name: '退出登录', exact: true })
  203 |     .click()
  204 |   await expect(page.getByRole('heading', { name: '登录工作台' })).toBeVisible()
  205 |   await page.getByLabel('邮箱', { exact: true }).fill(email)
  206 |   await page.getByLabel('密码', { exact: true }).fill(password)
  207 |   await page.getByRole('button', { name: '登录', exact: true }).click()
  208 |   await expect(page.getByRole('heading', { name: '登录工作台' })).toBeHidden()
  209 |   await page.getByRole('button', { name: '切换导航', exact: true }).click()
  210 |   await expect(
  211 |     page.getByRole('dialog', { name: '工作区导航' }).getByRole('button', { name: new RegExp(projectName) }),
  212 |   ).toContainText(projectName)
  213 |   expect(errors).toEqual([])
  214 | })
  215 |
```
