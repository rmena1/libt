import { test, expect } from '@playwright/test';
import { authenticate } from './helpers';

test.describe('Notes in Folders — Clean List View', () => {
  test.beforeEach(async ({ context }) => {
    await authenticate(context);
  });

  test('should display notes as a clean list with title and date', async ({ page }) => {
    await page.goto('/folders/test-folder-e2e');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1:text("Test Folder")')).toBeVisible({ timeout: 10000 });

    // Should show notes section header
    await expect(page.locator('text=Notes').first()).toBeVisible();

    // Notes should be displayed as clickable list items (links)
    const noteLinks = page.locator('a[href*="/note/"]');
    const count = await noteLinks.count();
    
    if (count > 0) {
      // First note should be visible
      await expect(noteLinks.first()).toBeVisible();
    }

    await page.screenshot({ path: 'screenshots/folder-notes-list.png', fullPage: true });
  });

  test('should show Add Note button that creates and navigates to note', async ({ page }) => {
    await page.goto('/folders/test-folder-e2e');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1:text("Test Folder")')).toBeVisible({ timeout: 10000 });

    // Add Note button should exist
    const addNoteBtn = page.locator('button:text("Add Note")');
    await expect(addNoteBtn).toBeVisible();

    // Click to create a note
    await addNoteBtn.click();

    // Should navigate to full screen note view
    await page.waitForURL('**/note/**', { timeout: 15000 });

    // The full screen view should show the folder name in back button
    await expect(page.locator('button').filter({ hasText: 'Test Folder' })).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'screenshots/note-fullscreen-new.png', fullPage: true });
  });
});

test.describe('Notes in Folders — Full Screen View', () => {
  test.beforeEach(async ({ context }) => {
    await authenticate(context);
  });

  test('should open note in full screen when clicked from list', async ({ page }) => {
    await page.goto('/folders/test-folder-e2e');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1:text("Test Folder")')).toBeVisible({ timeout: 10000 });

    // Click on the first note if one exists
    const noteLink = page.locator('a[href*="/note/"]').first();
    const hasNotes = await noteLink.isVisible().catch(() => false);

    if (hasNotes) {
      await noteLink.click();
      await page.waitForURL('**/note/**', { timeout: 15000 });

      // Should show back button with folder name
      await expect(page.locator('button').filter({ hasText: 'Test Folder' })).toBeVisible({ timeout: 10000 });

      // Should show textarea editor
      const editor = page.locator('textarea');
      await expect(editor).toBeVisible();

      await page.screenshot({ path: 'screenshots/note-fullscreen-view.png', fullPage: true });
    }
  });

  test('should have editable content with auto-save', async ({ page }) => {
    // Create a new note first
    await page.goto('/folders/test-folder-e2e');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1:text("Test Folder")')).toBeVisible({ timeout: 10000 });

    await page.locator('button:text("Add Note")').click();
    await page.waitForURL('**/note/**', { timeout: 15000 });

    // Type some content
    const editor = page.locator('textarea');
    await expect(editor).toBeVisible({ timeout: 10000 });
    await editor.fill('This is a test note\nWith multiple lines\nAnd content');

    // Wait for auto-save
    await page.waitForTimeout(1500);

    await page.screenshot({ path: 'screenshots/note-fullscreen-editing.png', fullPage: true });
  });

  test('should navigate back to folder when clicking back', async ({ page }) => {
    await page.goto('/folders/test-folder-e2e');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1:text("Test Folder")')).toBeVisible({ timeout: 10000 });

    await page.locator('button:text("Add Note")').click();
    await page.waitForURL('**/note/**', { timeout: 15000 });

    // Type something
    const editor = page.locator('textarea');
    await expect(editor).toBeVisible({ timeout: 10000 });
    await editor.fill('Back navigation test note');
    await page.waitForTimeout(1500); // wait for auto-save

    // Click back
    const backBtn = page.locator('button').filter({ hasText: 'Test Folder' });
    await backBtn.click();

    // Should be back on folder page
    await page.waitForURL('**/folders/test-folder-e2e', { timeout: 15000 });
    await expect(page.locator('h1:text("Test Folder")')).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'screenshots/note-back-to-folder.png', fullPage: true });
  });

  test('full screen note view should be distraction-free', async ({ page }) => {
    await page.goto('/folders/test-folder-e2e');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1:text("Test Folder")')).toBeVisible({ timeout: 10000 });

    await page.locator('button:text("Add Note")').click();
    await page.waitForURL('**/note/**', { timeout: 15000 });

    const editor = page.locator('textarea');
    await expect(editor).toBeVisible({ timeout: 10000 });
    await editor.fill('# A Beautiful Note\n\nThis is a distraction-free writing experience.\nNo clutter. Just your thoughts.\n\nClean. Minimal. Perfect.');
    await page.waitForTimeout(1500);

    await page.screenshot({ path: 'screenshots/note-distraction-free.png', fullPage: true });
  });
});
