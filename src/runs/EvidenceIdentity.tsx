import type { EvidenceContext } from './runAssociations'
import { FileCode2, GitCommitHorizontal, History } from 'lucide-react'
import { Hint } from '../components/ui'

export function EvidenceIdentity({
  context,
  showAttempt = false,
}: {
  context?: EvidenceContext
  showAttempt?: boolean
}) {
  return (
    <div className="run-evidence-identity" aria-label="证据归属">
      <span className="run-identity-scene">
        <FileCode2 size={14} aria-hidden="true" />
        <Hint
          label={
            context?.scenarioName
              ? `${context.scenarioName} · 名称来自当前项目目录`
              : '当前目录中没有此场景名称'
          }
        >
          <span className="run-identity-name" tabIndex={0}>
            场景：{context?.scenarioName || '未知场景'}
          </span>
        </Hint>
        {context?.scenarioId && (
          <Hint label={context.scenarioId}>
            <code tabIndex={0}>{context.scenarioId.slice(0, 8)}</code>
          </Hint>
        )}
      </span>
      <span className="run-identity-version">
        <GitCommitHorizontal size={14} aria-hidden="true" />
        固定版本：{context?.versionNumber === undefined ? '未知版本' : `v${context.versionNumber}`}
        {context?.versionId && (
          <Hint label={context.versionId}>
            <code tabIndex={0}>{context.versionId.slice(0, 8)}</code>
          </Hint>
        )}
      </span>
      {showAttempt && context?.attempt !== undefined && (
        <span className="run-identity-attempt">
          <History size={14} aria-hidden="true" />
          {context.attempt === 0 ? '首次执行' : `第 ${context.attempt} 次重试`}
        </span>
      )}
    </div>
  )
}
