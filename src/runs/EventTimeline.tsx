import { useState } from 'react'
import {
  Activity,
  ArrowUpRight,
  Braces,
  ChevronDown,
  Clock3,
  ListChecks,
  Network,
  Terminal,
  XCircle,
} from 'lucide-react'
import { Button, Empty, Spinner } from '../components/ui'
import type { RunEvent, Scenario, Version } from '../types'
import { EvidenceIdentity } from './EvidenceIdentity'
import { resolveEventContext } from './runAssociations'
import { eventPresentation, matchesEvidence, printable, stepCounterpart } from './runEvidence'
import type { EvidenceFilter } from './runEvidence'

const filters: { value: EvidenceFilter; label: string; icon: typeof Activity }[] = [
  { value: 'all', label: '全部', icon: Activity },
  { value: 'steps', label: '步骤与断言', icon: ListChecks },
  { value: 'network', label: '请求与数据', icon: Network },
  { value: 'logs', label: '日志', icon: Terminal },
]
const valueLabels: Record<string, string> = {
  status: '状态',
  statusCode: 'HTTP 状态',
  body: '响应内容',
  message: '消息',
  stack: '堆栈',
  name: '名称',
  contentType: '文件类型',
  path: '路径',
  file: '文件',
  line: '行',
  column: '列',
  total: '测试',
  passed: '通过',
  failed: '失败',
  skipped: '跳过',
  flaky: '重试后通过',
  unverified: '未验证',
}

function EvidenceValue({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    (value as Record<string, unknown>).unavailable === true
  ) {
    return <p className="run-value-unavailable">当前观察值不可用</p>
  }
  if (value && typeof value === 'object' && Object.keys(value).length && depth < 2) {
    return (
      <div className="run-value-object">
        {Object.entries(value).map(([key, item]) => (
          <div key={key} className="run-value-entry">
            <span>{Array.isArray(value) ? `[${key}]` : valueLabels[key] || key}</span>
            <EvidenceValue value={item} depth={depth + 1} />
          </div>
        ))}
      </div>
    )
  }
  return <pre>{value === '' ? '""' : printable(value)}</pre>
}

function EventDetails({
  event,
  events,
  versions,
  scenarios,
  onSelect,
}: {
  event: RunEvent
  events: RunEvent[]
  versions: Version[]
  scenarios: Scenario[]
  onSelect: (seq: number) => void
}) {
  const presentation = eventPresentation(event)
  const data = event.data || {}
  const counterpart = stepCounterpart(event, events)
  const test =
    typeof data.testId === 'string'
      ? events.find(
          (candidate) =>
            ['test.begin', 'test.end'].includes(candidate.type) &&
            candidate.data.testId === data.testId &&
            candidate.data.attempt === data.attempt,
        )
      : undefined
  const errors = [data.error, ...(Array.isArray(data.errors) ? data.errors : [])].filter(
    (value) => value !== undefined && value !== null,
  )
  return (
    <section className="run-event-detail" aria-label={`事件 ${event.seq} 详情`}>
      <header>
        <strong>{presentation.typeLabel}</strong>
        <span>#{event.seq}</span>
      </header>
      <time>{new Date(event.timestamp).toLocaleString('zh-CN', { hour12: false })}</time>
      <div className="run-event-context">
        {presentation.attempt && (
          <span className="run-badge">
            {presentation.attempt} · attempt {String(data.attempt)}
          </span>
        )}
        {presentation.status && (
          <span className={`run-badge ${presentation.failed ? 'run-badge-failed' : ''}`}>
            {presentation.failed && <XCircle size={12} aria-hidden="true" />}
            {presentation.status}
          </span>
        )}
        {counterpart && (
          <Button variant="link" size="sm" onClick={() => onSelect(counterpart.seq)}>
            <ArrowUpRight size={12} aria-hidden="true" />
            {event.type === 'step.begin' ? '结束事件' : '开始事件'} #{counterpart.seq}
          </Button>
        )}
      </div>
      {(typeof data.testId === 'string' || event.type.startsWith('test.')) && (
        <EvidenceIdentity context={resolveEventContext(event, events, versions, scenarios)} />
      )}
      {test && typeof test.data.title === 'string' && !event.type.startsWith('test.') && (
        <p className="run-event-test">
          <ListChecks size={13} aria-hidden="true" />
          {test.data.title}
        </p>
      )}
      {(presentation.hasExpected || presentation.hasActual) && (
        <div className="run-value-comparison" aria-label="期望与实际结果">
          <section>
            <h4>{presentation.expectedLabel}</h4>
            <EvidenceValue value={data.expected} />
          </section>
          <section>
            <h4>实际值</h4>
            <EvidenceValue value={data.actual} />
          </section>
        </div>
      )}
      {errors.length > 0 && (
        <section className="run-event-errors" aria-label="执行错误">
          <h4>
            <XCircle size={13} aria-hidden="true" />
            错误
          </h4>
          {errors.map((error, index) => (
            <EvidenceValue key={index} value={error} />
          ))}
        </section>
      )}
      <dl>
        {presentation.fields.map(({ key, label, value }) => (
          <div key={key}>
            <dt>{label}</dt>
            <dd>
              <EvidenceValue value={value} />
            </dd>
          </div>
        ))}
      </dl>
      {typeof data.testId === 'string' && (
        <details className="run-event-identifiers">
          <summary>测试标识</summary>
          <code>{data.testId}</code>
        </details>
      )}
      <details className="run-json" open={!presentation.known}>
        <summary>
          <Braces size={14} aria-hidden="true" />
          原始事件 <ChevronDown size={14} aria-hidden="true" />
        </summary>
        <pre>{printable(event)}</pre>
      </details>
    </section>
  )
}

export function EventTimeline({
  events,
  loading,
  versions,
  scenarios,
}: {
  events: RunEvent[]
  loading: boolean
  versions: Version[]
  scenarios: Scenario[]
}) {
  const [filter, setFilter] = useState<EvidenceFilter>('all')
  const [selectedSequence, setSelectedSequence] = useState<number>()
  const filtered = events.filter((event) => matchesEvidence(event, filter))
  const selected = filtered.find((event) => event.seq === selectedSequence) || filtered[0]
  return (
    <section className="run-evidence" aria-label="运行证据">
      <div className="run-section-heading">
        <h3>
          <Activity size={16} aria-hidden="true" />
          事件与证据 <span>{events.length}</span>
        </h3>
        <span className="run-hint">保留首次执行与所有重试</span>
      </div>
      <div className="run-filter" role="group" aria-label="筛选证据">
        {filters.map(({ value, label, icon: Icon }) => (
          <Button
            variant="ghost"
            size="sm"
            key={value}
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            <Icon size={14} aria-hidden="true" />
            {label}
            <span>{events.filter((event) => matchesEvidence(event, value)).length}</span>
          </Button>
        ))}
      </div>
      {!events.length ? (
        loading ? (
          <Spinner label="等待运行事件" />
        ) : (
          <Empty
            title="尚无运行事件"
            description="运行器记录的步骤、断言与日志会出现在这里。"
            icon={Activity}
          />
        )
      ) : !filtered.length ? (
        <p className="run-inline-empty">此分类尚无事件，可在“全部”中查看原始记录。</p>
      ) : (
        <div className="run-event-split">
          <div className="run-event-list" aria-label="事件列表">
            {filtered.map((event) => {
              const presentation = eventPresentation(event)
              return (
                <Button
                  variant="ghost"
                  key={event.seq}
                  className={event.seq === selected?.seq ? 'selected' : ''}
                  aria-pressed={event.seq === selected?.seq}
                  onClick={() => setSelectedSequence(event.seq)}
                >
                  <span className="run-sequence">{event.seq}</span>
                  <span className="run-event-label">
                    <strong>{presentation.title}</strong>
                    <small>
                      {presentation.typeLabel}
                      {presentation.attempt ? ` · ${presentation.attempt}` : ''}
                    </small>
                    {presentation.status && (
                      <span
                        className={`run-event-result ${presentation.failed ? 'run-event-result-failed' : ''}`}
                      >
                        {presentation.failed ? (
                          <XCircle size={11} aria-hidden="true" />
                        ) : presentation.status === '执行中' ? (
                          <Clock3 size={11} aria-hidden="true" />
                        ) : null}
                        {presentation.status}
                      </span>
                    )}
                  </span>
                  <time>{new Date(event.timestamp).toLocaleTimeString('zh-CN', { hour12: false })}</time>
                </Button>
              )
            })}
          </div>
          {selected && (
            <EventDetails
              key={selected.seq}
              event={selected}
              events={events}
              versions={versions}
              scenarios={scenarios}
              onSelect={setSelectedSequence}
            />
          )}
        </div>
      )}
    </section>
  )
}
