import { useState } from 'react'
import { ChevronDown, Globe2, Play, Radio, Settings2 } from 'lucide-react'
import type { Environment, Group } from '../types'
import {
  Button,
  Field,
  IconButton,
  Popover,
  PopoverContent,
  PopoverTrigger,
  SearchSelect,
  SelectControl,
} from '../components/ui'

export function ExecutionBar({
  environments,
  environment,
  onEnvironment,
  onManage,
  role,
  onRole,
  retries,
  onRetries,
  groups,
  onRun,
  onRecord,
  disabled,
  canEdit,
  canRunScenario,
}: {
  environments: Environment[]
  environment?: Environment
  onEnvironment: (id: string) => void
  onManage: () => void
  role: string
  onRole: (role: string) => void
  retries: number
  onRetries: (value: number) => void
  groups: Group[]
  onRun: (groupId?: string) => void
  onRecord: () => void
  disabled: boolean
  canEdit: boolean
  canRunScenario: boolean
}) {
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [groupId, setGroupId] = useState('')
  return (
    <div className="execution-bar">
      <div className="execution-context">
        <Globe2 size={15} className="muted" />
        <SearchSelect
          className="environment-selector"
          aria-label="运行环境"
          value={environment?.id || ''}
          onValueChange={onEnvironment}
          placeholder="选择测试环境"
          searchPlaceholder="搜索环境…"
          options={environments.map((e) => ({ value: e.id, label: e.name }))}
        />
        <IconButton label="管理环境" onClick={onManage}>
          <Settings2 size={15} />
        </IconButton>
        <SelectControl
          className="role-selector"
          aria-label="运行角色"
          value={role}
          onValueChange={onRole}
          options={[
            { value: '', label: '默认会话' },
            ...(environment?.roles || []).map((r) => ({ value: r.name, label: r.name })),
          ]}
        />
      </div>
      {canEdit ? (
        <div className="inline execution-actions">
          <Button variant="outline" disabled={disabled || !environment} onClick={onRecord}>
            <Radio size={15} />
            录制
          </Button>
          <Button disabled={disabled || !environment || !canRunScenario} onClick={() => onRun()}>
            <Play size={15} />
            运行
          </Button>
          <Popover open={optionsOpen} onOpenChange={setOptionsOpen}>
            <PopoverTrigger asChild>
              <IconButton variant="outline" label="运行选项">
                <ChevronDown size={15} />
              </IconButton>
            </PopoverTrigger>
            <PopoverContent className="stack" align="end" aria-label="运行选项">
              <strong>运行选项</strong>
              <Field label="失败重试次数">
                <SelectControl
                  value={String(retries)}
                  onValueChange={(v) => onRetries(Number(v))}
                  options={[
                    { value: '0', label: '不重试' },
                    { value: '1', label: '1 次' },
                    { value: '2', label: '2 次' },
                  ]}
                />
              </Field>
              <p className="muted">每次尝试独立保留，重试不会覆盖首次失败。</p>
              <Field label="运行测试组">
                <SelectControl
                  value={groupId}
                  onValueChange={setGroupId}
                  options={[
                    { value: '', label: '选择测试组' },
                    ...groups.map((g) => ({ value: g.id, label: g.name })),
                  ]}
                />
              </Field>
              <Button
                disabled={disabled || !environment || !groupId}
                onClick={() => {
                  setOptionsOpen(false)
                  onRun(groupId)
                }}
              >
                <Play size={15} />
                运行整组
              </Button>
              <Button variant="ghost" onClick={() => setOptionsOpen(false)}>
                完成
              </Button>
            </PopoverContent>
          </Popover>
        </div>
      ) : (
        <span className="readonly-label">只读访问</span>
      )}
    </div>
  )
}
