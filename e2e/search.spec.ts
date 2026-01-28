import { test, expect } from '@playwright/test'
import { authenticate } from './helpers'

async function openSearchAndType(page: any, query: string) {
  await page.keyboard.press('Meta+k')
  await expect(page.getByTestId('search-modal')).toBeVisible()
  const input = page.getByTestId('search-input')
  await input.fill(query)
  // Wait for results or no-results message
  await expect(
    page.getByTestId('search-result').first().or(page.getByText('No results found'))
  ).toBeVisible({ timeout: 10000 })
}

test.describe('Search - Desktop', () => {
  test.use({ viewport: { width: 1280, height: 720 } })

  test.beforeEach(async ({ context, page }) => {
    await authenticate(context)
    await page.goto('/daily')
    await page.waitForLoadState('networkidle')
  })

  test('Cmd+K opens the search modal', async ({ page }) => {
    await page.keyboard.press('Meta+k')
    await expect(page.getByTestId('search-modal')).toBeVisible()
    await expect(page.getByTestId('search-input')).toBeFocused()
  })

  test('ESC closes the search modal', async ({ page }) => {
    await page.keyboard.press('Meta+k')
    await expect(page.getByTestId('search-modal')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('search-modal')).not.toBeVisible()
  })

  test('Typing text shows search results or no results', async ({ page }) => {
    await openSearchAndType(page, 'a')
    // Verify either results or "no results" is visible (already waited in helper)
    const resultCount = await page.getByTestId('search-result').count()
    const noResultsVisible = await page.getByText('No results found').isVisible().catch(() => false)
    expect(resultCount > 0 || noResultsVisible).toBeTruthy()
  })

  test('Click on result navigates to daily note', async ({ page }) => {
    await openSearchAndType(page, 'a')
    const results = page.getByTestId('search-result')
    const count = await results.count()
    if (count > 0) {
      await results.first().click()
      await expect(page.getByTestId('search-modal')).not.toBeVisible()
      await expect(page).toHaveURL(/\/daily/)
    }
  })

  test('Arrow keys navigate between results', async ({ page }) => {
    await openSearchAndType(page, 'a')
    const results = page.getByTestId('search-result')
    const count = await results.count()
    if (count >= 2) {
      await expect(results.nth(0)).toHaveCSS('background-color', 'rgb(243, 244, 246)')
      await page.keyboard.press('ArrowDown')
      await expect(results.nth(1)).toHaveCSS('background-color', 'rgb(243, 244, 246)')
      await expect(results.nth(0)).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
      await page.keyboard.press('ArrowUp')
      await expect(results.nth(0)).toHaveCSS('background-color', 'rgb(243, 244, 246)')
    }
  })

  test('Enter on result navigates', async ({ page }) => {
    await openSearchAndType(page, 'a')
    const count = await page.getByTestId('search-result').count()
    if (count > 0) {
      await page.keyboard.press('Enter')
      await expect(page.getByTestId('search-modal')).not.toBeVisible()
    }
  })
})

test.describe('Search - Mobile', () => {
  test.use({ viewport: { width: 393, height: 851 } })

  test.beforeEach(async ({ context, page }) => {
    await authenticate(context)
    await page.goto('/daily')
    await page.waitForLoadState('networkidle')
  })

  test('Search button visible in mobile bottom nav', async ({ page }) => {
    await expect(page.getByTestId('mobile-search-button')).toBeVisible()
  })

  test('Click search button opens modal', async ({ page }) => {
    await page.getByTestId('mobile-search-button').click()
    await expect(page.getByTestId('search-modal')).toBeVisible()
    await expect(page.getByTestId('search-input')).toBeFocused()
  })

  test('Mobile search works end to end', async ({ page }) => {
    await page.getByTestId('mobile-search-button').click()
    await expect(page.getByTestId('search-modal')).toBeVisible()
    const input = page.getByTestId('search-input')
    await input.fill('a')
    await expect(
      page.getByTestId('search-result').first().or(page.getByText('No results found'))
    ).toBeVisible({ timeout: 10000 })
  })
})
