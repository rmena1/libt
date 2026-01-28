import { test, expect } from '@playwright/test'

test('sidebar screenshot', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/login')
  await page.waitForLoadState('networkidle')
  await page.fill('input[name="email"]', 'clod3@test.com')
  await page.fill('input[name="password"]', 'testtest123')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/daily', { timeout: 10000 })
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)
  
  await page.screenshot({ path: 'screenshots/full-page-redesign.png', fullPage: false })
  
  const sidebar = page.locator('div.fixed.right-0').first()
  if (await sidebar.isVisible()) {
    await sidebar.screenshot({ path: 'screenshots/sidebar-redesign.png' })
  }
})
