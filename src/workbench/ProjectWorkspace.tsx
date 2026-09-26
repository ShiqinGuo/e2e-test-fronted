import { lazy, Suspense, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Globe2 } from 'lucide-react'
import { api, projectPath } from '../api'
import { useDraftGuard } from '../app/DraftGuard'
import type { LocationState } from '../app/navigation'
import type { Environment, Group, Project, Run, RuntimeCapabilities, Scenario } from '../types'
import { Button, Empty, ErrorNotice, Spinner } from '../components/ui'
import { CreateDialog } from '../components/CreateDialog'
import { ExecutionBar } from './ExecutionBar'
import { RecordingDialog } from './RecordingDialog'
import { ScenarioList } from './ScenarioList'
const ScenarioPanel = lazy(() => import('../ScenarioPanel').then((m) => ({ default: m.ScenarioPanel })))
const EnvironmentManager = lazy(() =>
  import('../environments').then((m) => ({ default: m.EnvironmentManager })),
)
const RunWorkspace = lazy(() => import('../runs').then((m) => ({ default: m.RunWorkspace })))

export function ProjectWorkspace({
  project,
  location,
  navigate,
  canEdit,
}: {
  project: Project
  location: LocationState
  navigate: (patch: Partial<LocationState>, replace?: boolean) => void
  canEdit: boolean
}) {
  const client = useQueryClient()
  const { dirty, setDirty, setBusy, guard } = useDraftGuard()
  const [create, setCreate] = useState<{ kind: 'scenario' | 'group'; groupId?: string } | null>(null)
  const [role, setRole] = useState('')
  const [retries, setRetries] = useState(0)
  const [recordOpen, setRecordOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const operation = useRef(false)
  const [error, setError] = useState<unknown>(null)
  const base = projectPath(project.id)
  const scenarios = useQuery({
    queryKey: ['scenarios', project.id],
    queryFn: ({ signal }) => api.list<Scenario>(`${base}/scenarios`, signal),
  })
  const groups = useQuery({
    queryKey: ['groups', project.id],
    queryFn: ({ signal }) => api.list<Group>(`${base}/groups`, signal),
  })
  const environments = useQuery({
    queryKey: ['environments', project.id],
    queryFn: ({ signal }) => api.list<Environment>(`${base}/environments`, signal),
  })
  const capabilities = useQuery({
    queryKey: ['capabilities'],
    queryFn: ({ signal }) => api.get<RuntimeCapabilities>('/capabilities', signal),
  })
  const scenario = scenarios.data?.find((s) => s.id === location.scenario)
  const environment = location.environment
    ? environments.data?.find((e) => e.id === location.environment)
    : environments.data?.[0]
  const runRole = environment?.roles.some((r) => r.name === role) ? role : ''
  const executionDisabled =
    pending || dirty || !!location.recording || !canEdit || !capabilities.data?.runner.available
  async function createResource(name: string, description: string) {
    if (!create) return
    if (create.kind === 'group') {
      await api.post<Group>(`${base}/groups`, { name, description })
      await client.invalidateQueries({ queryKey: ['groups', project.id] })
    } else {
      const value = await api.post<Scenario>(`${base}/scenarios`, {
        name,
        description,
        groupId: create.groupId || null,
      })
      await client.invalidateQueries({ queryKey: ['scenarios', project.id] })
      navigate({ scenario: value.id, recording: '' })
    }
  }
  async function run(options: { versionId?: string; groupId?: string; previous?: Run } = {}) {
    if (operation.current) return
    operation.current = true
    setPending(true)
    setBusy(true)
    setError(null)
    try {
      const result = options.previous
        ? await api.post<Run>(`${base}/runs/${options.previous.id}/rerun`)
        : await api.post<Run>(`${base}/runs`, {
            environmentId: environment?.id,
            ...(options.groupId
              ? { groupId: options.groupId }
              : { scenarioId: scenario?.id, versionId: options.versionId }),
            role: runRole || undefined,
            retries,
          })
      await client.invalidateQueries({ queryKey: ['runs', project.id] })
      setBusy(false)
      navigate({ view: 'runs', run: result.id })
    } catch (error) {
      setError(error)
    } finally {
      operation.current = false
      setPending(false)
      setBusy(false)
    }
  }
  const changeView = (view: LocationState['view']) => navigate({ view, recording: '' })
  return (
    <div className="project-workspace">
      <ErrorNotice error={error} />
      <Suspense
        fallback={
          <div className="section-loading">
            <Spinner />
          </div>
        }
      >
        {location.view === 'environments' ? (
          <EnvironmentManager
            key={project.id}
            projectId={project.id}
            readOnly={!canEdit}
            onClose={() => changeView('scenarios')}
            onSaved={(value) => navigate({ environment: value.id }, true)}
            onDirtyChange={setDirty}
            onBusyChange={setBusy}
          />
        ) : location.view === 'runs' ? (
          <RunWorkspace
            projectId={project.id}
            selectedRunId={location.run}
            onSelectRun={(run) => navigate({ run })}
            scenarios={scenarios.data || []}
            canEdit={canEdit}
            onRerun={canEdit ? (previous) => void run({ previous }) : undefined}
          />
        ) : (
          <>
            <ErrorNotice
              error={scenarios.error || groups.error || environments.error}
              retry={() => {
                void scenarios.refetch()
                void groups.refetch()
                void environments.refetch()
              }}
            />
            {scenarios.isPending || groups.isPending || environments.isPending ? (
              <div className="section-loading">
                <Spinner label="正在加载测试资源" />
              </div>
            ) : scenarios.isError || groups.isError || environments.isError ? null : location.scenario ? (
              scenario ? (
                <>
                  <div className="scenario-back">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate({ scenario: '', recording: '' })}
                    >
                      <ArrowLeft size={14} />
                      全部场景
                    </Button>
                  </div>
                  <ExecutionBar
                    environments={environments.data}
                    environment={environment}
                    onEnvironment={(id) => {
                      setRole('')
                      navigate({ environment: id }, true)
                    }}
                    onManage={() => changeView('environments')}
                    role={runRole}
                    onRole={setRole}
                    retries={retries}
                    onRetries={setRetries}
                    groups={groups.data}
                    onRun={(groupId) => void run({ groupId })}
                    onRecord={() => guard(() => setRecordOpen(true))}
                    disabled={executionDisabled}
                    canEdit={canEdit}
                    canRunScenario={!!scenario.currentVersionId}
                  />
                  <ErrorNotice error={capabilities.error} retry={() => void capabilities.refetch()} />
                  {capabilities.data && !capabilities.data.runner.available && (
                    <div className="setup-notice">{capabilities.data.runner.reason}</div>
                  )}
                  {!environment && (
                    <div className="setup-notice">
                      <Globe2 size={15} />
                      <span>{canEdit ? '添加网站地址后，即可录制和执行。' : '项目尚未配置测试环境。'}</span>
                      {canEdit && (
                        <Button size="sm" variant="ghost" onClick={() => changeView('environments')}>
                          添加环境
                        </Button>
                      )}
                    </div>
                  )}
                  <ScenarioPanel
                    key={scenario.id}
                    projectId={project.id}
                    scenario={scenario}
                    readOnly={!canEdit}
                    recordingId={canEdit ? location.recording || undefined : undefined}
                    onRecordingDone={() => navigate({ recording: '' }, true)}
                    onDirtyChange={setDirty}
                    onBusyChange={setBusy}
                    guard={guard}
                    busy={pending}
                    onRun={(versionId) => void run({ versionId })}
                    runDisabled={executionDisabled || !environment}
                  />
                </>
              ) : (
                <Empty title="场景不存在或已不可访问" description="返回列表选择可访问的场景。">
                  <Button variant="outline" onClick={() => navigate({ scenario: '', recording: '' })}>
                    返回场景列表
                  </Button>
                </Empty>
              )
            ) : (
              <ScenarioList
                scenarios={scenarios.data}
                groups={groups.data}
                canEdit={canEdit}
                onSelect={(scenario) => navigate({ scenario })}
                onCreate={(kind, groupId) => setCreate({ kind, groupId })}
              />
            )}
          </>
        )}
      </Suspense>
      <CreateDialog
        key={create?.kind || 'closed'}
        title={create?.kind === 'group' ? '新建测试组' : '新建场景'}
        open={!!create}
        onClose={() => setCreate(null)}
        onCreate={createResource}
      />
      {recordOpen && scenario && environment && capabilities.data && (
        <RecordingDialog
          projectId={project.id}
          scenario={scenario}
          environment={environment}
          role={runRole}
          capabilities={capabilities.data}
          onBusyChange={setBusy}
          onClose={() => setRecordOpen(false)}
          onResume={(recording) => {
            setRecordOpen(false)
            navigate({ recording: recording.id, environment: recording.environmentId }, true)
          }}
        />
      )}
    </div>
  )
}
