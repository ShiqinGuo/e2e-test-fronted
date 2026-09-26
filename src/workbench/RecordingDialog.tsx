import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, projectPath } from '../api'
import type { Environment, Recording, RuntimeCapabilities, Scenario } from '../types'
import { Button, ErrorNotice, Field, Modal, SelectControl, Spinner } from '../components/ui'

export function RecordingDialog({
  projectId,
  scenario,
  environment,
  role,
  capabilities,
  onClose,
  onResume,
  onBusyChange,
}: {
  projectId: string
  scenario: Scenario
  environment: Environment
  role: string
  capabilities: RuntimeCapabilities
  onClose: () => void
  onResume: (recording: Recording) => void
  onBusyChange: (busy: boolean) => void
}) {
  const [website, setWebsite] = useState(Object.keys(environment.websites)[0])
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const query = useQuery({
    queryKey: ['recordings', projectId],
    queryFn: ({ signal }) => api.list<Recording>(`${projectPath(projectId)}/recordings`, signal),
    staleTime: 0,
  })
  async function record() {
    setPending(true)
    onBusyChange(true)
    setError(null)
    try {
      const recording = await api.post<Recording>(`${projectPath(projectId)}/recordings`, {
        environmentId: environment.id,
        scenarioId: scenario.id,
        website,
        role: role || undefined,
      })
      onResume(recording)
    } catch (error) {
      setError(error)
    } finally {
      setPending(false)
      onBusyChange(false)
    }
  }
  return (
    <Modal
      title="开始录制"
      description="在网页内操作远程浏览器，录制步骤与断言。"
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose()
      }}
    >
      <div className="dialog-body stack">
        <ErrorNotice error={error || query.error} />
        {!capabilities.recorder.available && <p className="setup-notice">{capabilities.recorder.reason}</p>}
        {query.data
          ?.filter((item) => item.scenarioId === scenario.id && item.status !== 'error')
          .slice(0, 5)
          .map((item) => (
            <div className="recording-recovery" key={item.id}>
              <span>{new Date(item.createdAt).toLocaleString('zh-CN')}</span>
              <Button variant="ghost" disabled={pending} onClick={() => onResume(item)}>
                {item.status === 'stopped' ? '查看代码' : '继续录制'}
              </Button>
            </div>
          ))}
        <Field label="录制网站">
          <SelectControl
            value={website}
            onValueChange={setWebsite}
            options={Object.entries(environment.websites).map(([name, url]) => ({
              value: name,
              label: `${name} · ${url}`,
            }))}
          />
        </Field>
        <dl className="key-value">
          <dt>环境</dt>
          <dd>{environment.name}</dd>
          <dt>会话角色</dt>
          <dd>{role || '默认会话'}</dd>
          <dt>场景</dt>
          <dd>{scenario.name}</dd>
        </dl>
      </div>
      <footer className="dialog-footer">
        <Button variant="outline" disabled={pending} onClick={onClose}>
          取消
        </Button>
        <Button
          disabled={pending || !website || !capabilities.recorder.available}
          onClick={() => void record()}
        >
          {pending ? <Spinner label="正在创建会话" /> : '开始录制'}
        </Button>
      </footer>
    </Modal>
  )
}
