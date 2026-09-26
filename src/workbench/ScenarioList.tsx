import { useState } from 'react'
import {
  ArrowDownUp,
  FileCode2,
  FolderPlus,
  List,
  ListFilter,
  Plus,
  Search,
  SlidersHorizontal,
} from 'lucide-react'
import type { Group, Scenario } from '../types'
import {
  Button,
  Empty,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  SelectControl,
} from '../components/ui'

export function ScenarioList({
  scenarios,
  groups,
  canEdit,
  onSelect,
  onCreate,
}: {
  scenarios: Scenario[]
  groups: Group[]
  canEdit: boolean
  onSelect: (id: string) => void
  onCreate: (kind: 'scenario' | 'group', groupId?: string) => void
}) {
  const [search, setSearch] = useState('')
  const [group, setGroup] = useState('all')
  const [sort, setSort] = useState('updated')
  const [grouped, setGrouped] = useState(false)
  const [showDescription, setShowDescription] = useState(true)
  const [showUpdated, setShowUpdated] = useState(true)
  const visible = scenarios
    .filter(
      (item) =>
        item.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()) &&
        (group === 'all' || item.groupId === group),
    )
    .sort((a, b) =>
      sort === 'name' ? a.name.localeCompare(b.name, 'zh-CN') : b.updatedAt.localeCompare(a.updatedAt),
    )
  const sections = grouped
    ? [...groups.map((g) => ({ id: g.id, name: g.name })), { id: null, name: '未分组' }]
    : [{ id: 'all', name: '全部场景' }]
  return (
    <section className="scenario-list-page" aria-label="业务场景列表">
      <div className="list-commandbar">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" className="filter-trigger">
              <ListFilter size={15} />
              筛选{group !== 'all' && <span className="filter-dot" />}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="stack" align="start">
            <strong>筛选场景</strong>
            <SelectControl
              aria-label="筛选测试组"
              value={group}
              onValueChange={setGroup}
              options={[
                { value: 'all', label: '全部测试组' },
                ...groups.map((g) => ({ value: g.id, label: g.name })),
              ]}
            />
          </PopoverContent>
        </Popover>
        <label className="list-search">
          <Search size={15} />
          <Input
            aria-label="搜索场景"
            placeholder="搜索场景…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <div className="toolbar-spacer" />
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="display-trigger">
              <SlidersHorizontal size={14} />
              显示
            </Button>
          </PopoverTrigger>
          <PopoverContent className="display-popover" align="end">
            <div className="display-layout">
              <List size={19} />
              <strong>列表视图</strong>
              <span>场景、版本与更新信息</span>
            </div>
            <div className="display-setting">
              <span>
                <List size={15} />
                分组
              </span>
              <SelectControl
                aria-label="分组方式"
                value={grouped ? 'group' : 'none'}
                onValueChange={(value) => setGrouped(value === 'group')}
                options={[
                  { value: 'none', label: '不分组' },
                  { value: 'group', label: '按测试组' },
                ]}
              />
            </div>
            <div className="display-setting">
              <span>
                <ArrowDownUp size={15} />
                排序
              </span>
              <SelectControl
                aria-label="排序"
                value={sort}
                onValueChange={setSort}
                options={[
                  { value: 'updated', label: '最近更新' },
                  { value: 'name', label: '名称' },
                ]}
              />
            </div>
            <div className="display-properties">
              <p>显示属性</p>
              <div>
                <Button
                  size="sm"
                  variant={showDescription ? 'secondary' : 'outline'}
                  aria-pressed={showDescription}
                  onClick={() => setShowDescription(!showDescription)}
                >
                  场景描述
                </Button>
                <Button
                  size="sm"
                  variant={showUpdated ? 'secondary' : 'outline'}
                  aria-pressed={showUpdated}
                  onClick={() => setShowUpdated(!showUpdated)}
                >
                  最近更新
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        {canEdit && (
          <>
            <Button variant="ghost" onClick={() => onCreate('group')}>
              <FolderPlus size={15} />
              新建测试组
            </Button>
            <Button variant="ghost" onClick={() => onCreate('scenario', group === 'all' ? undefined : group)}>
              <Plus size={15} />
              新建场景
            </Button>
          </>
        )}
      </div>
      {!scenarios.length && (!grouped || !groups.length) ? (
        <Empty
          icon={FileCode2}
          title="创建第一个业务场景"
          description={
            canEdit ? '录制浏览器操作，或导入 Playwright 测试代码。' : '组织成员创建的场景会显示在这里。'
          }
        >
          {canEdit && (
            <Button onClick={() => onCreate('scenario')}>
              <Plus size={15} />
              新建场景
            </Button>
          )}
        </Empty>
      ) : (
        <div className={`scenario-table${showUpdated ? '' : ' without-updated'}`}>
          <div className="scenario-table-head">
            <span>场景名称</span>
            <span>版本</span>
            {showUpdated && <span className="column-updated">最近更新</span>}
          </div>
          {sections.map((section) => {
            const items = visible.filter((item) => section.id === 'all' || item.groupId === section.id)
            if (!items.length && (search || group !== 'all' || section.id === null)) return null
            return (
              <section className="scenario-section" key={section.id || 'ungrouped'}>
                {grouped && (
                  <header>
                    <span>{section.name}</span>
                    <small>{items.length}</small>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`在${section.name}添加场景`}
                        onClick={() => onCreate('scenario', section.id || undefined)}
                      >
                        <Plus size={13} />
                      </Button>
                    )}
                  </header>
                )}
                {items.map((item) => (
                  <button className="scenario-table-row" key={item.id} onClick={() => onSelect(item.id)}>
                    <span>
                      <FileCode2 size={16} />
                      <span>
                        <strong>{item.name}</strong>
                        {showDescription && item.description && <small>{item.description}</small>}
                      </span>
                    </span>
                    <span className="scenario-version">
                      <span className={item.currentVersionId ? 'version-dot saved' : 'version-dot'} />
                      {item.currentVersionId ? '已保存' : '待建首版'}
                    </span>
                    {showUpdated && <time>{new Date(item.updatedAt).toLocaleDateString('zh-CN')}</time>}
                  </button>
                ))}
              </section>
            )
          })}
          {!visible.length && (search || group !== 'all') && (
            <Empty title="没有匹配的场景" description="调整关键词或测试组筛选。" icon={Search} />
          )}
        </div>
      )}
    </section>
  )
}
