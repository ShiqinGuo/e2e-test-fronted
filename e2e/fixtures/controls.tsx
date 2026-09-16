import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Button, Field, Input, Modal, SearchSelect, SelectControl, TooltipProvider,
} from '../../src/components/ui'
import '../../src/styles.css'

// This isolated Vite entry exercises shared controls only. It never calls a business API.
const environments = [
  { value: 'dev', label: '开发环境', description: 'dev.example.test' },
  { value: 'stage-a', label: '预发布甲', description: 'stage-a.example.test' },
  { value: 'stage-b', label: '预发布乙', description: 'stage-b.example.test' },
  { value: 'frozen', label: '冻结环境', description: 'frozen.example.test', disabled: true },
]
const roles = [
  { value: 'reader', label: '只读角色' },
  { value: 'editor', label: '编辑角色' },
  { value: 'owner', label: '管理角色' },
  { value: 'suspended', label: '已停用角色', disabled: true },
]

function ControlsFixture() {
  const [environment, setEnvironment] = useState('dev')
  const [role, setRole] = useState('reader')
  const [searchChanges, setSearchChanges] = useState(0)
  const [selectChanges, setSelectChanges] = useState(0)
  const [pending, setPending] = useState(false)
  const [scheduled, setScheduled] = useState(false)
  const [open, setOpen] = useState(false)
  const [modalRole, setModalRole] = useState('reader')
  const [modalEnvironment, setModalEnvironment] = useState('dev')
  const [edgeEnvironment, setEdgeEnvironment] = useState('dev')
  const [edgeRole, setEdgeRole] = useState('reader')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  return <TooltipProvider><main className="controls-fixture">
    <h1>共享控件边界测试</h1>
    <section className="fixture-section" aria-label="基础交互">
      <Field label="外部输入"><Input placeholder="关闭浮层后继续输入" /></Field>
      <div className="fixture-grid">
        <Field label="测试环境">
          <SearchSelect value={environment} options={environments} searchPlaceholder="搜索测试环境"
            disabled={pending} onValueChange={value => { setEnvironment(value); setSearchChanges(count => count + 1) }} />
        </Field>
        <Field label="测试角色">
          <SelectControl value={role} options={roles} disabled={pending}
            onValueChange={value => { setRole(value); setSelectChanges(count => count + 1) }} />
        </Field>
      </div>
      <div className="fixture-actions">
        <Button variant="outline" type="button" onClick={() => {
          if (timer.current) clearTimeout(timer.current)
          setScheduled(true)
          timer.current = setTimeout(() => { setPending(true); setScheduled(false) }, 1500)
        }}>模拟请求开始</Button>
        <Button variant="outline" type="button" onClick={() => {
          if (timer.current) clearTimeout(timer.current)
          setScheduled(false)
          setPending(false)
        }}>恢复可用</Button>
        <Button type="button" onClick={() => setOpen(true)}>打开设置弹窗</Button>
      </div>
      <div className="fixture-values" aria-label="真实组件回调结果">
        <div>环境：<output data-testid="search-value">{environment}</output></div>
        <div>环境变更次数：<output data-testid="search-changes">{searchChanges}</output></div>
        <div>角色：<output data-testid="select-value">{role}</output></div>
        <div>角色变更次数：<output data-testid="select-changes">{selectChanges}</output></div>
        <div>请求状态：<output data-testid="pending-state">{pending ? 'pending' : scheduled ? 'scheduled' : 'ready'}</output></div>
      </div>
    </section>
    <section className="fixture-edge" aria-label="视口边缘控件">
      <p>视口边缘</p>
      <SearchSelect aria-label="边缘环境" value={edgeEnvironment} onValueChange={setEdgeEnvironment}
        options={environments} searchPlaceholder="搜索边缘环境" />
      <SelectControl aria-label="边缘角色" value={edgeRole} onValueChange={setEdgeRole} options={roles} />
    </section>
    <Modal title="组件设置" description="验证弹窗内的选择器与焦点返回。" open={open} onOpenChange={setOpen}>
      <div className="fixture-modal-body">
        <Field label="弹窗输入"><Input autoFocus /></Field>
        <Field label="弹窗角色"><SelectControl value={modalRole} onValueChange={setModalRole} options={roles} /></Field>
        <Field label="弹窗环境"><SearchSelect value={modalEnvironment} onValueChange={setModalEnvironment}
          options={environments} searchPlaceholder="搜索弹窗环境" /></Field>
        <div className="fixture-values">
          <div>角色：<output data-testid="modal-role">{modalRole}</output></div>
          <div>环境：<output data-testid="modal-environment">{modalEnvironment}</output></div>
        </div>
      </div>
    </Modal>
  </main></TooltipProvider>
}

createRoot(document.getElementById('root')!).render(<ControlsFixture />)
