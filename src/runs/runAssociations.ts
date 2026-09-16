import type { RunArtifact, RunEvent, Scenario, Version } from '../types'

export interface EvidenceContext {
  scenarioId?: string
  scenarioName?: string
  versionId?: string
  versionNumber?: number
  testId?: string
  attempt?: number
}

const identifier = (value: unknown) => (typeof value === 'string' && value.length > 0 ? value : undefined)
const attemptNumber = (value: unknown) =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : undefined

export function resolveEventContext(
  event: RunEvent,
  events: RunEvent[],
  versions: Version[],
  scenarios: Scenario[],
): EvidenceContext {
  const testId = identifier(event.data?.testId)
  const attempt = attemptNumber(event.data?.attempt)
  const context: EvidenceContext = {
    ...(testId === undefined ? {} : { testId }),
    ...(attempt === undefined ? {} : { attempt }),
  }

  let source: RunEvent | undefined
  if (event.type === 'test.begin') {
    source = event
  } else if (testId !== undefined && attempt !== undefined) {
    const matches = events.filter(
      (candidate) =>
        candidate.type === 'test.begin' &&
        candidate.data?.testId === testId &&
        candidate.data?.attempt === attempt,
    )
    const first = matches[0]
    // Conflicting sources for one identity cannot be resolved by order or title.
    if (
      first &&
      matches.every(
        (candidate) =>
          identifier(candidate.data.scenarioId) === identifier(first.data.scenarioId) &&
          identifier(candidate.data.versionId) === identifier(first.data.versionId),
      )
    )
      source = first
  }
  if (!source) return context

  const scenarioId = identifier(source.data?.scenarioId)
  const versionId = identifier(source.data?.versionId)
  if (scenarioId !== undefined) {
    context.scenarioId = scenarioId
    const scenario = scenarios.find((candidate) => candidate.id === scenarioId)
    if (scenario) context.scenarioName = scenario.name
  }
  if (versionId !== undefined) context.versionId = versionId
  if (scenarioId !== undefined && versionId !== undefined) {
    const version = versions.find(
      (candidate) => candidate.id === versionId && candidate.scenarioId === scenarioId,
    )
    if (version) context.versionNumber = version.number
  }
  return context
}

export function resolveArtifactContext(
  artifact: RunArtifact,
  events: RunEvent[],
  versions: Version[],
  scenarios: Scenario[],
): EvidenceContext | undefined {
  const owners = events.filter(
    (event) =>
      event.type === 'test.end' &&
      Array.isArray(event.data?.attachments) &&
      event.data.attachments.some((attachment: unknown) => {
        if (!attachment || typeof attachment !== 'object') return false
        const path = (attachment as Record<string, unknown>).path
        return typeof path === 'string' && path.replace(/^artifacts\//, '') === artifact.name
      }),
  )
  const owner = owners[0]
  if (!owner) return undefined
  const testId = identifier(owner.data?.testId)
  const attempt = attemptNumber(owner.data?.attempt)
  if (
    testId === undefined ||
    attempt === undefined ||
    owners.some((candidate) => candidate.data?.testId !== testId || candidate.data?.attempt !== attempt)
  )
    return undefined
  return resolveEventContext(owner, events, versions, scenarios)
}
