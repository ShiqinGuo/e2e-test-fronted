import { describe, expect, it } from 'vitest'
import type { Environment } from '../types'
import { buildEnvironmentPayload, environmentToDraft, newPair, parseActions } from './model'

const environment: Environment = {
  id: 'environment-one',
  projectId: 'project-one',
  name: '预发布',
  description: '',
  websites: { main: 'https://test.example.com' },
  apiBases: { main: 'https://api.example.com' },
  variables: { testName: 'sample' },
  secretVariableKeys: ['apiToken'],
  roles: [{ name: 'buyer', hasStorageState: true, hasHeaders: true }],
  setup: [],
  cleanup: [],
  allowedOrigins: [],
  createdAt: '2026-09-13T00:00:00Z',
  updatedAt: '2026-09-13T00:00:00Z',
}

describe('environment credential preservation', () => {
  it('omits existing credentials rather than sending redacted values or empty replacements', () => {
    const draft = environmentToDraft(environment)
    expect(draft.secrets).toEqual([])
    expect(draft.roles[0].storageState).toBe('')
    expect(draft.roles[0].headers).toBe('')
    const payload = buildEnvironmentPayload(draft)
    expect(payload).not.toHaveProperty('secretVariables')
    expect(payload.roles).toEqual([{ name: 'buyer' }])
  })

  it('submits only explicitly edited secrets and role fields', () => {
    const draft = environmentToDraft(environment)
    draft.secrets = [newPair('apiToken', 'new-user-supplied-value')]
    draft.roles[0].editHeaders = true
    draft.roles[0].headers = '{}'
    const payload = buildEnvironmentPayload(draft)
    expect(payload.secretVariables).toEqual({ apiToken: 'new-user-supplied-value' })
    expect(payload.roles).toEqual([{ name: 'buyer', headers: {} }])
  })

  it('requires an explicit valid replacement when a sensitive editor is enabled', () => {
    const draft = environmentToDraft(environment)
    draft.roles[0].editStorageState = true
    expect(() => buildEnvironmentPayload(draft)).toThrow('取消修改')
    draft.roles[0].storageState = '{"cookies":[],"origins":[]}'
    expect(buildEnvironmentPayload(draft).roles[0].storageState).toEqual({ cookies: [], origins: [] })
  })
})

describe('environment input boundaries', () => {
  it('rejects duplicate names without silently overwriting a row', () => {
    const draft = environmentToDraft(environment)
    draft.websites.push(newPair(' main ', 'https://other.example.com'))
    expect(() => buildEnvironmentPayload(draft)).toThrow('名称不能重复')
  })

  it('rejects credentials embedded in URLs and unsupported protocols', () => {
    const draft = environmentToDraft(environment)
    draft.websites[0].value = 'https://user:password@example.com'
    expect(() => buildEnvironmentPayload(draft)).toThrow('不含账号密码')
    draft.websites[0].value = 'javascript:alert(1)'
    expect(() => buildEnvironmentPayload(draft)).toThrow('HTTP(S)')
  })

  it('retains invalid JSON and prevents it from reaching the server', () => {
    const draft = environmentToDraft(environment)
    draft.setup = '[{"name":"unfinished"'
    const original = draft.setup
    expect(() => buildEnvironmentPayload(draft)).toThrow('输入已保留')
    expect(draft.setup).toBe(original)
  })

  it('rejects action references to missing APIs and absolute request paths', () => {
    const action = { name: 'setup', apiBase: 'missing', method: 'POST', path: '/fixtures' }
    expect(() => parseActions(JSON.stringify([action]), '前置', { main: 'https://api.example.com' })).toThrow(
      'apiBase',
    )
    expect(() =>
      parseActions(
        JSON.stringify([{ ...action, apiBase: 'main', path: 'https://other.example.com' }]),
        '前置',
        { main: 'https://api.example.com' },
      ),
    ).toThrow('相对于')
  })

  it('preserves dynamic API action fields without lossy form conversion', () => {
    const actions = [
      {
        name: 'create',
        apiBase: 'main',
        method: 'POST',
        path: '/fixtures/{{fixture}}',
        body: { nested: [1, true] },
        headers: { Authorization: '{{apiToken}}' },
        capture: { fixtureId: 'data.id' },
        expectedStatus: 201,
      },
    ]
    expect(parseActions(JSON.stringify(actions), '前置', environment.apiBases)).toEqual(actions)
  })

  it('rejects plaintext credentials in sensitive action headers', () => {
    const action = {
      name: 'setup',
      apiBase: 'main',
      method: 'GET',
      path: '/fixtures',
      headers: { Authorization: 'Bearer plaintext' },
    }
    expect(() => parseActions(JSON.stringify([action]), '前置', environment.apiBases)).toThrow('敏感请求头')
    action.headers.Authorization = 'Bearer {{apiToken}}'
    expect(parseActions(JSON.stringify([action]), '前置', environment.apiBases)).toEqual([action])
  })
})
