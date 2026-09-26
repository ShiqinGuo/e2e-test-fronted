import { expect, type APIRequestContext, type Page } from '@playwright/test'

export async function createProject(api: APIRequestContext, name: string) {
  const orgResponse = await api.post('/api/v1/organizations', { data: { name: `${name}组织` } })
  expect(orgResponse.status()).toBe(201)
  const organization = await orgResponse.json()
  const response = await api.post('/api/v1/projects', {
    data: { name, workspaceId: organization.defaultWorkspaceId },
  })
  expect(response.status()).toBe(201)
  return response.json()
}
export async function register(page: Page, email: string, password: string, name = '协作验收') {
  await page.getByRole('button', { name: '创建账号', exact: true }).click()
  await page.getByLabel('姓名', { exact: true }).fill(name)
  await page.getByLabel('邮箱', { exact: true }).fill(email)
  await page.getByLabel('密码', { exact: true }).fill(password)
  await page.getByRole('button', { name: '创建账号', exact: true }).click()
}
