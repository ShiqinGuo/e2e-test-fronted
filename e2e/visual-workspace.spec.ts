import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { createProject } from './helpers'

test.use({ deviceScaleFactor: 2 })

test('Linear 列表显示、筛选与窄屏布局', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await page.request.post('/api/auth/sign-up/email', {
    data: { name: '陈悦', email: `visual-${randomUUID()}@example.com`, password: `${randomUUID()}Aa9!` },
  })
  const project = await createProject(page.request, '订单服务')
  await page.request.patch(`/api/v1/organizations/${project.organizationId}`, {
    data: { name: 'Flowtest 团队' },
  })
  const base = `/api/v1/projects/${project.id}`
  const group = await (await page.request.post(`${base}/groups`, { data: { name: '核心交易流程' } })).json()
  for (const [name, description] of [
    ['提交订单', '填写商品信息后生成订单编号'],
    ['支付与确认', '订单支付成功后更新交易状态'],
    ['取消订单', '释放商品库存并关闭待支付订单'],
    ['优惠券抵扣', '核对优惠金额与订单实付金额'],
    ['申请退款', '完成退款后更新订单与支付记录'],
    ['访客访问边界', '未登录用户无法读取他人订单'],
  ]) {
    await page.request.post(`${base}/scenarios`, { data: { name, description, groupId: group.id } })
  }
  await page.goto(`/?project=${project.id}`)
  await expect(page.locator('.scenario-table-row')).toHaveCount(6)
  await page.screenshot({ animations: 'disabled', path: 'docs/screenshots/web/linear-list-1366.png' })
  await page.getByRole('button', { name: '显示', exact: true }).click()
  await expect(page.getByText('列表视图', { exact: true })).toBeVisible()
  await expect(page.locator('.display-popover')).toHaveCSS('opacity', '1')
  await page.screenshot({ animations: 'disabled', path: 'docs/screenshots/web/linear-display-1366.png' })
  await page.getByRole('combobox', { name: '排序', exact: true }).click()
  await page.getByRole('option', { name: '名称', exact: true }).click()
  const names = await page.locator('.scenario-table-row strong').allTextContents()
  expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'zh-CN')))
  await page.getByRole('button', { name: '场景描述', exact: true }).click()
  await expect(page.locator('.scenario-table-row small')).toHaveCount(0)
  await page.getByRole('button', { name: '最近更新', exact: true }).click()
  await expect(page.locator('.scenario-table-row time')).toHaveCount(0)
  await page.getByRole('combobox', { name: '分组方式', exact: true }).click()
  await page.getByRole('option', { name: '按测试组', exact: true }).click()
  await expect(page.getByRole('listbox')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(page.locator('.display-popover')).toHaveCount(0)
  await expect(page.locator('.scenario-section > header')).toContainText(['核心交易流程'])
  await page.getByRole('button', { name: '筛选', exact: true }).click()
  await page.getByRole('combobox', { name: '筛选测试组' }).click()
  await page.getByRole('option', { name: '核心交易流程', exact: true }).click()
  await page.keyboard.press('Escape')
  await page.getByRole('textbox', { name: '搜索场景' }).fill('订单')
  await expect(page.locator('.scenario-table-row')).toHaveCount(2)
  await page.getByRole('textbox', { name: '搜索场景' }).fill('不存在的场景')
  await expect(page.getByRole('heading', { name: '没有匹配的场景' })).toBeVisible()
  await page.getByRole('textbox', { name: '搜索场景' }).clear()
  await expect(page.locator('[data-slot=popover-content]')).toHaveCount(0)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByRole('button', { name: '切换导航' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
  await page.screenshot({ animations: 'disabled', path: 'docs/screenshots/web/linear-list-mobile.png' })
})
