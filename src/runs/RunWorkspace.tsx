import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Activity,
  ArrowUpRight,
  Braces,
  CheckCheck,
  ChevronDown,
  Circle,
  Clock3,
  Code2,
  FileText,
  History,
  Image,
  ListChecks,
  RefreshCw,
  RotateCcw,
  Square,
  XCircle,
} from 'lucide-react'
import { api, projectPath, sameOriginUrl } from '../api'
import { Button, Empty, ErrorNotice, Hint, IconButton, Spinner } from '../components/ui'
import type { Run, RunArtifact, RunEvent, Scenario, Version } from '../types'
import { EvidenceIdentity } from './EvidenceIdentity'
import { resolveArtifactContext } from './runAssociations'
import { isActiveRun, mergeRunEvents, printable, runOutcome } from './runEvidence'
import { EventTimeline } from './EventTimeline'
import './runs.css'

interface RunWorkspaceProps {
  projectId: string
  selectedRunId?: string
  onSelectRun: (id: string) => void
  onRerun?: (run: Run) => void
  canEdit: boolean
  scenarios: Scenario[]
}
interface EventPage {
  items: RunEvent[]
  nextAfter: number
}
interface EventCache {
  items: RunEvent[]
  nextAfter: number
}

const dateTime = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '—'
const shortId = (value: string) => value.slice(0, 8)

function duration(run: Run) {
  if (!run.startedAt) return '尚未开始'
  const milliseconds =
    new Date(run.finishedAt || new Date().toISOString()).getTime() - new Date(run.startedAt).getTime()
  return `${Math.max(0, milliseconds / 1000).toFixed(1)} 秒${run.finishedAt ? '' : ' · 进行中'}`
}

function Outcome({ run, compact = false }: { run: Run; compact?: boolean }) {
  const result = runOutcome(run)
  const Icon = result.verified
    ? CheckCheck
    : result.tone === 'failed'
      ? XCircle
      : isActiveRun(run)
        ? Clock3
        : Circle
  return (
    <div className={`run-outcome ${compact ? 'run-outcome-compact' : ''}`}>
      <span className={`run-badge run-badge-${result.tone}`}>
        <Icon size={13} aria-hidden="true" />
        {result.statusLabel}
      </span>
      {!compact && <span className="run-badge">{result.verificationLabel}</span>}
      {!!run.summary?.flaky && (
        <span className="run-badge run-badge-attention">重试后通过 {run.summary.flaky}</span>
      )}
      {compact && run.verification !== 'verified' && (
        <span className="run-verification">{result.verificationLabel}</span>
      )}
    </div>
  )
}

function ArtifactList({
  artifacts,
  events,
  versions,
  scenarios,
}: {
  artifacts: RunArtifact[]
  events: RunEvent[]
  versions: Version[]
  scenarios: Scenario[]
}) {
  return (
    <section className="run-artifacts">
      <div className="run-section-heading">
        <h3>
          <FileText size={16} aria-hidden="true" />
          工件 <span>{artifacts.length}</span>
        </h3>
      </div>
      {!artifacts.length ? (
        <p className="run-inline-empty">尚无工件。完成后可在此查看运行器实际保存的文件。</p>
      ) : (
        <div className="run-artifact-grid">
          {artifacts.map((artifact) => {
            const url = sameOriginUrl(artifact.url)
            const isImage = artifact.contentType.startsWith('image/')
            const typeLabel =
              artifact.kind === 'trace'
                ? 'Trace 过程'
                : isImage
                  ? '页面截图'
                  : artifact.kind === 'network'
                    ? '网络记录'
                    : artifact.kind === 'video'
                      ? '运行视频'
                      : /log/.test(artifact.kind)
                        ? '运行日志'
                        : artifact.contentType.includes('json')
                          ? 'JSON 记录'
                          : '运行文件'
            return (
              <article key={artifact.id} className="run-artifact">
                <div className="run-artifact-heading">
                  {isImage ? (
                    <Image size={16} aria-hidden="true" />
                  ) : (
                    <FileText size={16} aria-hidden="true" />
                  )}
                  <div>
                    <strong>{typeLabel}</strong>
                    <small>
                      {artifact.kind} · {(artifact.size / 1024).toFixed(1)} KB
                    </small>
                  </div>
                  {url ? (
                    <IconButton label={`打开 ${artifact.name}`} asChild>
                      <a href={url} target="_blank" rel="noreferrer">
                        <ArrowUpRight size={16} />
                      </a>
                    </IconButton>
                  ) : (
                    <small>地址不可用</small>
                  )}
                </div>
                <EvidenceIdentity
                  context={resolveArtifactContext(artifact, events, versions, scenarios)}
                  showAttempt
                />
                <details className="run-artifact-file">
                  <summary>
                    文件信息
                    <ChevronDown size={14} aria-hidden="true" />
                  </summary>
                  <code>{artifact.name}</code>
                  <span>{artifact.contentType}</span>
                </details>
                {isImage && url && (
                  <a href={url} target="_blank" rel="noreferrer">
                    <img loading="lazy" src={url} alt={artifact.name} />
                  </a>
                )}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

function Snapshot({ run, scenarios }: { run: Run; scenarios: Scenario[] }) {
  return (
    <section className="run-snapshots">
      <details className="run-json">
        <summary>
          <Code2 size={15} aria-hidden="true" />
          本次版本与源码 <span>{run.versions?.length ?? 0}</span>
          <ChevronDown size={14} aria-hidden="true" />
        </summary>
        <div className="run-versions">
          {run.versions?.map((version) => (
            <details key={version.id} className="run-json">
              <summary>
                v{version.number} ·{' '}
                {scenarios.find((scenario) => scenario.id === version.scenarioId)?.name || '未知场景'} · 场景{' '}
                {shortId(version.scenarioId)}
                <span>{version.source}</span>
                <ChevronDown size={14} aria-hidden="true" />
              </summary>
              <div className="run-version-meta">
                <code>{version.id}</code>
                <span>{dateTime(version.createdAt)}</span>
                <span>{version.changeNote}</span>
              </div>
              <pre>{version.code}</pre>
              {version.checks?.length > 0 && (
                <details className="run-json">
                  <summary>
                    <ListChecks size={14} aria-hidden="true" />
                    版本检查点元数据 <ChevronDown size={14} aria-hidden="true" />
                  </summary>
                  <p className="run-hint">实际执行的断言以运行事件和 Trace 为准。</p>
                  <pre>{printable(version.checks)}</pre>
                </details>
              )}
              {Object.entries(version.modules || {}).map(([name, code]) => (
                <details key={name} className="run-json">
                  <summary>
                    {name}
                    <ChevronDown size={14} aria-hidden="true" />
                  </summary>
                  <pre>{code}</pre>
                </details>
              ))}
            </details>
          ))}
        </div>
      </details>
      <details className="run-json">
        <summary>
          <Braces size={15} aria-hidden="true" />
          环境快照 <span>服务端脱敏</span>
          <ChevronDown size={14} aria-hidden="true" />
        </summary>
        <pre>{printable(run.environmentSnapshot)}</pre>
      </details>
    </section>
  )
}

function RunDetails({
  projectId,
  runId,
  onRerun,
  canEdit,
  onSelectRun,
  scenarios,
}: {
  projectId: string
  runId: string
  onRerun?: (run: Run) => void
  canEdit: boolean
  onSelectRun: (id: string) => void
  scenarios: Scenario[]
}) {
  const queryClient = useQueryClient()
  const base = `${projectPath(projectId)}/runs/${encodeURIComponent(runId)}`
  const runQuery = useQuery({
    queryKey: ['run', projectId, runId],
    queryFn: ({ signal }) => api.get<Run>(base, signal),
    refetchInterval: (query) => (isActiveRun(query.state.data) ? 1500 : false),
  })
  const run = runQuery.data
  const active = isActiveRun(run)
  const eventsKey = ['run-events', projectId, runId]
  const artifactsKey = ['run-artifacts', projectId, runId]
  const eventsQuery = useQuery<EventCache>({
    queryKey: eventsKey,
    enabled: !!run,
    queryFn: async ({ signal }) => {
      const previous = queryClient.getQueryData<EventCache>(['run-events', projectId, runId])
      let result: EventCache = previous || { items: [], nextAfter: 0 }
      while (true) {
        const cursor = result.nextAfter
        const page = await api.get<EventPage>(`${base}/events?after=${cursor}&limit=100`, signal)
        if (!Array.isArray(page.items) || !Number.isFinite(page.nextAfter))
          throw new Error('运行事件格式无效，请重试。')
        result = {
          items: mergeRunEvents(result.items, page.items),
          nextAfter: Math.max(cursor, page.nextAfter),
        }
        if (page.items.length < 100 || page.nextAfter <= cursor) return result
      }
    },
    refetchInterval: active ? 1500 : false,
  })
  const artifactsQuery = useQuery({
    queryKey: artifactsKey,
    queryFn: ({ signal }) => api.list<RunArtifact>(`${base}/artifacts`, signal),
    enabled: !!run,
    refetchInterval: active ? 4000 : false,
  })
  useEffect(() => {
    if (run && !isActiveRun(run)) {
      void queryClient.invalidateQueries({ queryKey: ['run-events', projectId, runId] })
      void queryClient.invalidateQueries({ queryKey: ['run-artifacts', projectId, runId] })
      void queryClient.invalidateQueries({ queryKey: ['runs', projectId] })
    }
  }, [run?.status, projectId, runId, queryClient])
  const cancel = useMutation({
    mutationFn: () => api.post<Run>(`${base}/cancel`),
    onSuccess: (updated) => {
      queryClient.setQueryData(['run', projectId, runId], updated)
      void queryClient.invalidateQueries({ queryKey: ['runs', projectId] })
    },
  })
  const refresh = () => {
    void runQuery.refetch()
    void eventsQuery.refetch()
    void artifactsQuery.refetch()
  }
  if (runQuery.isPending)
    return (
      <div className="run-detail">
        <Spinner label="加载运行详情" />
      </div>
    )
  if (!run)
    return (
      <div className="run-detail">
        <ErrorNotice
          error={runQuery.error}
          retry={() => {
            void runQuery.refetch()
          }}
        />
      </div>
    )
  const artifacts = artifactsQuery.data || []
  const sourceRunId = run.rerunOf
  const traceExists = artifacts.some(
    (artifact) =>
      artifact.kind.toLowerCase().includes('trace') ||
      /(^|[-_.])trace[-_.].*\.zip$|^trace\.zip$/i.test(artifact.name),
  )
  const traceUrl = `/api/v1${base}/trace`
  const summaryFields: { key: keyof Run['summary']; label: string }[] = [
    { key: 'total', label: '测试' },
    { key: 'passed', label: '通过' },
    { key: 'failed', label: '失败' },
    { key: 'skipped', label: '跳过' },
    { key: 'flaky', label: '重试后通过' },
    { key: 'unverified', label: '未验证' },
  ]
  return (
    <div className="run-detail">
      <header className="run-detail-header">
        <div>
          <h2>
            <History size={19} aria-hidden="true" />
            运行{' '}
            <Hint label={run.id}>
              <code tabIndex={0}>{shortId(run.id)}</code>
            </Hint>
          </h2>
          <Outcome run={run} />
        </div>
        <div className="run-actions">
          <IconButton label="刷新运行证据" onClick={refresh}>
            <RefreshCw size={16} className={runQuery.isFetching ? 'spin' : ''} />
          </IconButton>
          {canEdit && active && (
            <Button variant="outline" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
              <Square size={14} aria-hidden="true" />
              {cancel.isPending ? '取消中' : '取消运行'}
            </Button>
          )}
          {onRerun && (
            <Button variant="outline" onClick={() => onRerun(run)}>
              <RotateCcw size={14} aria-hidden="true" />
              重新执行
            </Button>
          )}
          {traceExists ? (
            <Button asChild>
              <a href={traceUrl} target="_blank" rel="noreferrer">
                <ArrowUpRight size={14} aria-hidden="true" />
                查看过程
              </a>
            </Button>
          ) : (
            <Hint label="本次运行尚无 Trace 工件">
              <span className="run-disabled-action" tabIndex={0}>
                <Button variant="outline" disabled>
                  <ArrowUpRight size={14} aria-hidden="true" />
                  查看过程
                </Button>
              </span>
            </Hint>
          )}
        </div>
      </header>
      <ErrorNotice
        error={runQuery.error}
        retry={() => {
          void runQuery.refetch()
        }}
      />
      <ErrorNotice error={cancel.error} />
      <dl className="run-meta">
        <div>
          <dt>创建</dt>
          <dd>{dateTime(run.createdAt)}</dd>
        </div>
        <div>
          <dt>耗时</dt>
          <dd>{duration(run)}</dd>
        </div>
        <div>
          <dt>环境</dt>
          <dd>{run.environmentSnapshot?.name || shortId(run.environmentId)}</dd>
        </div>
        <div>
          <dt>角色</dt>
          <dd>{run.role || '默认会话'}</dd>
        </div>
        <div>
          <dt>范围</dt>
          <dd>{run.groupId ? `分组 ${shortId(run.groupId)}` : `场景 ${shortId(run.scenarioId || '')}`}</dd>
        </div>
        <div>
          <dt>重试配置</dt>
          <dd>最多 {run.retries} 次</dd>
        </div>
        {sourceRunId && (
          <div>
            <dt>重跑来源</dt>
            <dd className="run-origin">
              <span>原快照重跑</span>
              <Hint label={`查看来源运行 ${sourceRunId}`}>
                <Button variant="link" size="sm" onClick={() => onSelectRun(sourceRunId)}>
                  <History size={12} aria-hidden="true" />
                  {shortId(sourceRunId)}
                </Button>
              </Hint>
            </dd>
          </div>
        )}
      </dl>
      <div className="run-summary" aria-label="运行统计">
        {summaryFields.map(({ key, label }) => (
          <div key={key} data-result={key} data-present={!!run.summary?.[key]}>
            <strong>{run.summary?.[key] ?? '—'}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      {run.summary?.flaky > 0 && (
        <p className="run-retained-failure">
          <History size={15} aria-hidden="true" />
          重试后通过 · 首次失败与各次尝试均保留
        </p>
      )}
      {run.verification === 'unverified' && (
        <p className="run-retained-failure">
          <Circle size={15} aria-hidden="true" />
          没有真实断言 · 操作完成，业务结果未验证
        </p>
      )}
      {run.error && (
        <div className="run-error" role="alert">
          <XCircle size={16} aria-hidden="true" />
          <pre>{run.error}</pre>
        </div>
      )}
      <ErrorNotice
        error={eventsQuery.error}
        retry={() => {
          void eventsQuery.refetch()
        }}
      />
      <EventTimeline
        events={eventsQuery.data?.items || []}
        loading={eventsQuery.isPending || active}
        versions={run.versions || []}
        scenarios={scenarios}
      />
      <ErrorNotice
        error={artifactsQuery.error}
        retry={() => {
          void artifactsQuery.refetch()
        }}
      />
      <ArtifactList
        artifacts={artifacts}
        events={eventsQuery.data?.items || []}
        versions={run.versions || []}
        scenarios={scenarios}
      />
      <Snapshot run={run} scenarios={scenarios} />
    </div>
  )
}

export function RunWorkspace({
  projectId,
  selectedRunId,
  onSelectRun,
  onRerun,
  canEdit,
  scenarios,
}: RunWorkspaceProps) {
  const runsQuery = useQuery({
    queryKey: ['runs', projectId],
    queryFn: ({ signal }) => api.list<Run>(`${projectPath(projectId)}/runs`, signal),
    refetchInterval: (query) => (query.state.data?.some(isActiveRun) ? 3000 : false),
  })
  const runs = [...(runsQuery.data || [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return (
    <section className="run-workspace" aria-label="运行记录">
      <div className="run-layout">
        <aside className="run-history">
          <div className="run-history-heading">
            <h2>
              <History size={17} aria-hidden="true" />
              运行记录 <span>{runs.length}</span>
            </h2>
            <IconButton
              label="刷新运行列表"
              onClick={() => {
                void runsQuery.refetch()
              }}
            >
              <RefreshCw size={15} className={runsQuery.isFetching ? 'spin' : ''} />
            </IconButton>
          </div>
          <ErrorNotice
            error={runsQuery.error}
            retry={() => {
              void runsQuery.refetch()
            }}
          />
          {runsQuery.isPending ? (
            <Spinner label="加载运行记录" />
          ) : !runs.length ? (
            <Empty
              title="尚无运行记录"
              description="保存场景版本后，可在工作台选择环境并运行。"
              icon={History}
            />
          ) : (
            <nav aria-label="选择运行">
              {runs.map((run) => (
                <Button
                  variant="ghost"
                  key={run.id}
                  aria-current={selectedRunId === run.id ? 'true' : undefined}
                  className={`run-history-item ${selectedRunId === run.id ? 'selected' : ''}`}
                  onClick={() => onSelectRun(run.id)}
                >
                  <span className="run-history-row">
                    <code>{shortId(run.id)}</code>
                    <time>{dateTime(run.createdAt)}</time>
                  </span>
                  <Outcome run={run} compact />
                  <small>
                    {run.environmentSnapshot?.name || shortId(run.environmentId)} ·{' '}
                    {run.groupId ? '分组运行' : '单场景'}
                    {run.summary?.failed ? ` · 失败 ${run.summary.failed}` : ''}
                    {run.summary?.skipped ? ` · 跳过 ${run.summary.skipped}` : ''}
                  </small>
                </Button>
              ))}
            </nav>
          )}
        </aside>
        {selectedRunId ? (
          <RunDetails
            key={`${projectId}:${selectedRunId}`}
            projectId={projectId}
            runId={selectedRunId}
            onRerun={onRerun}
            canEdit={canEdit}
            onSelectRun={onSelectRun}
            scenarios={scenarios}
          />
        ) : (
          <div className="run-detail">
            <Empty
              title="选择一条运行记录"
              description="查看当次的版本、环境、断言与原始过程。"
              icon={Activity}
            />
          </div>
        )}
      </div>
    </section>
  )
}
