import { parse } from '@babel/parser'

type AstNode = {
  type: string
  start: number
  end: number
  loc?: { start: { line: number } }
  [key: string]: unknown
}

export type AssertionCondition = 'visible' | 'hidden' | 'text' | 'containsText' | 'value' | 'count' | 'url'
export type AssertionDraft = {
  locator: string
  condition: AssertionCondition
  expected: string
  expectedMode: 'literal' | 'expression'
}
export type SourceAssertion = AssertionDraft & {
  negated: boolean
  targetSpan: [number, number]
  matcherSpan: [number, number]
  expectedSpan?: [number, number]
  argumentsSpan: [number, number]
  hasExtraArguments: boolean
  argumentsHaveComments: boolean
}
export type SourceStep = {
  id: string
  start: number
  end: number
  line: number
  code: string
  label: string
  kind: 'action' | 'assertion' | 'code'
  testId: string
  canInsertAfter: boolean
  assertion?: SourceAssertion
}
export type SourceTest = {
  id: string
  name: string
  bodyStart: number
  bodyEnd: number
  endsWithExit: boolean
}
export type ParsedScenario = { steps: SourceStep[]; tests: SourceTest[]; error: string | null }

const matchers: Record<AssertionCondition, string> = {
  visible: 'toBeVisible',
  hidden: 'toBeHidden',
  text: 'toHaveText',
  containsText: 'toContainText',
  value: 'toHaveValue',
  count: 'toHaveCount',
  url: 'toHaveURL',
}
const actionLabels: Record<string, string> = {
  goto: '打开页面',
  click: '点击',
  dblclick: '双击',
  fill: '输入',
  press: '按键',
  check: '勾选',
  uncheck: '取消勾选',
  selectOption: '选择',
  hover: '悬停',
  dragTo: '拖动',
  reload: '刷新',
  setInputFiles: '上传文件',
  waitForURL: '等待网址',
  waitFor: '等待元素',
  get: 'GET 请求',
  post: 'POST 请求',
}

function node(value: unknown): AstNode | undefined {
  return value && typeof value === 'object' && typeof (value as AstNode).type === 'string'
    ? (value as AstNode)
    : undefined
}
function nodes(value: unknown): AstNode[] {
  return Array.isArray(value) ? value.map(node).filter((item): item is AstNode => Boolean(item)) : []
}
function walk(
  current: AstNode,
  visit: (item: AstNode, parent?: AstNode) => boolean | void,
  parent?: AstNode,
) {
  if (visit(current, parent) === false) return
  for (const [key, value] of Object.entries(current)) {
    if (
      [
        'loc',
        'comments',
        'tokens',
        'leadingComments',
        'trailingComments',
        'innerComments',
        'errors',
      ].includes(key)
    )
      continue
    if (Array.isArray(value)) {
      for (const item of nodes(value)) walk(item, visit, current)
    } else {
      const child = node(value)
      if (child) walk(child, visit, current)
    }
  }
}
function propertyName(value: AstNode | undefined) {
  if (value?.type !== 'MemberExpression' || value.computed) return undefined
  const property = node(value.property)
  return property?.type === 'Identifier' ? String(property.name) : undefined
}
function isTestCallee(value: AstNode | undefined): boolean {
  if (value?.type === 'Identifier') return value.name === 'test'
  return (
    ['only', 'skip', 'fixme', 'fail'].includes(propertyName(value) ?? '') && isTestCallee(node(value?.object))
  )
}
function isExpect(value: AstNode | undefined): boolean {
  return (
    (value?.type === 'Identifier' && value.name === 'expect') ||
    (propertyName(value) === 'soft' &&
      node(value?.object)?.type === 'Identifier' &&
      node(value?.object)?.name === 'expect')
  )
}
function isExpectChain(call: AstNode): boolean {
  let current = node(call.callee)
  while (current) {
    if (current.type === 'MemberExpression') current = node(current.object)
    else if (current.type === 'CallExpression') {
      const callee = node(current.callee)
      if (isExpect(callee) || (propertyName(callee) === 'poll' && node(callee?.object)?.name === 'expect'))
        return true
      current = callee
    } else return false
  }
  return false
}
function readAssertion(call: AstNode, code: string): SourceAssertion | undefined {
  const callee = node(call.callee)
  const matcher = propertyName(callee)
  const condition = (Object.keys(matchers) as AssertionCondition[]).find((key) => matchers[key] === matcher)
  if (!condition || !callee) return undefined
  let subject = node(callee.object)
  const negated = propertyName(subject) === 'not'
  if (negated) subject = node(subject?.object)
  if (subject?.type !== 'CallExpression' || !isExpect(node(subject.callee))) return undefined
  const target = nodes(subject.arguments)[0]
  if (!target || target.type === 'SpreadElement') return undefined
  const args = nodes(call.arguments)
  const needsExpected = !['visible', 'hidden'].includes(condition)
  const expected = needsExpected ? args[0] : undefined
  if (needsExpected && (!expected || expected.type === 'SpreadElement')) return undefined
  const literal =
    expected && ['StringLiteral', 'NumericLiteral', 'BooleanLiteral', 'NullLiteral'].includes(expected.type)
  const property = node(callee.property)!
  const argumentsText = code.slice(callee.end, call.end)
  // Babel spans identify the call boundaries. Retain existing options, messages and whitespace.
  const opening = argumentsText.indexOf('(')
  if (opening < 0) return undefined
  return {
    locator: code.slice(target.start, target.end),
    condition,
    negated,
    expected: expected
      ? literal
        ? String(expected.type === 'NullLiteral' ? 'null' : expected.value)
        : code.slice(expected.start, expected.end)
      : '',
    expectedMode: literal ? 'literal' : 'expression',
    targetSpan: [target.start, target.end],
    matcherSpan: [property.start, property.end],
    expectedSpan: expected ? [expected.start, expected.end] : undefined,
    argumentsSpan: [callee.end + opening + 1, call.end - 1],
    hasExtraArguments: args.length > (needsExpected ? 1 : 0),
    argumentsHaveComments: /\/\*|\/\//.test(code.slice(callee.end + opening + 1, call.end - 1)),
  }
}

export function parseScenario(code: string): ParsedScenario {
  try {
    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['typescript'],
      errorRecovery: false,
    }) as unknown as AstNode
    const tests: SourceTest[] = []
    const steps: SourceStep[] = []
    walk(ast, (current) => {
      if (current.type !== 'CallExpression' || !isTestCallee(node(current.callee))) return
      const args = nodes(current.arguments)
      const callback = args.find(
        (arg) => ['ArrowFunctionExpression', 'FunctionExpression'].includes(arg.type) && arg.async,
      )
      const body = node(callback?.body)
      if (!body || body.type !== 'BlockStatement') return
      const id = `test:${current.start}`
      const first = args[0]
      const lastStatement = nodes(body.body).at(-1)
      tests.push({
        id,
        name: first?.type === 'StringLiteral' ? String(first.value) : `测试 ${tests.length + 1}`,
        bodyStart: body.start,
        bodyEnd: body.end,
        endsWithExit: Boolean(
          lastStatement && ['ReturnStatement', 'ThrowStatement'].includes(lastStatement.type),
        ),
      })
      walk(body, (statement, parent) => {
        // Nested callbacks are independent execution contexts (routes, events, helpers).
        if (
          statement !== body &&
          (functionTypes.has(statement.type) ||
            ['ClassDeclaration', 'ClassExpression'].includes(statement.type))
        )
          return false
        if (statement.type !== 'ExpressionStatement') return
        const expression = node(statement.expression)
        if (expression?.type !== 'AwaitExpression') return
        const call = node(expression.argument)
        if (call?.type !== 'CallExpression') return
        const assertion = readAssertion(call, code)
        const method = propertyName(node(call.callee))
        const expectLike = isExpectChain(call)
        steps.push({
          id: `step:${statement.start}`,
          start: statement.start,
          end: statement.end,
          line: statement.loc?.start.line ?? 1,
          code: code.slice(statement.start, statement.end),
          label: assertion
            ? matchers[assertion.condition]
            : expectLike
              ? '源码断言'
              : (actionLabels[method ?? ''] ?? method ?? '异步代码'),
          kind: assertion || expectLike ? 'assertion' : method && actionLabels[method] ? 'action' : 'code',
          testId: id,
          canInsertAfter: parent?.type === 'BlockStatement',
          assertion,
        })
      })
      return false
    })
    return { tests, steps: steps.sort((a, b) => a.start - b.start), error: null }
  } catch (error) {
    return { tests: [], steps: [], error: error instanceof Error ? error.message : '源码解析失败' }
  }
}

function validateExpression(expression: string, label: string) {
  if (!expression.trim()) throw new Error(`${label}不能为空`)
  try {
    const ast = parse(`const __value = (${expression});`, { sourceType: 'module', plugins: ['typescript'] })
    if (ast.program.body.length !== 1) throw new Error('Unexpected statements')
  } catch {
    throw new Error(`${label}需要一个有效的 JavaScript 表达式`)
  }
}
function expectedSource(draft: AssertionDraft) {
  if (['visible', 'hidden'].includes(draft.condition)) return ''
  if (draft.expectedMode === 'expression') {
    validateExpression(draft.expected, '预期值')
    return draft.expected.trim()
  }
  if (draft.condition === 'count') {
    if (!/^\d+$/.test(draft.expected.trim())) throw new Error('数量需要非负整数')
    return String(Number(draft.expected))
  }
  return JSON.stringify(draft.expected)
}
export function assertionCode(draft: AssertionDraft) {
  validateExpression(draft.locator, '目标')
  return `await expect(${draft.locator.trim()}).${matchers[draft.condition]}(${expectedSource(draft)});`
}
function patched(code: string, edits: { span: [number, number]; text: string }[]) {
  let next = code
  for (const edit of edits.sort((a, b) => b.span[0] - a.span[0]))
    next = next.slice(0, edit.span[0]) + edit.text + next.slice(edit.span[1])
  const result = parseScenario(next)
  if (result.error) throw new Error(`修改未写入：${result.error}`)
  return next
}

type SourceEdit = { span: [number, number]; text: string }
type SourceBinding = { name: string; scope: AstNode; imported?: AstNode; declaration?: AstNode }
const functionTypes = new Set([
  'ArrowFunctionExpression',
  'FunctionExpression',
  'FunctionDeclaration',
  'ObjectMethod',
  'ClassMethod',
  'ClassPrivateMethod',
])
const lexicalScopeTypes = new Set([
  'Program',
  'BlockStatement',
  'StaticBlock',
  'CatchClause',
  'ForStatement',
  'ForInStatement',
  'ForOfStatement',
  'SwitchStatement',
])

function patternNames(pattern: AstNode | undefined): string[] {
  if (!pattern) return []
  if (pattern.type === 'Identifier') return [String(pattern.name)]
  if (pattern.type === 'RestElement') return patternNames(node(pattern.argument))
  if (pattern.type === 'AssignmentPattern') return patternNames(node(pattern.left))
  if (pattern.type === 'TSParameterProperty') return patternNames(node(pattern.parameter))
  if (pattern.type === 'ArrayPattern') return nodes(pattern.elements).flatMap((item) => patternNames(item))
  if (pattern.type === 'ObjectPattern')
    return nodes(pattern.properties).flatMap((item) =>
      patternNames(node(item.type === 'RestElement' ? item.argument : item.value)),
    )
  return []
}

function collectBindings(ast: AstNode): SourceBinding[] {
  const bindings: SourceBinding[] = []
  const ancestors: AstNode[] = []
  const add = (pattern: AstNode | undefined, scope: AstNode | undefined) => {
    if (scope) for (const name of patternNames(pattern)) bindings.push({ name, scope })
  }
  function visit(current: AstNode) {
    const lexicalScope = [...ancestors]
      .reverse()
      .find((item) => lexicalScopeTypes.has(item.type) || functionTypes.has(item.type))
    if (current.type === 'ImportDeclaration') {
      const program = ancestors.find((item) => item.type === 'Program')
      if (program)
        for (const specifier of nodes(current.specifiers)) {
          const local = node(specifier.local)
          if (local)
            bindings.push({
              name: String(local.name),
              scope: program,
              imported: specifier,
              declaration: current,
            })
        }
    }
    if (current.type === 'VariableDeclarator') {
      const declaration = ancestors.at(-1)
      const scope =
        declaration?.kind === 'var'
          ? [...ancestors]
              .reverse()
              .find(
                (item) =>
                  functionTypes.has(item.type) ||
                  ['Program', 'StaticBlock', 'TSModuleBlock'].includes(item.type),
              )
          : lexicalScope
      add(node(current.id), scope)
    }
    if (functionTypes.has(current.type)) {
      if (current.type === 'FunctionDeclaration') add(node(current.id), lexicalScope)
      else if (current.type === 'FunctionExpression') add(node(current.id), current)
      for (const parameter of nodes(current.params)) add(parameter, current)
    }
    if (current.type === 'ClassDeclaration') add(node(current.id), lexicalScope)
    if (current.type === 'ClassExpression') add(node(current.id), current)
    if (current.type === 'CatchClause') add(node(current.param), current)
    if (
      ['TSEnumDeclaration', 'TSModuleDeclaration', 'TSImportEqualsDeclaration', 'TSDeclareFunction'].includes(
        current.type,
      )
    )
      add(node(current.id), lexicalScope)
    ancestors.push(current)
    for (const [key, value] of Object.entries(current)) {
      if (
        [
          'loc',
          'comments',
          'tokens',
          'leadingComments',
          'trailingComments',
          'innerComments',
          'errors',
        ].includes(key)
      )
        continue
      if (Array.isArray(value)) for (const child of nodes(value)) visit(child)
      else {
        const child = node(value)
        if (child) visit(child)
      }
    }
    ancestors.pop()
  }
  visit(ast)
  return bindings
}

function runtimeNamedImport(
  binding: SourceBinding | undefined,
  importedName: string,
): binding is SourceBinding & { imported: AstNode; declaration: AstNode } {
  return Boolean(
    binding?.imported?.type === 'ImportSpecifier' &&
    binding.imported.importKind !== 'type' &&
    binding.declaration?.importKind !== 'type' &&
    node(binding.imported.imported)?.name === importedName,
  )
}
function importSource(binding: SourceBinding) {
  return String(node(binding.declaration?.source)?.value ?? '')
}
function fixtureSource(source: string) {
  // A fixture-named module is an explicit compatibility convention. Other modules remain unknown.
  return /(?:^|[\/@._-])fixtures?(?:$|[\/._-])/.test(source)
}

function ensureExpectBinding(code: string, position: number): SourceEdit[] {
  const ast = parse(code, { sourceType: 'module', plugins: ['typescript'] }) as unknown as AstNode
  const bindings = collectBindings(ast)
  const visible = bindings.filter(
    (binding) => binding.scope.start <= position && position < binding.scope.end,
  )
  const expects = visible.filter((binding) => binding.name === 'expect')
  if (expects.some((binding) => binding.scope.type !== 'Program'))
    throw new Error('插入位置的 expect 被局部参数或声明遮蔽，请先在源码中重命名该绑定')
  const expectBinding = expects[0]
  const testBindings = visible.filter((binding) => binding.name === 'test')
  const testBinding = testBindings.length === 1 ? testBindings[0] : undefined
  const testSource = testBinding ? importSource(testBinding) : ''
  const fixture = runtimeNamedImport(testBinding, 'test') && fixtureSource(testSource)
  if (expectBinding) {
    if (
      runtimeNamedImport(expectBinding, 'expect') &&
      (importSource(expectBinding) === '@playwright/test' ||
        (fixture && importSource(expectBinding) === testSource))
    )
      return []
    throw new Error('无法确认 expect 是 Playwright 的运行时 named import，请先在源码中明确其来源')
  }
  if (
    !runtimeNamedImport(testBinding, 'test') ||
    testBinding.scope.type !== 'Program' ||
    (testSource !== '@playwright/test' && !fixture)
  ) {
    throw new Error(
      '缺少 expect，且无法确认 test 的 Playwright 或 fixture 导入来源，请先在源码中添加官方 expect 导入',
    )
  }
  const program = node(ast.program)!
  const imports = nodes(program.body).filter((item) => item.type === 'ImportDeclaration')
  const officialNamedImport = imports.find(
    (item) =>
      node(item.source)?.value === '@playwright/test' &&
      item.importKind !== 'type' &&
      nodes(item.specifiers).some((specifier) => specifier.type === 'ImportSpecifier'),
  )
  if (officialNamedImport) {
    const last = nodes(officialNamedImport.specifiers)
      .filter((item) => item.type === 'ImportSpecifier')
      .at(-1)!
    // Insert before the existing comma/comment/closing brace; the original import bytes stay intact.
    return [{ span: [last.end, last.end], text: ', expect' }]
  }
  // A fixture may export only test. Import official expect separately instead of inventing a fixture export.
  const lastImport = imports.at(-1)!
  const quote = code[node(lastImport.source)!.start] === '"' ? '"' : "'"
  const newline = code.includes('\r\n') ? '\r\n' : '\n'
  let importEnd = lastImport.end
  for (const comment of nodes(lastImport.trailingComments)) {
    if (/^[\t ]*$/.test(code.slice(importEnd, comment.start))) importEnd = comment.end
  }
  return [
    {
      span: [importEnd, importEnd],
      text: `${newline}import { expect } from ${quote}@playwright/test${quote};`,
    },
  ]
}

export function updateAssertion(code: string, stepId: string, draft: AssertionDraft): string {
  const parsed = parseScenario(code)
  if (parsed.error) throw new Error('请先修复源码语法错误')
  const source = parsed.steps.find((step) => step.id === stepId)?.assertion
  if (!source) throw new Error('该断言请在源码中编辑')
  validateExpression(draft.locator, '目标')
  const edits: { span: [number, number]; text: string }[] = []
  if (draft.locator !== source.locator) edits.push({ span: source.targetSpan, text: draft.locator.trim() })
  if (draft.condition !== source.condition) {
    if (source.hasExtraArguments || source.argumentsHaveComments)
      throw new Error('此断言带有选项或注释，请在源码中切换条件，以保留完整配置')
    edits.push(
      { span: source.matcherSpan, text: matchers[draft.condition] },
      { span: source.argumentsSpan, text: expectedSource(draft) },
    )
  } else if (
    source.expectedSpan &&
    (draft.expected !== source.expected || draft.expectedMode !== source.expectedMode)
  ) {
    edits.push({ span: source.expectedSpan, text: expectedSource(draft) })
  }
  return edits.length ? patched(code, edits) : code
}

export function insertAssertion(
  code: string,
  draft: AssertionDraft,
  options: { afterStepId?: string; testId?: string } = {},
): string {
  const parsed = parseScenario(code)
  if (parsed.error) throw new Error('请先修复源码语法错误')
  const statement = assertionCode(draft)
  const selected = options.afterStepId
    ? parsed.steps.find((step) => step.id === options.afterStepId)
    : undefined
  if (options.afterStepId && (!selected || !selected.canInsertAfter))
    throw new Error('该位置无法安全插入，请选择代码块内的步骤或测试末尾')
  const test =
    parsed.tests.find((item) => item.id === (selected?.testId ?? options.testId)) ??
    (parsed.tests.length === 1 ? parsed.tests[0] : undefined)
  if (!test)
    throw new Error(
      parsed.tests.length ? '请选择要插入的测试' : '未找到可插入的 test async 回调，请在源码中添加',
    )
  const newline = code.includes('\r\n') ? '\r\n' : '\n'
  if (selected) {
    const lineStart = code.lastIndexOf('\n', selected.start - 1) + 1
    const indent = code.slice(lineStart, selected.start).match(/^[\t ]*/)?.[0] ?? ''
    // Insert at the next line if it contains a trailing comment, preserving its association.
    const lineEnd = code.indexOf('\n', selected.end)
    const remainder = code.slice(selected.end, lineEnd < 0 ? code.length : lineEnd)
    const trailingLineComment = /^[\t ]*\/\//.test(remainder)
    const position = trailingLineComment && lineEnd >= 0 ? lineEnd + 1 : selected.end
    const addition =
      trailingLineComment && lineEnd >= 0
        ? `${indent}${statement}${newline}`
        : `${newline}${indent}${statement}`
    return patched(code, [
      ...ensureExpectBinding(code, position),
      { span: [position, position], text: addition },
    ])
  }
  if (test.endsWithExit) throw new Error('测试末尾为 return 或 throw，请选择可执行的步骤后插入')
  const closing = test.bodyEnd - 1
  const lineStart = code.lastIndexOf('\n', closing - 1) + 1
  const closingPrefix = code.slice(lineStart, closing)
  const standaloneBrace = /^[\t ]*$/.test(closingPrefix)
  const callbackStartLine = code.lastIndexOf('\n', test.bodyStart - 1) + 1
  const baseIndent = code.slice(callbackStartLine, test.bodyStart).match(/^[\t ]*/)?.[0] ?? ''
  const bodyText = code.slice(test.bodyStart + 1, closing)
  const existingIndent = bodyText.match(/\r?\n([\t ]+)\S/)?.[1]
  const indent = existingIndent ?? `${baseIndent}  `
  const position = standaloneBrace ? lineStart : closing
  const addition = standaloneBrace
    ? `${indent}${statement}${newline}`
    : `${newline}${indent}${statement}${newline}${baseIndent}`
  return patched(code, [
    ...ensureExpectBinding(code, position),
    { span: [position, position], text: addition },
  ])
}
