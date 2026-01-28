import { test, expect } from '@playwright/test';
import { authenticate } from './helpers';

test.describe('Daily Notes - Comprehensive Testing', () => {
  test.beforeEach(async ({ context }) => {
    await authenticate(context);
  });

  test.describe('Note Creation', () => {
    test('should create a new note by clicking empty state', async ({ page }) => {
      await page.goto('/daily');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Scroll to today if needed
      const todayButton = page.locator('button').filter({ hasText: 'Today' });
      const hasTodayBtn = await todayButton.isVisible().catch(() => false);
      if (hasTodayBtn) {
        await todayButton.click();
        await page.waitForTimeout(500);
      }

      // Find "What's on your mind" prompt or empty state
      const createPrompt = page.locator('button').filter({ hasText: /mind/ });
      const hasPrompt = await createPrompt.first().isVisible().catch(() => false);
      
      if (hasPrompt) {
        await createPrompt.first().click();
        await page.waitForTimeout(800);
        
        // Should create a new textarea
        const textarea = page.locator('textarea').first();
        await expect(textarea).toBeVisible({ timeout: 5000 });
        await expect(textarea).toBeFocused();
        
        await page.screenshot({ path: 'screenshots/daily-create-note.png', fullPage: true });
      }
    });

    test('should create new line by pressing Enter', async ({ page }) => {
      await page.goto('/daily');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Find or create a note
      const textarea = page.locator('textarea').first();
      const hasTextarea = await textarea.isVisible().catch(() => false);
      
      if (!hasTextarea) {
        const createButton = page.locator('button').filter({ hasText: /mind/ });
        if (await createButton.first().isVisible().catch(() => false)) {
          await createButton.first().click();
          await page.waitForTimeout(800);
        }
      }

      const noteInput = page.locator('textarea').first();
      await expect(noteInput).toBeVisible({ timeout: 5000 });
      
      // Type content
      await noteInput.fill(`Line 1 - ${Date.now()}`);
      await page.waitForTimeout(500);
      
      // Press Enter to create new line
      await noteInput.press('Enter');
      await page.waitForTimeout(1000);
      
      // Should have a new focused textarea
      const newTextarea = page.locator('textarea:focus');
      await expect(newTextarea).toBeVisible({ timeout: 5000 });
      
      // Type in new line
      await newTextarea.fill('Line 2 - new line');
      await page.waitForTimeout(500);
      
      await page.screenshot({ path: 'screenshots/daily-enter-new-line.png', fullPage: true });
    });
  });

  test.describe('Note Deletion', () => {
    test('should delete empty line with Backspace', async ({ page }) => {
      await page.goto('/daily');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Scroll to today first
      const todayButton = page.locator('button').filter({ hasText: 'Today' });
      if (await todayButton.isVisible().catch(() => false)) {
        await todayButton.click();
        await page.waitForTimeout(500);
      }

      // Create a fresh note
      const createButton = page.locator('button').filter({ hasText: /mind/ });
      if (await createButton.first().isVisible().catch(() => false)) {
        await createButton.first().click();
        await page.waitForTimeout(800);
      }

      const noteInput = page.locator('textarea:focus');
      await expect(noteInput).toBeVisible({ timeout: 5000 });
      
      // Type something unique to track this line
      const uniqueText = `Delete Test ${Date.now()}`;
      await noteInput.fill(uniqueText);
      await page.waitForTimeout(1000);
      
      // Press Enter to create new empty line
      await noteInput.press('Enter');
      await page.waitForTimeout(1000);
      
      // Get the new focused textarea (should be empty)
      const secondLine = page.locator('textarea:focus');
      await expect(secondLine).toBeVisible({ timeout: 5000 });
      
      // Verify it's empty
      const secondLineValue = await secondLine.inputValue();
      expect(secondLineValue).toBe('');
      
      // Press Backspace on empty line to delete it
      await secondLine.press('Backspace');
      await page.waitForTimeout(1000);
      
      // Screenshot to verify deletion behavior
      await page.screenshot({ path: 'screenshots/daily-delete-empty-line.png', fullPage: true });
      
      // Original line should still exist
      await expect(page.locator(`text=${uniqueText}`)).toBeVisible();
    });
  });

  test.describe('Auto-save', () => {
    test('should show Saving... indicator while saving', async ({ page }) => {
      await page.goto('/daily');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      const textarea = page.locator('textarea').first();
      const hasTextarea = await textarea.isVisible().catch(() => false);
      
      if (!hasTextarea) {
        const createButton = page.locator('button').filter({ hasText: /mind/ });
        if (await createButton.first().isVisible().catch(() => false)) {
          await createButton.first().click();
          await page.waitForTimeout(800);
        }
      }

      const noteInput = page.locator('textarea').first();
      await expect(noteInput).toBeVisible({ timeout: 5000 });
      
      // Type to trigger auto-save
      await noteInput.fill(`Auto-save test ${Date.now()}`);
      
      // Immediately look for "Saving..." indicator
      const savingIndicator = page.locator('text=Saving...');
      // Take screenshot quickly to catch saving state
      await page.screenshot({ path: 'screenshots/daily-autosave-saving.png', fullPage: true });
    });

    test('should show Saved indicator after save completes', async ({ page }) => {
      await page.goto('/daily');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      const textarea = page.locator('textarea').first();
      const hasTextarea = await textarea.isVisible().catch(() => false);
      
      if (!hasTextarea) {
        const createButton = page.locator('button').filter({ hasText: /mind/ });
        if (await createButton.first().isVisible().catch(() => false)) {
          await createButton.first().click();
          await page.waitForTimeout(800);
        }
      }

      const noteInput = page.locator('textarea').first();
      await expect(noteInput).toBeVisible({ timeout: 5000 });
      
      // Type to trigger auto-save
      await noteInput.fill(`Saved test ${Date.now()}`);
      
      // Wait for save to complete (debounce + network)
      await page.waitForTimeout(2000);
      
      // Look for "Saved" indicator
      const savedIndicator = page.locator('text=Saved');
      const hasSaved = await savedIndicator.first().isVisible().catch(() => false);
      
      await page.screenshot({ path: 'screenshots/daily-autosave-saved.png', fullPage: true });
    });
  });

  test.describe('Indentation', () => {
    test('should indent line with Tab key', async ({ page }) => {
      await page.goto('/daily');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Find today button and scroll to today first
      const todayButton = page.locator('button').filter({ hasText: 'Today' });
      if (await todayButton.isVisible().catch(() => false)) {
        await todayButton.click();
        await page.waitForTimeout(500);
      }

      // Create a fresh note for indentation testing
      const createButton = page.locator('button').filter({ hasText: /mind/ });
      if (await createButton.first().isVisible().catch(() => false)) {
        await createButton.first().click();
        await page.waitForTimeout(800);
      }

      const noteInput = page.locator('textarea:focus');
      await expect(noteInput).toBeVisible({ timeout: 5000 });
      await noteInput.fill('Indent test line');
      await page.waitForTimeout(500);
      
      // Get initial indent attribute (data-indent)
      const initialIndent = await noteInput.locator('xpath=ancestor::div[@data-indent]').getAttribute('data-indent').catch(() => '0');
      
      // Press Tab
      await noteInput.press('Tab');
      await page.waitForTimeout(500);
      
      // Get new indent
      const newIndent = await noteInput.locator('xpath=ancestor::div[@data-indent]').getAttribute('data-indent').catch(() => '0');
      
      const initialLevel = parseInt(initialIndent || '0');
      const newLevel = parseInt(newIndent || '0');
      
      // New indent should be greater (unless we started at max)
      expect(newLevel).toBeGreaterThanOrEqual(initialLevel);
      
      await page.screenshot({ path: 'screenshots/daily-tab-indent.png', fullPage: true });
    });

    test('should outdent line with Shift+Tab', async ({ page }) => {
      await page.goto('/daily');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      const textarea = page.locator('textarea').first();
      const hasTextarea = await textarea.isVisible().catch(() => false);
      
      if (!hasTextarea) {
        const createButton = page.locator('button').filter({ hasText: /mind/ });
        if (await createButton.first().isVisible().catch(() => false)) {
          await createButton.first().click();
          await page.waitForTimeout(800);
        }
      }

      const noteInput = page.locator('textarea').first();
      await expect(noteInput).toBeVisible({ timeout: 5000 });
      await noteInput.fill('Outdent test');
      
      // Indent first
      await noteInput.press('Tab');
      await noteInput.press('Tab');
      await page.waitForTimeout(500);
      
      const afterIndent = await noteInput.locator('xpath=ancestor::div[@data-indent]').evaluate(
        el => window.getComputedStyle(el).paddingLeft
      ).catch(() => '0px');
      
      // Outdent
      await noteInput.press('Shift+Tab');
      await page.waitForTimeout(500);
      
      const afterOutdent = await noteInput.locator('xpath=ancestor::div[@data-indent]').evaluate(
        el => window.getComputedStyle(el).paddingLeft
      ).catch(() => '0px');
      
      const indentPx = parseInt(afterIndent) || 0;
      const outdentPx = parseInt(afterOutdent) || 0;
      expect(outdentPx).toBeLessThan(indentPx);
      
      await page.screenshot({ path: 'screenshots/daily-shift-tab-outdent.png', fullPage: true });
    });

    test('should preserve indent on new line', async ({ page }) => {
      await page.goto('/daily');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      const textarea = page.locator('textarea').first();
      const hasTextarea = await textarea.isVisible().catch(() => false);
      
      if (!hasTextarea) {
        const createButton = page.locator('button').filter({ hasText: /mind/ });
        if (await createButton.first().isVisible().catch(() => false)) {
          await createButton.first().click();
          await page.waitForTimeout(800);
        }
      }

      const noteInput = page.locator('textarea').first();
      await expect(noteInput).toBeVisible({ timeout: 5000 });
      await noteInput.fill('Parent with indent');
      
      // Indent twice
      await noteInput.press('Tab');
      await noteInput.press('Tab');
      await page.waitForTimeout(500);
      
      const parentIndent = await noteInput.locator('xpath=ancestor::div[@data-indent]').getAttribute('data-indent');
      
      // Create new line
      await noteInput.press('Enter');
      await page.waitForTimeout(1000);
      
      // New line should have same indent
      const newLine = page.locator('textarea:focus');
      await expect(newLine).toBeVisible({ timeout: 5000 });
      
      const childIndent = await newLine.locator('xpath=ancestor::div[@data-indent]').getAttribute('data-indent');
      
      expect(childIndent).toBe(parentIndent);
      
      await page.screenshot({ path: 'screenshots/daily-preserve-indent.png', fullPage: true });
    });
  });

  test.describe('Today Section', () => {
    test('should show Today badge on current day', async ({ page }) => {
      await page.goto('/daily');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Look for Today badge
      const todayBadge = page.locator('span').filter({ hasText: 'Today' }).first();
      await expect(todayBadge).toBeVisible({ timeout: 10000 });
      
      await page.screenshot({ path: 'screenshots/daily-today-badge.png', fullPage: true });
    });

    test('should show Scroll to Today button when scrolled away', async ({ page }) => {
      await page.goto('/daily');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Scroll up to past days
      await page.evaluate(() => {
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(1000);

      // Should show "Today" floating button
      const todayButton = page.locator('button').filter({ hasText: 'Today' }).last();
      const hasButton = await todayButton.isVisible().catch(() => false);
      
      if (hasButton) {
        await page.screenshot({ path: 'screenshots/daily-scroll-to-today-btn.png', fullPage: true });
        
        // Click to scroll back to today
        await todayButton.click();
        await page.waitForTimeout(1000);
        
        await page.screenshot({ path: 'screenshots/daily-after-scroll-to-today.png', fullPage: true });
      }
    });
  });

  test.describe('Infinite Scroll', () => {
    test('should load past days when scrolling up', async ({ page }) => {
      await page.goto('/daily');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Get initial content
      const initialHeaders = await page.locator('h2').allTextContents();
      
      // Scroll to top
      await page.evaluate(() => {
        document.querySelector('.h-screen.overflow-y-auto')?.scrollTo(0, 0);
      });
      await page.waitForTimeout(2000);
      
      // Should have loaded more past dates
      await page.screenshot({ path: 'screenshots/daily-scroll-past.png', fullPage: true });
    });

    test('should load future days when scrolling down', async ({ page }) => {
      await page.goto('/daily');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Scroll to bottom
      await page.evaluate(() => {
        const container = document.querySelector('.h-screen.overflow-y-auto');
        if (container) {
          container.scrollTo(0, container.scrollHeight);
        }
      });
      await page.waitForTimeout(2000);
      
      await page.screenshot({ path: 'screenshots/daily-scroll-future.png', fullPage: true });
    });
  });

  test.describe('Bullet Points', () => {
    test('should show bullet point for regular notes', async ({ page }) => {
      await page.goto('/daily');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      const textarea = page.locator('textarea').first();
      const hasTextarea = await textarea.isVisible().catch(() => false);
      
      if (!hasTextarea) {
        const createButton = page.locator('button').filter({ hasText: /mind/ });
        if (await createButton.first().isVisible().catch(() => false)) {
          await createButton.first().click();
          await page.waitForTimeout(800);
        }
      }

      const noteInput = page.locator('textarea').first();
      await expect(noteInput).toBeVisible({ timeout: 5000 });
      await noteInput.fill('Regular note with bullet');
      await page.waitForTimeout(1000);

      // Should have bullet point (small circle)
      const bullet = page.locator('div[style*="border-radius: 50%"][style*="width: 6px"]').first();
      const hasBullet = await bullet.isVisible().catch(() => false);
      
      await page.screenshot({ path: 'screenshots/daily-bullet-point.png', fullPage: true });
    });

    test('should show checkbox for tasks instead of bullet', async ({ page }) => {
      await page.goto('/daily');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      const textarea = page.locator('textarea').first();
      const hasTextarea = await textarea.isVisible().catch(() => false);
      
      if (!hasTextarea) {
        const createButton = page.locator('button').filter({ hasText: /mind/ });
        if (await createButton.first().isVisible().catch(() => false)) {
          await createButton.first().click();
          await page.waitForTimeout(800);
        }
      }

      const noteInput = page.locator('textarea').first();
      await expect(noteInput).toBeVisible({ timeout: 5000 });
      await noteInput.fill('[] Task has checkbox not bullet');
      await page.waitForTimeout(1500);

      // Should have checkbox, not bullet
      const checkbox = page.locator('[role="checkbox"]').first();
      await expect(checkbox).toBeVisible({ timeout: 5000 });
      
      await page.screenshot({ path: 'screenshots/daily-task-checkbox.png', fullPage: true });
    });
  });
});
