import { useEffect, useMemo, useRef, useState } from 'react'
import CodeMirror, { EditorView } from '@uiw/react-codemirror'
import type { ReactCodeMirrorRef } from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import {
  AlertCircle,
  Check,
  ChevronRight,
  Code2,
  ListOrdered,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  ScanLine,
} from 'lucide-react'
import { Button, Field, IconButton, SelectControl, Textarea } from '../components/ui'
import { insertAssertion, parseScenario, updateAssertion } from './source'
import type { AssertionCondition, AssertionDraft } from './source'
import './editor.css'

export type ScenarioEditorProps = { code: string; onChange: (code: string) => void; readOnly?: boolean }
const conditions: { value: AssertionCondition; label: string }[] = [
  { value: 'visible', label: '可见' },
  { value: 'hidden', label: '隐藏' },
  { value: 'text', label: '文本等于' },
  { value: 'containsText', label: '文本包含' },
  { value: 'value', label: '输入值等于' },
  { value: 'count', label: '元素数量' },
  { value: 'url', label: '页面网址' },
]
const defaultDraft = (): AssertionDraft => ({
  locator: "page.getByRole('button', { name: '提交' })",
  condition: 'visible',
  expected: '',
  expectedMode: 'literal',
})
const codeExtensions = [
  javascript({ typescript: true }),
  EditorView.contentAttributes.of({ 'aria-label': 'Playwright 场景源码' }),
]

export function ScenarioEditor({ code, onChange, readOnly = false }: ScenarioEditorProps) {
  const parsed = useMemo(() => parseScenario(code), [code])
  const editor = useRef<ReactCodeMirrorRef>(null)
  const [showSteps, setShowSteps] = useState(true)
  const [activePanel, setActivePanel] = useState<'source' | 'steps'>('source')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = parsed.steps.find((step) => step.id === selectedId)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState<AssertionDraft>(defaultDraft)
  const [testId, setTestId] = useState('')
  const [position, setPosition] = useState<'end' | 'after'>('end')
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const frame = requestAnimationFrame(() => editor.current?.view?.requestMeasure())
    return () => cancelAnimationFrame(frame)
  }, [activePanel, showSteps])
  useEffect(() => {
    if (!adding && selected?.assertion) {
      const { locator, condition, expected, expectedMode } = selected.assertion
      setDraft({ locator, condition, expected, expectedMode })
    }
    setFormError('')
  }, [selected, adding])

  const pickStep = (id: string) => {
    setSelectedId(id)
    setAdding(false)
    setNotice('')
    const step = parsed.steps.find((item) => item.id === id)
    if (step && editor.current?.view) {
      editor.current.view.dispatch({
        selection: { anchor: step.start, head: step.end },
        scrollIntoView: true,
      })
    }
  }
  const startAdding = () => {
    setAdding(true)
    setShowSteps(true)
    setActivePanel('steps')
    setDraft(defaultDraft())
    setTestId(selected?.testId ?? parsed.tests[0]?.id ?? '')
    setPosition(selected?.canInsertAfter ? 'after' : 'end')
    setFormError('')
    setNotice('')
  }
  const apply = () => {
    if (readOnly) return
    try {
      const next = adding
        ? insertAssertion(code, draft, {
            afterStepId: position === 'after' ? selected?.id : undefined,
            testId,
          })
        : updateAssertion(code, selectedId ?? '', draft)
      onChange(next)
      setAdding(false)
      setFormError('')
      setNotice('检查点已写入源码，保存新版本后用于执行。')
    } catch (error) {
      setFormError(error instanceof Error ? error.message : '无法更新源码')
    }
  }
  const updateDraft = <K extends keyof AssertionDraft>(key: K, value: AssertionDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }))
    setFormError('')
  }
  const showForm = adding || Boolean(selected?.assertion)
  const needExpected = !['visible', 'hidden'].includes(draft.condition)

  return (
    <section className="scenario-editor" aria-label="场景编辑器">
      <div className="editor-toolbar">
        <div className="editor-toolbar-label editor-desktop-label">
          <Code2 size={16} />
          <span>源码</span>
          <span className="editor-tag">TypeScript</span>
        </div>
        <div className="editor-panel-switch" role="group" aria-label="编辑器视图">
          <Button
            type="button"
            variant={activePanel === 'source' ? 'secondary' : 'ghost'}
            aria-pressed={activePanel === 'source'}
            onClick={() => setActivePanel('source')}
          >
            <Code2 size={16} />
            源码
          </Button>
          <Button
            type="button"
            variant={activePanel === 'steps' ? 'secondary' : 'ghost'}
            aria-pressed={activePanel === 'steps'}
            onClick={() => {
              setActivePanel('steps')
              setShowSteps(true)
            }}
          >
            <ListOrdered size={16} />
            步骤<span className="editor-count">{parsed.steps.length}</span>
          </Button>
        </div>
        <div className="editor-toolbar-actions">
          {!readOnly && (
            <Button
              type="button"
              variant="outline"
              onClick={startAdding}
              disabled={Boolean(parsed.error) || !parsed.tests.length}
            >
              <Plus size={16} />
              检查点
            </Button>
          )}
          <IconButton
            type="button"
            className="editor-desktop-toggle"
            label={showSteps ? '收起步骤面板' : '展开步骤面板'}
            aria-expanded={showSteps}
            onClick={() => setShowSteps((current) => !current)}
          >
            {showSteps ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
          </IconButton>
        </div>
      </div>
      {parsed.error && (
        <div className="editor-error" role="alert">
          <AlertCircle size={16} />
          <div>
            <strong>源码有语法错误</strong>
            <span>{parsed.error}</span>
            <span>原始代码已保留。修复后恢复步骤与检查点编辑。</span>
          </div>
        </div>
      )}
      <div
        className={`editor-columns${showSteps ? '' : ' editor-code-only'}`}
        data-active-panel={activePanel}
      >
        <div className="editor-code">
          <CodeMirror
            ref={editor}
            className="editor-codemirror"
            value={code}
            extensions={codeExtensions}
            onChange={onChange}
            readOnly={readOnly}
            editable={!readOnly}
            height="100%"
            aria-label="Playwright 场景源码"
            basicSetup={{
              foldGutter: true,
              lineNumbers: true,
              highlightActiveLine: !readOnly,
              autocompletion: !readOnly,
              tabSize: 2,
            }}
          />
          <div className="editor-source-note">
            源码为唯一数据源 · 未识别代码保留{readOnly ? ' · 只读版本' : ''}
          </div>
        </div>
        <aside className="editor-steps" aria-label="步骤与检查点">
          <div className="editor-panel-heading">
            <ListOrdered size={16} />
            <strong>步骤与检查点</strong>
            <span className="editor-count">{parsed.steps.length}</span>
          </div>
          <div className="editor-step-list">
            {!parsed.steps.length && (
              <div className="editor-empty">
                <ListOrdered size={24} />
                <span>{parsed.error ? '等待语法修复' : '尚无可识别步骤'}</span>
                <small>{parsed.error ? '可继续编辑源码' : '导入或编写 test async 回调中的 await 操作'}</small>
              </div>
            )}
            {parsed.steps.map((step, index) => (
              <Button
                key={step.id}
                type="button"
                variant={selectedId === step.id ? 'secondary' : 'ghost'}
                className="editor-step"
                onClick={() => pickStep(step.id)}
                aria-pressed={selectedId === step.id}
              >
                <span className="editor-step-number">{index + 1}</span>
                <span className={`editor-step-icon${step.kind === 'assertion' ? ' assertion' : ''}`}>
                  {step.kind === 'assertion' ? <ScanLine size={16} /> : <Code2 size={16} />}
                </span>
                <span className="editor-step-text">
                  <strong>{step.label}</strong>
                  <code>{step.code}</code>
                </span>
                <span className="editor-line">L{step.line}</span>
              </Button>
            ))}
          </div>
          {(selected || adding) && (
            <section className="editor-inspector" aria-label="检查点配置">
              <div className="editor-panel-heading">
                <ScanLine size={16} />
                <strong>
                  {adding ? '添加检查点' : selected?.kind === 'assertion' ? '检查点' : '步骤源码'}
                </strong>
                {adding ? (
                  <Button
                    variant="ghost"
                    type="button"
                    className="editor-cancel"
                    onClick={() => {
                      setAdding(false)
                      setFormError('')
                    }}
                  >
                    取消
                  </Button>
                ) : (
                  <IconButton
                    label="查看步骤源码"
                    type="button"
                    className="editor-view-source"
                    onClick={() => {
                      setActivePanel('source')
                      requestAnimationFrame(() => editor.current?.view?.focus())
                    }}
                  >
                    <Code2 size={16} />
                  </IconButton>
                )}
              </div>
              {showForm ? (
                <form
                  className="editor-form"
                  onSubmit={(event) => {
                    event.preventDefault()
                    apply()
                  }}
                >
                  {adding && (
                    <>
                      <Field label="插入到">
                        <SelectControl
                          value={position}
                          onValueChange={(value) => setPosition(value as 'end' | 'after')}
                          disabled={readOnly}
                          options={[
                            { value: 'end', label: '测试末尾' },
                            {
                              value: 'after',
                              label: `选中步骤之后${selected ? `（L${selected.line}）` : ''}`,
                              disabled: !selected?.canInsertAfter,
                            },
                          ]}
                        />
                      </Field>
                      {position === 'end' && (
                        <Field label="测试">
                          <SelectControl
                            value={testId}
                            onValueChange={setTestId}
                            disabled={readOnly}
                            options={parsed.tests.map((test) => ({ value: test.id, label: test.name }))}
                          />
                        </Field>
                      )}
                    </>
                  )}
                  <Field label="目标表达式">
                    <Textarea
                      className="mono"
                      rows={2}
                      spellCheck={false}
                      value={draft.locator}
                      onChange={(event) => updateDraft('locator', event.target.value)}
                      readOnly={readOnly}
                      placeholder="page.getByRole('button', { name: '提交' })"
                    />
                  </Field>
                  <Field label="条件">
                    <SelectControl
                      value={draft.condition}
                      options={conditions}
                      disabled={readOnly}
                      onValueChange={(value) => updateDraft('condition', value as AssertionCondition)}
                    />
                  </Field>
                  {!adding && selected?.assertion?.negated && (
                    <span className="editor-hint">此断言含 .not，条件按取反判断。</span>
                  )}
                  {needExpected && (
                    <>
                      <Field label="预期值类型">
                        <SelectControl
                          value={draft.expectedMode}
                          disabled={readOnly}
                          onValueChange={(value) =>
                            updateDraft('expectedMode', value as 'literal' | 'expression')
                          }
                          options={[
                            { value: 'literal', label: '固定值' },
                            { value: 'expression', label: 'JavaScript 表达式 / 变量' },
                          ]}
                        />
                      </Field>
                      <Field label="预期值">
                        <Textarea
                          className="mono"
                          rows={2}
                          spellCheck={false}
                          value={draft.expected}
                          onChange={(event) => updateDraft('expected', event.target.value)}
                          readOnly={readOnly}
                          placeholder={
                            draft.expectedMode === 'expression'
                              ? '变量名、正则或表达式'
                              : draft.condition === 'count'
                                ? '0'
                                : '输入精确预期值'
                          }
                        />
                      </Field>
                    </>
                  )}
                  <span className="editor-hint">当前观察值需在录制器或运行结果中查看。</span>
                  {formError && (
                    <div className="editor-form-error" role="alert">
                      {formError}
                    </div>
                  )}
                  {!readOnly && (
                    <Button type="submit">
                      <Check size={16} />
                      {adding ? '插入源码' : '应用到源码'}
                    </Button>
                  )}
                </form>
              ) : (
                <div className="editor-source-detail">
                  <pre>{selected?.code}</pre>
                  <span className="editor-hint">
                    {selected?.kind === 'assertion'
                      ? '复杂断言请直接编辑源码；其选项和自定义逻辑完整保留。'
                      : '直接编辑源码以修改操作。'}
                  </span>
                </div>
              )}
            </section>
          )}
          {!selected && !adding && parsed.steps.length > 0 && (
            <div className="editor-select-hint">
              <ChevronRight size={16} />
              选择步骤查看或编辑
            </div>
          )}
          {notice && (
            <div className="editor-notice" role="status">
              <Check size={16} />
              {notice}
            </div>
          )}
        </aside>
      </div>
    </section>
  )
}
