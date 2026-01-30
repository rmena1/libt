import { test, expect } from '@playwright/test';
import { authenticate } from './helpers';

test.describe('Sidebar Navigation - Complete Flow', () => {
  test.beforeEach(async ({ context }) => {
    await authenticate(context);
  });

  test('sidebar links, active states, collapse/expand, and starred pages', async ({ page }) => {
    // Step 1: Navigate to daily (default page)
    await page.goto('/daily');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/sidebar-01-daily-active.png', fullPage: true });

    // Step 2: Verify sidebar nav items visible (desktop)
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible({ timeout: 5000 });

    await expect(page.locator('a:text("Daily Notes")')).toBeVisible();
    await expect(page.locator('a:text("Tasks")')).toBeVisible();
    await expect(page.locator('a:text("Folders")')).toBeVisible();

    // Step 3: Navigate to Tasks via sidebar
    await page.locator('a:text("Tasks")').click();
    await page.waitForURL('**/tasks');
    await page.waitForTimeout(1000);
    await expect(page.locator('h1:text("Tasks")')).toBeVisible();
    await page.screenshot({ path: 'screenshots/sidebar-02-tasks-active.png', fullPage: true });

    // Step 4: Navigate to Folders via sidebar
    await page.locator('a:text("Folders")').click();
    await page.waitForURL('**/folders');
    await page.waitForTimeout(1000);
    await expect(page.locator('h1:text("Folders")')).toBeVisible();
    await page.screenshot({ path: 'screenshots/sidebar-03-folders-active.png', fullPage: true });

    // Step 5: Navigate back to Daily Notes
    await page.locator('a:text("Daily Notes")').click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/sidebar-04-back-to-daily.png', fullPage: true });

    // Step 6: Collapse sidebar
    const collapseBtn = page.locator('button[title="Collapse sidebar"]');
    if (await collapseBtn.isVisible().catch(() => false)) {
      await collapseBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'screenshots/sidebar-05-collapsed.png', fullPage: true });

      // Step 7: Expand sidebar
      const expandBtn = page.locator('button[title="Expand sidebar"]');
      await expect(expandBtn).toBeVisible();
      await expandBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'screenshots/sidebar-06-expanded.png', fullPage: true });
    }

    // Step 8: Check libt logo link
    const logoLink = page.locator('a:text("libt")').first();
    if (await logoLink.isVisible().catch(() => false)) {
      await page.screenshot({ path: 'screenshots/sidebar-07-logo-visible.png', fullPage: true });
    }

    // Step 9: Check starred section (may or may not have items)
    const starredSection = page.locator('text=Starred');
    if (await starredSection.isVisible().catch(() => false)) {
      await page.screenshot({ path: 'screenshots/sidebar-08-starred-section.png', fullPage: true });
    }

    // Step 10: Check sign out button exists
    const signOutBtn = page.locator('button[title="Sign out"]');
    await expect(signOutBtn).toBeVisible();
    await page.screenshot({ path: 'screenshots/sidebar-09-signout-visible.png', fullPage: true });
  });
});
