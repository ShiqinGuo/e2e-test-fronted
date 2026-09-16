import { describe, expect, it } from 'vitest'
import type { Run, RunEvent } from '../types'
import {
  attemptLabel,
  eventPresentation,
  matchesEvidence,
  mergeRunEvents,
  runOutcome,
  stepCounterpart,
} from './runEvidence'

const summary: Run['summary'] = { total: 1, passed: 1, failed: 0, skipped: 0, flaky: 0, unverified: 0 }

describe('run evidence semantics', () => {
  it('does not mark action-only, partial, skipped, or retried executions as a clean verified pass', () => {
    expect(runOutcome({ status: 'passed', verification: 'verified', summary }).verified).toBe(true)
    expect(
      runOutcome({ status: 'passed', verification: 'unverified', summary: { ...summary, unverified: 1 } })
        .verified,
    ).toBe(false)
    expect(runOutcome({ status: 'passed', verification: 'partial', summary }).verified).toBe(false)
    expect(
      runOutcome({ status: 'passed', verification: 'verified', summary: { ...summary, flaky: 1 } }).verified,
    ).toBe(false)
    expect(
      runOutcome({ status: 'passed', verification: 'verified', summary: { ...summary, skipped: 1 } })
        .verified,
    ).toBe(false)
  })

  it('retains the first failure when incremental pages contain retries and duplicate sequences', () => {
    const failed: RunEvent = {
      seq: 4,
      type: 'test.end',
      timestamp: '2026-09-13T00:00:00Z',
      data: { attempt: 0, status: 'failed', error: 'first failure' },
    }
    const passed: RunEvent = {
      seq: 8,
      type: 'test.end',
      timestamp: '2026-09-13T00:00:01Z',
      data: { attempt: 1, status: 'passed' },
    }
    const result = mergeRunEvents([failed], [passed, failed])
    expect(result).toEqual([failed, passed])
    expect(result[0].data.error).toBe('first failure')
  })

  it('presents zero-based attempts and pairs steps only within the same test attempt', () => {
    expect(attemptLabel(0)).toBe('首次执行')
    expect(attemptLabel(1)).toBe('第 1 次重试')
    expect(attemptLabel(undefined)).toBeUndefined()
    const first: RunEvent = {
      seq: 1,
      type: 'step.begin',
      timestamp: '',
      data: { testId: 'test-a', attempt: 0, stepId: 'step-a', title: 'click', category: 'pw:api' },
    }
    const retryEnd: RunEvent = {
      seq: 2,
      type: 'step.end',
      timestamp: '',
      data: { ...first.data, attempt: 1, status: 'passed', durationMs: 15 },
    }
    const firstEnd: RunEvent = {
      seq: 3,
      type: 'step.end',
      timestamp: '',
      data: { ...first.data, status: 'failed', durationMs: 120 },
    }
    expect(stepCounterpart(first, [retryEnd])).toBeUndefined()
    expect(stepCounterpart(first, [retryEnd, firstEnd])).toBe(firstEnd)
    expect(eventPresentation(firstEnd)).toMatchObject({
      typeLabel: '步骤结束',
      status: '失败',
      failed: true,
      attempt: '首次执行',
    })
  })

  it('shows numeric HTTP responses without interpreting HTTP 200 as business success', () => {
    const response: RunEvent = {
      seq: 1,
      type: 'network',
      timestamp: '',
      data: {
        phase: 'response',
        status: 200,
        url: 'https://example.test/api/order',
        source: 'api',
        attempt: 0,
      },
    }
    expect(eventPresentation(response)).toMatchObject({
      typeLabel: '收到响应',
      status: 'HTTP 200',
      failed: false,
    })
    expect(eventPresentation(response).fields).toContainEqual({
      key: 'status',
      label: 'HTTP 响应',
      value: 200,
    })
    expect(eventPresentation(response).fields).toContainEqual({
      key: 'source',
      label: '请求来源',
      value: 'Playwright API',
    })
    expect(matchesEvidence(response, 'network')).toBe(true)
    expect(matchesEvidence(response, 'steps')).toBe(false)
  })

  it('preserves matcher arguments, unavailable observations and setup expectations', () => {
    const assertion: RunEvent = {
      seq: 1,
      type: 'assertion',
      timestamp: '',
      data: {
        matcher: 'toHaveText',
        expected: ['完成'],
        actual: { unavailable: true },
        negated: true,
        status: 'failed',
        attempt: 0,
      },
    }
    expect(eventPresentation(assertion)).toMatchObject({
      title: '.not.toHaveText',
      expectedLabel: '预期参数',
      hasExpected: true,
      hasActual: true,
      failed: true,
    })
    expect(assertion.data.expected).toEqual(['完成'])
    expect(assertion.data.actual).toEqual({ unavailable: true })
    const setup: RunEvent = {
      seq: 2,
      type: 'setup.end',
      timestamp: '',
      data: {
        name: '创建订单',
        status: 'failed',
        expected: 201,
        actual: { status: 200, body: { id: null } },
        captured: [],
        durationMs: 37,
      },
    }
    expect(eventPresentation(setup)).toMatchObject({
      typeLabel: '前置请求结束',
      hasExpected: true,
      hasActual: true,
      failed: true,
    })
    expect(matchesEvidence(setup, 'network')).toBe(true)
  })

  it('includes browser console events in logs and retains unknown events in all evidence', () => {
    for (const type of ['console', 'page.error', 'stdout', 'stderr', 'error']) {
      expect(matchesEvidence({ seq: 1, type, timestamp: '', data: {} }, 'logs')).toBe(true)
    }
    const unknown: RunEvent = { seq: 2, type: 'future.custom.event', timestamp: '', data: { value: 0 } }
    expect(matchesEvidence(unknown, 'all')).toBe(true)
    expect(eventPresentation(unknown).known).toBe(false)
  })

  it('distinguishes successful operations from actual assertions at event level', () => {
    const event: RunEvent = {
      seq: 1,
      type: 'test.end',
      timestamp: '',
      data: { status: 'passed', assertions: 0 },
    }
    expect(eventPresentation(event).status).toBe('操作完成 · 未验证')
    expect(
      eventPresentation({ ...event, type: 'step.end', data: { status: 'passed', category: 'pw:api' } })
        .status,
    ).toBe('步骤完成')
    expect(
      eventPresentation({ ...event, type: 'step.end', data: { status: 'passed', category: 'expect' } })
        .status,
    ).toBe('断言通过')
  })
})
