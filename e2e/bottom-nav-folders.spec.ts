import { test, expect } from '@playwright/test';
import { authenticate } from './helpers';

test.describe('Bottom Nav - Folders button (mobile)', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test.beforeEach(async ({ context }) => {
    await authenticate(context);
  });

  test('bottom nav shows Folders button instead of Search', async ({ page }) => {
    await page.goto('/daily');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Should NOT have a search button in bottom nav
    const searchButton = page.locator('[data-testid="mobile-search-button"]');
    await expect(searchButton).not.toBeVisible();

    // Should have Folders text in bottom nav
    const foldersText = page.locator('.mobile-bottom-nav').getByText('Folders');
    await expect(foldersText).toBeVisible();
    await page.screenshot({ path: 'screenshots/bottom-nav-01-folders-button.png', fullPage: true });

    // Navigate to /folders directly to verify page exists
    await page.goto('/folders');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('/folders');
    await page.screenshot({ path: 'screenshots/bottom-nav-02-folders-page.png', fullPage: true });
  });
});
