import { describe, expect, it } from 'vitest'
import type { RunArtifact, RunEvent, Scenario, Version } from '../types'
import { resolveArtifactContext, resolveEventContext } from './runAssociations'

const timestamp = '2026-09-13T00:00:00Z'
const scenarios: Scenario[] = ['a', 'b'].map((id) => ({
  id: `scenario-${id}`,
  projectId: 'project',
  groupId: 'group',
  name: `场景 ${id}`,
  description: '',
  currentVersionId: `current-${id}`,
  createdAt: timestamp,
  updatedAt: timestamp,
}))
const versions: Version[] = scenarios.map((scenario, index) => ({
  id: `version-${index + 1}`,
  scenarioId: scenario.id,
  projectId: 'project',
  number: index + 3,
  code: '',
  source: 'human',
  changeNote: '',
  checks: [],
  modules: {},
  createdAt: timestamp,
  createdBy: 'user',
}))
const event = (type: string, data: Record<string, unknown>, seq = 1): RunEvent => ({
  seq,
  type,
  timestamp,
  data,
})
const beginA = event('test.begin', {
  testId: 'test-a',
  attempt: 0,
  title: '同名业务测试',
  file: 'same.spec.ts',
  scenarioId: scenarios[0].id,
  versionId: versions[0].id,
})
const beginB = event(
  'test.begin',
  {
    testId: 'test-b',
    attempt: 0,
    title: '同名业务测试',
    file: 'same.spec.ts',
    scenarioId: scenarios[1].id,
    versionId: versions[1].id,
  },
  2,
)
const artifact = (name: string): RunArtifact => ({
  id: 'artifact',
  runId: 'run',
  name,
  kind: 'trace',
  contentType: 'application/zip',
  size: 123,
  url: '/api/artifact',
})

describe('event and artifact ownership', () => {
  it('separates identical test titles and file names by exact test identity', () => {
    const contextA = resolveEventContext(
      event('assertion', { testId: 'test-a', attempt: 0 }),
      [beginA, beginB],
      versions,
      scenarios,
    )
    const contextB = resolveEventContext(
      event('assertion', { testId: 'test-b', attempt: 0 }),
      [beginA, beginB],
      versions,
      scenarios,
    )
    expect(contextA).toEqual({
      scenarioId: 'scenario-a',
      scenarioName: '场景 a',
      versionId: 'version-1',
      versionNumber: 3,
      testId: 'test-a',
      attempt: 0,
    })
    expect(contextB).toEqual({
      scenarioId: 'scenario-b',
      scenarioName: '场景 b',
      versionId: 'version-2',
      versionNumber: 4,
      testId: 'test-b',
      attempt: 0,
    })
  })

  it('requires the exact attempt and never borrows the first attempt for a retry', () => {
    const retry = event('test.begin', { ...beginB.data, testId: 'test-a', attempt: 1 })
    expect(
      resolveEventContext(
        event('step.end', { testId: 'test-a', attempt: 1 }),
        [beginA, retry],
        versions,
        scenarios,
      ),
    ).toMatchObject({ scenarioId: 'scenario-b', versionId: 'version-2', attempt: 1 })
    expect(
      resolveEventContext(
        event('step.end', { testId: 'test-a', attempt: 2 }),
        [beginA, retry],
        versions,
        scenarios,
      ),
    ).toEqual({ testId: 'test-a', attempt: 2 })
    expect(
      resolveEventContext(event('step.end', { testId: 'test-a' }), [beginA], versions, scenarios),
    ).toEqual({ testId: 'test-a' })
  })

  it('uses test.begin directly but does not infer missing scenario IDs from versions', () => {
    expect(resolveEventContext(beginA, [], versions, scenarios)).toMatchObject({
      scenarioId: 'scenario-a',
      versionNumber: 3,
    })
    expect(
      resolveEventContext(
        event('test.begin', { testId: 'test-a', attempt: 0, versionId: 'version-1' }),
        [],
        versions,
        scenarios,
      ),
    ).toEqual({ testId: 'test-a', attempt: 0, versionId: 'version-1' })
    expect(
      resolveEventContext(
        event('console', { title: '同名业务测试', file: 'same.spec.ts', scenarioId: 'scenario-a' }),
        [beginA],
        versions,
        scenarios,
      ),
    ).toEqual({})
  })

  it('assigns version numbers only from a matching frozen version and scenario pair', () => {
    const mismatched = event('test.begin', { ...beginA.data, versionId: 'version-2' })
    expect(resolveEventContext(mismatched, [], versions, scenarios)).toEqual({
      testId: 'test-a',
      attempt: 0,
      scenarioId: 'scenario-a',
      scenarioName: '场景 a',
      versionId: 'version-2',
    })
    expect(resolveEventContext(beginA, [], [], [])).toEqual({
      testId: 'test-a',
      attempt: 0,
      scenarioId: 'scenario-a',
      versionId: 'version-1',
    })
  })

  it('leaves conflicting test.begin sources unresolved', () => {
    const conflicting = event('test.begin', { ...beginB.data, testId: 'test-a' })
    expect(
      resolveEventContext(
        event('assertion', { testId: 'test-a', attempt: 0 }),
        [beginA, conflicting],
        versions,
        scenarios,
      ),
    ).toEqual({ testId: 'test-a', attempt: 0 })
  })

  it('matches the complete artifact path after removing exactly one artifacts prefix', () => {
    const nameA = 'pw-results/000-version-abc123-same-title-9a1b/trace.zip'
    const nameB = 'pw-results/001-version-abc123-same-title-9a1b/trace.zip'
    const endA = event('test.end', {
      testId: 'test-a',
      attempt: 0,
      attachments: [{ name: 'trace', path: `artifacts/${nameA}` }],
    })
    const endB = event('test.end', {
      testId: 'test-b',
      attempt: 0,
      attachments: [{ name: 'trace', path: `artifacts/${nameB}` }],
    })
    const events = [beginA, beginB, endA, endB]
    expect(resolveArtifactContext(artifact(nameB), events, versions, scenarios)).toMatchObject({
      scenarioId: 'scenario-b',
      versionId: 'version-2',
      testId: 'test-b',
    })
    expect(resolveArtifactContext(artifact('trace.zip'), events, versions, scenarios)).toBeUndefined()
    expect(
      resolveArtifactContext(artifact(nameA.slice('pw-results/'.length)), events, versions, scenarios),
    ).toBeUndefined()
    expect(
      resolveArtifactContext(artifact(`artifacts/${nameA}`), events, versions, scenarios),
    ).toBeUndefined()
  })

  it('does not assign an artifact with multiple test or attempt owners', () => {
    const attachments = [{ path: 'artifacts/trace.zip' }]
    const endA = event('test.end', { testId: 'test-a', attempt: 0, attachments })
    const endB = event('test.end', { testId: 'test-b', attempt: 0, attachments })
    const retry = event('test.end', { testId: 'test-a', attempt: 1, attachments })
    expect(
      resolveArtifactContext(artifact('trace.zip'), [beginA, beginB, endA, endB], versions, scenarios),
    ).toBeUndefined()
    expect(
      resolveArtifactContext(artifact('trace.zip'), [beginA, endA, retry], versions, scenarios),
    ).toBeUndefined()
  })

  it('does not match attachment names or incomplete owner identities', () => {
    const noPath = event('test.end', { testId: 'test-a', attempt: 0, attachments: [{ name: 'trace.zip' }] })
    const noAttempt = event('test.end', { testId: 'test-a', attachments: [{ path: 'artifacts/trace.zip' }] })
    expect(
      resolveArtifactContext(artifact('trace.zip'), [beginA, noPath], versions, scenarios),
    ).toBeUndefined()
    expect(
      resolveArtifactContext(artifact('trace.zip'), [beginA, noAttempt], versions, scenarios),
    ).toBeUndefined()
  })

  it('retains an exact test and attempt association when scenario metadata is absent', () => {
    const end = event('test.end', {
      testId: 'test-a',
      attempt: 0,
      attachments: [{ path: 'artifacts/trace.zip' }],
    })
    expect(resolveArtifactContext(artifact('trace.zip'), [end], versions, scenarios)).toEqual({
      testId: 'test-a',
      attempt: 0,
    })
  })

  it('accepts repeated attachments from the same owner without inventing ambiguity', () => {
    const end = event('test.end', {
      testId: 'test-a',
      attempt: 0,
      attachments: [{ path: 'artifacts/trace.zip' }, { path: 'artifacts/trace.zip' }],
    })
    expect(
      resolveArtifactContext(artifact('trace.zip'), [beginA, end, { ...end, seq: 99 }], versions, scenarios),
    ).toMatchObject({ scenarioId: 'scenario-a', versionId: 'version-1', testId: 'test-a', attempt: 0 })
  })
})
