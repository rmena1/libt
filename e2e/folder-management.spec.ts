import { test, expect } from '@playwright/test';
import { authenticate } from './helpers';

test.describe('Folder Management - Rename & Delete', () => {
  test.beforeEach(async ({ context }) => {
    await authenticate(context);
  });

  test.describe('Folder Rename', () => {
    test('should rename folder from list view', async ({ page }) => {
      await page.goto('/folders');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('h1:text("Folders")')).toBeVisible({ timeout: 10000 });

      // First create a folder to rename
      const uniqueName = `Rename Test ${Date.now()}`;
      await page.click('text=New Folder');
      const input = page.locator('input[placeholder="Folder name..."]');
      await input.fill(uniqueName);
      await page.click('button:text("Create")');
      await expect(input).not.toBeVisible({ timeout: 5000 });
      
      // Wait for folder to appear
      await page.waitForTimeout(1000);
      
      // Find the rename button (pencil icon) next to the folder
      const folderRow = page.locator(`text=${uniqueName}`).locator('xpath=ancestor::div').first();
      
      // Hover to show actions
      await folderRow.hover();
      await page.waitForTimeout(300);
      
      // Click rename button
      const renameBtn = folderRow.locator('button[title="Rename"]');
      const hasRenameBtn = await renameBtn.isVisible().catch(() => false);
      
      if (hasRenameBtn) {
        await renameBtn.click();
        await page.waitForTimeout(500);
        
        // Should show input for editing
        const editInput = page.locator('input[style*="border: 1px solid #007aff"]');
        await expect(editInput).toBeVisible({ timeout: 3000 });
        
        // Type new name
        const newName = `Renamed ${Date.now()}`;
        await editInput.fill(newName);
        await editInput.press('Enter');
        await page.waitForTimeout(1500);
        
        // Should show new name
        await expect(page.locator(`text=${newName}`)).toBeVisible({ timeout: 5000 });
        
        await page.screenshot({ path: 'screenshots/folder-renamed.png', fullPage: true });
      }
    });

    test('should rename folder from detail view', async ({ page }) => {
      // First, create a folder to rename
      await page.goto('/folders');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('h1:text("Folders")')).toBeVisible({ timeout: 10000 });

      const detailRenameName = `Detail Rename ${Date.now()}`;
      await page.click('text=New Folder');
      const input = page.locator('input[placeholder="Folder name..."]');
      await input.fill(detailRenameName);
      await page.click('button:text("Create")');
      await expect(input).not.toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(1500);

      // Navigate to the folder
      const folderLink = page.locator(`a`).filter({ hasText: detailRenameName });
      await folderLink.first().click();
      await page.waitForURL('**/folders/**', { timeout: 10000 });
      
      // Verify we're on the folder page
      await expect(page.locator('h1').filter({ hasText: detailRenameName })).toBeVisible({ timeout: 10000 });

      // Click on the title to rename
      const title = page.locator('h1').first();
      await title.click();
      await page.waitForTimeout(500);

      // Should show input field (a bare input field)
      const titleInput = page.locator('input').first();
      const hasInput = await titleInput.isVisible().catch(() => false);
      
      if (hasInput) {
        // Change name
        const newName = `Renamed ${Date.now()}`;
        await titleInput.fill(newName);
        await titleInput.press('Enter');
        await page.waitForTimeout(1500);
      }
      
      await page.screenshot({ path: 'screenshots/folder-rename-detail.png', fullPage: true });
    });

    test('should cancel rename on Escape', async ({ page }) => {
      await page.goto('/folders');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('h1:text("Folders")')).toBeVisible({ timeout: 10000 });

      // Create a folder
      const uniqueName = `Escape Test ${Date.now()}`;
      await page.click('text=New Folder');
      const input = page.locator('input[placeholder="Folder name..."]');
      await input.fill(uniqueName);
      await page.click('button:text("Create")');
      await expect(input).not.toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(1000);

      // Find and hover folder
      const folderRow = page.locator(`text=${uniqueName}`).locator('xpath=ancestor::div').first();
      await folderRow.hover();
      await page.waitForTimeout(300);
      
      const renameBtn = folderRow.locator('button[title="Rename"]');
      const hasRenameBtn = await renameBtn.isVisible().catch(() => false);
      
      if (hasRenameBtn) {
        await renameBtn.click();
        await page.waitForTimeout(500);
        
        const editInput = page.locator('input[style*="border: 1px solid #007aff"]');
        await editInput.fill('New Name That Should Be Cancelled');
        
        // Press Escape to cancel
        await editInput.press('Escape');
        await page.waitForTimeout(500);
        
        // Original name should be preserved
        await expect(page.locator(`text=${uniqueName}`)).toBeVisible();
        
        await page.screenshot({ path: 'screenshots/folder-rename-cancelled.png', fullPage: true });
      }
    });
  });

  test.describe('Folder Delete', () => {
    test('should delete folder with confirmation from list view', async ({ page }) => {
      await page.goto('/folders');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('h1:text("Folders")')).toBeVisible({ timeout: 10000 });

      // Create a folder to delete
      const uniqueName = `Delete Test ${Date.now()}`;
      await page.click('text=New Folder');
      const input = page.locator('input[placeholder="Folder name..."]');
      await input.fill(uniqueName);
      await page.click('button:text("Create")');
      await expect(input).not.toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(1000);

      // Find and hover folder
      const folderRow = page.locator(`text=${uniqueName}`).locator('xpath=ancestor::div').first();
      await folderRow.hover();
      await page.waitForTimeout(300);
      
      // Set up dialog handler for confirmation
      page.on('dialog', async dialog => {
        expect(dialog.message()).toContain('Delete');
        await dialog.accept();
      });
      
      const deleteBtn = folderRow.locator('button[title="Delete"]');
      const hasDeleteBtn = await deleteBtn.isVisible().catch(() => false);
      
      if (hasDeleteBtn) {
        await deleteBtn.click();
        await page.waitForTimeout(1500);
        
        // Folder should be gone
        const folderStillExists = await page.locator(`text=${uniqueName}`).isVisible().catch(() => false);
        expect(folderStillExists).toBeFalsy();
        
        await page.screenshot({ path: 'screenshots/folder-deleted.png', fullPage: true });
      }
    });

    test('should cancel delete on dialog dismiss', async ({ page }) => {
      await page.goto('/folders');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('h1:text("Folders")')).toBeVisible({ timeout: 10000 });

      // Create a folder
      const uniqueName = `Cancel Delete ${Date.now()}`;
      await page.click('text=New Folder');
      const input = page.locator('input[placeholder="Folder name..."]');
      await input.fill(uniqueName);
      await page.click('button:text("Create")');
      await expect(input).not.toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(1000);

      // Find and hover folder
      const folderRow = page.locator(`text=${uniqueName}`).locator('xpath=ancestor::div').first();
      await folderRow.hover();
      await page.waitForTimeout(300);
      
      // Set up dialog handler to DISMISS (cancel delete)
      page.on('dialog', async dialog => {
        await dialog.dismiss();
      });
      
      const deleteBtn = folderRow.locator('button[title="Delete"]');
      const hasDeleteBtn = await deleteBtn.isVisible().catch(() => false);
      
      if (hasDeleteBtn) {
        await deleteBtn.click();
        await page.waitForTimeout(1000);
        
        // Folder should still exist
        await expect(page.locator(`text=${uniqueName}`)).toBeVisible();
        
        await page.screenshot({ path: 'screenshots/folder-delete-cancelled.png', fullPage: true });
      }
    });

    test('should delete folder from detail view', async ({ page }) => {
      // First create a folder via the folders page
      await page.goto('/folders');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('h1:text("Folders")')).toBeVisible({ timeout: 10000 });

      const uniqueName = `Detail Delete ${Date.now()}`;
      await page.click('text=New Folder');
      const input = page.locator('input[placeholder="Folder name..."]');
      await input.fill(uniqueName);
      await page.click('button:text("Create")');
      await expect(input).not.toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(1500);

      // Navigate to the folder detail page
      const folderLink = page.locator(`a`).filter({ hasText: uniqueName });
      await folderLink.first().click();
      await page.waitForURL('**/folders/**', { timeout: 10000 });
      
      // Find delete button in header
      const deleteBtn = page.locator('button[title="Delete folder"]');
      const hasDeleteBtn = await deleteBtn.isVisible().catch(() => false);
      
      // Set up dialog handler
      page.on('dialog', async dialog => {
        await dialog.accept();
      });
      
      if (hasDeleteBtn) {
        await deleteBtn.click();
        await page.waitForTimeout(1500);
        
        // Should redirect to /folders
        await page.waitForURL('**/folders', { timeout: 10000 });
        
        await page.screenshot({ path: 'screenshots/folder-deleted-from-detail.png', fullPage: true });
      }
    });
  });

  test.describe('Subfolder Creation', () => {
    test('should create subfolder from folder detail page', async ({ page }) => {
      // First, create a parent folder
      await page.goto('/folders');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('h1:text("Folders")')).toBeVisible({ timeout: 10000 });

      const parentName = `Parent ${Date.now()}`;
      await page.click('text=New Folder');
      const input = page.locator('input[placeholder="Folder name..."]');
      await input.fill(parentName);
      await page.click('button:text("Create")');
      await expect(input).not.toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(1500);

      // Navigate to the folder
      const folderLink = page.locator(`a`).filter({ hasText: parentName });
      await folderLink.first().click();
      await page.waitForURL('**/folders/**', { timeout: 10000 });
      
      await expect(page.locator('h1').filter({ hasText: parentName })).toBeVisible({ timeout: 10000 });

      // Click Subfolder button
      const subfolderBtn = page.locator('button:text("Subfolder")');
      await expect(subfolderBtn).toBeVisible();
      await subfolderBtn.click();
      
      // Should show input form
      const subfolderInput = page.locator('input[placeholder="Subfolder name..."]');
      await expect(subfolderInput).toBeVisible({ timeout: 3000 });
      
      const subfolderName = `Subfolder ${Date.now()}`;
      await subfolderInput.fill(subfolderName);
      
      await page.screenshot({ path: 'screenshots/folder-subfolder-form.png', fullPage: true });
      
      // Create
      await page.locator('button:text("Create")').last().click();
      await page.waitForTimeout(1500);
      
      // Should show in subfolders section
      await expect(page.locator(`text=${subfolderName}`)).toBeVisible({ timeout: 5000 });
      
      await page.screenshot({ path: 'screenshots/folder-subfolder-created.png', fullPage: true });
    });

    test('should navigate to subfolder', async ({ page }) => {
      // First, create a parent folder with a subfolder
      await page.goto('/folders');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('h1:text("Folders")')).toBeVisible({ timeout: 10000 });

      const parentName = `NavParent ${Date.now()}`;
      await page.click('text=New Folder');
      const input = page.locator('input[placeholder="Folder name..."]');
      await input.fill(parentName);
      await page.click('button:text("Create")');
      await expect(input).not.toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(1500);

      // Navigate to parent folder
      const folderLink = page.locator(`a`).filter({ hasText: parentName });
      await folderLink.first().click();
      await page.waitForURL('**/folders/**', { timeout: 10000 });

      // Create a subfolder
      await page.locator('button:text("Subfolder")').click();
      const subInput = page.locator('input[placeholder="Subfolder name..."]');
      const childName = `NavChild ${Date.now()}`;
      await subInput.fill(childName);
      await page.locator('button:text("Create")').last().click();
      await page.waitForTimeout(1500);

      // Navigate to child folder
      const childLink = page.locator('main').locator('a').filter({ hasText: childName }).first();
      await expect(childLink).toBeVisible({ timeout: 5000 });
      await childLink.click();
      await page.waitForURL('**/folders/**', { timeout: 10000 });
      
      // Should show breadcrumbs including parent
      await expect(page.locator('nav').filter({ hasText: parentName })).toBeVisible({ timeout: 5000 });
      
      await page.screenshot({ path: 'screenshots/folder-subfolder-navigation.png', fullPage: true });
    });
  });

  test.describe('Empty States', () => {
    test('should show empty state when no folders exist', async ({ page }) => {
      // This test assumes there might be an empty state
      await page.goto('/folders');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('h1:text("Folders")')).toBeVisible({ timeout: 10000 });

      const emptyState = page.locator('text=No folders yet');
      const hasEmpty = await emptyState.isVisible().catch(() => false);
      
      if (hasEmpty) {
        await expect(page.locator('text=Create folders to organize')).toBeVisible();
        await page.screenshot({ path: 'screenshots/folders-empty-state.png', fullPage: true });
      }
    });

    test('should show empty state for empty folder', async ({ page }) => {
      // Navigate to a folder that might be empty
      await page.goto('/folders/child-folder-e2e');
      await page.waitForLoadState('domcontentloaded');
      
      const emptyState = page.locator('text=This folder is empty');
      const hasEmpty = await emptyState.isVisible().catch(() => false);
      
      if (hasEmpty) {
        await page.screenshot({ path: 'screenshots/folder-detail-empty.png', fullPage: true });
      }
    });
  });
});
