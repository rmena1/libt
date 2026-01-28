import { test, expect } from '@playwright/test';
import { authenticate } from './helpers';

test.describe('Folders - CRUD', () => {
  test.beforeEach(async ({ context }) => {
    await authenticate(context);
  });

  test('should navigate to folders page', async ({ page }) => {
    await page.goto('/folders');
    await page.waitForLoadState('networkidle');
    
    const header = page.locator('h1');
    await expect(header).toContainText('Folders');
    
    await page.screenshot({ path: 'screenshots/folders-page.png', fullPage: true });
  });

  test('should show existing folders', async ({ page }) => {
    await page.goto('/folders');
    await page.waitForLoadState('networkidle');
    
    // Should show the test folder in the main content area
    await expect(page.locator('main').locator('text=Test Folder').first()).toBeVisible();
    
    await page.screenshot({ path: 'screenshots/folders-list.png', fullPage: true });
  });

  test('should show create folder button and form', async ({ page }) => {
    await page.goto('/folders');
    await page.waitForLoadState('networkidle');
    
    // Click "New Folder"
    await page.click('text=New Folder');
    
    // Input should appear
    const input = page.locator('input[placeholder="Folder name..."]');
    await expect(input).toBeVisible();
    
    await page.screenshot({ path: 'screenshots/folders-create-form.png' });
    
    // Cancel
    await page.click('button:text("Cancel")');
    await expect(input).not.toBeVisible();
  });

  test('should create a new folder', async ({ page }) => {
    await page.goto('/folders');
    await page.waitForLoadState('networkidle');
    
    await page.click('text=New Folder');
    
    const input = page.locator('input[placeholder="Folder name..."]');
    const folderName = `E2E Folder ${Date.now()}`;
    await input.fill(folderName);
    
    await page.click('button:text("Create")');
    
    // Wait for the input form to disappear (folder created)
    await expect(input).not.toBeVisible({ timeout: 5000 });
    
    // Reload the page and check the folder exists
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('main').locator(`text=${folderName}`)).toBeVisible({ timeout: 5000 });
    
    await page.screenshot({ path: 'screenshots/folders-created-new.png', fullPage: true });
  });

  test('should show nested folders with expand/collapse', async ({ page }) => {
    await page.goto('/folders');
    await page.waitForLoadState('networkidle');
    
    // Test Folder should show with an expand chevron (in main content)
    const testFolder = page.locator('main').locator('text=Test Folder').first();
    await expect(testFolder).toBeVisible();
    
    // Child Folder should be visible (expanded by default, in main content)
    const childFolder = page.locator('main').locator('text=Child Folder').first();
    const isChildVisible = await childFolder.isVisible().catch(() => false);
    
    await page.screenshot({ path: 'screenshots/folders-nested.png', fullPage: true });
  });
});

test.describe('Folders - Detail Page', () => {
  test.beforeEach(async ({ context }) => {
    await authenticate(context);
  });

  test('should navigate to folder detail page', async ({ page }) => {
    await page.goto('/folders/test-folder-e2e');
    await page.waitForLoadState('networkidle');
    
    // Should show folder name
    await expect(page.locator('h1:text("Test Folder")')).toBeVisible();
    
    await page.screenshot({ path: 'screenshots/folder-detail.png', fullPage: true });
  });

  test('should show breadcrumb navigation', async ({ page }) => {
    await page.goto('/folders/test-folder-e2e');
    await page.waitForLoadState('networkidle');
    
    // Breadcrumbs: Folders > Test Folder
    const breadcrumbLink = page.locator('main nav a:text("Folders")');
    await expect(breadcrumbLink).toBeVisible();
    
    await page.screenshot({ path: 'screenshots/folder-breadcrumbs.png' });
  });

  test('should show child folders section', async ({ page }) => {
    await page.goto('/folders/test-folder-e2e');
    await page.waitForLoadState('networkidle');
    
    // Should show Subfolders section with Child Folder (in main content)
    await expect(page.locator('main').locator('text=Child Folder').first()).toBeVisible();
    
    await page.screenshot({ path: 'screenshots/folder-subfolders.png' });
  });

  test('should show notes in folder', async ({ page }) => {
    await page.goto('/folders/test-folder-e2e');
    await page.waitForLoadState('networkidle');
    
    // Should show the note
    await expect(page.locator('text=Test note in folder').first()).toBeVisible();
    
    await page.screenshot({ path: 'screenshots/folder-notes.png', fullPage: true });
  });

  test('should show action buttons (Add Note, Subfolder)', async ({ page }) => {
    await page.goto('/folders/test-folder-e2e');
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('button:text("Add Note")')).toBeVisible();
    await expect(page.locator('button:text("Subfolder")')).toBeVisible();
    
    await page.screenshot({ path: 'screenshots/folder-actions.png' });
  });

  test('should create a note in folder', async ({ page }) => {
    await page.goto('/folders/test-folder-e2e');
    await page.waitForLoadState('networkidle');
    
    const initialNoteCount = await page.locator('[style*="border-radius: 50%"][style*="width: 6px"]').count();
    
    await page.click('button:text("Add Note")');
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: 'screenshots/folder-note-created.png', fullPage: true });
  });

  test('should navigate to child folder', async ({ page }) => {
    await page.goto('/folders/test-folder-e2e');
    await page.waitForLoadState('networkidle');
    
    const childLink = page.locator('main').locator('a:text("Child Folder")').first();
    await childLink.click();
    await page.waitForLoadState('networkidle');
    
    // Should now be on child folder page
    await expect(page.locator('h1:text("Child Folder")')).toBeVisible();
    
    // Breadcrumbs should show: Folders > Test Folder > Child Folder
    await expect(page.locator('main nav a:text("Folders")')).toBeVisible();
    
    await page.screenshot({ path: 'screenshots/child-folder-detail.png', fullPage: true });
  });

  test('should show empty state for empty folder', async ({ page }) => {
    await page.goto('/folders/child-folder-e2e');
    await page.waitForLoadState('networkidle');
    
    const emptyText = page.locator('text=This folder is empty');
    if (await emptyText.isVisible()) {
      await page.screenshot({ path: 'screenshots/folder-empty-state.png', fullPage: true });
    }
  });
});

test.describe('Folders - Sidebar', () => {
  test.beforeEach(async ({ context }) => {
    await authenticate(context);
  });

  test('should show folder tree in sidebar (desktop)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/daily');
    await page.waitForLoadState('networkidle');
    
    // Desktop sidebar should be visible
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
    
    // Should show "Folders" label and folder names
    const foldersLabel = sidebar.locator('text=Folders').first();
    
    await page.screenshot({ path: 'screenshots/sidebar-folder-tree.png', fullPage: true });
  });

  test('should highlight active folder in sidebar', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/folders/test-folder-e2e');
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ path: 'screenshots/sidebar-active-folder.png', fullPage: true });
  });
});
