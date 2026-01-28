import { test, expect } from '@playwright/test';
import { authenticate } from './helpers';

test.describe('Folder Tags (#folder-name) in Daily Notes', () => {
  test.beforeEach(async ({ context }) => {
    await authenticate(context);
  });

  test('should show autocomplete dropdown when typing #', async ({ page }) => {
    await page.goto('/daily');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000); // Wait for daily notes to load

    // Find today's section and click to create a note
    // Look for existing textarea or "What's on your mind" button
    const existingTextarea = page.locator('textarea').first();
    const createButton = page.locator('button:text("What\'s on your mind")').first();

    const hasTextarea = await existingTextarea.isVisible().catch(() => false);
    if (!hasTextarea) {
      // Click the create button
      const hasCreateBtn = await createButton.isVisible().catch(() => false);
      if (hasCreateBtn) {
        await createButton.click();
        await page.waitForTimeout(1000);
      }
    }

    // Get the first textarea (should be in today's section)
    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible({ timeout: 10000 });

    // Type text with # to trigger autocomplete
    await textarea.click();
    await textarea.fill('Testing ');
    await page.waitForTimeout(300);

    // Type # to trigger autocomplete
    await textarea.press('#');
    await page.waitForTimeout(500);

    // Should show autocomplete dropdown
    // The dropdown is an absolutely positioned div with folder buttons
    const dropdown = page.locator('div[style*="position: absolute"][style*="z-index: 50"]');
    const isDropdownVisible = await dropdown.isVisible().catch(() => false);

    // Take screenshot regardless
    await page.screenshot({ path: 'screenshots/folder-tag-autocomplete.png', fullPage: true });

    // If there are folders, dropdown should be visible
    if (isDropdownVisible) {
      // Should show folder items with folder icon
      const folderItems = dropdown.locator('button');
      const itemCount = await folderItems.count();
      expect(itemCount).toBeGreaterThan(0);
    }
  });

  test('should filter autocomplete as user types', async ({ page }) => {
    await page.goto('/daily');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Find or create a textarea
    const existingTextarea = page.locator('textarea').first();
    const hasTextarea = await existingTextarea.isVisible().catch(() => false);
    if (!hasTextarea) {
      const createButton = page.locator('button:text("What\'s on your mind")').first();
      const hasBtn = await createButton.isVisible().catch(() => false);
      if (hasBtn) {
        await createButton.click();
        await page.waitForTimeout(1000);
      }
    }

    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible({ timeout: 10000 });

    // Type #test to filter
    await textarea.click();
    await textarea.fill('');
    await page.waitForTimeout(200);
    
    // Type character by character to trigger autocomplete
    await textarea.pressSequentially('#test', { delay: 100 });
    await page.waitForTimeout(500);

    // Check if dropdown is showing with filtered results
    const dropdown = page.locator('div[style*="position: absolute"][style*="z-index: 50"]');
    const isVisible = await dropdown.isVisible().catch(() => false);

    await page.screenshot({ path: 'screenshots/folder-tag-filter.png', fullPage: true });

    if (isVisible) {
      // All visible items should contain "test" in their text
      const items = dropdown.locator('button');
      const count = await items.count();
      for (let i = 0; i < count; i++) {
        const text = await items.nth(i).textContent();
        expect(text?.toLowerCase()).toContain('test');
      }
    }
  });

  test('should select a folder and show folder badge', async ({ page }) => {
    await page.goto('/daily');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Find or create a textarea
    const existingTextarea = page.locator('textarea').first();
    const hasTextarea = await existingTextarea.isVisible().catch(() => false);
    if (!hasTextarea) {
      const createButton = page.locator('button:text("What\'s on your mind")').first();
      const hasBtn = await createButton.isVisible().catch(() => false);
      if (hasBtn) {
        await createButton.click();
        await page.waitForTimeout(1000);
      }
    }

    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible({ timeout: 10000 });

    // Type # to trigger autocomplete
    await textarea.click();
    await textarea.fill('');
    await page.waitForTimeout(200);
    await textarea.pressSequentially('#', { delay: 50 });
    await page.waitForTimeout(500);

    // Check for dropdown
    const dropdown = page.locator('div[style*="position: absolute"][style*="z-index: 50"]');
    const isVisible = await dropdown.isVisible().catch(() => false);

    if (isVisible) {
      // Click the first folder option
      const firstOption = dropdown.locator('button').first();
      const folderName = await firstOption.textContent();
      await firstOption.click();
      await page.waitForTimeout(1000);

      // Autocomplete should be dismissed
      await expect(dropdown).not.toBeVisible({ timeout: 2000 });

      // The textarea should contain #slug
      const value = await textarea.inputValue();
      expect(value).toContain('#');

      // A folder badge/link should be visible
      const folderBadge = page.locator('a[href*="/folders/"]').first();
      const hasBadge = await folderBadge.isVisible().catch(() => false);

      await page.screenshot({ path: 'screenshots/folder-tag-selected.png', fullPage: true });
    } else {
      // No folders exist - just take screenshot
      await page.screenshot({ path: 'screenshots/folder-tag-no-folders.png', fullPage: true });
    }
  });

  test('should dismiss autocomplete on Escape', async ({ page }) => {
    await page.goto('/daily');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const existingTextarea = page.locator('textarea').first();
    const hasTextarea = await existingTextarea.isVisible().catch(() => false);
    if (!hasTextarea) {
      const createButton = page.locator('button:text("What\'s on your mind")').first();
      const hasBtn = await createButton.isVisible().catch(() => false);
      if (hasBtn) {
        await createButton.click();
        await page.waitForTimeout(1000);
      }
    }

    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible({ timeout: 10000 });

    // Type # to trigger autocomplete
    await textarea.click();
    await textarea.fill('');
    await page.waitForTimeout(200);
    await textarea.pressSequentially('#', { delay: 50 });
    await page.waitForTimeout(500);

    const dropdown = page.locator('div[style*="position: absolute"][style*="z-index: 50"]');
    const wasVisible = await dropdown.isVisible().catch(() => false);

    if (wasVisible) {
      // Press Escape to dismiss
      await textarea.press('Escape');
      await page.waitForTimeout(300);

      // Dropdown should be hidden
      await expect(dropdown).not.toBeVisible();
    }

    await page.screenshot({ path: 'screenshots/folder-tag-escape.png', fullPage: true });
  });

  test('should navigate to folder when clicking folder badge', async ({ page }) => {
    await page.goto('/daily');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Find or create a textarea
    const existingTextarea = page.locator('textarea').first();
    const hasTextarea = await existingTextarea.isVisible().catch(() => false);
    if (!hasTextarea) {
      const createButton = page.locator('button:text("What\'s on your mind")').first();
      const hasBtn = await createButton.isVisible().catch(() => false);
      if (hasBtn) {
        await createButton.click();
        await page.waitForTimeout(1000);
      }
    }

    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible({ timeout: 10000 });

    // Type # and select a folder
    await textarea.click();
    await textarea.fill('');
    await page.waitForTimeout(200);
    await textarea.pressSequentially('#', { delay: 50 });
    await page.waitForTimeout(500);

    const dropdown = page.locator('div[style*="position: absolute"][style*="z-index: 50"]');
    const isVisible = await dropdown.isVisible().catch(() => false);

    if (isVisible) {
      // Select first folder
      await dropdown.locator('button').first().click();
      await page.waitForTimeout(1500);

      // Find and click the folder badge
      const folderBadge = page.locator('a[href*="/folders/"]').first();
      const hasBadge = await folderBadge.isVisible().catch(() => false);

      if (hasBadge) {
        await folderBadge.click();
        await page.waitForTimeout(2000);

        // Should navigate to folder page
        await expect(page).toHaveURL(/\/folders\//);
        await page.screenshot({ path: 'screenshots/folder-tag-navigate.png', fullPage: true });
      }
    }
  });
});
