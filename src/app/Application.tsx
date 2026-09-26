import { useContext, useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Building2,
  ChevronRight,
  FolderKanban,
  Globe2,
  History,
  Layers3,
  LogOut,
  Menu,
  Plus,
  Settings2,
  Users,
  Workflow,
} from 'lucide-react'
import { api } from '../api'
import type { Organization, Project, User, Workspace } from '../types'
import {
  Button,
  Empty,
  ErrorNotice,
  Field,
  IconButton,
  Input,
  SearchSelect,
  Spinner,
  ModalSuspendedContext,
} from '../components/ui'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '../components/primitives/sheet'
import { CreateDialog } from '../components/CreateDialog'
import { ProjectWorkspace } from '../workbench/ProjectWorkspace'
import { OrganizationSettings } from '../organizations/OrganizationSettings'
import { canEditResources, canManageOrganization, roleLabels } from '../organizations/permissions'
import { invitationToken } from '../organizations/InvitationGate'
import { clearProject, useNavigation } from './navigation'
import { useDraftGuard } from './DraftGuard'

type CreateKind = 'organization' | 'workspace' | 'project' | 'rename-organization' | 'rename-workspace'
export function Application({
  user,
  onSignedOut,
  onJoin,
}: {
  user: User
  onSignedOut: () => void
  onJoin: (token: string) => void
}) {
  const client = useQueryClient()
  const { guard } = useDraftGuard()
  const { location, navigate } = useNavigation(guard)
  const [create, setCreate] = useState<CreateKind | null>(null)
  const [mobileNav, setMobileNav] = useState(false)
  const [joinLink, setJoinLink] = useState('')
  const [error, setError] = useState<unknown>(null)
  const [signingOut, setSigningOut] = useState(false)
  const navTrigger = useRef<HTMLButtonElement>(null)
  const navSheet = useRef<HTMLDivElement>(null)
  const suspended = useContext(ModalSuspendedContext)
  const organizations = useQuery({
    queryKey: ['organizations'],
    queryFn: ({ signal }) => api.list<Organization>('/organizations', signal),
    refetchInterval: 10_000,
  })
  const organization = organizations.data?.find((o) => o.id === location.organization)
  const workspaces = useQuery({
    queryKey: ['workspaces', location.organization],
    queryFn: ({ signal }) =>
      api.list<Workspace>(`/organizations/${location.organization}/workspaces`, signal),
    enabled: !!organization,
    refetchInterval: 10_000,
  })
  const workspace = workspaces.data?.find((w) => w.id === location.workspace)
  const projects = useQuery({
    queryKey: ['projects', location.workspace],
    queryFn: ({ signal }) =>
      api.list<Project>(`/projects?workspaceId=${encodeURIComponent(location.workspace)}`, signal),
    enabled: !!workspace,
  })
  const project = projects.data?.find((p) => p.id === location.project)
  const linkedProject = useQuery({
    queryKey: ['project-location', location.project],
    queryFn: ({ signal }) => api.get<Project>(`/projects/${encodeURIComponent(location.project)}`, signal),
    enabled: !!location.project && !location.organization,
  })
  useEffect(() => {
    if (!location.organization && organizations.data?.length) {
      if (location.project && !linkedProject.data) return
      const selected = linkedProject.data
        ? organizations.data.find((o) => o.id === linkedProject.data.organizationId)
        : organizations.data[0]
      if (selected)
        navigate(
          {
            organization: selected.id,
            workspace: linkedProject.data?.workspaceId || selected.defaultWorkspaceId,
          },
          true,
        )
    }
  }, [location.organization, location.project, organizations.data, linkedProject.data, navigate])
  useEffect(() => {
    const wide = window.matchMedia('(min-width: 1001px)')
    const close = () => {
      if (wide.matches) setMobileNav(false)
    }
    wide.addEventListener('change', close)
    return () => wide.removeEventListener('change', close)
  }, [])
  const canEdit = !!organization && canEditResources(organization.role)
  const canManage = !!organization && canManageOrganization(organization.role)
  function selectOrganization(id: string) {
    const selected = organizations.data?.find((o) => o.id === id)
    if (!selected) return
    navigate({ organization: id, workspace: selected.defaultWorkspaceId, ...clearProject, view: 'scenarios' })
    setMobileNav(false)
  }
  async function createResource(name: string, description: string) {
    if (create === 'organization') {
      const created = await api.post<Organization>('/organizations', { name })
      await client.invalidateQueries({ queryKey: ['organizations'] })
      navigate({
        organization: created.id,
        workspace: created.defaultWorkspaceId,
        ...clearProject,
        view: 'scenarios',
      })
    } else if (create === 'workspace' && organization) {
      const created = await api.post<Workspace>(`/organizations/${organization.id}/workspaces`, { name })
      await client.invalidateQueries({ queryKey: ['workspaces', organization.id] })
      navigate({ workspace: created.id, ...clearProject, view: 'scenarios' })
    } else if (create === 'project' && workspace) {
      const created = await api.post<Project>('/projects', { workspaceId: workspace.id, name, description })
      await client.invalidateQueries({ queryKey: ['projects', workspace.id] })
      navigate({ ...clearProject, project: created.id, view: 'scenarios' })
    } else if (create === 'rename-organization' && organization) {
      await api.patch(`/organizations/${organization.id}`, { name })
      await client.invalidateQueries({ queryKey: ['organizations'] })
    } else if (create === 'rename-workspace' && workspace) {
      await api.patch(`/workspaces/${workspace.id}`, { name })
      await client.invalidateQueries({ queryKey: ['workspaces', organization?.id] })
    }
  }
  async function signOut() {
    setSigningOut(true)
    setError(null)
    try {
      await api.post('/api/auth/sign-out')
      window.history.replaceState(null, '', '/')
      onSignedOut()
    } catch (error) {
      setError(error)
    } finally {
      setSigningOut(false)
    }
  }
  const beginCreate = (kind: CreateKind) => guard(() => setCreate(kind))
  const sidebar = (
    <div className="sidebar-content">
      <div className="sidebar-organization">
        <span className="organization-mark">
          <Workflow size={17} />
        </span>
        <SearchSelect
          aria-label="选择组织"
          value={organization?.id || ''}
          placeholder="选择组织"
          options={(organizations.data || []).map((o) => ({
            value: o.id,
            label: o.name,
            description: roleLabels[o.role],
          }))}
          onValueChange={selectOrganization}
        />
        <IconButton label="创建组织" onClick={() => beginCreate('organization')}>
          <Plus size={16} />
        </IconButton>
      </div>
      <div className="sidebar-section-title">团队</div>
      <nav className="workspace-nav" aria-label="主导航">
        <Button
          variant="ghost"
          className={!location.project && location.view !== 'members' ? 'active' : ''}
          onClick={() => {
            navigate({ ...clearProject, view: 'scenarios' })
            setMobileNav(false)
          }}
        >
          <FolderKanban size={16} />
          全部项目
        </Button>
        <Button
          variant="ghost"
          disabled={!organization}
          className={location.view === 'members' ? 'active' : ''}
          onClick={() => {
            navigate({ view: 'members' })
            setMobileNav(false)
          }}
        >
          <Users size={16} />
          成员与权限
        </Button>
      </nav>
      <div className="workspace-switcher">
        <SearchSelect
          aria-label="选择工作区"
          value={workspace?.id || ''}
          placeholder="选择工作区"
          disabled={!organization}
          options={(workspaces.data || []).map((w) => ({ value: w.id, label: w.name }))}
          onValueChange={(id) => {
            navigate({ workspace: id, ...clearProject, view: 'scenarios' })
            setMobileNav(false)
          }}
        />
        {canManage && (
          <IconButton label="新建工作区" onClick={() => beginCreate('workspace')}>
            <Plus size={14} />
          </IconButton>
        )}
      </div>
      <div className="scope-label">
        项目
        {canEdit && workspace && (
          <IconButton label="创建项目" onClick={() => beginCreate('project')}>
            <Plus size={14} />
          </IconButton>
        )}
      </div>
      <div className="sidebar-projects">
        <ErrorNotice error={workspaces.error || projects.error} />
        {projects.isLoading ? (
          <Spinner label="加载项目" />
        ) : (
          projects.data?.map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              className={project?.id === item.id ? 'active' : ''}
              onClick={() => {
                navigate({ ...clearProject, project: item.id, view: 'scenarios' })
                setMobileNav(false)
              }}
            >
              <span className="project-initial">{item.name.slice(0, 1)}</span>
              <span>{item.name}</span>
            </Button>
          ))
        )}
        {workspace && projects.data?.length === 0 && <p className="sidebar-hint">这个工作区暂无项目</p>}
      </div>
      <div className="sidebar-footer">
        <span className="avatar">{user.name.slice(0, 1)}</span>
        <div className="account-identity">
          <strong>{user.name}</strong>
          <small>{organization ? roleLabels[organization.role] : user.email}</small>
        </div>
        <IconButton label="退出登录" disabled={signingOut} onClick={() => guard(() => void signOut())}>
          <LogOut size={15} />
        </IconButton>
      </div>
    </div>
  )
  const loadError = organizations.error || linkedProject.error
  return (
    <div className="app-shell">
      <aside className="desktop-sidebar">{sidebar}</aside>
      <Sheet open={mobileNav && !suspended} onOpenChange={setMobileNav}>
        <SheetContent
          side="left"
          ref={navSheet}
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            navSheet.current?.focus()
          }}
          className="navigation-sheet"
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            if (!suspended) navTrigger.current?.focus()
          }}
        >
          <SheetTitle className="sr-only">工作区导航</SheetTitle>
          <SheetDescription className="sr-only">选择组织、工作区和项目</SheetDescription>
          {sidebar}
        </SheetContent>
      </Sheet>
      <main className="main-workspace">
        <header className="workspace-contextbar">
          <div className="breadcrumbs">
            <IconButton
              label="切换导航"
              className="mobile-menu"
              ref={navTrigger}
              onClick={() => setMobileNav(true)}
            >
              <Menu size={18} />
            </IconButton>
            <strong>{location.view === 'members' ? '成员与权限' : project?.name || '项目'}</strong>
          </div>
          {project && location.view !== 'members' && (
            <nav className="project-tabs" aria-label="项目导航">
              {(
                [
                  { view: 'scenarios', label: '业务场景', icon: Layers3 },
                  { view: 'runs', label: '运行记录', icon: History },
                  { view: 'environments', label: '测试环境', icon: Globe2 },
                ] as const
              ).map((item) => (
                <Button
                  variant="ghost"
                  key={item.view}
                  className={location.view === item.view ? 'active' : ''}
                  aria-label={item.view === 'environments' ? '环境' : item.label}
                  onClick={() => navigate({ view: item.view })}
                >
                  <item.icon size={15} />
                  {item.label}
                </Button>
              ))}
              {!canEdit && <span className="readonly-label">只读访问</span>}
            </nav>
          )}
          {!project && (
            <span className="context-subtitle">{workspace?.name || organization?.name || 'Flowtest'}</span>
          )}
        </header>
        <ErrorNotice error={error || loadError} retry={() => void organizations.refetch()} />
        {organizations.isPending ? (
          <div className="section-loading">
            <Spinner label="正在加载组织" />
          </div>
        ) : loadError ? null : !organizations.data?.length ? (
          <div className="onboarding-page">
            <section className="onboarding-card">
              <Building2 size={30} />
              <h1>建立你的团队工作区</h1>
              <p>在浏览器中组织场景、录制操作，与团队一起查看测试结果。</p>
              <Button onClick={() => beginCreate('organization')}>
                <Plus size={16} />
                创建组织
              </Button>
              <div className="onboarding-divider">或加入已有组织</div>
              <Field label="邀请链接">
                <Input
                  placeholder="粘贴管理员分享的邀请链接"
                  value={joinLink}
                  onChange={(e) => setJoinLink(e.target.value)}
                />
              </Field>
              <Button
                variant="outline"
                disabled={!invitationToken(joinLink)}
                onClick={() => onJoin(invitationToken(joinLink))}
              >
                查看邀请
              </Button>
              <p className="muted">请使用收到邀请的邮箱注册或登录。</p>
            </section>
          </div>
        ) : !organization ? (
          <Empty title="无法访问这个组织" description="请选择你已加入的组织。" />
        ) : location.view === 'members' ? (
          <OrganizationSettings
            key={organization.id}
            organization={organization}
            user={user}
            onLeft={() =>
              navigate({ organization: '', workspace: '', ...clearProject, view: 'scenarios' }, true)
            }
          />
        ) : workspaces.isPending ? (
          <div className="section-loading">
            <Spinner label="加载工作区" />
          </div>
        ) : !workspace ? (
          <Empty title="无法访问这个工作区" description="从左侧选择可访问的工作区。" />
        ) : location.project ? (
          projects.isPending ? (
            <div className="section-loading">
              <Spinner label="加载项目" />
            </div>
          ) : !project ? (
            <Empty title="项目不存在或已不可访问" description="返回工作区选择项目。">
              <Button onClick={() => navigate({ ...clearProject })}>返回项目列表</Button>
            </Empty>
          ) : (
            <>
              <ProjectWorkspace
                key={project.id}
                project={project}
                location={location}
                navigate={navigate}
                canEdit={canEdit}
              />
            </>
          )
        ) : (
          <section className="projects-page">
            <header className="settings-heading">
              <div>
                <h1>{workspace.name}</h1>
                <p>项目中的场景、环境和运行记录与组织成员共享。</p>
              </div>
              <div className="inline">
                {organization.role === 'owner' && (
                  <IconButton label="重命名组织" onClick={() => beginCreate('rename-organization')}>
                    <Building2 size={16} />
                  </IconButton>
                )}
                {canManage && (
                  <IconButton label="重命名工作区" onClick={() => beginCreate('rename-workspace')}>
                    <Settings2 size={16} />
                  </IconButton>
                )}
                {canEdit && (
                  <Button onClick={() => beginCreate('project')}>
                    <Plus size={15} />
                    创建项目
                  </Button>
                )}
              </div>
            </header>
            <ErrorNotice error={projects.error} retry={() => void projects.refetch()} />
            {projects.isPending ? (
              <Spinner label="加载项目" />
            ) : projects.isError ? null : !projects.data.length ? (
              <Empty
                icon={FolderKanban}
                title="创建第一个项目"
                description={
                  canEdit
                    ? '一个项目集中管理一套产品的测试场景与环境。'
                    : '组织成员创建项目后，你可以在这里查看。'
                }
              >
                {canEdit && <Button onClick={() => beginCreate('project')}>创建项目</Button>}
              </Empty>
            ) : (
              <div className="project-list">
                <div className="project-list-head">
                  <span>项目名称</span>
                  <span>最近更新</span>
                </div>
                {projects.data.map((item) => (
                  <button
                    className="project-list-row"
                    key={item.id}
                    onClick={() => navigate({ ...clearProject, project: item.id, view: 'scenarios' })}
                  >
                    <span className="project-initial">{item.name.slice(0, 1)}</span>
                    <div>
                      <strong>{item.name}</strong>
                      <p>{item.description || '业务流程测试项目'}</p>
                    </div>
                    <time>{new Date(item.updatedAt).toLocaleDateString('zh-CN')}</time>
                    <ChevronRight size={15} />
                  </button>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
      <CreateDialog
        key={create || 'closed'}
        title={
          create
            ? {
                organization: '创建组织',
                workspace: '新建工作区',
                project: '创建项目',
                'rename-organization': '重命名组织',
                'rename-workspace': '重命名工作区',
              }[create]
            : ''
        }
        open={!!create}
        onClose={() => setCreate(null)}
        onCreate={createResource}
        showDescription={create === 'project'}
      />
    </div>
  )
}
