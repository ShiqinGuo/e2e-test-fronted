import { useContext, useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, FileCode2, Files, GitCompareArrows, MoreHorizontal, Play, Save, Upload } from 'lucide-react'
import { api, projectPath } from './api'
import type { Recording, Scenario, Version, VersionSource } from './types'
import {
  Button,
  ErrorNotice,
  Field,
  Hint,
  IconButton,
  Input,
  Modal,
  ModalSuspendedContext,
  Popover,
  PopoverContent,
  PopoverTrigger,
  SelectControl,
  Spinner,
  Textarea,
} from './components/ui'
import { ScenarioEditor, VersionDiff } from './editor'
import { RecordingPanel } from './RecordingPanel'

const starterCode = `import { test, expect } from '@playwright/test';

test('业务流程', async ({ page }) => {
  await page.goto('/');
});
`

export function ScenarioPanel({
  projectId,
  scenario,
  recordingId,
  onRecordingDone,
  onDirtyChange,
  onRun,
  runDisabled,
  guard,
  busy = false,
}: {
  projectId: string
  scenario: Scenario
  recordingId?: string
  onRecordingDone: () => void
  onDirtyChange: (dirty: boolean) => void
  onRun: (versionId?: string) => void
  runDisabled: boolean
  busy?: boolean
  guard: (action: () => void) => void
}) {
  const client = useQueryClient()
  const base = `${projectPath(projectId)}/scenarios/${scenario.id}`
  const versions = useQuery({
    queryKey: ['versions', projectId, scenario.id],
    queryFn: ({ signal }) => api.list<Version>(`${base}/versions`, signal),
  })
  const [selectedId, setSelectedId] = useState<string>('')
  const [code, setCode] = useState(starterCode)
  const [baseline, setBaseline] = useState(starterCode)
  const [modules, setModules] = useState<Record<string, string>>({})
  const [moduleText, setModuleText] = useState('{}')
  const [source, setSource] = useState<VersionSource>('human')
  const [changeNote, setChangeNote] = useState('')
  const [saveOpen, setSaveOpen] = useState(false)
  const [diffOpen, setDiffOpen] = useState(false)
  const [modulesOpen, setModulesOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [moduleError, setModuleError] = useState<unknown>(null)
  const [actionsOpen, setActionsOpen] = useState(false)
  const suspended = useContext(ModalSuspendedContext)
  const initialized = useRef(false)
  const importInput = useRef<HTMLInputElement>(null)
  const selected = versions.data?.find((version) => version.id === selectedId)
  const dirty = code !== baseline || JSON.stringify(modules) !== JSON.stringify(selected?.modules || {})
  const sortedVersions = [...(versions.data || [])].sort((a, b) => b.number - a.number)
  const previous = sortedVersions.find((version) => selected && version.number < selected.number)
  useEffect(() => {
    if (suspended) setActionsOpen(false)
  }, [suspended])
  useEffect(() => {
    if (versions.data && !initialized.current) {
      initialized.current = true
      const version =
        versions.data.find((item) => item.id === scenario.currentVersionId) ||
        [...versions.data].sort((a, b) => b.number - a.number)[0]
      if (version) loadVersion(version)
    }
  }, [versions.data, scenario.currentVersionId])
  useEffect(() => {
    onDirtyChange(dirty)
    return () => onDirtyChange(false)
  }, [dirty, onDirtyChange])
  function loadVersion(version: Version) {
    setSelectedId(version.id)
    setCode(version.code)
    setBaseline(version.code)
    setModules(version.modules || {})
    setSource('human')
    setError(null)
  }
  async function save(e: FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    try {
      const version = await api.post<Version>(`${base}/versions`, {
        code,
        source,
        changeNote: changeNote.trim(),
        checks: [],
        modules,
      })
      client.setQueryData<Version[]>(['versions', projectId, scenario.id], (old) => [...(old || []), version])
      loadVersion(version)
      await client.invalidateQueries({ queryKey: ['scenarios', projectId] })
      setChangeNote('')
      setSaveOpen(false)
    } catch (error) {
      setError(error)
    } finally {
      setPending(false)
    }
  }
  async function importFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 2_000_000) {
      setError(new Error('代码文件不能超过 2 MB。'))
      return
    }
    const nextCode = await file.text()
    guard(() => {
      setCode(nextCode)
      setSource('import')
      setError(null)
    })
  }
  function useRecording(recording: Recording) {
    if (!recording.code.trim()) {
      setError(new Error('录制器尚未生成代码，请检查录制过程。'))
      return
    }
    setCode(recording.code)
    setSource('recording')
    setError(null)
    onRecordingDone()
  }
  return (
    <section className="scenario-panel scenario-workspace">
      <header className="scenario-commandbar">
        <div className="scenario-title-and-version">
          <div className="scenario-identity">
            <div className="scenario-name">
              <FileCode2 size={16} aria-hidden="true" />
              <Hint
                label={scenario.description ? `${scenario.name} · ${scenario.description}` : scenario.name}
              >
                <h1 tabIndex={0}>{scenario.name}</h1>
              </Hint>
            </div>
            <span className="scenario-save-state" role="status">
              {dirty ? (
                <>
                  <span className="scenario-draft-dot" />
                  未保存
                </>
              ) : selected ? (
                <>
                  <Check size={14} />
                  已保存
                </>
              ) : (
                '待建首版'
              )}
              {selected && selected.id !== scenario.currentVersionId && (
                <span className="scenario-version-state">历史版本</span>
              )}
            </span>
          </div>
          <div className="scenario-version-picker">
            <SelectControl
              aria-label="场景版本"
              value={selectedId}
              disabled={versions.isPending || versions.isError}
              placeholder="新场景 · 尚无版本"
              onValueChange={(value) => {
                const version = versions.data?.find((v) => v.id === value)
                if (version) guard(() => loadVersion(version))
              }}
              options={[
                ...(!selectedId ? [{ value: '', label: '新场景 · 尚无版本' }] : []),
                ...sortedVersions.map((version) => ({
                  value: version.id,
                  label: `v${version.number} · ${version.changeNote || { human: '手动编辑', ai: 'AI 代码', recording: '浏览器录制', import: '导入代码' }[version.source]}`,
                  description: new Date(version.createdAt).toLocaleString('zh-CN'),
                })),
              ]}
            />
          </div>
        </div>
        <div className="scenario-command-actions">
          <Popover open={actionsOpen && !suspended} onOpenChange={setActionsOpen}>
            <PopoverTrigger asChild>
              <IconButton label="场景操作" type="button">
                <MoreHorizontal size={16} />
              </IconButton>
            </PopoverTrigger>
            <PopoverContent
              className="scenario-action-menu"
              aria-label="场景操作"
              align="end"
              sideOffset={6}
              collisionPadding={12}
              onCloseAutoFocus={(event) => {
                if (suspended || modulesOpen || diffOpen) event.preventDefault()
              }}
            >
              <Button
                variant="ghost"
                type="button"
                disabled={!!recordingId || busy || versions.isPending || versions.isError}
                onClick={() => {
                  setActionsOpen(false)
                  importInput.current?.click()
                }}
              >
                <Upload size={16} />
                导入代码
              </Button>
              <Button
                variant="ghost"
                type="button"
                disabled={!!recordingId || busy || versions.isPending || versions.isError}
                onClick={() => {
                  setActionsOpen(false)
                  setModulesOpen(true)
                  setModuleText(JSON.stringify(modules, null, 2))
                  setModuleError(null)
                }}
              >
                <Files size={16} />
                复用模块{Object.keys(modules).length ? ` · ${Object.keys(modules).length}` : ''}
              </Button>
              <Button
                variant="ghost"
                type="button"
                disabled={!selected || (!dirty && !previous)}
                onClick={() => {
                  setActionsOpen(false)
                  setDiffOpen(true)
                }}
              >
                <GitCompareArrows size={16} />
                {dirty ? '查看修改' : '版本差异'}
              </Button>
              {selected && (
                <time className="scenario-version-time" dateTime={selected.createdAt}>
                  {new Date(selected.createdAt).toLocaleString('zh-CN')}
                </time>
              )}
            </PopoverContent>
          </Popover>
          <input
            className="sr-only"
            aria-label="导入 Playwright 文件"
            ref={importInput}
            type="file"
            accept=".ts,.js,.mts,.mjs,.txt"
            onChange={importFile}
          />
          <IconButton
            label="执行此版本"
            type="button"
            variant="outline"
            disabled={runDisabled || dirty || !selectedId || !!recordingId}
            onClick={() => onRun(selectedId)}
          >
            <Play size={16} />
          </IconButton>
          <Button
            type="button"
            onClick={() => {
              setError(null)
              setSaveOpen(true)
            }}
            disabled={
              pending ||
              busy ||
              versions.isPending ||
              versions.isError ||
              (!dirty && !!selected) ||
              !!recordingId ||
              !code.trim()
            }
          >
            <Save size={16} />
            保存新版本
          </Button>
        </div>
      </header>
      <ErrorNotice error={versions.error || (!saveOpen ? error : null)} retry={() => versions.refetch()} />
      {versions.isPending || versions.isError ? (
        <div className="section-loading">{versions.isPending && <Spinner />}</div>
      ) : recordingId ? (
        <RecordingPanel projectId={projectId} recordingId={recordingId} onUseCode={useRecording} />
      ) : (
        <ScenarioEditor code={code} onChange={setCode} readOnly={busy || pending} />
      )}
      <Modal
        title="保存新版本"
        description="每次保存生成独立版本，历史运行保留原代码。"
        open={saveOpen}
        onOpenChange={(open) => !pending && setSaveOpen(open)}
      >
        <form onSubmit={save}>
          <div className="dialog-body stack">
            <ErrorNotice error={error} />
            <Field label="修改说明">
              <Input
                autoFocus
                required
                maxLength={1000}
                value={changeNote}
                onChange={(e) => setChangeNote(e.target.value)}
                placeholder="例如：补充提交后的状态检查"
              />
            </Field>
            <Field label="代码来源">
              <SelectControl
                value={source}
                onValueChange={(value) => setSource(value as VersionSource)}
                options={[
                  { value: 'human', label: '手动编辑' },
                  { value: 'ai', label: 'AI 生成' },
                  { value: 'import', label: '导入代码' },
                  { value: 'recording', label: '浏览器录制' },
                ]}
              />
            </Field>
          </div>
          <footer className="dialog-footer">
            <Button variant="outline" type="button" disabled={pending} onClick={() => setSaveOpen(false)}>
              取消
            </Button>
            <Button type="submit" disabled={pending || !changeNote.trim()}>
              {pending ? <Spinner label="正在保存" /> : '保存新版本'}
            </Button>
          </footer>
        </form>
      </Modal>
      <Modal
        title={
          dirty ? '未保存的修改' : `版本差异 · v${previous?.number || '—'} → v${selected?.number || '—'}`
        }
        open={diffOpen}
        onOpenChange={setDiffOpen}
        wide
      >
        <div className="dialog-body">
          <VersionDiff
            before={dirty ? baseline : previous?.code || ''}
            after={code}
            beforeLabel={dirty ? `已保存 · v${selected?.number || '—'}` : `v${previous?.number || '—'}`}
            afterLabel={dirty ? '当前草稿' : `v${selected?.number || '—'}`}
          />
        </div>
      </Modal>
      <Modal
        title="复用模块"
        description="模块与场景版本一起保存。代码通过 ./modules/模块名 引用。"
        open={modulesOpen}
        onOpenChange={setModulesOpen}
        wide
      >
        <div className="dialog-body stack">
          <ErrorNotice error={moduleError} />
          <Field
            label="模块代码 JSON"
            hint={'格式：{"login.ts": "export async function login(page) { ... }"}'}
          >
            <Textarea
              className="mono"
              rows={14}
              value={moduleText}
              onChange={(e) => setModuleText(e.target.value)}
            />
          </Field>
        </div>
        <footer className="dialog-footer">
          <Button variant="outline" type="button" onClick={() => setModulesOpen(false)}>
            取消
          </Button>
          <Button
            type="button"
            onClick={() => {
              try {
                const parsed: unknown = JSON.parse(moduleText)
                if (
                  !parsed ||
                  Array.isArray(parsed) ||
                  typeof parsed !== 'object' ||
                  Object.entries(parsed).some(
                    ([name, value]) => !/^[a-zA-Z0-9_-]+\.ts$/.test(name) || typeof value !== 'string',
                  )
                )
                  throw new Error(
                    '模块必须是对象；文件名使用字母、数字、横线或下划线，并以 .ts 结尾；值为代码字符串。',
                  )
                setModules(parsed as Record<string, string>)
                setModulesOpen(false)
              } catch (error) {
                setModuleError(error)
              }
            }}
          >
            应用到草稿
          </Button>
        </footer>
      </Modal>
    </section>
  )
}
