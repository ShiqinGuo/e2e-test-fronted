import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import {
  ArrowLeft,
  Check,
  Circle,
  Globe,
  KeyRound,
  ListChecks,
  LockKeyhole,
  Plus,
  Save,
  Server,
  Settings2,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { api, projectPath } from '../api'
import type { Environment } from '../types'
import {
  Button,
  Empty,
  ErrorNotice,
  Field,
  IconButton,
  Input,
  Modal,
  SearchSelect,
  Spinner,
  Textarea,
} from '../components/ui'
import {
  buildEnvironmentPayload,
  environmentToDraft,
  newPair,
  newRole,
  type EnvironmentDraft,
  type PairDraft,
  type RoleDraft,
} from './model'
import './environments.css'

interface Props {
  projectId: string
  onClose: () => void
  onSaved?: (environment: Environment) => void
  onDirtyChange?: (dirty: boolean) => void
  onBusyChange?: (busy: boolean) => void
  readOnly?: boolean
}
type Section = 'addresses' | 'identity' | 'actions'
type Selection = 'new' | string

export function EnvironmentManager(props: Props) {
  return <EnvironmentManagerContent key={props.projectId} {...props} />
}

function environmentHost(environment: Environment) {
  const address = environment.websites.main || Object.values(environment.websites)[0]
  if (!address) return undefined
  try {
    return new URL(address).host
  } catch {
    return undefined
  }
}

function EnvironmentManagerContent({
  projectId,
  onClose,
  onSaved,
  onDirtyChange,
  onBusyChange,
  readOnly = false,
}: Props) {
  const queryClient = useQueryClient()
  const [selection, setSelection] = useState<Selection>()
  const [dirty, setDirty] = useState(false)
  const [pendingAction, setPendingAction] = useState<{ selection?: Selection; close?: boolean }>()
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const dirtyCallback = useRef(onDirtyChange)
  dirtyCallback.current = onDirtyChange
  const updateDirty = (value: boolean) => {
    setDirty(value)
    dirtyCallback.current?.(value)
  }
  useEffect(() => () => dirtyCallback.current?.(false), [])
  const queryKey = ['environments', projectId]
  const environments = useQuery({
    queryKey,
    queryFn: ({ signal }) => api.list<Environment>(`${projectPath(projectId)}/environments`, signal),
  })
  useEffect(() => {
    if (selection === undefined && environments.data)
      setSelection(environments.data[0]?.id ?? (readOnly ? undefined : 'new'))
  }, [environments.data, selection, readOnly])
  const selected = environments.data?.find((environment) => environment.id === selection)
  const changeSelection = (next: Selection) => {
    if (saving || next === selection) return
    if (dirty) setPendingAction({ selection: next })
    else {
      setSelection(next)
      setSuccess('')
    }
  }
  const close = () => {
    if (saving) return
    if (dirty) setPendingAction({ close: true })
    else onClose()
  }
  const saved = (environment: Environment) => {
    setSaving(false)
    queryClient.setQueryData<Environment[]>(queryKey, (current) => {
      const previous = current ?? []
      return previous.some((item) => item.id === environment.id)
        ? previous.map((item) => (item.id === environment.id ? environment : item))
        : [...previous, environment]
    })
    void queryClient.invalidateQueries({ queryKey })
    updateDirty(false)
    setSelection(environment.id)
    setSuccess(`已保存「${environment.name}」`)
    onSaved?.(environment)
  }
  const environmentOptions = [
    ...(environments.data ?? []).map((environment) => ({
      value: environment.id,
      label: environment.name,
      description: environmentHost(environment),
    })),
    ...(selection === 'new' ? [{ value: 'new', label: '新环境', description: '尚未保存' }] : []),
  ]
  return (
    <section className="environment-manager" aria-label="测试环境管理">
      <header className="env-page-header">
        <div className="env-heading">
          <IconButton label="返回工作台" type="button" onClick={close} disabled={saving}>
            <ArrowLeft size={16} />
          </IconButton>
          <h1>测试环境</h1>
        </div>
        <div className="env-context-controls">
          {environments.data && (
            <SearchSelect
              className="env-selector"
              aria-label="选择要编辑的环境"
              value={selection ?? ''}
              onValueChange={changeSelection}
              options={environmentOptions}
              placeholder="选择环境"
              searchPlaceholder="搜索环境…"
              disabled={saving}
            />
          )}
          <Button
            variant="outline"
            type="button"
            disabled={saving || readOnly}
            onClick={() => changeSelection('new')}
          >
            <Plus size={16} />
            新建环境
          </Button>
        </div>
      </header>
      {environments.isPending ? (
        <div className="env-loading">
          <Spinner label="加载测试环境" />
        </div>
      ) : environments.isError && !environments.data ? (
        <div className="env-loading">
          <ErrorNotice error={environments.error} retry={() => void environments.refetch()} />
        </div>
      ) : (
        <div className="env-main">
          <ErrorNotice
            error={environments.isError ? environments.error : undefined}
            retry={() => void environments.refetch()}
          />
          {selection === 'new' || selected ? (
            <EnvironmentEditor
              key={selection}
              environment={selected}
              projectId={projectId}
              dirty={dirty}
              success={success}
              onSaved={saved}
              readOnly={readOnly}
              onSaving={(value) => {
                setSaving(value)
                onBusyChange?.(value)
              }}
              onDirty={(value) => {
                updateDirty(value)
                if (value) setSuccess('')
              }}
            />
          ) : (
            <Empty title="选择环境" description="选择要编辑的环境，或新建环境。" icon={Globe} />
          )}
        </div>
      )}
      <Modal
        title="离开未保存的环境？"
        description="当前修改尚未保存。"
        open={!!pendingAction}
        onOpenChange={(open) => {
          if (!open) setPendingAction(undefined)
        }}
      >
        <div className="env-confirm-actions">
          <Button variant="outline" type="button" onClick={() => setPendingAction(undefined)}>
            继续编辑
          </Button>
          <Button
            type="button"
            onClick={() => {
              const action = pendingAction
              setPendingAction(undefined)
              updateDirty(false)
              setSuccess('')
              if (action?.close) onClose()
              else setSelection(action?.selection)
            }}
          >
            放弃修改并离开
          </Button>
        </div>
      </Modal>
    </section>
  )
}

function EnvironmentEditor({
  environment,
  projectId,
  dirty,
  success,
  onSaved,
  onDirty,
  onSaving,
  readOnly,
}: {
  environment?: Environment
  projectId: string
  dirty: boolean
  success: string
  onSaved: (environment: Environment) => void
  onDirty: (dirty: boolean) => void
  onSaving: (saving: boolean) => void
  readOnly: boolean
}) {
  const [draft, setDraft] = useState<EnvironmentDraft>(() => environmentToDraft(environment))
  const [section, setSection] = useState<Section>('addresses')
  const [validationError, setValidationError] = useState<unknown>()
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const mutation = useMutation({
    mutationFn: (payload: ReturnType<typeof buildEnvironmentPayload>) =>
      environment
        ? api.patch<Environment>(
            `${projectPath(projectId)}/environments/${encodeURIComponent(environment.id)}`,
            payload,
          )
        : api.post<Environment>(`${projectPath(projectId)}/environments`, payload),
    onSuccess: (saved) => {
      if (mounted.current) {
        setDraft(environmentToDraft(saved))
        setValidationError(undefined)
        onDirty(false)
        onSaved(saved)
      }
    },
    onSettled: () => {
      if (mounted.current) onSaving(false)
    },
  })
  const update = <K extends keyof EnvironmentDraft>(key: K, value: EnvironmentDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }))
    onDirty(true)
    setValidationError(undefined)
    mutation.reset()
  }
  const tabs: { id: Section; label: string; icon: typeof Globe }[] = [
    { id: 'addresses', label: '地址', icon: Globe },
    { id: 'identity', label: '身份与变量', icon: KeyRound },
    { id: 'actions', label: '前置与清理', icon: ListChecks },
  ]
  return (
    <form
      className="env-editor"
      onSubmit={(event) => {
        event.preventDefault()
        if (readOnly || mutation.isPending) return
        try {
          const payload = buildEnvironmentPayload(draft)
          setValidationError(undefined)
          onSaving(true)
          mutation.mutate(payload)
        } catch (error) {
          setValidationError(error)
        }
      }}
    >
      <div className="env-save-bar">
        <div className="env-save-heading">
          <div className="env-save-title">
            <h2 title={environment?.name}>{environment ? environment.name : '新建环境'}</h2>
            {dirty && (
              <span className="env-draft-state">
                <Circle size={12} />
                未保存
              </span>
            )}
          </div>
          <p className="env-save-note">
            {environment
              ? `更新于 ${new Date(environment.updatedAt).toLocaleString('zh-CN')}`
              : '填写网站地址后，即可用于录制和运行。'}
          </p>
        </div>
        <Button type="submit" disabled={readOnly || mutation.isPending}>
          {mutation.isPending ? (
            <Spinner label="保存中" />
          ) : (
            <>
              <Save size={16} />
              保存环境
            </>
          )}
        </Button>
        {!!(validationError || mutation.error || success) && (
          <div className="env-save-feedback">
            <ErrorNotice error={validationError || mutation.error} />
            {success && (
              <span className="env-success" role="status">
                <Check size={16} />
                {success}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="env-fieldset">
        <div className="env-form-content">
          <fieldset disabled={readOnly || mutation.isPending} className="env-fieldset">
            <div className="env-settings-group">
              <SettingsSection title="基本信息" icon={Settings2}>
                <div className="env-basics">
                  <Field label="环境名称">
                    <Input
                      autoFocus={!environment}
                      required
                      value={draft.name}
                      onChange={(event) => update('name', event.target.value)}
                      placeholder="例如：预发布"
                    />
                  </Field>
                  <Field label="备注">
                    <Input
                      value={draft.description}
                      onChange={(event) => update('description', event.target.value)}
                      placeholder="可选"
                    />
                  </Field>
                </div>
              </SettingsSection>
            </div>
          </fieldset>
          <nav className="env-tabs" aria-label="环境配置分类">
            {tabs.map(({ id, label, icon: Icon }) => (
              <Button
                type="button"
                key={id}
                variant={section === id ? 'secondary' : 'ghost'}
                aria-pressed={section === id}
                onClick={() => setSection(id)}
              >
                <Icon size={16} />
                {label}
              </Button>
            ))}
          </nav>
          <fieldset disabled={readOnly || mutation.isPending} className="env-fieldset">
            {section === 'addresses' && (
              <div className="env-settings-group">
                <SettingsSection title="网站" icon={Globe} description="至少一个网站。录制时按名称选择。">
                  <PairEditor
                    label="网站"
                    rows={draft.websites}
                    onChange={(rows) => update('websites', rows)}
                    kind="url"
                    placeholder="https://test.example.com"
                    namePlaceholder="main"
                  />
                </SettingsSection>
                <SettingsSection title="API 基址" icon={Server} description="用于前置请求、清理与接口检查。">
                  <PairEditor
                    label="API 基址"
                    rows={draft.apiBases}
                    onChange={(rows) => update('apiBases', rows)}
                    kind="url"
                    placeholder="https://api.test.example.com"
                    namePlaceholder="main"
                  />
                </SettingsSection>
                <SettingsSection title="允许的来源" icon={ShieldCheck}>
                  <Field label="额外来源" hint="每行一个完整来源，不含路径。">
                    <Textarea
                      className="env-mono env-origins"
                      rows={3}
                      value={draft.allowedOrigins}
                      onChange={(event) => update('allowedOrigins', event.target.value)}
                      placeholder="https://accounts.example.com"
                    />
                  </Field>
                </SettingsSection>
              </div>
            )}
            {section === 'identity' && (
              <div className="env-settings-group">
                <SettingsSection
                  title="角色"
                  icon={ShieldCheck}
                  description="保存浏览器状态和请求头，不回显已有凭据。"
                >
                  <div className="env-role-list">
                    {!draft.roles.length && (
                      <p className="env-inline-empty">未配置角色，运行使用匿名浏览器。</p>
                    )}
                    {draft.roles.map((role, index) => (
                      <RoleEditor
                        role={role}
                        key={role.id}
                        index={index}
                        onChange={(next) =>
                          update(
                            'roles',
                            draft.roles.map((item) => (item.id === role.id ? next : item)),
                          )
                        }
                        onRemove={() =>
                          update(
                            'roles',
                            draft.roles.filter((item) => item.id !== role.id),
                          )
                        }
                      />
                    ))}
                    <div className="env-row-action">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => update('roles', [...draft.roles, newRole()])}
                      >
                        <Plus size={16} />
                        添加角色
                      </Button>
                    </div>
                  </div>
                </SettingsSection>
                <SettingsSection
                  title="普通变量"
                  icon={Settings2}
                  description="请求中使用 {{variable}} 引用。"
                >
                  <PairEditor
                    label="普通变量"
                    rows={draft.variables}
                    onChange={(rows) => update('variables', rows)}
                    placeholder="值"
                    namePlaceholder="variable"
                  />
                </SettingsSection>
                <SettingsSection
                  title="敏感变量"
                  icon={LockKeyhole}
                  description="仅写入新值。未修改的变量保留。"
                >
                  {!!environment?.secretVariableKeys?.length && (
                    <div className="env-secret-list">
                      {environment.secretVariableKeys.map((key) => (
                        <div className="env-secret-entry" key={key}>
                          <span className="env-secret-name" title={key}>
                            <LockKeyhole size={16} />
                            {key}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            aria-label={`更新敏感变量 ${key}`}
                            disabled={draft.secrets.some((row) => row.key === key)}
                            onClick={() => update('secrets', [...draft.secrets, newPair(key)])}
                          >
                            更新
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <PairEditor
                    label="敏感变量"
                    rows={draft.secrets}
                    onChange={(rows) => update('secrets', rows)}
                    kind="password"
                    placeholder="输入新值"
                    namePlaceholder="secret_key"
                  />
                </SettingsSection>
              </div>
            )}
            {section === 'actions' && (
              <div className="env-action-content">
                <div className="env-settings-group">
                  <SettingsSection
                    title="前置请求"
                    icon={ListChecks}
                    description="运行前执行。apiBase 使用已配置的 API 名称。"
                  >
                    <ActionEditor
                      label="前置请求"
                      value={draft.setup}
                      disabled={readOnly || mutation.isPending}
                      onChange={(value) => update('setup', value)}
                    />
                  </SettingsSection>
                  <SettingsSection
                    title="后置清理"
                    icon={ListChecks}
                    description="运行后清理数据。敏感信息使用 {{variable}} 引用。"
                  >
                    <ActionEditor
                      label="后置清理"
                      value={draft.cleanup}
                      disabled={readOnly || mutation.isPending}
                      onChange={(value) => update('cleanup', value)}
                    />
                  </SettingsSection>
                </div>
                <details className="env-action-reference">
                  <summary>ApiAction 字段与示例</summary>
                  <div className="env-reference-content">
                    <dl>
                      <dt>name / apiBase</dt>
                      <dd>请求名称 / 已配置的 API 名称</dd>
                      <dt>method / path</dt>
                      <dd>HTTP 方法 / 相对路径</dd>
                      <dt>expectedStatus</dt>
                      <dd>预期 HTTP 状态码；业务结果应另加断言</dd>
                      <dt>headers / body</dt>
                      <dd>可选请求头与 JSON 请求体</dd>
                      <dt>capture</dt>
                      <dd>变量名到响应 JSON 路径的映射</dd>
                    </dl>
                    <pre>
                      {
                        '{\n  "name": "准备数据",\n  "apiBase": "main",\n  "method": "POST",\n  "path": "/fixtures",\n  "expectedStatus": 201,\n  "body": { "name": "{{testName}}" },\n  "capture": { "fixtureId": "id" }\n}'
                      }
                    </pre>
                  </div>
                </details>
              </div>
            )}
          </fieldset>
          <p className="env-footnote">环境修改仅影响后续运行。</p>
        </div>
      </div>
    </form>
  )
}

function SettingsSection({
  title,
  icon: Icon,
  description,
  children,
}: {
  title: string
  icon: ComponentType<{ size?: number }>
  description?: string
  children: ReactNode
}) {
  return (
    <section className="env-settings-section">
      <div className="env-section-label">
        <h3>
          <Icon size={16} />
          {title}
        </h3>
        {description && <p>{description}</p>}
      </div>
      <div className="env-section-content">{children}</div>
    </section>
  )
}

function PairEditor({
  label,
  rows,
  onChange,
  kind = 'text',
  placeholder,
  namePlaceholder,
}: {
  label: string
  rows: PairDraft[]
  onChange: (rows: PairDraft[]) => void
  kind?: 'text' | 'url' | 'password'
  placeholder: string
  namePlaceholder: string
}) {
  return (
    <div className="env-pair-editor">
      {!!rows.length && (
        <div className="env-pair-labels" aria-hidden="true">
          <span>名称</span>
          <span>{kind === 'url' ? '地址' : '值'}</span>
        </div>
      )}
      {rows.map((row, index) => (
        <div className="env-pair-row" key={row.id}>
          <Input
            className="env-mono"
            aria-label={`${label} ${index + 1} 名称`}
            value={row.key}
            onChange={(event) =>
              onChange(rows.map((item) => (item.id === row.id ? { ...item, key: event.target.value } : item)))
            }
            placeholder={namePlaceholder}
            autoComplete="off"
            spellCheck={false}
          />
          <Input
            className="env-mono"
            aria-label={`${label} ${index + 1} ${kind === 'url' ? '地址' : '值'}`}
            type={kind}
            value={row.value}
            onChange={(event) =>
              onChange(
                rows.map((item) => (item.id === row.id ? { ...item, value: event.target.value } : item)),
              )
            }
            placeholder={placeholder}
            autoComplete={kind === 'password' ? 'new-password' : 'off'}
            spellCheck={false}
          />
          <IconButton
            type="button"
            label={`移除${label} ${index + 1}`}
            onClick={() => onChange(rows.filter((item) => item.id !== row.id))}
          >
            <Trash2 size={16} />
          </IconButton>
        </div>
      ))}
      <div className="env-row-action">
        <Button type="button" variant="outline" onClick={() => onChange([...rows, newPair()])}>
          <Plus size={16} />
          添加{label}
        </Button>
      </div>
    </div>
  )
}

function RoleEditor({
  role,
  index,
  onChange,
  onRemove,
}: {
  role: RoleDraft
  index: number
  onChange: (role: RoleDraft) => void
  onRemove: () => void
}) {
  const [fileError, setFileError] = useState<unknown>()
  const fileInput = useRef<HTMLInputElement>(null)
  return (
    <div className="env-role">
      <div className="env-role-heading">
        <Field
          label={`角色 ${index + 1}`}
          hint={role.originalName ? '已有角色名称固定；更换身份请添加新角色。' : undefined}
        >
          <Input
            value={role.name}
            readOnly={!!role.originalName}
            onChange={(event) => onChange({ ...role, name: event.target.value })}
            placeholder="例如：buyer"
          />
        </Field>
        <IconButton type="button" label={`移除角色 ${role.name || index + 1}`} onClick={onRemove}>
          <Trash2 size={16} />
        </IconButton>
      </div>
      <div className="env-role-config">
        <span>
          <ShieldCheck size={16} />
          浏览器状态
        </span>
        <span className="env-role-status">
          {role.hasStorageState ? <Check size={16} /> : <Circle size={12} />}
          {role.hasStorageState ? '已配置' : '未配置'}
        </span>
        <Button
          variant="ghost"
          type="button"
          onClick={() => {
            onChange({ ...role, editStorageState: !role.editStorageState, storageState: '' })
            setFileError(undefined)
          }}
        >
          {role.editStorageState ? (
            <>
              <X size={16} />
              取消修改
            </>
          ) : (
            '设置'
          )}
        </Button>
      </div>
      {role.editStorageState && (
        <div className="env-secret-input">
          <Field label="新的 storageState JSON" hint="清空登录态可输入含空 cookies 与 origins 的对象。">
            <Input
              className="env-mono"
              type="password"
              autoComplete="new-password"
              value={role.storageState}
              onChange={(event) => onChange({ ...role, storageState: event.target.value })}
              placeholder='{"cookies":[],"origins":[]}'
            />
          </Field>
          <div className="env-upload-row">
            <Button variant="outline" type="button" onClick={() => fileInput.current?.click()}>
              <Upload size={16} />
              导入 JSON
            </Button>
            <input
              ref={fileInput}
              type="file"
              hidden
              accept=".json,application/json"
              aria-label={`导入角色 ${role.name || index + 1} 的 storageState JSON`}
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (!file) return
                if (file.size > 5 * 1024 * 1024) {
                  setFileError(new Error('登录状态文件不能超过 5 MB。'))
                  event.target.value = ''
                  return
                }
                void file.text().then(
                  (text) => {
                    onChange({ ...role, storageState: text })
                    setFileError(undefined)
                  },
                  () => setFileError(new Error('无法读取文件，请重新选择。')),
                )
                event.target.value = ''
              }}
            />
            {role.storageState && (
              <span className="env-file-status">
                <Check size={16} />
                已输入，保存后生效
              </span>
            )}
          </div>
          <ErrorNotice error={fileError} />
        </div>
      )}
      <div className="env-role-config">
        <span>
          <KeyRound size={16} />
          角色请求头
        </span>
        <span className="env-role-status">
          {role.hasHeaders ? <Check size={16} /> : <Circle size={12} />}
          {role.hasHeaders ? '已配置' : '未配置'}
        </span>
        <Button
          variant="ghost"
          type="button"
          onClick={() => onChange({ ...role, editHeaders: !role.editHeaders, headers: '' })}
        >
          {role.editHeaders ? (
            <>
              <X size={16} />
              取消修改
            </>
          ) : (
            '设置'
          )}
        </Button>
      </div>
      {role.editHeaders && (
        <div className="env-secret-input">
          <Field label="新的请求头 JSON" hint="输入 {} 可清空请求头。未修改则保留已存配置。">
            <Input
              className="env-mono"
              type="password"
              autoComplete="new-password"
              value={role.headers}
              onChange={(event) => onChange({ ...role, headers: event.target.value })}
              placeholder='{"Authorization":"Bearer …"}'
            />
          </Field>
        </div>
      )}
    </div>
  )
}

function ActionEditor({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  disabled: boolean
}) {
  return (
    <div className="env-action-editor">
      <div className="env-code-label">
        <span>{label} JSON</span>
        <span>ApiAction[]</span>
      </div>
      <div className="env-json-editor">
        <CodeMirror
          aria-label={`${label} JSON`}
          value={value}
          onChange={onChange}
          editable={!disabled}
          extensions={[javascript({ jsx: false, typescript: false })]}
          minHeight="144px"
          maxHeight="384px"
          basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: false }}
        />
      </div>
    </div>
  )
}
