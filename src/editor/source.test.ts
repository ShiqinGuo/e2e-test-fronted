import { describe, expect, it } from 'vitest'
import { assertionCode, insertAssertion, parseScenario, updateAssertion } from './source'
import type { AssertionDraft } from './source'

const checkpoint: AssertionDraft = {
  locator: "page.getByTestId('result')",
  condition: 'text',
  expected: '已保存',
  expectedMode: 'literal',
}

describe('源码步骤和检查点', () => {
  it('解析动作与断言，保留异步辅助代码与未知断言', () => {
    const code = `import { test, expect } from '@playwright/test';
const helper = async () => { await database.query('select 1'); };
test('业务流程', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button').click();
  const value = await helper();
  await expect(page.getByTestId('result')).toHaveText('已保存');
  await expect.poll(() => page.title()).toBe('完成');
});`
    const parsed = parseScenario(code)
    expect(parsed.error).toBeNull()
    expect(parsed.tests[0].name).toBe('业务流程')
    expect(parsed.steps.map((step) => step.kind)).toEqual(['action', 'action', 'assertion', 'assertion'])
    expect(parsed.steps[2].assertion?.expected).toBe('已保存')
    for (const step of parsed.steps) expect(code.slice(step.start, step.end)).toBe(step.code)
    const unchanged = updateAssertion(code, parsed.steps[2].id, checkpoint)
    expect(unchanged).toBe(code)
  })

  it('在选择步骤之后插入，不改动原始字符、尾部注释与辅助函数', () => {
    const code = `import { test, expect } from '@playwright/test';
// keep this prelude
const data = { untouched: true };
test('flow', async ({ page }) => {
  await page.goto('/'); // navigation evidence
  await customThing(data);
});
function later() { return 'retain me'; }
`
    const first = parseScenario(code).steps[0]
    const result = insertAssertion(code, checkpoint, { afterStepId: first.id })
    expect(result).toContain(
      "await page.goto('/'); // navigation evidence\n  await expect(page.getByTestId('result')).toHaveText(\"已保存\");\n  await customThing(data)",
    )
    expect(result.replace(`  ${assertionCode(checkpoint)}\n`, '')).toBe(code)
    expect(parseScenario(result).error).toBeNull()
  })

  it('插入选定的测试末尾，保持 CRLF 和其他测试不变', () => {
    const code =
      "import { test, expect } from '@playwright/test';\r\ntest('first', async ({page}) => {\r\n  await page.goto('/a');\r\n});\r\ntest('second', async ({page}) => {\r\n  await page.goto('/b');\r\n});\r\n"
    const parsed = parseScenario(code)
    expect(() => insertAssertion(code, checkpoint)).toThrow('请选择')
    const result = insertAssertion(code, checkpoint, { testId: parsed.tests[1].id })
    expect(result.startsWith(code.slice(0, code.indexOf("test('second'")))).toBe(true)
    expect(result.replace(`  ${assertionCode(checkpoint)}\r\n`, '')).toBe(code)
  })

  it('现有断言只补丁目标或预期值，保留 soft、not、消息、超时和注释', () => {
    const code = `test('flow', async ({ page }) => {
  await expect.soft(page.getByTestId('result'), '保留消息').not.toHaveText(/* reason */ 'old', { timeout: 7000 });
});`
    const step = parseScenario(code).steps[0]
    expect(step.assertion?.negated).toBe(true)
    const result = updateAssertion(code, step.id, { ...checkpoint, expected: 'new' })
    expect(result).toBe(code.replace("'old'", '"new"'))
    expect(() => updateAssertion(code, step.id, { ...checkpoint, condition: 'visible' })).toThrow(
      '选项或注释',
    )
  })

  it('源码解析失败时拒绝变更，未知源码原样保留', () => {
    const code = "test('unfinished', async ({page}) => { const = ???"
    const result = parseScenario(code)
    expect(result.error).toBeTruthy()
    expect(result.steps).toEqual([])
    expect(() => insertAssertion(code, checkpoint)).toThrow('语法错误')
    expect(() => updateAssertion(code, 'step:0', checkpoint)).toThrow('语法错误')
    expect(code).toBe("test('unfinished', async ({page}) => { const = ???")
  })

  it('拒绝无代码块的分支后插入，也不把事件回调当主流程步骤', () => {
    const code = `test('flow', async ({page}) => {
  page.on('response', async response => { await response.json(); });
  if (process.env.RUN) await page.click('button');
});`
    const parsed = parseScenario(code)
    expect(parsed.steps).toHaveLength(1)
    expect(parsed.steps[0].canInsertAfter).toBe(false)
    expect(() => insertAssertion(code, checkpoint, { afterStepId: parsed.steps[0].id })).toThrow('安全插入')
  })

  it('对象方法及命名或匿名类的方法不会伪装成主流程步骤', () => {
    const code = `import { test, expect } from '@playwright/test';
test('flow', async ({page}) => {
  const helpers = { async submit() { await page.click('object-method'); } };
  class NamedHelper { async submit() { await page.click('class-method'); } }
  const AnonymousHelper = class { async submit() { await page.click('anonymous-class-method'); } };
  await page.goto('/');
  await helpers.submit();
  await expect(page.getByTestId('result')).toBeVisible();
});`
    const parsed = parseScenario(code)
    expect(parsed.error).toBeNull()
    expect(parsed.steps.map((step) => step.code)).toEqual([
      "await page.goto('/');",
      'await helpers.submit();',
      "await expect(page.getByTestId('result')).toBeVisible();",
    ])
    expect(parsed.steps.map((step) => step.kind)).toEqual(['action', 'code', 'assertion'])
    const result = insertAssertion(code, checkpoint, { afterStepId: parsed.steps[0].id })
    expect(result.replace(`\n  ${assertionCode(checkpoint)}`, '')).toBe(code)
  })

  it('表达式预期值保持表达式，固定值安全转义，数量正确输出', () => {
    expect(
      assertionCode({ ...checkpoint, expected: 'fixture.expected', expectedMode: 'expression' }),
    ).toContain('.toHaveText(fixture.expected)')
    expect(assertionCode({ ...checkpoint, expected: '\"line\nnext' })).toContain(
      '.toHaveText("\\\"line\\nnext")',
    )
    expect(assertionCode({ ...checkpoint, condition: 'count', expected: '02' })).toContain('.toHaveCount(2)')
    expect(() => assertionCode({ ...checkpoint, condition: 'count', expected: '-1' })).toThrow('非负整数')
    expect(() =>
      assertionCode({ ...checkpoint, expectedMode: 'expression', expected: 'x); bad(); (' }),
    ).toThrow('有效的 JavaScript 表达式')
  })

  it('拒绝在测试直接退出之后添加不会执行的检查点', () => {
    const code =
      "import { test, expect } from '@playwright/test';\ntest('flow', async ({page}) => { await page.goto('/'); return result; });"
    expect(() => insertAssertion(code, checkpoint)).toThrow('return 或 throw')
    expect(
      parseScenario(insertAssertion(code, checkpoint, { afterStepId: parseScenario(code).steps[0].id }))
        .error,
    ).toBeNull()
  })

  it('只增量补充缺失的官方 expect 导入，保留引号、尾逗号及注释', () => {
    for (const declaration of [
      "import { test } from '@playwright/test';",
      'import {\n  test /* fixture */,\n} from "@playwright/test";',
      "import { test, expect as customExpect } from '@playwright/test';",
    ]) {
      const code = `${declaration}\ntest('flow', async ({page}) => {\n  await page.goto('/');\n});`
      const result = insertAssertion(code, checkpoint)
      expect(parseScenario(result).error).toBeNull()
      const extraImport = result.lastIndexOf(', expect')
      const withoutImport = result.slice(0, extraImport) + result.slice(extraImport + ', expect'.length)
      expect(withoutImport.replace(`  ${assertionCode(checkpoint)}\n`, '')).toBe(code)
    }
    const existing =
      "import { test, expect } from '@playwright/test';\ntest('flow', async ({page}) => {\n  await page.goto('/');\n});"
    expect(insertAssertion(existing, checkpoint).replace(`  ${assertionCode(checkpoint)}\n`, '')).toBe(
      existing,
    )
  })

  it('兼容 fixture 已有的 expect，缺失时从官方补充而不虚构 fixture 导出', () => {
    const code =
      'import { test } from "./fixtures"; // fixture import\r\ntest("flow", async ({page}) => {\r\n  await page.goto("/");\r\n});'
    const result = insertAssertion(code, checkpoint)
    const extraImport = '\r\nimport { expect } from "@playwright/test";'
    expect(result).toContain('from "./fixtures"; // fixture import' + extraImport)
    expect(result.replace(extraImport, '').replace(`  ${assertionCode(checkpoint)}\r\n`, '')).toBe(code)
    const withExpect = code.replace('{ test }', '{ test, expect }')
    expect(insertAssertion(withExpect, checkpoint).replace(`  ${assertionCode(checkpoint)}\r\n`, '')).toBe(
      withExpect,
    )
  })

  it('拒绝插入点可见的 expect 遮蔽和未知来源，忽略无关函数中的绑定', () => {
    const prefix = "import { test } from '@playwright/test';\n"
    const cases = [
      "test('flow', async ({page, expect}) => { await page.goto('/'); });",
      "test('flow', async ({page}) => { const { value: expect } = custom; await page.goto('/'); });",
      "test('flow', async ({page}) => { if (false) { var expect; } await page.goto('/'); });",
      "test('flow', async ({page}) => { for (let expect of items) { await page.goto('/'); } });",
      "test('flow', async ({page}) => { try {} catch (expect) { await page.goto('/'); } });",
      "const expect = custom; test('flow', async ({page}) => { await page.goto('/'); });",
      "import { expect } from 'vitest'; test('flow', async ({page}) => { await page.goto('/'); });",
      "import type { expect } from '@playwright/test'; test('flow', async ({page}) => { await page.goto('/'); });",
    ]
    for (const body of cases) {
      const code = prefix + body
      expect(() =>
        insertAssertion(code, checkpoint, { afterStepId: parseScenario(code).steps[0].id }),
      ).toThrow(/expect.*(遮蔽|运行时 named import)/)
    }
    const unrelated =
      prefix +
      "function helper() { const expect = custom; }\ntest('flow', async ({page}) => { await page.goto('/'); });"
    expect(parseScenario(insertAssertion(unrelated, checkpoint)).error).toBeNull()
    const unknown =
      "import { test } from 'unknown-test-kit'; test('flow', async ({page}) => { await page.goto('/'); });"
    expect(() => insertAssertion(unknown, checkpoint)).toThrow('无法确认 test')
  })
})
