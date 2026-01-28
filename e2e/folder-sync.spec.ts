import { test, expect } from '@playwright/test';
import { authenticate } from './helpers';

test.describe('Folder Creation Sync — Sidebar + Folders Page', () => {
  test.beforeEach(async ({ context }) => {
    await authenticate(context);
  });

  test('should sync newly created folder to folders page without reload', async ({ page }) => {
    await page.goto('/folders');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1:text("Folders")')).toBeVisible({ timeout: 10000 });

    const folderName = `Sync Test ${Date.now()}`;

    // Click "New Folder"
    await page.click('text=New Folder');

    const input = page.locator('input[placeholder="Folder name..."]');
    await expect(input).toBeVisible();
    await input.fill(folderName);

    // Create
    await page.click('button:text("Create")');

    // Wait for the form to disappear (folder created)
    await expect(input).not.toBeVisible({ timeout: 5000 });

    // The folder should appear in the folders page list WITHOUT manual reload
    // router.refresh() should trigger the server to re-render and useEffect syncs the data
    await expect(page.locator(`main`).locator(`text=${folderName}`)).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'screenshots/folder-sync-created.png', fullPage: true });
  });

  test('should show new folder in sidebar on desktop after creation', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/folders');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1:text("Folders")')).toBeVisible({ timeout: 10000 });

    const folderName = `Sidebar Sync ${Date.now()}`;

    // Create folder
    await page.click('text=New Folder');
    const input = page.locator('input[placeholder="Folder name..."]');
    await input.fill(folderName);
    await page.click('button:text("Create")');

    // Wait for creation
    await expect(input).not.toBeVisible({ timeout: 5000 });

    // The folder should appear in BOTH main content AND sidebar
    // Main content
    await expect(page.locator('main').locator(`text=${folderName}`)).toBeVisible({ timeout: 10000 });

    // Sidebar (desktop only)
    const sidebar = page.locator('aside');
    await expect(sidebar.locator(`text=${folderName}`)).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'screenshots/folder-sync-sidebar.png', fullPage: true });
  });
});
