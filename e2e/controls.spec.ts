import { expect, test } from '@playwright/test'
import { writeFile } from 'node:fs/promises'
import type { Locator, Page, TestInfo } from '@playwright/test'

const popover = (page: Page) => page.locator('[data-slot="popover-content"][data-state="open"]')
const selectPopup = (page: Page) => page.locator('[data-slot="select-content"][data-state="open"]')

async function motionStyle(locator: Locator) {
  return locator.evaluate(element => {
    const style = getComputedStyle(element)
    return {
      animationName: style.animationName,
      animationDuration: style.animationDuration,
      transitionDuration: style.transitionDuration,
    }
  })
}

async function expectInsideViewport(page: Page, locator: Locator) {
  await expect(locator).toBeVisible()
  // Read the final position after the real entry animation, not its scale-from frame.
  await expect.poll(async () => locator.evaluate(element =>
    element.getAnimations().filter(animation => animation.playState === 'running').length,
  )).toBe(0)
  const box = await locator.boundingBox()
  const viewport = page.viewportSize()!
  expect(box).not.toBeNull()
  expect(box!.x).toBeGreaterThanOrEqual(8)
  expect(box!.y).toBeGreaterThanOrEqual(8)
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width - 8)
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height - 8)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
}

async function screenshot(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(name)
  await page.screenshot({ path, fullPage: true })
  await testInfo.attach(name, { path, contentType: 'image/png' })
}

for (const viewport of [{ width: 810, height: 1000 }, { width: 390, height: 844 }]) {
  test.describe(`shared controls · ${viewport.width}px`, () => {
    test.use({ viewport, reducedMotion: 'no-preference' })
    test.beforeEach(async ({ page }) => {
      await page.goto('/e2e/fixtures/controls.html')
      await expect(page.getByRole('heading', { name: '共享控件边界测试' })).toBeVisible()
    })

    test('SearchSelect 搜索、上下键选择、Escape 和外部输入焦点', async ({ page }) => {
      const trigger = page.getByRole('combobox', { name: '测试环境', exact: true })
      await trigger.click()
      const search = page.getByRole('combobox', { name: '搜索测试环境', exact: true })
      await expect(search).toBeFocused()
      await search.fill('预发布')
      await expect(page.getByRole('option')).toHaveCount(2)
      const first = page.getByRole('option', { name: /预发布甲/ })
      const second = page.getByRole('option', { name: /预发布乙/ })
      await expect(first).toHaveAttribute('aria-selected', 'true')
      await search.press('ArrowDown')
      await expect(second).toHaveAttribute('aria-selected', 'true')
      await search.press('ArrowUp')
      await expect(first).toHaveAttribute('aria-selected', 'true')
      await search.press('ArrowDown')
      await search.press('Enter')
      await expect(trigger).toHaveText('预发布乙')
      await expect(page.getByTestId('search-value')).toHaveText('stage-b')
      await expect(page.getByTestId('search-changes')).toHaveText('1')
      await expect(trigger).toBeFocused()

      await trigger.click()
      await search.fill('不存在的环境')
      await expect(page.getByText('没有匹配的选项', { exact: true })).toBeVisible()
      await search.press('Escape')
      await expect(popover(page)).toHaveCount(0)
      await expect(trigger).toBeFocused()

      await trigger.click()
      const outside = page.getByRole('textbox', { name: '外部输入', exact: true })
      await outside.click()
      await expect(popover(page)).toHaveCount(0)
      await expect(outside).toBeFocused()
      await page.keyboard.type('focus stays in the input')
      await expect(outside).toHaveValue('focus stays in the input')
      await expect(trigger).not.toBeFocused()
      await expect(page.getByTestId('search-changes')).toHaveText('1')
    })

    test('SelectControl 通过 Enter 和方向键选择', async ({ page }) => {
      const trigger = page.getByRole('combobox', { name: '测试角色', exact: true })
      await trigger.focus()
      await trigger.press('Enter')
      await expect(page.getByRole('option', { name: '只读角色', exact: true })).toBeFocused()
      await page.keyboard.press('ArrowDown')
      await expect(page.getByRole('option', { name: '编辑角色', exact: true })).toBeFocused()
      await page.keyboard.press('Enter')
      await expect(page.getByTestId('select-value')).toHaveText('editor')
      await expect(page.getByTestId('select-changes')).toHaveText('1')
      await expect(trigger).toHaveText('编辑角色')
      await expect(trigger).toBeFocused()
      await expect(selectPopup(page)).toHaveCount(0)
    })

    test('请求变为 pending 时已打开的两类选择器关闭且不能再选择', async ({ page }) => {
      await page.clock.install()
      for (const control of [
        { name: '测试环境', popup: popover, value: 'search-value', changes: 'search-changes', initial: 'dev' },
        { name: '测试角色', popup: selectPopup, value: 'select-value', changes: 'select-changes', initial: 'reader' },
      ]) {
        await page.getByRole('button', { name: '恢复可用', exact: true }).click()
        await page.getByRole('button', { name: '模拟请求开始', exact: true }).click()
        await expect(page.getByTestId('pending-state')).toHaveText('scheduled')
        const trigger = page.getByRole('combobox', { name: control.name, exact: true })
        await trigger.click()
        await expect(control.popup(page)).toBeVisible()
        await page.clock.runFor(1600)
        await expect(page.getByTestId('pending-state')).toHaveText('pending')
        await expect(trigger).toBeDisabled()
        await expect(control.popup(page)).toHaveCount(0)
        await page.keyboard.press('ArrowDown')
        await page.keyboard.press('Enter')
        await expect(control.popup(page)).toHaveCount(0)
        await expect(page.getByTestId(control.value)).toHaveText(control.initial)
        await expect(page.getByTestId(control.changes)).toHaveText('0')
      }
    })

    test('边缘浮层翻转并保持在视口内', async ({ page }, testInfo) => {
      const search = page.getByRole('combobox', { name: '边缘环境', exact: true })
      await search.click()
      await expect(popover(page)).toHaveAttribute('data-side', 'top')
      await expectInsideViewport(page, popover(page))
      await screenshot(page, testInfo, `popover-collision-${viewport.width}.png`)
      await page.keyboard.press('Escape')
      await expect(search).toBeFocused()

      const select = page.getByRole('combobox', { name: '边缘角色', exact: true })
      await select.click()
      await expect(selectPopup(page)).toHaveAttribute('data-side', 'top')
      await expectInsideViewport(page, selectPopup(page))
      await screenshot(page, testInfo, `select-collision-${viewport.width}.png`)
      await page.keyboard.press('Escape')
      await expect(select).toBeFocused()
    })

    test('Modal 内两类 portal 可交互，关闭后焦点返回原按钮', async ({ page }, testInfo) => {
      const opener = page.getByRole('button', { name: '打开设置弹窗', exact: true })
      await opener.click()
      const dialog = page.getByRole('dialog', { name: '组件设置', exact: true })
      await expect(dialog).toBeVisible()
      // Child autoFocus runs before Radix's open autofocus callback. On the
      // first opening, Escape must still return to the original trigger.
      await expect(dialog.getByRole('textbox', { name: '弹窗输入', exact: true })).toBeFocused()
      await page.keyboard.press('Escape')
      await expect(dialog).toBeHidden()
      await expect(opener).toBeFocused()

      await opener.click()
      await expect(dialog.getByRole('textbox', { name: '弹窗输入', exact: true })).toBeFocused()
      const select = dialog.getByRole('combobox', { name: '弹窗角色', exact: true })
      await select.click()
      await expectInsideViewport(page, selectPopup(page))
      await screenshot(page, testInfo, `modal-select-${viewport.width}.png`)
      await page.getByRole('option', { name: '编辑角色', exact: true }).click()
      await expect(page.getByTestId('modal-role')).toHaveText('editor')
      await expect(select).toBeFocused()
      await expect(dialog).toBeVisible()

      const search = dialog.getByRole('combobox', { name: '弹窗环境', exact: true })
      await search.click()
      await page.getByRole('combobox', { name: '搜索弹窗环境', exact: true }).fill('stage-b')
      await page.getByRole('option', { name: /预发布乙/ }).click()
      await expect(page.getByTestId('modal-environment')).toHaveText('stage-b')
      await expect(search).toBeFocused()
      await expect(dialog).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(dialog).toBeHidden()
      await expect(opener).toBeFocused()
    })

    test('实际 computed style 保留 140/200ms 动效且遵从 reduced motion', async ({ page }, testInfo) => {
      const evidence: Record<string, Awaited<ReturnType<typeof motionStyle>>> = {}
      const search = page.getByRole('combobox', { name: '测试环境', exact: true })
      const select = page.getByRole('combobox', { name: '测试角色', exact: true })
      const opener = page.getByRole('button', { name: '打开设置弹窗', exact: true })

      for (const reduced of [false, true]) {
        await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' })
        const mode = reduced ? 'reduced' : 'normal'
        for (const control of [
          { name: 'popover', trigger: search, popup: () => popover(page), duration: '0.14s' },
          { name: 'select', trigger: select, popup: () => selectPopup(page), duration: '0.14s' },
          { name: 'dialog', trigger: opener, popup: () => page.locator('[data-slot="dialog-content"]'), duration: '0.2s' },
        ]) {
          await control.trigger.click()
          const popup = control.popup()
          await expect(popup).toBeVisible()
          if (reduced) {
            await expect(popup).toHaveCSS('animation-name', 'none')
            await expect(popup).toHaveCSS('transition-duration', '0s')
          } else {
            await expect(popup).toHaveCSS('animation-duration', control.duration)
            await expect(popup).toHaveCSS('transition-duration', control.duration)
            await expect(popup).not.toHaveCSS('animation-name', 'none')
          }
          evidence[`${mode}-${control.name}`] = await motionStyle(popup)
          if (control.name === 'dialog') {
            const overlay = page.locator('[data-slot="dialog-overlay"]')
            await expect(overlay).toHaveCSS('animation-duration', reduced ? '0s' : '0.2s')
            if (reduced) await expect(overlay).toHaveCSS('animation-name', 'none')
            evidence[`${mode}-overlay`] = await motionStyle(overlay)
          }
          await page.keyboard.press('Escape')
          await expect(popup).toBeHidden()
          await expect(control.trigger).toBeFocused()
        }
      }
      const evidencePath = testInfo.outputPath('computed-motion.json')
      await writeFile(evidencePath, JSON.stringify({ viewport, evidence }, null, 2))
      await testInfo.attach('computed-motion.json', { path: evidencePath, contentType: 'application/json' })
    })
  })
}
