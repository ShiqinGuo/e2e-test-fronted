import type { PageResult } from './types'

export class ApiError extends Error {
  status: number
  code: string
  requestId?: string
  details?: unknown
  constructor(status: number, code: string, message: string, requestId?: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.requestId = requestId
    this.details = details
  }
}

let sessionPaused = false
export function pauseSessionRequests(paused: boolean) {
  sessionPaused = paused
}

async function request<T>(path: string, method = 'GET', body?: unknown, signal?: AbortSignal): Promise<T> {
  if (sessionPaused && !path.startsWith('/api/auth/'))
    throw new ApiError(401, 'UNAUTHENTICATED', '请重新登录以恢复会话。')
  let response: Response
  try {
    response = await fetch(path.startsWith('/api/') ? path : `/api/v1${path}`, {
      method,
      credentials: 'include',
      headers:
        body === undefined
          ? { Accept: 'application/json' }
          : { Accept: 'application/json', 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(0, 'NETWORK_ERROR', '无法连接服务，请检查连接后重试。')
  }
  const text = await response.text()
  let data: unknown
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    throw new ApiError(
      response.status,
      'INVALID_RESPONSE',
      response.ok ? '服务返回了无法读取的数据。' : `服务暂不可用（${response.status}），请稍后重试。`,
    )
  }
  if (!response.ok) {
    const result = data as {
      error?: { code?: string; message?: string; details?: unknown }
      code?: string
      message?: string
      requestId?: string
    } | null
    const error = result?.error
    const failure = new ApiError(
      response.status,
      error?.code || result?.code || 'REQUEST_FAILED',
      error?.message || result?.message || `请求失败（${response.status}）`,
      result?.requestId,
      error?.details,
    )
    if (response.status === 401 && !path.startsWith('/api/auth/'))
      window.dispatchEvent(new CustomEvent('session-expired'))
    throw failure
  }
  return data as T
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, 'GET', undefined, signal),
  post: <T>(path: string, body: unknown = {}) => request<T>(path, 'POST', body),
  patch: <T>(path: string, body: unknown) => request<T>(path, 'PATCH', body),
  delete: <T>(path: string) => request<T>(path, 'DELETE'),
  async list<T>(path: string, signal?: AbortSignal): Promise<T[]> {
    const items: T[] = []
    let offset = 0
    while (true) {
      const page = await request<PageResult<T>>(
        `${path}${path.includes('?') ? '&' : '?'}limit=100&offset=${offset}`,
        'GET',
        undefined,
        signal,
      )
      if (!Array.isArray(page.items)) throw new ApiError(500, 'INVALID_RESPONSE', '服务返回了无效列表。')
      items.push(...page.items)
      offset += page.items.length
      if (offset >= page.total || !page.items.length) return items
    }
  },
}

export const projectPath = (projectId: string) => `/projects/${encodeURIComponent(projectId)}`
export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : '操作失败，请重试。'

/** Private viewers and artifacts must remain on the authenticated application origin. */
export function sameOriginUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  try {
    const url = new URL(value, window.location.origin)
    if (url.origin !== window.location.origin || !['http:', 'https:'].includes(url.protocol)) return undefined
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return undefined
  }
}
