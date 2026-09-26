import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { register } from './helpers'

test('组织创建、工作区隔离、邀请注册加入、角色变更与撤销访问', async ({ page, browser }, testInfo) => {
  test.setTimeout(180_000)
  const unique = randomUUID().slice(0, 8)
  const ownerEmail = `owner-${unique}@example.com`
  const invitedEmail = `viewer-${unique}@example.com`
  const password = `${randomUUID()}A7!`
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await register(page, ownerEmail, password, '组织验收负责人')
  await expect(page.getByRole('heading', { name: '建立你的团队工作区' })).toBeVisible()
  await page.getByRole('button', { name: '创建组织', exact: true }).last().click()
  await page.getByLabel('名称', { exact: true }).fill(`Flowtest 协作验收 ${unique}`)
  await page.getByRole('button', { name: '创建', exact: true }).click()
  await expect(page.getByRole('heading', { name: '创建第一个项目' })).toBeVisible()
  const orgId = new URL(page.url()).searchParams.get('organization')!
  const workspaceId = new URL(page.url()).searchParams.get('workspace')!
  await page.getByRole('button', { name: '创建项目', exact: true }).last().click()
  await page.getByLabel('名称', { exact: true }).fill('订单服务 · 协作验收')
  await page.getByLabel('备注（选填）').fill('组织协作与浏览器业务流程验收')
  await page.getByRole('button', { name: '创建', exact: true }).click()
  await expect(page.getByRole('heading', { name: '创建第一个业务场景' })).toBeVisible()
  const projectId = new URL(page.url()).searchParams.get('project')!
  const base = `/api/v1/projects/${projectId}`
  const scenario = await (
    await page.request.post(`${base}/scenarios`, { data: { name: '订单提交后展示编号' } })
  ).json()
  await page.request.post(`${base}/scenarios/${scenario.id}/versions`, {
    data: {
      code: "import { test, expect } from '@playwright/test';\ntest('订单提交', async ({ page }) => { await page.goto('/'); await expect(page).toHaveTitle('订单'); });",
      source: 'human',
      changeNote: '协作验收初版',
      checks: [],
    },
  })
  for (const name of [
    '登录过期后重新认证',
    '优惠券抵扣与订单总额',
    '取消订单后恢复库存',
    '退款后的订单状态',
    '访客无法查看他人订单',
  ]) {
    await page.request.post(`${base}/scenarios`, { data: { name } })
  }
  const environment = await (
    await page.request.post(`${base}/environments`, {
      data: { name: '预发布 · 订单服务', websites: { main: 'http://host.docker.internal:18080/' } },
    })
  ).json()
  const projectUrl = `/?organization=${orgId}&workspace=${workspaceId}&project=${projectId}`
  await page.goto(projectUrl)
  await expect(page.getByRole('button', { name: /订单提交后展示编号/ })).toBeVisible()
  await page.screenshot({ path: 'docs/screenshots/web/scenarios-1440.png', fullPage: true })
  await page.getByRole('button', { name: '新建工作区', exact: true }).click()
  await page.getByLabel('名称', { exact: true }).fill('移动产品组')
  await page.getByRole('button', { name: '创建', exact: true }).click()
  await expect(page.getByRole('heading', { name: '创建第一个项目' })).toBeVisible()
  const secondWorkspace = new URL(page.url()).searchParams.get('workspace')!
  expect(secondWorkspace).not.toBe(workspaceId)
  await expect(page.getByRole('button', { name: /订单服务 · 协作验收/ })).toHaveCount(0)
  await page.getByRole('combobox', { name: '选择工作区' }).click()
  await page.getByRole('option', { name: '默认工作区', exact: true }).click()
  await expect(page.getByRole('button', { name: /订单服务 · 协作验收/ }).first()).toBeVisible()
  await page.getByRole('button', { name: '成员与权限', exact: true }).click()
  await page.getByLabel('邀请邮箱').fill(invitedEmail)
  await page.getByLabel('加入角色').click()
  await page.getByRole('option', { name: '只读成员', exact: true }).click()
  await page.getByRole('button', { name: '生成邀请链接', exact: true }).click()
  const inviteUrl = await page.getByLabel('邀请链接').inputValue()
  expect(new URL(inviteUrl).pathname).toBe('/join')
  expect(new URL(inviteUrl).search).toBe('')
  expect(new URL(inviteUrl).hash).toMatch(/^#token=/)
  const guestContext = await browser.newContext({ baseURL: testInfo.project.use.baseURL })
  const guest = await guestContext.newPage()
  guest.on('pageerror', (error) => errors.push(error.message))
  await guest.goto(new URL(inviteUrl).pathname + new URL(inviteUrl).hash)
  await register(guest, invitedEmail, password, '只读协作者')
  await expect(guest.getByRole('heading', { name: '加入组织' })).toBeVisible()
  await guest.getByRole('button', { name: '接受邀请并加入', exact: true }).click()
  await expect(guest.getByRole('combobox', { name: '选择组织' })).toContainText(`Flowtest 协作验收 ${unique}`)
  const guestSession = await (await guest.request.get('/api/auth/get-session')).json()
  await guest.goto(`${projectUrl}&scenario=${scenario.id}&environment=${environment.id}`)
  await expect(guest.getByRole('heading', { name: '订单提交后展示编号' })).toBeVisible()
  await expect(guest.getByRole('button', { name: '保存新版本', exact: true })).toBeDisabled()
  await expect(guest.getByRole('button', { name: '执行此版本', exact: true })).toBeDisabled()
  await expect(guest.locator('.cm-content[contenteditable="true"]')).toHaveCount(0)
  expect(
    (await guest.request.post(`${base}/scenarios`, { data: { name: 'viewer 不可写入' } })).status(),
  ).toBe(403)
  await guest.getByRole('button', { name: '环境', exact: true }).click()
  await expect(guest.getByRole('button', { name: '保存环境', exact: true })).toBeDisabled()
  await expect(guest.getByLabel('环境名称', { exact: true })).toBeDisabled()
  await guest.getByRole('button', { name: '身份与变量', exact: true }).click()
  await expect(guest.getByRole('heading', { name: '角色', exact: true })).toBeVisible()
  await guest.getByRole('button', { name: '前置与清理', exact: true }).click()
  await expect(guest.locator('.cm-content[contenteditable="true"]')).toHaveCount(0)
  await page.reload()
  await expect(page.getByText(invitedEmail, { exact: true }).first()).toBeVisible()
  await page.getByRole('combobox', { name: `${invitedEmail} 的角色` }).click()
  await page.getByRole('option', { name: '成员', exact: true }).click()
  await expect(page.getByRole('combobox', { name: `${invitedEmail} 的角色` })).toContainText('成员')
  await page.screenshot({ path: 'docs/screenshots/web/members-1440.png', fullPage: true })
  await guest.goto(`${projectUrl}&scenario=${scenario.id}`)
  await expect(guest.getByRole('button', { name: '运行', exact: true })).toBeVisible()
  await expect(guest.locator('.cm-content[contenteditable="true"]')).toBeVisible()
  const ownerMembership = page.getByRole('combobox', { name: `${ownerEmail} 的角色` })
  await ownerMembership.click()
  await page.getByRole('option', { name: '成员', exact: true }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  expect((await (await page.request.get(`/api/v1/organizations/${orgId}`)).json()).role).toBe('owner')
  await page
    .locator('.member-row')
    .filter({ hasText: invitedEmail })
    .getByRole('button', { name: '移除', exact: true })
    .click()
  await page.getByRole('button', { name: '确认移除', exact: true }).click()
  await expect(page.locator('.member-row').filter({ hasText: invitedEmail })).toHaveCount(0)
  expect((await guest.request.get(base)).status()).toBe(404)
  await guest.reload()
  await expect(guest.getByRole('heading', { name: '建立你的团队工作区' })).toBeVisible()
  await guestContext.close()
  expect(guestSession.user.email).toBe(invitedEmail)
  expect(errors).toEqual([])
})

test('邀请邮箱不匹配可切换账号，撤销邀请不可加入', async ({ page, browser }, testInfo) => {
  const unique = randomUUID().slice(0, 8)
  const password = `${randomUUID()}A9!`
  await page.request.post('/api/auth/sign-up/email', {
    data: { name: '邀请边界', email: `invite-${unique}@example.com`, password },
  })
  const org = await (
    await page.request.post('/api/v1/organizations', { data: { name: `邀请边界-${unique}` } })
  ).json()
  const invitation = await (
    await page.request.post(`/api/v1/organizations/${org.id}/invitations`, {
      data: { email: `target-${unique}@example.com`, role: 'member' },
    })
  ).json()
  const context = await browser.newContext({ baseURL: testInfo.project.use.baseURL })
  const guest = await context.newPage()
  await guest.request.post('/api/auth/sign-up/email', {
    data: { name: '错误账号', email: `wrong-${unique}@example.com`, password },
  })
  const link = new URL(invitation.inviteUrl)
  await guest.goto(link.pathname + link.hash)
  await expect(guest.getByText('请使用受邀邮箱登录后接受邀请。')).toBeVisible()
  await expect(guest.getByRole('button', { name: '接受邀请并加入' })).toHaveCount(0)
  await guest.getByRole('button', { name: '切换账号', exact: true }).click()
  await register(guest, `target-${unique}@example.com`, password)
  await expect(guest.getByRole('button', { name: '接受邀请并加入' })).toBeVisible()
  await page.request.delete(`/api/v1/organizations/${org.id}/invitations/${invitation.invitation.id}`)
  await guest.getByRole('button', { name: '接受邀请并加入' }).click()
  await expect(guest.getByRole('alert')).toBeVisible()
  expect((await (await guest.request.get('/api/v1/organizations')).json()).items).toEqual([])
  await context.close()
})
