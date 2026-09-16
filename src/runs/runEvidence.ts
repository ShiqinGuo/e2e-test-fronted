import type { Run, RunEvent } from '../types'

export type EvidenceFilter = 'all' | 'steps' | 'network' | 'logs'

export const isActiveRun = (run: Pick<Run, 'status'> | undefined) =>
  run?.status === 'queued' || run?.status === 'running'

export function runOutcome(run: Pick<Run, 'status' | 'verification' | 'summary'>) {
  const statusLabels: Record<Run['status'], string> = {
    queued: '排队中',
    running: '执行中',
    passed: '执行完成',
    failed: '失败',
    cancelled: '已取消',
    timed_out: '超时',
    error: '运行错误',
  }
  const verificationLabels: Record<Run['verification'], string> = {
    pending: '等待验证',
    verified: '断言已验证',
    unverified: '只有操作，未验证',
    partial: '部分验证',
  }
  const verified =
    run.status === 'passed' &&
    run.verification === 'verified' &&
    !run.summary?.failed &&
    !run.summary?.unverified &&
    !run.summary?.flaky &&
    !run.summary?.skipped
  return {
    statusLabel: verified ? '通过' : statusLabels[run.status] || run.status,
    verificationLabel: verificationLabels[run.verification] || run.verification,
    tone: verified
      ? 'verified'
      : ['failed', 'error', 'timed_out'].includes(run.status)
        ? 'failed'
        : 'neutral',
    verified,
  }
}

/** Sequence is the persistent event identity; attempts never replace earlier events. */
export function mergeRunEvents(previous: RunEvent[], incoming: RunEvent[]): RunEvent[] {
  const bySequence = new Map(previous.map((event) => [event.seq, event]))
  for (const event of incoming) if (!bySequence.has(event.seq)) bySequence.set(event.seq, event)
  return [...bySequence.values()].sort((left, right) => left.seq - right.seq)
}

export function matchesEvidence(event: RunEvent, filter: EvidenceFilter) {
  if (filter === 'all') return true
  if (filter === 'steps')
    return ['test.begin', 'test.end', 'step.begin', 'step.end', 'assertion'].includes(event.type)
  if (filter === 'network')
    return ['network', 'setup.begin', 'setup.end', 'cleanup.begin', 'cleanup.end'].includes(event.type)
  return ['console', 'page.error', 'stdout', 'stderr', 'error'].includes(event.type)
}

const eventTypes: Record<string, string> = {
  'run.begin': '运行开始',
  'suite.begin': '测试集开始',
  'test.begin': '测试开始',
  'step.begin': '步骤开始',
  'step.end': '步骤结束',
  assertion: '断言结果',
  console: '页面日志',
  'page.error': '页面错误',
  stdout: '标准输出',
  stderr: '标准错误输出',
  'setup.begin': '前置请求开始',
  'setup.end': '前置请求结束',
  'cleanup.begin': '后置清理开始',
  'cleanup.end': '后置清理结束',
  'test.end': '测试结束',
  'suite.end': '测试集结束',
  'run.complete': '运行完成',
  error: '运行错误',
}
const eventStatuses: Record<string, string> = {
  running: '执行中',
  passed: '通过',
  failed: '失败',
  skipped: '跳过',
  timedOut: '超时',
  timed_out: '超时',
  interrupted: '已中断',
  cancelled: '已取消',
  error: '错误',
}
const fieldsByType: Record<string, [string, string][]> = {
  'run.begin': [
    ['runId', '运行'],
    ['versionIds', '固定版本'],
    ['allowedOrigins', '允许来源'],
  ],
  'suite.begin': [
    ['total', '测试数'],
    ['workers', '执行进程'],
  ],
  'test.begin': [
    ['title', '测试'],
    ['file', '文件'],
  ],
  'step.begin': [
    ['title', '步骤'],
    ['category', '类型'],
    ['location', '源码位置'],
    ['stepId', '步骤 ID'],
    ['parentStepId', '父步骤'],
  ],
  'step.end': [
    ['title', '步骤'],
    ['category', '类型'],
    ['durationMs', '耗时'],
    ['stepId', '步骤 ID'],
    ['parentStepId', '父步骤'],
  ],
  assertion: [
    ['matcher', '断言'],
    ['negated', '取反'],
  ],
  network: [
    ['method', '方法'],
    ['url', '地址'],
    ['status', 'HTTP 响应'],
    ['resourceType', '资源类型'],
    ['source', '请求来源'],
  ],
  console: [
    ['level', '级别'],
    ['text', '内容'],
  ],
  'page.error': [['message', '错误']],
  stdout: [['text', '输出']],
  stderr: [['text', '输出']],
  'setup.begin': [
    ['name', '动作'],
    ['apiBase', 'API 基址'],
    ['method', '方法'],
    ['path', '路径'],
  ],
  'cleanup.begin': [
    ['name', '动作'],
    ['apiBase', 'API 基址'],
    ['method', '方法'],
    ['path', '路径'],
  ],
  'setup.end': [
    ['name', '动作'],
    ['targetOrigin', '请求来源'],
    ['durationMs', '耗时'],
    ['captured', '捕获变量'],
  ],
  'cleanup.end': [
    ['name', '动作'],
    ['targetOrigin', '请求来源'],
    ['durationMs', '耗时'],
    ['captured', '捕获变量'],
  ],
  'test.end': [
    ['title', '测试'],
    ['expectedStatus', '预期结果'],
    ['assertions', '真实断言数'],
    ['durationMs', '耗时'],
    ['attachments', '附件'],
  ],
  'suite.end': [
    ['verification', '验证程度'],
    ['summary', '结果统计'],
  ],
  'run.complete': [
    ['verification', '验证程度'],
    ['summary', '结果统计'],
  ],
  error: [
    ['message', '错误'],
    ['stack', '错误堆栈'],
  ],
}

export function attemptLabel(value: unknown): string | undefined {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) return undefined
  return value === 0 ? '首次执行' : `第 ${value} 次重试`
}

export function eventPresentation(event: RunEvent) {
  const data = event.data || {}
  const networkPhase = { request: '发出请求', response: '收到响应', failed: '请求失败' }[String(data.phase)]
  const typeLabel =
    event.type === 'network' ? networkPhase || '网络事件' : eventTypes[event.type] || event.type
  const title =
    typeof data.title === 'string'
      ? data.title
      : typeof data.name === 'string'
        ? data.name
        : event.type === 'network' && typeof data.url === 'string'
          ? `${typeof data.method === 'string' ? `${data.method} ` : ''}${data.url}`
          : event.type === 'assertion' && typeof data.matcher === 'string'
            ? `${data.negated === true ? '.not.' : ''}${data.matcher}`
            : typeLabel
  let status =
    event.type === 'network'
      ? data.phase === 'response' && typeof data.status === 'number'
        ? `HTTP ${data.status}`
        : data.phase === 'failed'
          ? '请求失败'
          : undefined
      : typeof data.status === 'string'
        ? eventStatuses[data.status] || data.status
        : undefined
  if (event.type === 'test.end' && data.status === 'passed' && data.assertions === 0) {
    status = '操作完成 · 未验证'
  } else if (event.type === 'step.end' && data.status === 'passed') {
    status = data.category === 'expect' ? '断言通过' : '步骤完成'
  }
  const failed =
    event.type === 'network'
      ? data.phase === 'failed'
      : ['failed', 'timedOut', 'timed_out', 'error', 'interrupted'].includes(String(data.status)) ||
        event.type === 'error' ||
        event.type === 'page.error'
  const fields = (fieldsByType[event.type] || [])
    .filter(([key]) => Object.hasOwn(data, key))
    .map(([key, label]) => {
      const value =
        key === 'durationMs' && typeof data[key] === 'number'
          ? `${data[key]} ms`
          : key === 'negated' && typeof data[key] === 'boolean'
            ? data[key]
              ? '是（.not）'
              : '否'
            : key === 'source' && data[key] === 'api'
              ? 'Playwright API'
              : data[key]
      return { key, label, value }
    })
  return {
    title,
    typeLabel,
    status,
    failed,
    fields,
    attempt: attemptLabel(data.attempt),
    known: event.type === 'network' || Object.hasOwn(eventTypes, event.type),
    hasExpected: Object.hasOwn(data, 'expected'),
    hasActual: Object.hasOwn(data, 'actual'),
    expectedLabel: event.type === 'assertion' ? '预期参数' : '预期值',
  }
}

/** Step IDs may repeat across test attempts; pair only within the same test and attempt. */
export function stepCounterpart(event: RunEvent, events: RunEvent[]) {
  if (!['step.begin', 'step.end'].includes(event.type) || !event.data.stepId) return undefined
  const counterpartType = event.type === 'step.begin' ? 'step.end' : 'step.begin'
  return events.find(
    (candidate) =>
      candidate.type === counterpartType &&
      candidate.data.stepId === event.data.stepId &&
      candidate.data.testId === event.data.testId &&
      candidate.data.attempt === event.data.attempt,
  )
}

export function printable(value: unknown): string {
  if (value === undefined) return '未记录'
  if (typeof value === 'string') return value
  return JSON.stringify(value, null, 2) ?? String(value)
}
