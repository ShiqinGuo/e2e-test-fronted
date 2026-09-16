export interface User {
  id: string
  name: string
  email: string
}
export interface Session {
  user: User
  session: { id: string; expiresAt: string }
}
export interface PageResult<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}
export interface Project {
  id: string
  name: string
  description: string
  ownerId: string
  createdAt: string
  updatedAt: string
}
export interface Group {
  id: string
  projectId: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
}
export interface Scenario {
  id: string
  projectId: string
  groupId: string | null
  name: string
  description: string
  currentVersionId: string | null
  createdAt: string
  updatedAt: string
}
export interface Check {
  id: string
  title: string
  kind: 'ui' | 'api' | 'data'
  expected?: unknown
}
export type VersionSource = 'human' | 'ai' | 'recording' | 'import'
export interface Version {
  id: string
  scenarioId: string
  projectId: string
  number: number
  code: string
  source: VersionSource
  changeNote: string
  checks: Check[]
  modules: Record<string, string>
  createdAt: string
  createdBy: string
}
export interface ApiAction {
  name: string
  apiBase: string
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  headers?: Record<string, string>
  body?: unknown
  expectedStatus?: number
  capture?: Record<string, string>
}
export interface EnvironmentRole {
  name: string
  hasStorageState?: boolean
  hasHeaders?: boolean
  storageState?: unknown
  headers?: Record<string, string>
}
export interface Environment {
  id: string
  projectId: string
  name: string
  description: string
  websites: Record<string, string>
  apiBases: Record<string, string>
  variables: Record<string, string>
  secretVariableKeys: string[]
  roles: EnvironmentRole[]
  setup: ApiAction[]
  cleanup: ApiAction[]
  allowedOrigins?: string[]
  createdAt: string
  updatedAt: string
}
export type RunStatus = 'queued' | 'running' | 'passed' | 'failed' | 'cancelled' | 'timed_out' | 'error'
export type Verification = 'pending' | 'verified' | 'unverified' | 'partial'
export interface RunSummary {
  total: number
  passed: number
  failed: number
  skipped: number
  flaky: number
  unverified: number
}
export interface Run {
  sourceRunId?: string | null
  rerunOf?: string | null
  id: string
  projectId: string
  environmentId: string
  scenarioId: string | null
  groupId: string | null
  role: string | null
  status: RunStatus
  verification: Verification
  createdAt: string
  startedAt: string | null
  finishedAt: string | null
  timeoutMs: number
  retries: number
  environmentSnapshot: Environment
  versions: Version[]
  summary: RunSummary
  error: string | null
}
export interface RunEvent {
  seq: number
  type: string
  timestamp: string
  data: Record<string, unknown>
}
export interface RunArtifact {
  id: string
  runId: string
  name: string
  contentType: string
  size: number
  url: string
  kind: string
}
export interface Recording {
  id: string
  projectId: string
  environmentId: string
  scenarioId: string | null
  status: 'starting' | 'ready' | 'stopped' | 'error'
  createdAt: string
  expiresAt: string
  viewerUrl: string | null
  code: string
  checks: Check[]
  error: string | null
}
export interface Capabilities {
  [key: string]: unknown
}
