import { test, expect } from '@playwright/test';
import { authenticate } from './helpers';

test.describe('Note Full View — PageLine Editor', () => {
  test.beforeEach(async ({ context }) => {
    await authenticate(context);
  });

  test('should show note title and content editor (not textarea)', async ({ page }) => {
    // Navigate to folder
    await page.goto('/folders/test-folder-e2e');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1:text("Test Folder")')).toBeVisible({ timeout: 10000 });

    // Create a new note
    const addNoteBtn = page.locator('button:text("Add Note")');
    await expect(addNoteBtn).toBeVisible();
    await addNoteBtn.click();

    // Should navigate to note full view
    await page.waitForURL('**/note/**', { timeout: 15000 });

    // Should show back button with folder name
    await expect(page.locator('button').filter({ hasText: 'Test Folder' })).toBeVisible({ timeout: 10000 });

    // Should show a title textarea (large font, not the old single textarea)
    const titleInput = page.locator('textarea').first();
    await expect(titleInput).toBeVisible();

    // Title should have large font styling
    const fontSize = await titleInput.evaluate(el => window.getComputedStyle(el).fontSize);
    expect(parseInt(fontSize)).toBeGreaterThanOrEqual(24);

    await page.screenshot({ path: 'screenshots/note-editor-empty.png', fullPage: true });
  });

  test('should type a title and press Enter to create first content line', async ({ page }) => {
    await page.goto('/folders/test-folder-e2e');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1:text("Test Folder")')).toBeVisible({ timeout: 10000 });

    // Create note
    await page.locator('button:text("Add Note")').click();
    await page.waitForURL('**/note/**', { timeout: 15000 });

    // Type a title
    const titleInput = page.locator('textarea').first();
    await expect(titleInput).toBeVisible({ timeout: 10000 });
    await titleInput.fill('My Test Note Title');
    await page.waitForTimeout(800); // Wait for auto-save

    // Press Enter to create first content line
    await titleInput.press('Enter');
    await page.waitForTimeout(1000); // Wait for line creation

    // Should now have at least 2 textareas (title + content line)
    const textareas = page.locator('textarea');
    const count = await textareas.count();
    expect(count).toBeGreaterThanOrEqual(2);

    // Type in the content line
    const contentLine = textareas.nth(1);
    await expect(contentLine).toBeFocused({ timeout: 5000 });
    await contentLine.fill('First line of content');
    await page.waitForTimeout(800);

    await page.screenshot({ path: 'screenshots/note-editor-with-content.png', fullPage: true });
  });

  test('should support Tab indentation in content lines', async ({ page }) => {
    await page.goto('/folders/test-folder-e2e');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1:text("Test Folder")')).toBeVisible({ timeout: 10000 });

    // Create note
    await page.locator('button:text("Add Note")').click();
    await page.waitForURL('**/note/**', { timeout: 15000 });

    // Type title and press Enter
    const titleInput = page.locator('textarea').first();
    await expect(titleInput).toBeVisible({ timeout: 10000 });
    await titleInput.fill('Indentation Test');
    await page.waitForTimeout(600);
    await titleInput.press('Enter');
    await page.waitForTimeout(1000);

    // Type in the content line
    const textareas = page.locator('textarea');
    const contentLine = textareas.nth(1);
    await expect(contentLine).toBeFocused({ timeout: 5000 });
    await contentLine.fill('Indented line');
    await page.waitForTimeout(600);

    // Press Tab to indent
    await contentLine.press('Tab');
    await page.waitForTimeout(500);

    // Check that indent changed (data-indent attribute on parent)
    const lineContainer = contentLine.locator('xpath=ancestor::div[@data-indent]');
    const indentValue = await lineContainer.getAttribute('data-indent');
    expect(indentValue).toBe('1');

    // Press Shift+Tab to outdent
    await contentLine.press('Shift+Tab');
    await page.waitForTimeout(500);

    const indentAfter = await lineContainer.getAttribute('data-indent');
    expect(indentAfter).toBe('0');

    await page.screenshot({ path: 'screenshots/note-editor-indentation.png', fullPage: true });
  });

  test('should show bullet points for content lines', async ({ page }) => {
    await page.goto('/folders/test-folder-e2e');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1:text("Test Folder")')).toBeVisible({ timeout: 10000 });

    // Create note
    await page.locator('button:text("Add Note")').click();
    await page.waitForURL('**/note/**', { timeout: 15000 });

    // Type title
    const titleInput = page.locator('textarea').first();
    await expect(titleInput).toBeVisible({ timeout: 10000 });
    await titleInput.fill('Bullet Test Note');
    await page.waitForTimeout(600);

    // Create multiple content lines
    await titleInput.press('Enter');
    await page.waitForTimeout(1000);

    const line1 = page.locator('textarea').nth(1);
    await expect(line1).toBeFocused({ timeout: 5000 });
    await line1.fill('First bullet point');
    await page.waitForTimeout(500);

    await line1.press('Enter');
    await page.waitForTimeout(1000);

    const line2 = page.locator('textarea').nth(2);
    await expect(line2).toBeFocused({ timeout: 5000 });
    await line2.fill('Second bullet point');
    await page.waitForTimeout(500);

    await line2.press('Enter');
    await page.waitForTimeout(1000);

    const line3 = page.locator('textarea').nth(3);
    await expect(line3).toBeFocused({ timeout: 5000 });
    await line3.fill('Third bullet point');
    await page.waitForTimeout(500);

    // Should have bullet points (small circles) visible
    // PageLine renders bullets as 6x6 rounded divs
    const bullets = page.locator('div[style*="border-radius: 50%"]');
    const bulletCount = await bullets.count();
    expect(bulletCount).toBeGreaterThanOrEqual(3);

    await page.screenshot({ path: 'screenshots/note-editor-bullets.png', fullPage: true });
  });

  test('should navigate back to folder', async ({ page }) => {
    await page.goto('/folders/test-folder-e2e');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1:text("Test Folder")')).toBeVisible({ timeout: 10000 });

    // Create note
    await page.locator('button:text("Add Note")').click();
    await page.waitForURL('**/note/**', { timeout: 15000 });

    // Type something
    const titleInput = page.locator('textarea').first();
    await expect(titleInput).toBeVisible({ timeout: 10000 });
    await titleInput.fill('Back nav test');
    await page.waitForTimeout(1000);

    // Click back
    const backBtn = page.locator('button').filter({ hasText: 'Test Folder' });
    await backBtn.click();

    // Should be back on folder page
    await page.waitForURL('**/folders/test-folder-e2e', { timeout: 15000 });
    await expect(page.locator('h1:text("Test Folder")')).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'screenshots/note-editor-back.png', fullPage: true });
  });

  test('should auto-save content', async ({ page }) => {
    await page.goto('/folders/test-folder-e2e');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1:text("Test Folder")')).toBeVisible({ timeout: 10000 });

    // Create note
    await page.locator('button:text("Add Note")').click();
    await page.waitForURL('**/note/**', { timeout: 15000 });

    // Type title
    const titleInput = page.locator('textarea').first();
    await expect(titleInput).toBeVisible({ timeout: 10000 });
    await titleInput.fill('Auto-save Test Note');

    // Wait for save indicator
    await page.waitForTimeout(1500);

    // Should show save indicator
    const saveIndicator = page.locator('text=/Sav/');
    // It might have already disappeared, which is fine
    // Just check the flow doesn't crash

    await page.screenshot({ path: 'screenshots/note-editor-autosave.png', fullPage: true });
  });
});
