import { randomUUID } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'

test('真实执行证据、混合结果、原快照重跑与取消', async ({ page }) => {
  test.setTimeout(300_000)
  const id = randomUUID().slice(0, 8)
  const api = page.request
  const signup = await api.post('/api/auth/sign-up/email', {
    data: { name: '运行证据验收', email: `runs-${id}@example.com`, password: `${randomUUID()}Aa8!` },
  })
  expect(signup.status()).toBe(201)
  const project = await (await api.post('/api/v1/projects', { data: { name: `运行验收-${id}` } })).json()
  const base = `/api/v1/projects/${project.id}`
  const environment = await (
    await api.post(`${base}/environments`, {
      data: {
        name: 'Fixture A 快照',
        websites: { main: 'http://host.docker.internal:18080/' },
        apiBases: { main: 'http://host.docker.internal:18080/' },
        variables: {},
        roles: [],
        setup: [],
        cleanup: [],
      },
    })
  ).json()
  const scenario = await (await api.post(`${base}/scenarios`, { data: { name: '订单和状态证据' } })).json()
  const code = `import { test, expect } from '@playwright/test';
test('订单页面和后台一致', async ({ page, platform }) => {
  const reference = 'run-' + Date.now();
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Order', exact: true }).fill(reference);
  await page.getByRole('button', { name: 'Submit order' }).click();
  await expect(page.locator('#result')).toHaveText(reference);
  await expect(page.locator('#order-id')).not.toBeEmpty();
  const id = await page.locator('#order-id').innerText();
  const response = await platform.api('main', '/orders/' + id);
  expect(response.status()).toBe(200);
  expect((await response.json()).reference).toBe(reference);
  const cleanup = await platform.api('main', '/orders/' + id, { method: 'DELETE' });
  expect(cleanup.status()).toBe(204);
});
test('只有操作', async ({ page }) => { await page.goto('/'); });
test.skip('明确跳过', async () => {});
test('重试后通过', async ({}, testInfo) => { expect(testInfo.retry).toBeGreaterThan(0); });
test('保留失败', async () => { expect('actual').toBe('expected'); });
`
  const version = await (
    await api.post(`${base}/scenarios/${scenario.id}/versions`, {
      data: { code, source: 'human', changeNote: '真实结果组合验收', checks: [] },
    })
  ).json()
  await page.goto(`/?project=${project.id}&scenario=${scenario.id}&environment=${environment.id}`)
  await page.getByRole('button', { name: '运行选项', exact: true }).click()
  await page.getByLabel('失败重试次数', { exact: true }).click()
  await page.getByRole('option', { name: '1 次', exact: true }).click()
  await page.getByRole('button', { name: '完成', exact: true }).click()
  await page.getByRole('button', { name: '运行', exact: true }).click()
  await expect(page.locator('.run-detail-header')).toBeVisible()
  await expect(page.locator('.run-detail-header').getByText('失败', { exact: true })).toBeVisible({
    timeout: 120_000,
  })
  const runId = new URL(page.url()).searchParams.get('run')!
  const run = await (await api.get(`${base}/runs/${runId}`)).json()
  expect(run.status).toBe('failed')
  expect(run.summary).toMatchObject({ total: 5, passed: 3, failed: 1, skipped: 1, flaky: 1, unverified: 1 })
  expect(run.verification).toBe('partial')
  await expect(page.locator('.run-detail-header').getByText('部分验证', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: '查看过程', exact: true })).toBeVisible({ timeout: 30_000 })
  await page.screenshot({ path: 'docs/screenshots/redesign/run-evidence.png', fullPage: true })
  const popupPromise = page.waitForEvent('popup')
  await page.getByRole('link', { name: '查看过程', exact: true }).click()
  const trace = await popupPromise
  await expect(trace).toHaveTitle(/Playwright Trace Viewer/, { timeout: 30_000 })
  await expect(trace.getByRole('treeitem').first()).toBeVisible({ timeout: 30_000 })
  await trace.screenshot({ path: 'docs/screenshots/redesign/trace-viewer.png', fullPage: true })
  await trace.close()
  await api.patch(`${base}/environments/${environment.id}`, {
    data: { name: '已改为 Fixture B', websites: { main: 'http://host.docker.internal:18081/' } },
  })
  await api.post(`${base}/scenarios/${scenario.id}/versions`, {
    data: {
      code: `import { test, expect } from '@playwright/test'; test('新版本', async () => { expect(true).toBe(true); });`,
      source: 'human',
      changeNote: '修改当前版本，验证重跑仍绑定旧版',
      checks: [],
    },
  })
  await page.getByRole('button', { name: '重新执行', exact: true }).click()
  await expect.poll(() => new URL(page.url()).searchParams.get('run')).not.toBe(runId)
  const rerunId = new URL(page.url()).searchParams.get('run')!
  const rerun = await (await api.get(`${base}/runs/${rerunId}`)).json()
  expect(rerun.sourceRunId || rerun.rerunOf).toBe(runId)
  expect(rerun.versions[0].id).toBe(version.id)
  expect(rerun.environmentSnapshot.websites.main).toBe('http://host.docker.internal:18080/')
  expect((await (await api.get(`${base}/runs/${runId}`)).json()).status).toBe('failed')
  await page.getByRole('button', { name: '取消运行', exact: true }).click()
  await expect(page.locator('.run-detail-header').getByText('已取消', { exact: true })).toBeVisible({
    timeout: 60_000,
  })
  await page.screenshot({ path: 'docs/screenshots/redesign/rerun-cancelled.png', fullPage: true })
  await writeFile(
    'docs/run-acceptance.json',
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        projectId: project.id,
        scenarioId: scenario.id,
        environmentId: environment.id,
        versionId: version.id,
        runId,
        status: run.status,
        verification: run.verification,
        summary: run.summary,
        rerunId,
        rerunSourceId: rerun.sourceRunId || rerun.rerunOf,
        rerunVersionId: rerun.versions[0].id,
        rerunWebsite: rerun.environmentSnapshot.websites.main,
        rerunCancelled: true,
        traceActionsVisible: true,
      },
      null,
      2,
    ),
  )
})
