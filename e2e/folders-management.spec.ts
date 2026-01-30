import { test, expect } from '@playwright/test';
import { authenticate } from './helpers';

test.describe('Folders Management - Complete CRUD Flow', () => {
  test.beforeEach(async ({ context }) => {
    await authenticate(context);
  });

  test('create folder, navigate into it, go back, and delete it', async ({ page }) => {
    // Step 1: Navigate to folders page
    await page.goto('/folders');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    await expect(page.locator('h1:text("Folders")')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'screenshots/folders-01-initial-page.png', fullPage: true });

    // Step 2: Click "New Folder" button
    const newFolderBtn = page.locator('button').filter({ hasText: 'New Folder' });
    await expect(newFolderBtn).toBeVisible();
    await newFolderBtn.click();
    await page.waitForTimeout(300);

    // Step 3: Folder creation form appears
    const nameInput = page.locator('input[placeholder="Folder name..."]');
    await expect(nameInput).toBeVisible();
    await expect(page.locator('button:text("Create")')).toBeVisible();
    await expect(page.locator('button:text("Cancel")')).toBeVisible();
    await page.screenshot({ path: 'screenshots/folders-02-create-form.png', fullPage: true });

    // Step 4: Create button should be disabled with empty name
    const createBtn = page.locator('button:text("Create")');
    await expect(createBtn).toBeDisabled();

    // Step 5: Type folder name and create
    const testFolderName = `E2E Test ${Date.now()}`;
    await nameInput.fill(testFolderName);
    await expect(createBtn).toBeEnabled();
    await page.screenshot({ path: 'screenshots/folders-03-typed-name.png', fullPage: true });

    await createBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'screenshots/folders-04-folder-created.png', fullPage: true });

    // Step 6: Navigate into the folder by clicking the link in main content area
    // The folder list is inside a div with white bg and border-radius
    const folderListContainer = page.locator('div[style*="border-radius: 12px"]').filter({ hasText: testFolderName });
    const folderLink = folderListContainer.locator('a').filter({ hasText: testFolderName });
    await expect(folderLink).toBeVisible({ timeout: 5000 });
    await folderLink.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'screenshots/folders-05-folder-detail.png', fullPage: true });

    // Step 7: Go back to folders list
    await page.goto('/folders');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // Step 8: Delete the test folder
    page.on('dialog', dialog => dialog.accept());
    // Hover the folder row to show action buttons
    const folderRow = page.locator('div[style*="border-radius: 12px"]').filter({ hasText: testFolderName });
    const folderText = folderRow.locator('a').filter({ hasText: testFolderName });
    await folderText.hover();
    await page.waitForTimeout(300);

    const delBtn = folderRow.locator('button[title="Delete"]');
    if (await delBtn.isVisible().catch(() => false)) {
      await delBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'screenshots/folders-06-after-delete.png', fullPage: true });
    }
  });

  test('cancel folder creation and keyboard shortcut', async ({ page }) => {
    await page.goto('/folders');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Click New Folder
    await page.locator('button').filter({ hasText: 'New Folder' }).click();
    await page.waitForTimeout(300);

    // Type something
    const nameInput = page.locator('input[placeholder="Folder name..."]');
    await nameInput.fill('Should be cancelled');
    await page.screenshot({ path: 'screenshots/folders-07-before-cancel.png', fullPage: true });

    // Cancel with button
    await page.locator('button:text("Cancel")').click();
    await page.waitForTimeout(300);

    // New Folder button should be back
    await expect(page.locator('button').filter({ hasText: 'New Folder' })).toBeVisible();
    await page.screenshot({ path: 'screenshots/folders-08-after-cancel.png', fullPage: true });

    // Test Escape key to cancel
    await page.locator('button').filter({ hasText: 'New Folder' }).click();
    await page.waitForTimeout(300);
    await page.locator('input[placeholder="Folder name..."]').fill('Escape test');
    await page.locator('input[placeholder="Folder name..."]').press('Escape');
    await page.waitForTimeout(300);
    await expect(page.locator('button').filter({ hasText: 'New Folder' })).toBeVisible();
    await page.screenshot({ path: 'screenshots/folders-09-escape-cancel.png', fullPage: true });

    // Test Enter key to create
    await page.locator('button').filter({ hasText: 'New Folder' }).click();
    await page.waitForTimeout(300);
    const enterFolderName = `Enter Test ${Date.now()}`;
    await page.locator('input[placeholder="Folder name..."]').fill(enterFolderName);
    await page.locator('input[placeholder="Folder name..."]').press('Enter');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/folders-10-enter-created.png', fullPage: true });

    // Cleanup: delete the folder
    page.on('dialog', dialog => dialog.accept());
    const folderRow = page.locator('div[style*="border-radius: 12px"]').filter({ hasText: enterFolderName });
    const link = folderRow.locator('a').filter({ hasText: enterFolderName });
    if (await link.isVisible().catch(() => false)) {
      await link.hover();
      await page.waitForTimeout(200);
      const delBtn = folderRow.locator('button[title="Delete"]');
      if (await delBtn.isVisible().catch(() => false)) {
        await delBtn.click();
        await page.waitForTimeout(500);
      }
    }
  });
});
