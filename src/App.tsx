import { lazy, Suspense, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronDown,
  CircleHelp,
  FileCode2,
  Folder,
  FolderPlus,
  Globe2,
  History,
  Layers3,
  LogOut,
  Menu,
  Play,
  Plus,
  Radio,
  Search,
  Settings2,
  Workflow,
} from 'lucide-react'
import { api, pauseSessionRequests, projectPath } from './api'
import type { Environment, Group, Project, Recording, Run, Scenario, Session, User } from './types'
import { Auth } from './Auth'
import { CreateDialog } from './components/CreateDialog'
import {
  Button,
  Popover,
  PopoverTrigger,
  PopoverContent,
  IconButton,
  Input,
  SearchSelect,
  SelectControl,
  Empty,
  ErrorNotice,
  Field,
  Modal,
  ModalSuspendedContext,
  Spinner,
} from './components/ui'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from './components/primitives/sheet'
const ScenarioPanel = lazy(() =>
  import('./ScenarioPanel').then((module) => ({ default: module.ScenarioPanel })),
)
const EnvironmentManager = lazy(() =>
  import('./environments').then((module) => ({ default: module.EnvironmentManager })),
)
const RunWorkspace = lazy(() => import('./runs').then((module) => ({ default: module.RunWorkspace })))

type View = 'workspace' | 'runs' | 'environments'
type RuntimeCapabilities = {
  playwrightVersion: string
  runner: { available: boolean; reason?: string }
  recorder: { available: boolean; reason?: string }
  databaseChecks: string
}

export function App() {
  const client = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const [expired, setExpired] = useState(false)
  const session = useQuery({
    queryKey: ['session'],
    queryFn: () => api.get<Session | null>('/api/auth/get-session'),
    staleTime: 60_000,
    retry: false,
    enabled: !expired,
  })
  useEffect(() => {
    const onExpired = () => {
      pauseSessionRequests(true)
      setExpired(true)
      void client.cancelQueries({ predicate: (query) => query.queryKey[0] !== 'session' })
    }
    window.addEventListener('session-expired', onExpired)
    return () => window.removeEventListener('session-expired', onExpired)
  }, [client])
  useEffect(() => {
    if (session.data && !user) setUser(session.data.user)
    if (session.data === null && user && !session.isFetching) {
      pauseSessionRequests(true)
      setExpired(true)
    }
  }, [session.data, session.isFetching, user])
  async function authenticated() {
    const result = await session.refetch()
    if (result.error) throw result.error
    if (!result.data) throw new Error('会话未能建立，请重试登录。')
    if (user && result.data.user.id !== user.id) throw new Error('请使用原账号重新登录，以恢复当前草稿。')
    pauseSessionRequests(false)
    setUser(result.data.user)
    setExpired(false)
    await client.invalidateQueries({ predicate: (query) => query.queryKey[0] !== 'session' })
  }
  if (session.isPending && !user)
    return (
      <div className="boot">
        <Workflow size={30} />
        <Spinner label="正在恢复会话" />
      </div>
    )
  const current = user || session.data?.user
  if (!current)
    return (
      <Auth
        sessionError={session.error}
        retrySession={() => session.refetch()}
        onAuthenticated={authenticated}
      />
    )
  return (
    <>
      <div className="session-workspace" inert={expired}>
        <ModalSuspendedContext.Provider value={expired}>
          <Workbench
            key={current.id}
            user={current}
            onSignedOut={() => {
              pauseSessionRequests(false)
              setUser(null)
              setExpired(false)
              client.clear()
              client.setQueryData(['session'], null)
            }}
          />
        </ModalSuspendedContext.Provider>
      </div>
      {expired && (
        <div className="session-reauth">
          <Auth
            expectedEmail={current.email}
            sessionError={new Error('会话已过期。当前草稿已保留，重新登录后继续。')}
            retrySession={() => {
              void authenticated().catch(() => undefined)
            }}
            onAuthenticated={authenticated}
          />
        </div>
      )}
    </>
  )
}

function Workbench({ user, onSignedOut }: { user: User; onSignedOut: () => void }) {
  const client = useQueryClient()
  const [projectId, setProjectId] = useState(
    () => new URLSearchParams(window.location.search).get('project') || '',
  )
  const [scenarioId, setScenarioId] = useState(
    () => new URLSearchParams(window.location.search).get('scenario') || '',
  )
  const [view, setView] = useState<View>(() => {
    const value = new URLSearchParams(window.location.search).get('view')
    return value === 'runs' || value === 'environments' ? value : 'workspace'
  })
  const [runId, setRunId] = useState<string>(
    () => new URLSearchParams(window.location.search).get('run') || '',
  )
  const [environmentId, setEnvironmentId] = useState(
    () => new URLSearchParams(window.location.search).get('environment') || '',
  )
  const [role, setRole] = useState(() => new URLSearchParams(window.location.search).get('role') || '')
  const [groupId, setGroupId] = useState<string | null>(null)
  const [create, setCreate] = useState<'project' | 'group' | 'scenario' | null>(null)
  const [search, setSearch] = useState('')
  const [mobileNav, setMobileNav] = useState(false)
  const mobileNavTrigger = useRef<HTMLButtonElement>(null)
  const suspended = useContext(ModalSuspendedContext)
  useEffect(() => {
    const wide = window.matchMedia('(min-width: 1001px)')
    const closeDrawer = () => {
      if (wide.matches) setMobileNav(false)
    }
    wide.addEventListener('change', closeDrawer)
    return () => wide.removeEventListener('change', closeDrawer)
  }, [])
  const [error, setError] = useState<unknown>(null)
  const [pending, setPending] = useState(false)
  const operationRef = useRef(false)
  const [recordOpen, setRecordOpen] = useState(false)
  const [recordingId, setRecordingId] = useState<string | undefined>(
    () => new URLSearchParams(window.location.search).get('recording') || undefined,
  )
  const [website, setWebsite] = useState('')
  const [retries, setRetries] = useState(0)
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [dirty, setDirty] = useState(false)
  const dirtyRef = useRef(false)
  const nextAction = useRef<(() => void) | null>(null)
  const [discardOpen, setDiscardOpen] = useState(false)
  const dirtyChanged = useCallback((value: boolean) => {
    dirtyRef.current = value
    setDirty(value)
  }, [])
  const guard = useCallback(
    (action: () => void) => {
      if (pending) return
      if (dirtyRef.current) {
        nextAction.current = action
        setDiscardOpen(true)
      } else action()
    },
    [pending],
  )
  const projects = useQuery({
    queryKey: ['projects', user.id],
    queryFn: ({ signal }) => api.list<Project>('/projects', signal),
  })
  const project = projects.data?.find((item) => item.id === projectId)
  const environments = useQuery({
    queryKey: ['environments', projectId],
    queryFn: ({ signal }) => api.list<Environment>(`${projectPath(projectId)}/environments`, signal),
    enabled: !!project,
  })
  const groups = useQuery({
    queryKey: ['groups', projectId],
    queryFn: ({ signal }) => api.list<Group>(`${projectPath(projectId)}/groups`, signal),
    enabled: !!project,
  })
  const scenarios = useQuery({
    queryKey: ['scenarios', projectId],
    queryFn: ({ signal }) => api.list<Scenario>(`${projectPath(projectId)}/scenarios`, signal),
    enabled: !!project,
  })
  const capabilities = useQuery({
    queryKey: ['capabilities'],
    queryFn: () => api.get<RuntimeCapabilities>('/capabilities'),
    staleTime: 15_000,
  })
  const scenario = scenarios.data?.find((item) => item.id === scenarioId)
  const environment = environments.data?.find((item) => item.id === environmentId)
  const recordings = useQuery({
    queryKey: ['recordings', projectId],
    queryFn: ({ signal }) => api.list<Recording>(`${projectPath(projectId)}/recordings`, signal),
    enabled: !!project && recordOpen,
    staleTime: 0,
  })
  useEffect(() => {
    if (projects.data?.length && !projects.data.some((item) => item.id === projectId))
      setProjectId(projects.data[0].id)
  }, [projects.data, projectId])
  useEffect(() => {
    if (environments.data && !environments.data.some((item) => item.id === environmentId))
      setEnvironmentId(environments.data[0]?.id || '')
  }, [environments.data, environmentId])
  useEffect(() => {
    if (environment && !Object.hasOwn(environment.websites, website))
      setWebsite(Object.keys(environment.websites)[0] || '')
  }, [environment, website])
  useEffect(() => {
    if (!environment?.roles.some((item) => item.name === role)) setRole('')
  }, [environment, role])
  useEffect(() => {
    const query = new URLSearchParams()
    if (projectId) query.set('project', projectId)
    if (scenarioId) query.set('scenario', scenarioId)
    if (view !== 'workspace') query.set('view', view)
    if (runId && view === 'runs') query.set('run', runId)
    if (recordingId) query.set('recording', recordingId)
    if (environmentId) query.set('environment', environmentId)
    if (role) query.set('role', role)
    window.history.replaceState(null, '', `${window.location.pathname}${query.size ? `?${query}` : ''}`)
  }, [projectId, scenarioId, view, runId, recordingId, environmentId, role])
  useEffect(() => {
    const handle = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handle)
    return () => window.removeEventListener('beforeunload', handle)
  }, [])
  function changeProject(id: string) {
    guard(() => {
      setProjectId(id)
      setScenarioId('')
      setGroupId(null)
      setEnvironmentId('')
      setRunId('')
      setRecordingId(undefined)
      setError(null)
      setMobileNav(false)
    })
  }
  function changeView(value: View) {
    guard(() => {
      setView(value)
      setMobileNav(false)
      setError(null)
    })
  }
  function selectScenario(item: Scenario) {
    guard(() => {
      setScenarioId(item.id)
      setGroupId(item.groupId)
      setView('workspace')
      setRecordingId(undefined)
      setMobileNav(false)
      setError(null)
    })
  }
  async function createResource(name: string, description: string) {
    if (create === 'project') {
      const value = await api.post<Project>('/projects', { name, description })
      await client.invalidateQueries({ queryKey: ['projects', user.id] })
      changeProject(value.id)
    } else if (create === 'group') {
      const value = await api.post<Group>(`${projectPath(projectId)}/groups`, { name, description })
      await client.invalidateQueries({ queryKey: ['groups', projectId] })
      setGroupId(value.id)
    } else {
      const value = await api.post<Scenario>(`${projectPath(projectId)}/scenarios`, {
        name,
        description,
        groupId,
      })
      await client.invalidateQueries({ queryKey: ['scenarios', projectId] })
      selectScenario(value)
    }
  }
  async function run(versionId?: string, groupRun = false, oldRun?: Run) {
    if (operationRef.current) return
    operationRef.current = true
    setPending(true)
    setError(null)
    try {
      const result = oldRun
        ? await api.post<Run>(`${projectPath(projectId)}/runs/${oldRun.id}/rerun`)
        : await api.post<Run>(`${projectPath(projectId)}/runs`, {
            environmentId,
            ...(groupRun ? { groupId } : { scenarioId, versionId }),
            role: role || undefined,
            retries,
          })
      await client.invalidateQueries({ queryKey: ['runs', projectId] })
      setRunId(result.id)
      setView('runs')
    } catch (error) {
      setError(error)
    } finally {
      operationRef.current = false
      setPending(false)
    }
  }
  async function record() {
    if (operationRef.current) return
    operationRef.current = true
    setPending(true)
    setError(null)
    try {
      const value = await api.post<Recording>(`${projectPath(projectId)}/recordings`, {
        environmentId,
        scenarioId,
        website,
        role: role || undefined,
      })
      setRecordingId(value.id)
      setRecordOpen(false)
      setView('workspace')
    } catch (error) {
      setError(error)
    } finally {
      operationRef.current = false
      setPending(false)
    }
  }
  async function logout() {
    setPending(true)
    setError(null)
    try {
      await api.post('/api/auth/sign-out')
      onSignedOut()
      window.history.replaceState(null, '', '/')
    } catch (error) {
      setError(error)
    } finally {
      setPending(false)
    }
  }
  const matchingScenarios = (scenarios.data || []).filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()),
  )
  const runDisabled = !environmentId || pending || capabilities.data?.runner.available === false
  const renderScenario = (item: Scenario) => (
    <Button
      variant="ghost"
      key={item.id}
      className={`scenario-item ${scenarioId === item.id && view === 'workspace' ? 'selected' : ''}`}
      onClick={() => selectScenario(item)}
    >
      <FileCode2 size={15} />
      <span>{item.name}</span>
      {!item.currentVersionId && <span className="unsaved-mark" aria-label="尚无版本" />}
    </Button>
  )
  const sidebar = (
    <div className="sidebar-content">
      <div className="sidebar-brand">
        <a
          href="/"
          className="brand"
          onClick={(e) => {
            e.preventDefault()
            changeView('workspace')
          }}
        >
          <Workflow size={24} />
          <span>Flowtest</span>
        </a>
      </div>
      <div className="sidebar-project">
        <SearchSelect
          aria-label="选择项目"
          value={project?.id || ''}
          onValueChange={changeProject}
          disabled={pending}
          placeholder="选择项目"
          searchPlaceholder="搜索项目…"
          options={(projects.data || []).map((item) => ({ value: item.id, label: item.name }))}
        />
        <IconButton label="创建项目" onClick={() => guard(() => setCreate('project'))}>
          <Plus size={16} />
        </IconButton>
      </div>
      <nav className="workspace-nav" aria-label="主导航">
        <Button
          variant="ghost"
          aria-label="测试工作台"
          className={view === 'workspace' ? 'active' : ''}
          onClick={() => changeView('workspace')}
        >
          <Layers3 size={16} />
          工作台
        </Button>
        <Button
          variant="ghost"
          className={view === 'runs' ? 'active' : ''}
          disabled={!project}
          onClick={() => changeView('runs')}
        >
          <History size={16} />
          运行记录
        </Button>
        <Button
          variant="ghost"
          aria-label="环境"
          className={view === 'environments' ? 'active' : ''}
          disabled={!project}
          onClick={() => changeView('environments')}
        >
          <Globe2 size={16} />
          测试环境
        </Button>
      </nav>
      <div className="sidebar-header">
        <strong>业务场景</strong>
        <div className="inline">
          <IconButton label="新建测试组" disabled={!project} onClick={() => setCreate('group')}>
            <FolderPlus size={16} />
          </IconButton>
          <IconButton label="新建场景" disabled={!project} onClick={() => guard(() => setCreate('scenario'))}>
            <Plus size={16} />
          </IconButton>
        </div>
      </div>
      <label className="sidebar-search">
        <Search size={14} />
        <Input
          aria-label="搜索场景"
          placeholder="搜索场景"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      <div className="scenario-tree">
        <ErrorNotice
          error={groups.error || scenarios.error}
          retry={() => {
            void groups.refetch()
            void scenarios.refetch()
          }}
        />
        {groups.isLoading || scenarios.isLoading ? (
          <Spinner />
        ) : !project ? (
          <p className="sidebar-hint">创建或选择项目</p>
        ) : (
          <>
            {groups.data
              ?.filter((group) => !search || matchingScenarios.some((item) => item.groupId === group.id))
              .map((group) => (
                <details className="group-node" open key={group.id}>
                  <summary onClick={() => setGroupId(group.id)}>
                    <ChevronDown size={13} />
                    <Folder size={15} />
                    <span>{group.name}</span>
                    <span className="count">
                      {scenarios.data?.filter((item) => item.groupId === group.id).length || 0}
                    </span>
                  </summary>
                  <div className="group-children">
                    {matchingScenarios.filter((item) => item.groupId === group.id).map(renderScenario)}
                    {!search && !scenarios.data?.some((item) => item.groupId === group.id) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setGroupId(group.id)
                          guard(() => setCreate('scenario'))
                        }}
                      >
                        <Plus size={13} />
                        添加场景
                      </Button>
                    )}
                  </div>
                </details>
              ))}
            {matchingScenarios.filter((item) => !item.groupId).map(renderScenario)}
            {!groups.data?.length && !scenarios.data?.length && (
              <div className="sidebar-empty">
                <p>还没有业务场景</p>
                <Button variant="ghost" size="sm" onClick={() => setCreate('group')}>
                  新建测试组
                </Button>
              </div>
            )}
            {search && !matchingScenarios.length && <p className="sidebar-hint">没有匹配的场景</p>}
          </>
        )}
      </div>
      <footer className="sidebar-footer">
        <div className="account-identity">
          <span className="avatar">{(user.name || user.email).slice(0, 1).toUpperCase()}</span>
          <span className="user-name">{user.name || user.email}</span>
        </div>
        <IconButton label="使用帮助" onClick={() => setHelpOpen(true)}>
          <CircleHelp size={16} />
        </IconButton>
        <IconButton label="退出登录" disabled={pending} onClick={() => guard(() => void logout())}>
          <LogOut size={16} />
        </IconButton>
      </footer>
    </div>
  )
  return (
    <div className="app-shell">
      <aside className="desktop-sidebar">{sidebar}</aside>
      <Sheet open={mobileNav && !suspended} onOpenChange={setMobileNav}>
        <SheetContent
          side="left"
          className="navigation-sheet"
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            if (!suspended) mobileNavTrigger.current?.focus()
          }}
        >
          <SheetTitle className="sr-only">项目导航</SheetTitle>
          <SheetDescription className="sr-only">切换项目、业务场景、运行记录和环境</SheetDescription>
          {sidebar}
        </SheetContent>
      </Sheet>
      <main className="main-workspace">
        {!(view === 'workspace' && scenario) && (
          <header className="workspace-contextbar">
            <div className="inline">
              <IconButton
                ref={mobileNavTrigger}
                label="切换导航"
                className="mobile-menu"
                onClick={() => setMobileNav(true)}
              >
                <Menu size={18} />
              </IconButton>
              <span className="context-title">
                {view === 'workspace' ? '测试工作台' : view === 'runs' ? '运行记录' : '测试环境'}
              </span>
            </div>
            <span className="project-caption">{project?.name}</span>
          </header>
        )}
        <Suspense
          fallback={
            <div className="section-loading">
              <Spinner />
            </div>
          }
        >
          <ErrorNotice
            error={projects.error || (!recordOpen ? error : null)}
            retry={() => projects.refetch()}
          />
          {projects.isPending ? (
            <div className="section-loading">
              <Spinner label="正在加载项目" />
            </div>
          ) : !project ? (
            <Empty title="创建第一个项目" description="按项目组织环境、业务场景与运行记录。" icon={Layers3}>
              <Button onClick={() => setCreate('project')}>
                <Plus size={16} />
                创建项目
              </Button>
            </Empty>
          ) : view === 'environments' ? (
            <EnvironmentManager
              key={projectId}
              projectId={projectId}
              onClose={() => changeView('workspace')}
              onSaved={(value) => setEnvironmentId(value.id)}
              onDirtyChange={dirtyChanged}
            />
          ) : view === 'runs' ? (
            <RunWorkspace
              key={projectId}
              projectId={projectId}
              scenarios={scenarios.data || []}
              selectedRunId={runId || undefined}
              onSelectRun={setRunId}
              onRerun={(oldRun) => {
                void run(undefined, false, oldRun)
              }}
            />
          ) : (
            <>
              <div className="execution-bar">
                <div className="execution-context">
                  {scenario && (
                    <IconButton
                      ref={mobileNavTrigger}
                      label="切换导航"
                      className="mobile-menu"
                      onClick={() => setMobileNav(true)}
                    >
                      <Menu size={18} />
                    </IconButton>
                  )}
                  <Globe2 size={16} className="execution-globe muted" />
                  <SearchSelect
                    className="environment-selector"
                    aria-label="运行环境"
                    value={environmentId}
                    onValueChange={setEnvironmentId}
                    disabled={pending}
                    placeholder={environments.isLoading ? '正在加载环境' : '选择测试环境'}
                    searchPlaceholder="搜索环境…"
                    options={(environments.data || []).map((item) => ({
                      value: item.id,
                      label: item.name,
                      description: Object.values(item.websites)[0],
                    }))}
                  />
                  <IconButton label="管理环境" onClick={() => changeView('environments')}>
                    <Settings2 size={15} />
                  </IconButton>
                  <SelectControl
                    className="role-selector"
                    aria-label="运行角色"
                    value={role}
                    onValueChange={setRole}
                    disabled={pending}
                    options={[
                      { value: '', label: '默认会话' },
                      ...(environment?.roles || []).map((item) => ({ value: item.name, label: item.name })),
                    ]}
                  />
                </div>
                <div className="inline execution-actions">
                  <Button
                    variant="outline"
                    disabled={!scenario || !environmentId || pending || !!recordingId}
                    onClick={() => guard(() => setRecordOpen(true))}
                  >
                    <Radio size={15} />
                    录制
                  </Button>
                  <Button
                    disabled={!scenario?.currentVersionId || runDisabled || dirty || !!recordingId}
                    onClick={() => void run()}
                  >
                    <Play size={15} />
                    运行
                  </Button>
                  <Popover open={optionsOpen && !suspended} onOpenChange={setOptionsOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="icon" aria-label="运行选项" disabled={!project}>
                        <ChevronDown size={16} />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="end"
                      sideOffset={6}
                      collisionPadding={12}
                      className="run-options-popover p-0"
                      aria-label="运行选项"
                      onCloseAutoFocus={(event) => {
                        if (suspended) event.preventDefault()
                      }}
                    >
                      <header className="dialog-header">
                        <h2>运行选项</h2>
                      </header>

                      <div className="dialog-body stack">
                        <Field label="失败重试次数">
                          <SelectControl
                            value={String(retries)}
                            onValueChange={(value) => setRetries(Number(value))}
                            options={[
                              { value: '0', label: '不重试' },
                              { value: '1', label: '1 次' },
                              { value: '2', label: '2 次' },
                            ]}
                          />
                        </Field>
                        <p className="muted">重试后通过单独标记，首次失败过程始终保留。</p>
                        <Field label="运行测试组">
                          <SelectControl
                            value={groupId || ''}
                            onValueChange={(value) => setGroupId(value || null)}
                            options={[
                              { value: '', label: '选择测试组' },
                              ...(groups.data || []).map((group) => ({ value: group.id, label: group.name })),
                            ]}
                          />
                        </Field>
                      </div>
                      <footer className="dialog-footer">
                        <Button variant="outline" onClick={() => setOptionsOpen(false)}>
                          完成
                        </Button>
                        <Button
                          disabled={!groupId || runDisabled || dirty}
                          onClick={() => {
                            setOptionsOpen(false)
                            void run(undefined, true)
                          }}
                        >
                          <Play size={15} />
                          运行整组
                        </Button>
                      </footer>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <ErrorNotice error={environments.error} retry={() => environments.refetch()} />
              {!environments.isLoading && !environments.data?.length && !environments.error && (
                <div className="setup-notice">
                  <Globe2 size={15} />
                  <span>添加网站地址后，即可录制和执行。</span>
                  <Button variant="ghost" size="sm" onClick={() => changeView('environments')}>
                    添加环境
                  </Button>
                </div>
              )}
              {scenario ? (
                <ScenarioPanel
                  key={`${projectId}:${scenario.id}`}
                  projectId={projectId}
                  scenario={scenario}
                  recordingId={recordingId}
                  onRecordingDone={() => setRecordingId(undefined)}
                  onDirtyChange={dirtyChanged}
                  guard={guard}
                  busy={pending}
                  onRun={(versionId) => void run(versionId)}
                  runDisabled={runDisabled}
                />
              ) : scenarios.data?.length ? (
                <section className="scenario-overview">
                  <div className="overview-heading">
                    <div>
                      <h1>业务场景</h1>
                      <p>选择场景，编辑检查点或查看已保存的版本。</p>
                    </div>
                    <Button onClick={() => setCreate('scenario')}>
                      <Plus size={16} />
                      新建场景
                    </Button>
                  </div>
                  <div className="overview-list">
                    {[
                      ...(groups.data || []).map((group) => ({ id: group.id, name: group.name })),
                      { id: null, name: '未分组' },
                    ]
                      .filter((group) => matchingScenarios.some((item) => item.groupId === group.id))
                      .map((group) => (
                        <section className="overview-group" key={group.id || 'ungrouped'}>
                          <header>
                            <Folder size={15} />
                            {group.name}
                          </header>
                          {matchingScenarios
                            .filter((item) => item.groupId === group.id)
                            .map((item) => (
                              <Button
                                key={item.id}
                                variant="ghost"
                                className="overview-row"
                                onClick={() => selectScenario(item)}
                              >
                                <FileCode2 size={16} />
                                <div>
                                  <strong>{item.name}</strong>
                                  {item.description && <p>{item.description}</p>}
                                </div>
                                <span className="badge">
                                  {item.currentVersionId ? '已保存版本' : '尚无版本'}
                                </span>
                              </Button>
                            ))}
                        </section>
                      ))}
                  </div>
                  {search && !matchingScenarios.length && (
                    <Empty
                      title="没有匹配的场景"
                      description="试试其他关键词，或清空左侧搜索。"
                      icon={Search}
                    />
                  )}
                </section>
              ) : (
                <Empty
                  title="创建第一个业务场景"
                  description="录制真实操作，或导入 Playwright 测试代码。"
                  icon={Workflow}
                >
                  <div className="inline">
                    <Button onClick={() => setCreate('scenario')}>
                      <Plus size={16} />
                      新建场景
                    </Button>
                    <Button variant="outline" onClick={() => setCreate('group')}>
                      <FolderPlus size={16} />
                      新建测试组
                    </Button>
                  </div>
                </Empty>
              )}
            </>
          )}
        </Suspense>
      </main>
      <CreateDialog
        key={create || 'none'}
        title={create === 'project' ? '创建项目' : create === 'group' ? '新建测试组' : '新建场景'}
        open={!!create}
        onClose={() => setCreate(null)}
        onCreate={createResource}
      />
      <Modal
        title="未保存的修改"
        description="切换后将放弃当前草稿。已保存的版本仍然保留。"
        open={discardOpen}
        onOpenChange={setDiscardOpen}
      >
        <footer className="dialog-footer">
          <Button
            variant="outline"
            onClick={() => {
              nextAction.current = null
              setDiscardOpen(false)
            }}
          >
            继续编辑
          </Button>
          <Button
            onClick={() => {
              const next = nextAction.current
              nextAction.current = null
              setDiscardOpen(false)
              next?.()
            }}
          >
            放弃草稿并继续
          </Button>
        </footer>
      </Modal>
      <Modal
        title="开始录制"
        description="在远程浏览器中操作，使用 Playwright 录制器添加断言。"
        open={recordOpen}
        onOpenChange={(open) => !pending && setRecordOpen(open)}
      >
        <div className="dialog-body stack">
          <ErrorNotice error={error || capabilities.error} />
          {capabilities.data?.recorder.available === false && (
            <div className="setup-notice">
              <span>{capabilities.data.recorder.reason || '录制服务尚未就绪'}</span>
              <Button variant="ghost" size="sm" onClick={() => capabilities.refetch()}>
                重新检查
              </Button>
            </div>
          )}
          <ErrorNotice error={recordings.error} retry={() => recordings.refetch()} />
          {recordings.data
            ?.filter((item) => item.scenarioId === scenarioId && item.status !== 'error')
            .slice(0, 5)
            .map((item) => (
              <div className="recording-recovery" key={item.id}>
                <span>
                  {new Date(item.createdAt).toLocaleString('zh-CN')} ·{' '}
                  {item.status === 'stopped' ? '已停止' : '未结束'}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setRecordingId(item.id)
                    setEnvironmentId(item.environmentId)
                    setRecordOpen(false)
                    setView('workspace')
                  }}
                >
                  {item.status === 'stopped' ? '查看代码' : '继续录制'}
                </Button>
              </div>
            ))}
          <Field label="录制网站">
            <SelectControl
              value={website}
              onValueChange={setWebsite}
              options={Object.entries(environment?.websites || {}).map(([name, url]) => ({
                value: name,
                label: `${name} · ${url}`,
              }))}
            />
          </Field>
          <div className="key-value">
            <span>环境</span>
            <strong>{environment?.name}</strong>
            <span>角色</span>
            <strong>{role || '默认会话'}</strong>
            <span>场景</span>
            <strong>{scenario?.name}</strong>
          </div>
        </div>
        <footer className="dialog-footer">
          <Button variant="outline" disabled={pending} onClick={() => setRecordOpen(false)}>
            取消
          </Button>
          <Button
            disabled={pending || !website || capabilities.data?.recorder.available === false}
            onClick={() => void record()}
          >
            {pending ? (
              <Spinner label="正在创建会话" />
            ) : (
              <>
                <Radio size={15} />
                开始录制
              </>
            )}
          </Button>
        </footer>
      </Modal>

      <Modal title="工作台帮助" open={helpOpen} onOpenChange={setHelpOpen}>
        <div className="dialog-body stack">
          <ol className="help-steps">
            <li>添加测试环境，填写已部署的网站和 API 地址。</li>
            <li>新建业务场景，录制操作或导入 Playwright 代码。</li>
            <li>添加实际断言，保存为新版本后运行。</li>
            <li>在运行记录中检查步骤、请求和 Trace；重新执行会创建新记录。</li>
          </ol>
          <div className="help-links">
            <a href="https://playwright.dev/docs/codegen" target="_blank" rel="noreferrer">
              Playwright 录制器
            </a>
            <a href="https://playwright.dev/docs/trace-viewer" target="_blank" rel="noreferrer">
              Trace Viewer
            </a>
          </div>
          <ErrorNotice error={capabilities.error} retry={() => capabilities.refetch()} />
          {capabilities.data && (
            <details>
              <summary>运行服务状态</summary>
              <pre>{JSON.stringify(capabilities.data, null, 2)}</pre>
            </details>
          )}
        </div>
      </Modal>
    </div>
  )
}
