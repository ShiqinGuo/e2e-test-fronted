import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Circle, ExternalLink, FileCode2, Square } from 'lucide-react'
import { api, projectPath, sameOriginUrl } from './api'
import { Button, Empty, ErrorNotice, Spinner } from './components/ui'
import type { Recording } from './types'

export function RecordingPanel({
  projectId,
  recordingId,
  onUseCode,
}: {
  projectId: string
  recordingId: string
  onUseCode: (recording: Recording) => void
}) {
  const [error, setError] = useState<unknown>(null)
  const [pending, setPending] = useState(false)
  const path = `${projectPath(projectId)}/recordings/${recordingId}`
  const recording = useQuery({
    queryKey: ['recording', projectId, recordingId],
    queryFn: ({ signal }) => api.get<Recording>(path, signal),
    refetchInterval: (query) =>
      query.state.data && ['stopped', 'error'].includes(query.state.data.status) ? false : 1500,
  })
  const data = recording.data
  const viewerUrl = sameOriginUrl(data?.viewerUrl)
  useEffect(() => {
    setError(null)
  }, [recordingId])
  async function stop() {
    setPending(true)
    setError(null)
    try {
      const result = await api.post<Recording>(`${path}/stop`)
      await recording.refetch()
      if (result.status === 'stopped') onUseCode(result)
    } catch (error) {
      setError(error)
    } finally {
      setPending(false)
    }
  }
  return (
    <section className="recording-panel">
      <div className="panel-toolbar">
        <div className="inline">
          <Circle size={14} className={data?.status === 'ready' ? 'record-indicator' : ''} />
          <strong>浏览器录制</strong>
          <span className="badge">
            {
              {
                starting: '正在启动',
                ready: '录制中',
                stopping: '正在停止',
                stopped: '已停止',
                error: '录制失败',
              }[data?.status || 'starting']
            }
          </span>
        </div>
        <div className="inline">
          {viewerUrl && (
            <Button variant="outline" size="sm" asChild>
              <a href={viewerUrl} target="_blank" rel="noreferrer">
                <ExternalLink size={14} />
                独立窗口
              </a>
            </Button>
          )}
          {data && ['ready', 'starting'].includes(data.status) && (
            <Button variant="outline" size="sm" disabled={pending} onClick={stop}>
              {pending ? (
                <Spinner label="正在停止" />
              ) : (
                <>
                  <Square size={13} />
                  停止并编辑
                </>
              )}
            </Button>
          )}
        </div>
      </div>
      <ErrorNotice
        error={error || recording.error || (data?.error ? new Error(data.error) : null)}
        retry={() => recording.refetch()}
      />
      {viewerUrl && data?.status === 'ready' ? (
        <>
          <div className="recorder-hint">使用录制器的可见性、文本、值断言工具点选检查点。</div>
          <iframe
            className="recorder-frame"
            src={viewerUrl}
            title="Playwright 远程录制器"
            allow="clipboard-read; clipboard-write; fullscreen"
          />
        </>
      ) : data?.status === 'stopped' ? (
        <Empty title="录制已停止" icon={FileCode2}>
          <Button onClick={() => onUseCode(data)}>编辑录制代码</Button>
        </Empty>
      ) : data?.status === 'error' ? (
        <Empty title="录制器未能启动" description="修复页面显示的运行环境问题后可重新录制。" />
      ) : (
        <div className="recording-loading">
          <Spinner label={data?.status === 'stopping' ? '正在保存最终录制代码' : '正在准备远程浏览器'} />
          <p className="muted">
            {data?.status === 'stopping' ? '完成后可编辑录制代码。' : '启动后将在这里显示真实录制器。'}
          </p>
        </div>
      )}
    </section>
  )
}
