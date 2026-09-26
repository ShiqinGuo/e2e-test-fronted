import { createProject } from './helpers'
import { randomUUID } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import type { Run, RunArtifact, RunEvent } from '../src/types'

test('真实 Web 分组执行固化两个独立场景并保留各自证据', async ({ page }) => {
  test.setTimeout(180_000)
  const unique = randomUUID().slice(0, 8)
  const api = page.request
  const signup = await api.post('/api/auth/sign-up/email', {
    data: { name: '分组运行验收', email: `group-${unique}@example.com`, password: `${randomUUID()}Aa9!` },
  })
  expect(signup.status()).toBe(201)
  const project = await createProject(api, `分组验收-${unique}`)
  const base = `/api/v1/projects/${project.id}`
  const environment = await (
    await api.post(`${base}/environments`, {
      data: {
        name: '订单技术夹具 A',
        websites: { main: 'http://host.docker.internal:18080/' },
        apiBases: { main: 'http://host.docker.internal:18080/' },
        variables: {},
        roles: [],
        setup: [],
        cleanup: [],
      },
    })
  ).json()
  const group = await (await api.post(`${base}/groups`, { data: { name: '订单业务流程' } })).json()
  const scenarios: { id: string; name: string; versionId: string; code: string; testTitle: string }[] = []
  const definitions = [
    {
      name: '创建订单并查询',
      testTitle: 'test',
      suffix: 'create',
      final: `
  const found = await platform.api('main', '/orders/' + orderId);
  expect(found.status()).toBe(200);
  expect((await found.json()).reference).toBe(reference);
  const removed = await platform.api('main', '/orders/' + orderId, { method: 'DELETE' });
  expect(removed.status()).toBe(204);`,
    },
    {
      name: '删除订单后确认不存在',
      testTitle: 'test',
      suffix: 'delete',
      final: `
  const removed = await platform.api('main', '/orders/' + orderId, { method: 'DELETE' });
  expect(removed.status()).toBe(204);
  const missing = await platform.api('main', '/orders/' + orderId);
  expect(missing.status()).toBe(404);`,
    },
  ]
  for (const definition of definitions) {
    const scenario = await (
      await api.post(`${base}/scenarios`, { data: { name: definition.name, groupId: group.id } })
    ).json()
    const code = `import { test, expect } from '@playwright/test';
test('${definition.testTitle}', async ({ page, platform }) => {
  const reference = 'group-${unique}-${definition.suffix}';
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Order', exact: true }).fill(reference);
  await page.getByRole('button', { name: 'Submit order' }).click();
  await expect(page.locator('#result')).toHaveText(reference);
  await expect(page.locator('#order-id')).not.toBeEmpty();
  const orderId = await page.locator('#order-id').innerText();${definition.final}
});
`
    const response = await api.post(`${base}/scenarios/${scenario.id}/versions`, {
      data: { code, source: 'ai', changeNote: '独立场景的真实分组运行验收', checks: [] },
    })
    expect(response.status()).toBe(201)
    const version = await response.json()
    scenarios.push({
      id: scenario.id,
      name: definition.name,
      versionId: version.id,
      code,
      testTitle: definition.testTitle,
    })
  }

  await page.goto(`/?project=${project.id}&scenario=${scenarios[0].id}&environment=${environment.id}`)
  await expect(page.getByRole('heading', { name: scenarios[0].name, exact: true })).toBeVisible()
  await page.getByRole('button', { name: '运行选项', exact: true }).click()
  await page.getByLabel('运行测试组', { exact: true }).click()
  await page.getByRole('option', { name: group.name, exact: true }).click()
  const submissionPromise = page.waitForRequest(
    (request) => request.method() === 'POST' && new URL(request.url()).pathname === `${base}/runs`,
  )
  await page.getByRole('button', { name: '运行整组', exact: true }).click()
  const submittedBody = (await submissionPromise).postDataJSON()
  expect(submittedBody).toEqual({ groupId: group.id, environmentId: environment.id, retries: 0 })
  await expect(page.locator('.run-detail-header').getByText('通过', { exact: true })).toBeVisible({
    timeout: 120_000,
  })
  const runId = new URL(page.url()).searchParams.get('run')!
  const run: Run = await (await api.get(`${base}/runs/${runId}`)).json()
  expect(run.groupId).toBe(group.id)
  expect(run.scenarioId).toBeNull()
  expect(run.status).toBe('passed')
  expect(run.verification).toBe('verified')
  expect(run.summary).toEqual({ total: 2, passed: 2, failed: 0, skipped: 0, flaky: 0, unverified: 0 })
  expect(run.versions).toHaveLength(2)
  for (const scenario of scenarios) {
    expect(run.versions.find((version) => version.scenarioId === scenario.id)).toMatchObject({
      id: scenario.versionId,
      code: scenario.code,
    })
  }
  await expect(page.locator('.run-meta')).toContainText(`分组 ${group.id.slice(0, 8)}`)
  await expect(page.locator('.run-detail-header')).toContainText('断言已验证')
  await page.screenshot({ path: 'docs/screenshots/web/group-run-summary.png', fullPage: false })

  const events: RunEvent[] = []
  let after = 0
  while (true) {
    const batch = await (await api.get(`${base}/runs/${runId}/events?after=${after}&limit=100`)).json()
    events.push(...batch.items)
    if (batch.items.length < 100 || batch.nextAfter <= after) break
    after = batch.nextAfter
  }
  const artifacts: RunArtifact[] = (await (await api.get(`${base}/runs/${runId}/artifacts?limit=100`)).json())
    .items
  const evidence = []
  for (const [index, scenario] of scenarios.entries()) {
    const begin = events.find((event) => event.type === 'test.begin' && event.data.scenarioId === scenario.id)
    expect(begin).toBeDefined()
    expect(begin!.data.versionId).toBe(scenario.versionId)
    const testId = begin!.data.testId
    const end = events.find((event) => event.type === 'test.end' && event.data.testId === testId)
    expect(end?.data.status).toBe('passed')
    const assertions = events.filter((event) => event.type === 'assertion' && event.data.testId === testId)
    expect(assertions.length).toBeGreaterThanOrEqual(4)
    expect(assertions.every((event) => event.data.status === 'passed')).toBe(true)
    const attachments = end!.data.attachments as { path?: string; name: string }[]
    const sceneArtifacts = artifacts.filter((artifact) =>
      attachments.some((attachment) => attachment.path?.replace(/^artifacts\//, '') === artifact.name),
    )
    expect(sceneArtifacts.some((artifact) => artifact.kind === 'trace')).toBe(true)
    expect(sceneArtifacts.some((artifact) => artifact.kind === 'screenshot')).toBe(true)
    const firstStep = events.find((event) => event.type === 'step.begin' && event.data.testId === testId)!
    for (const event of [begin!, firstStep]) {
      await page
        .locator('.run-event-list button')
        .filter({
          has: page.locator('.run-sequence', { hasText: new RegExp(`^${event.seq}$`) }),
        })
        .click()
      const identity = page
        .getByRole('region', { name: `事件 ${event.seq} 详情`, exact: true })
        .getByLabel('证据归属')
      await expect(identity).toContainText(scenario.name)
      await expect(identity).toContainText(scenario.versionId.slice(0, 8))
    }
    await page
      .locator('.run-event-list button')
      .filter({
        has: page.locator('.run-sequence', { hasText: new RegExp(`^${end!.seq}$`) }),
      })
      .click()
    const endDetail = page.getByRole('region', { name: `事件 ${end!.seq} 详情`, exact: true })
    await expect(endDetail).toContainText(scenario.testTitle)
    await expect(endDetail.getByLabel('证据归属')).toContainText(scenario.name)
    await expect(endDetail.getByLabel('证据归属')).toContainText(scenario.versionId.slice(0, 8))
    for (const artifact of sceneArtifacts) await expect(endDetail).toContainText(artifact.name)
    const assertion = assertions.at(-1)!
    const eventButton = page
      .locator('.run-event-list button')
      .filter({ has: page.locator('.run-sequence', { hasText: new RegExp(`^${assertion.seq}$`) }) })
    await eventButton.click()
    const detail = page.getByRole('region', { name: `事件 ${assertion.seq} 详情`, exact: true })
    await expect(detail).toContainText(scenario.testTitle)
    await expect(detail).toContainText(scenario.versionId)
    await expect(detail.getByLabel('证据归属')).toContainText(scenario.name)
    await expect(detail.getByLabel('证据归属')).toContainText(`固定版本：v1`)
    await expect(detail.getByLabel('证据归属')).toContainText(scenario.versionId.slice(0, 8))
    await expect(detail.getByLabel('期望与实际结果')).toBeVisible()
    await detail.getByLabel('期望与实际结果').scrollIntoViewIfNeeded()
    await page.screenshot({
      path: `docs/screenshots/web/group-scene-${index + 1}-evidence.png`,
      fullPage: false,
    })
    for (const artifact of sceneArtifacts) {
      const link = page.getByRole('link', { name: `打开 ${artifact.name}`, exact: true })
      const artifactCard = page.locator('.run-artifact').filter({ has: link })
      await expect(artifactCard.getByLabel('证据归属')).toContainText(scenario.name)
      await expect(artifactCard.getByLabel('证据归属')).toContainText(scenario.versionId.slice(0, 8))
      await expect(link).toHaveAttribute('href', artifact.url)
      expect((await api.get(artifact.url)).status()).toBe(200)
    }
    evidence.push({
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      versionId: scenario.versionId,
      testId,
      beginSeq: begin!.seq,
      endSeq: end!.seq,
      status: end!.data.status,
      assertionSeqs: assertions.map((event) => event.seq),
      testTitle: scenario.testTitle,
      explicitUiIdentityVerified: true,
      attachmentPaths: attachments.flatMap((attachment) => (attachment.path ? [attachment.path] : [])),
      artifacts: sceneArtifacts.map((artifact) => ({
        id: artifact.id,
        name: artifact.name,
        kind: artifact.kind,
        url: artifact.url,
      })),
    })
  }
  await page
    .locator('.run-artifact-grid')
    .screenshot({ path: 'docs/screenshots/web/group-artifact-identities.png' })
  await page.locator('.run-snapshots > details').first().locator('summary').first().click()
  for (const scenario of scenarios) {
    const snapshot = page
      .locator('.run-versions > details')
      .filter({ hasText: `场景 ${scenario.id.slice(0, 8)}` })
    await snapshot.locator('summary').first().click()
    await expect(snapshot).toContainText(scenario.versionId)
    await expect(snapshot).toContainText(scenario.code)
  }
  await page.locator('.run-versions').screenshot({ path: 'docs/screenshots/web/group-version-snapshots.png' })
  await writeFile(
    'docs/verification/web/group-acceptance.json',
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        projectId: project.id,
        groupId: group.id,
        groupName: group.name,
        environmentId: environment.id,
        runId,
        submittedBody,
        status: run.status,
        verification: run.verification,
        summary: run.summary,
        versionCount: run.versions.length,
        eventCount: events.length,
        evidence,
      },
      null,
      2,
    ),
  )
})
