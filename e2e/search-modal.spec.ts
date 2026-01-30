import { test, expect } from '@playwright/test';
import { authenticate } from './helpers';

test.describe('Search Modal - Complete Flow', () => {
  test.beforeEach(async ({ context }) => {
    await authenticate(context);
  });

  test('open search with Cmd+K, search notes, keyboard navigation, and close', async ({ page }) => {
    // Step 1: Navigate to daily (main authenticated page)
    await page.goto('/daily');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/search-01-before-open.png', fullPage: true });

    // Step 2: Open search modal with Cmd+K
    await page.keyboard.press('Meta+k');
    await page.waitForTimeout(500);

    const searchModal = page.locator('[data-testid="search-modal"]');
    await expect(searchModal).toBeVisible({ timeout: 3000 });
    await page.screenshot({ path: 'screenshots/search-02-modal-open.png', fullPage: true });

    // Step 3: Search input is focused and has placeholder
    const searchInput = page.locator('[data-testid="search-input"]');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toBeFocused();

    // Step 4: Type a search query
    await searchInput.fill('test');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots/search-03-typed-query.png', fullPage: true });

    // Step 5: Check for results or "no results" state
    const results = page.locator('[data-testid="search-result"]');
    const noResults = page.locator('text=No results found');
    const resultCount = await results.count();

    if (resultCount > 0) {
      await page.screenshot({ path: 'screenshots/search-04-results.png', fullPage: true });

      // Step 6: Keyboard navigation with arrows
      await searchInput.press('ArrowDown');
      await page.waitForTimeout(200);
      await page.screenshot({ path: 'screenshots/search-05-arrow-down.png', fullPage: true });

      await searchInput.press('ArrowUp');
      await page.waitForTimeout(200);
    } else {
      await expect(noResults).toBeVisible();
      await page.screenshot({ path: 'screenshots/search-04-no-results.png', fullPage: true });
    }

    // Step 7: Close with Escape
    await searchInput.press('Escape');
    await page.waitForTimeout(300);
    await expect(searchModal).not.toBeVisible();
    await page.screenshot({ path: 'screenshots/search-06-closed.png', fullPage: true });

    // Step 8: Reopen and close by clicking backdrop
    await page.keyboard.press('Meta+k');
    await page.waitForTimeout(500);
    await expect(searchModal).toBeVisible();

    // Click the backdrop (the outer overlay div)
    await searchModal.click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(300);
    await expect(searchModal).not.toBeVisible();
    await page.screenshot({ path: 'screenshots/search-07-closed-backdrop.png', fullPage: true });
  });

  test('search with empty query shows no results section', async ({ page }) => {
    await page.goto('/daily');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Open search
    await page.keyboard.press('Meta+k');
    await page.waitForTimeout(500);

    const searchInput = page.locator('[data-testid="search-input"]');
    await expect(searchInput).toBeVisible();

    // Empty query should show no results list
    await page.screenshot({ path: 'screenshots/search-08-empty-query.png', fullPage: true });

    // Type gibberish that won't match
    await searchInput.fill('zzzzxxxxxnonexistent12345');
    await page.waitForTimeout(500);
    await expect(page.locator('text=No results found')).toBeVisible();
    await page.screenshot({ path: 'screenshots/search-09-no-match.png', fullPage: true });
  });
});
