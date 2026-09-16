import type { ApiAction, Environment } from '../types'

export interface PairDraft {
  id: string
  key: string
  value: string
}
export interface RoleDraft {
  id: string
  name: string
  originalName?: string
  hasStorageState: boolean
  hasHeaders: boolean
  storageState: string
  headers: string
  editStorageState: boolean
  editHeaders: boolean
}
export interface EnvironmentDraft {
  name: string
  description: string
  websites: PairDraft[]
  apiBases: PairDraft[]
  variables: PairDraft[]
  secrets: PairDraft[]
  roles: RoleDraft[]
  setup: string
  cleanup: string
  allowedOrigins: string
}

export const newPair = (key = '', value = ''): PairDraft => ({ id: crypto.randomUUID(), key, value })
export const newRole = (): RoleDraft => ({
  id: crypto.randomUUID(),
  name: '',
  hasStorageState: false,
  hasHeaders: false,
  storageState: '',
  headers: '',
  editStorageState: false,
  editHeaders: false,
})
const pairs = (value: Record<string, string> = {}) =>
  Object.entries(value).map(([key, entry]) => newPair(key, entry))

export function environmentToDraft(environment?: Environment): EnvironmentDraft {
  return {
    name: environment?.name ?? '',
    description: environment?.description ?? '',
    websites: environment ? pairs(environment.websites) : [newPair('main')],
    apiBases: pairs(environment?.apiBases),
    variables: pairs(environment?.variables),
    secrets: [],
    roles: (environment?.roles ?? []).map((role) => ({
      ...newRole(),
      name: role.name,
      originalName: role.name,
      hasStorageState: !!role.hasStorageState,
      hasHeaders: !!role.hasHeaders,
    })),
    setup: JSON.stringify(environment?.setup ?? [], null, 2),
    cleanup: JSON.stringify(environment?.cleanup ?? [], null, 2),
    allowedOrigins: (environment?.allowedOrigins ?? []).join('\n'),
  }
}

function record(rows: PairDraft[], label: string, requireValue = false): Record<string, string> {
  const output: Record<string, string> = Object.create(null) as Record<string, string>
  for (const row of rows) {
    const key = row.key.trim()
    if (!key) throw new Error(`${label}：请填写名称，或移除空行。`)
    if (Object.hasOwn(output, key)) throw new Error(`${label}：名称不能重复。`)
    if (requireValue && !row.value.trim()) throw new Error(`${label}：请填写值，或移除空行。`)
    output[key] = row.value
  }
  return output
}

function httpUrl(value: string, label: string): URL {
  let parsed: URL
  try {
    parsed = new URL(value.trim())
  } catch {
    throw new Error(`${label}：请输入完整的 http:// 或 https:// 地址。`)
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password)
    throw new Error(`${label}：仅支持不含账号密码的 HTTP(S) 地址。`)
  return parsed
}

function stringRecord(value: unknown): value is Record<string, string> {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.values(value).every((item) => typeof item === 'string')
  )
}

export function parseActions(source: string, label: string, apiBases: Record<string, string>): ApiAction[] {
  let input: unknown
  try {
    input = JSON.parse(source)
  } catch {
    throw new Error(`${label}：JSON 格式无效，输入已保留。`)
  }
  if (!Array.isArray(input)) throw new Error(`${label}：请输入 ApiAction 数组，例如 []。`)
  input.forEach((value: unknown, index) => {
    const prefix = `${label}第 ${index + 1} 项`
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error(`${prefix}：必须是请求对象。`)
    const action = value as Record<string, unknown>
    if (typeof action.name !== 'string' || !action.name.trim()) throw new Error(`${prefix}：缺少 name。`)
    if (typeof action.apiBase !== 'string' || !Object.hasOwn(apiBases, action.apiBase))
      throw new Error(`${prefix}：apiBase 必须匹配已配置的 API 名称。`)
    if (
      typeof action.method !== 'string' ||
      !['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(action.method)
    )
      throw new Error(`${prefix}：method 必须是 GET、POST、PUT、PATCH 或 DELETE。`)
    if (
      typeof action.path !== 'string' ||
      !action.path.trim() ||
      /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(action.path) ||
      action.path.includes('\\')
    )
      throw new Error(`${prefix}：path 必须是相对于 API 基址的路径。`)
    if (action.headers !== undefined && !stringRecord(action.headers))
      throw new Error(`${prefix}：headers 必须是字符串键值对象。`)
    if (stringRecord(action.headers)) {
      for (const [header, value] of Object.entries(action.headers)) {
        if (
          /^(?:authorization|proxy-authorization|cookie|set-cookie|x-api-key|x-auth-token)$/i.test(header) &&
          value &&
          !/\{\{\s*[^{}]+\s*\}\}/.test(value)
        )
          throw new Error(`${prefix}：敏感请求头必须使用 {{secretVariable}} 引用，请将凭据存入敏感变量。`)
      }
    }
    if (action.capture !== undefined && !stringRecord(action.capture))
      throw new Error(`${prefix}：capture 必须是变量名与 JSON 路径的字符串键值对象。`)
    if (
      action.expectedStatus !== undefined &&
      (!Number.isInteger(action.expectedStatus) ||
        Number(action.expectedStatus) < 100 ||
        Number(action.expectedStatus) > 599)
    )
      throw new Error(`${prefix}：expectedStatus 必须是 100 至 599 的整数。`)
  })
  return input as ApiAction[]
}

function parseSecretJson(source: string, label: string): unknown {
  if (!source.trim()) throw new Error(`${label}：请填写新的 JSON，或取消修改以保留现有配置。`)
  try {
    return JSON.parse(source)
  } catch {
    throw new Error(`${label}：JSON 格式无效，输入已保留。`)
  }
}

export function buildEnvironmentPayload(draft: EnvironmentDraft) {
  const name = draft.name.trim()
  if (!name) throw new Error('请填写环境名称。')
  const websites = record(draft.websites, '网站', true)
  if (!Object.keys(websites).length) throw new Error('请至少添加一个网站。')
  const apiBases = record(draft.apiBases, 'API 基址', true)
  for (const collection of [websites, apiBases]) {
    for (const key of Object.keys(collection)) {
      httpUrl(collection[key], '地址')
      collection[key] = collection[key].trim()
    }
  }
  const variables = record(draft.variables, '普通变量')
  const secretVariables = record(draft.secrets, '敏感变量', true)
  const names = new Set<string>()
  const roles = draft.roles.map((role) => {
    const roleName = role.name.trim()
    if (!roleName) throw new Error('角色：请填写名称，或移除空行。')
    if (names.has(roleName)) throw new Error('角色名称不能重复。')
    names.add(roleName)
    const result: { name: string; storageState?: unknown; headers?: Record<string, string> } = {
      name: roleName,
    }
    if (role.editStorageState) {
      const state = parseSecretJson(role.storageState, '浏览器登录状态')
      if (
        !state ||
        typeof state !== 'object' ||
        !('cookies' in state) ||
        !Array.isArray(state.cookies) ||
        !('origins' in state) ||
        !Array.isArray(state.origins)
      )
        throw new Error('浏览器登录状态：需要包含 cookies 和 origins 数组。')
      result.storageState = state
    }
    if (role.editHeaders) {
      const headers = parseSecretJson(role.headers, '角色请求头')
      if (!stringRecord(headers)) throw new Error('角色请求头：请输入字符串键值对象。')
      result.headers = headers
    }
    return result
  })
  const allowedOrigins = [
    ...new Set(
      draft.allowedOrigins
        .split(/\r?\n/)
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) => {
          const parsed = httpUrl(value, '允许的来源')
          if ((parsed.pathname !== '/' && parsed.pathname !== '') || parsed.search || parsed.hash)
            throw new Error('允许的来源：请只填写协议、域名与端口，不含路径或查询参数。')
          return parsed.origin
        }),
    ),
  ]
  return {
    name,
    description: draft.description.trim(),
    websites,
    apiBases,
    variables,
    ...(draft.secrets.length ? { secretVariables } : {}),
    roles,
    setup: parseActions(draft.setup, '前置请求', apiBases),
    cleanup: parseActions(draft.cleanup, '后置清理', apiBases),
    allowedOrigins,
  }
}
