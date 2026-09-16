import { useMemo } from 'react'
import { diffLines } from 'diff'
import { GitCompareArrows } from 'lucide-react'
import './editor.css'

export type VersionDiffProps = { before: string; after: string; beforeLabel?: string; afterLabel?: string }

export function VersionDiff({
  before,
  after,
  beforeLabel = '上个版本',
  afterLabel = '当前版本',
}: VersionDiffProps) {
  const changes = useMemo(() => diffLines(before, after), [before, after])
  const added = changes.filter((change) => change.added).reduce((total, change) => total + change.count, 0)
  const removed = changes
    .filter((change) => change.removed)
    .reduce((total, change) => total + change.count, 0)
  let oldLine = 0
  let newLine = 0
  return (
    <section className="editor-diff" aria-label="版本源码差异">
      <div className="editor-toolbar">
        <div className="editor-toolbar-label">
          <GitCompareArrows size={16} aria-hidden="true" />
          <strong>
            {beforeLabel} → {afterLabel}
          </strong>
        </div>
        <span className="editor-diff-count" aria-label={`${added} 行新增，${removed} 行删除`}>
          <span>+{added}</span>
          <span>−{removed}</span>
        </span>
      </div>
      {before === after ? (
        <div className="editor-empty">两个版本的源码相同</div>
      ) : (
        <div className="editor-diff-scroll" tabIndex={0} aria-label="源码差异，减号为删除，加号为新增">
          <table>
            <tbody>
              {changes.flatMap((change, groupIndex) => {
                const lines = change.value.split('\n')
                if (lines.at(-1) === '') lines.pop()
                return lines.map((line, index) => {
                  const oldNumber = change.added ? '' : ++oldLine
                  const newNumber = change.removed ? '' : ++newLine
                  return (
                    <tr
                      key={`${groupIndex}:${index}`}
                      className={change.added ? 'added' : change.removed ? 'removed' : ''}
                    >
                      <td className="editor-diff-line">{oldNumber}</td>
                      <td className="editor-diff-line">{newNumber}</td>
                      <td className="editor-diff-sign">{change.added ? '+' : change.removed ? '−' : ' '}</td>
                      <td className="editor-diff-code">
                        <code>{line || ' '}</code>
                      </td>
                    </tr>
                  )
                })
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
