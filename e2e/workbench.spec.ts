import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

async function showSource(page: Page) {
  const viewSwitch = page.getByRole('group', { name: '编辑器视图' })
  if (await viewSwitch.isVisible())
    await viewSwitch.getByRole('button', { name: '源码', exact: true }).click()
  await expect(page.locator('.cm-content[contenteditable="true"]').first()).toBeVisible()
}

test('真实会话、项目环境、场景版本与草稿保护', async ({ page }) => {
  const unique = randomUUID().slice(0, 8)
  const email = `front-${unique}@example.com`
  const password = `${randomUUID()}Aa7!`
  const projectName = `前端验收-${unique}`
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await page.getByRole('button', { name: '创建账号', exact: true }).click()
  await page.getByLabel('姓名', { exact: true }).fill('前端浏览器验收')
  await page.getByLabel('邮箱', { exact: true }).fill(email)
  await page.getByLabel('密码', { exact: true }).fill(password)
  await page.getByRole('button', { name: '创建账号', exact: true }).click()
  await expect(page.getByRole('heading', { name: '建立你的团队工作区' })).toBeVisible()
  await page.getByRole('button', { name: '创建组织', exact: true }).last().click()
  await page.getByLabel('名称', { exact: true }).fill(`协作验收-${unique}`)
  await page.getByRole('button', { name: '创建', exact: true }).click()
  await expect(page.getByRole('heading', { name: '创建第一个项目' })).toBeVisible()
  await page.getByRole('button', { name: '创建项目', exact: true }).last().click()
  await page.getByLabel('名称', { exact: true }).fill(projectName)
  await page.screenshot({
    path: 'docs/screenshots/web/create-dialog.png',
    fullPage: true,
    animations: 'disabled',
  })
  await page.getByRole('button', { name: '创建', exact: true }).click()
  await expect(page.locator('.breadcrumbs')).toContainText(projectName)
  await page.getByRole('button', { name: '环境', exact: true }).click()
  await page.getByLabel('环境名称', { exact: true }).fill('浏览器验收环境')
  await page
    .getByLabel('网站 1 地址')
    .fill(process.env.TEST_WEBSITE_URL || 'http://host.docker.internal:18080/')
  await page.getByRole('button', { name: '保存环境', exact: true }).first().click()
  await expect(page.getByRole('status').filter({ hasText: '已保存' })).toBeVisible()
  await page.getByRole('button', { name: '返回工作台', exact: true }).click()
  const createGroupTrigger = page.getByRole('button', { name: '新建测试组', exact: true }).last()
  await createGroupTrigger.click()
  await page.getByLabel('名称', { exact: true }).fill('验收流程')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: '新建测试组', exact: true })).toBeHidden()
  await expect(createGroupTrigger).toBeFocused()
  await createGroupTrigger.click()
  await page.getByLabel('名称', { exact: true }).fill('验收流程')
  await page.getByRole('button', { name: '创建', exact: true }).click()
  await page.getByRole('button', { name: '显示', exact: true }).click()
  await page.getByRole('combobox', { name: '分组方式', exact: true }).click()
  await page.getByRole('option', { name: '按测试组', exact: true }).click()
  await expect(page.getByRole('listbox')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(page.locator('.display-popover')).toHaveCount(0)
  await page.getByRole('button', { name: '在验收流程添加场景', exact: true }).click()
  await page.getByLabel('名称', { exact: true }).fill('技术夹具检查')
  await page.getByRole('button', { name: '创建', exact: true }).click()
  await expect(page.getByRole('heading', { name: '技术夹具检查' })).toBeVisible()
  const source = page.locator('.cm-content[contenteditable="true"]').first()
  const initial = `import { test, expect } from '@playwright/test';\n\ntest('技术夹具', async ({ page }) => {\n  await page.goto('/');\n});\n`
  await source.fill(initial)
  await page.getByRole('button', { name: '保存新版本', exact: true }).click()
  await page.getByLabel('修改说明', { exact: true }).fill('浏览器创建首版')
  await page.getByRole('dialog').getByRole('button', { name: '保存新版本', exact: true }).click()
  await expect(page.getByLabel('场景版本')).toContainText('v1')
  await page.getByRole('button', { name: '检查点', exact: true }).click()
  await page.getByLabel('目标表达式').fill("page.getByRole('heading', { name: '技术夹具' })")
  await page.getByRole('button', { name: '插入源码', exact: true }).click()
  await showSource(page)
  await expect(source).toContainText('toBeVisible')
  await expect(page.getByText('未保存', { exact: true })).toBeVisible()
  const draftUrl = page.url()
  await page.goBack()
  await expect(page.getByRole('dialog', { name: '未保存的修改' })).toBeVisible()
  await page.getByRole('button', { name: '继续编辑', exact: true }).click()
  await expect(page).toHaveURL(draftUrl)
  await expect(source).toContainText('toBeVisible')

  await page.getByRole('button', { name: '环境', exact: true }).click()
  await expect(page.getByRole('dialog', { name: '未保存的修改' })).toBeVisible()
  await page.getByRole('button', { name: '继续编辑', exact: true }).click()
  await showSource(page)
  await expect(source).toContainText('toBeVisible')
  await page.getByRole('button', { name: '保存新版本', exact: true }).click()
  await page.getByLabel('修改说明', { exact: true }).fill('通过面板增加真实断言')
  await page.screenshot({
    path: 'docs/screenshots/web/save-dialog.png',
    fullPage: true,
    animations: 'disabled',
  })
  await page.getByRole('dialog').getByRole('button', { name: '保存新版本', exact: true }).click()
  await expect(page.getByLabel('场景版本')).toContainText('v2')
  await page.getByRole('button', { name: '场景操作', exact: true }).click()
  const scenarioActions = page.getByRole('dialog', { name: '场景操作', exact: true })
  await expect(scenarioActions.getByRole('button', { name: '导入代码', exact: true })).toBeVisible()
  await expect(scenarioActions.getByRole('button', { name: '复用模块', exact: true })).toBeVisible()
  await page.screenshot({
    path: 'docs/screenshots/web/workbench-actions.png',
    fullPage: true,
    animations: 'disabled',
  })
  await scenarioActions.getByRole('button', { name: '版本差异', exact: true }).click()
  const versionDiff = page.getByRole('dialog', { name: '版本差异 · v1 → v2', exact: true })
  await expect(versionDiff.locator('tr.added')).toContainText('toBeVisible')
  await versionDiff.getByRole('button', { name: '关闭', exact: true }).click()
  await expect(page.getByRole('button', { name: '场景操作', exact: true })).toBeFocused()
  await page.screenshot({
    path: 'docs/screenshots/web/workbench.png',
    fullPage: true,
    animations: 'disabled',
  })
  await page.reload()
  await expect(page.getByRole('heading', { name: '技术夹具检查' })).toBeVisible()
  await expect(source).toContainText('toBeVisible')
  const preserved = (await source.innerText()) + '\n// session-recovery-draft'
  await source.fill(preserved)
  await page.request.post('/api/auth/sign-out', { data: {} })
  const saveTrigger = page.getByRole('button', { name: '保存新版本', exact: true })
  await saveTrigger.click()
  await page.getByLabel('修改说明', { exact: true }).fill('会话失效时保存不能自动重试')
  await page.getByRole('dialog').getByRole('button', { name: '保存新版本', exact: true }).click()
  await expect(page.getByRole('heading', { name: '登录工作台' })).toBeVisible()
  await page.getByLabel('密码', { exact: true }).fill(password)
  await page.getByRole('button', { name: '登录', exact: true }).click()
  await expect(page.getByRole('heading', { name: '登录工作台' })).toBeHidden()
  await page.getByRole('button', { name: '取消', exact: true }).click()
  await expect(saveTrigger).toBeFocused()
  await expect(source).toContainText('session-recovery-draft')
  await expect(page.getByText('未保存', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '保存新版本', exact: true }).click()
  await page.getByLabel('修改说明', { exact: true }).fill('会话恢复后保存草稿')
  await page.getByRole('dialog').getByRole('button', { name: '保存新版本', exact: true }).click()
  await expect(page.getByRole('dialog', { name: '保存新版本' })).toBeHidden()
  await expect(page.getByLabel('场景版本')).toContainText('v3')
  await page.setViewportSize({ width: 810, height: 1000 })
  const navigationTrigger = page.getByRole('button', { name: '切换导航', exact: true })
  await navigationTrigger.click()
  await expect(page.getByRole('dialog', { name: '工作区导航' })).toBeVisible()
  await page.screenshot({
    path: 'docs/screenshots/web/workbench-810-navigation.png',
    fullPage: true,
    animations: 'disabled',
  })
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: '工作区导航' })).toBeHidden()
  await expect(navigationTrigger).toBeFocused()
  await showSource(page)
  await expect(page.getByRole('complementary', { name: '步骤与检查点' })).toBeHidden()
  await expect(source).toContainText('session-recovery-draft')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({
    path: 'docs/screenshots/web/workbench-810.png',
    fullPage: true,
    animations: 'disabled',
  })
  await page.getByRole('group', { name: '编辑器视图' }).getByRole('button', { name: /^步骤/ }).click()
  await expect(source).toBeHidden()
  await expect(page.getByRole('complementary', { name: '步骤与检查点' })).toBeVisible()
  await page.screenshot({
    path: 'docs/screenshots/web/workbench-810-steps.png',
    fullPage: true,
    animations: 'disabled',
  })
  await showSource(page)
  await expect(source).toContainText('session-recovery-draft')
  await page.getByRole('combobox', { name: '运行环境' }).click()
  await page.getByRole('combobox', { name: '搜索环境…' }).fill('浏览器验收环境')
  await expect(page.getByRole('option', { name: /浏览器验收环境/ })).toBeVisible()
  await page.screenshot({
    path: 'docs/screenshots/web/workbench-810-environment.png',
    fullPage: true,
    animations: 'disabled',
  })
  await page.getByRole('option', { name: /浏览器验收环境/ }).click()
  await expect(page.getByRole('combobox', { name: '运行环境' })).toBeFocused()
  await page.setViewportSize({ width: 390, height: 844 })
  await showSource(page)
  const environmentSelector = page.getByRole('combobox', { name: '运行环境' })
  await expect(environmentSelector).toContainText('浏览器验收环境')
  await expect
    .poll(() => environmentSelector.evaluate((element) => element.getBoundingClientRect().width))
    .toBeGreaterThan(100)
  await page.screenshot({
    path: 'docs/screenshots/web/workbench-mobile.png',
    fullPage: true,
    animations: 'disabled',
  })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const runButton = page.getByRole('button', { name: '执行此版本', exact: true })
  await runButton.scrollIntoViewIfNeeded()
  expect(
    await runButton.evaluate((element) => {
      const rect = element.getBoundingClientRect()
      const top = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)
      return !!top && (top === element || element.contains(top))
    }),
  ).toBe(true)
  await page.reload()
  await showSource(page)
  await expect(source).toContainText('session-recovery-draft')
  await source.fill((await source.innerText()) + '\n// discard-navigation-draft')
  await page.goBack()
  await expect(page.getByRole('dialog', { name: '未保存的修改' })).toBeVisible()
  await page.getByRole('button', { name: '放弃草稿并继续', exact: true }).click()
  await expect(page.getByRole('heading', { name: '技术夹具检查', exact: true })).toBeHidden()
  await page.goForward()
  await expect(page.getByRole('heading', { name: '技术夹具检查', exact: true })).toBeVisible()
  await showSource(page)
  await expect(source).toContainText('session-recovery-draft')
  await expect(source).not.toContainText('discard-navigation-draft')
  await page.getByRole('button', { name: '切换导航', exact: true }).click()
  await page
    .getByRole('dialog', { name: '工作区导航' })
    .getByRole('button', { name: '退出登录', exact: true })
    .click()
  await expect(page.getByRole('heading', { name: '登录工作台' })).toBeVisible()
  await page.getByLabel('邮箱', { exact: true }).fill(email)
  await page.getByLabel('密码', { exact: true }).fill(password)
  await page.getByRole('button', { name: '登录', exact: true }).click()
  await expect(page.getByRole('heading', { name: '登录工作台' })).toBeHidden()
  await page.getByRole('button', { name: '切换导航', exact: true }).click()
  await expect(
    page.getByRole('dialog', { name: '工作区导航' }).getByRole('button', { name: new RegExp(projectName) }),
  ).toContainText(projectName)
  expect(errors).toEqual([])
})
