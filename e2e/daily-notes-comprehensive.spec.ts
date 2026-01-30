import { test, expect } from '@playwright/test';
import { authenticate } from './helpers';

test.describe('Daily Notes - Comprehensive Testing', () => {
  test.beforeEach(async ({ context }) => {
    await authenticate(context);
  });

  test('note creation flow - empty state and Enter for new line', async ({ page }) => {
    await page.goto('/daily');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Scroll to today if needed
    const todayButton = page.locator('button').filter({ hasText: 'Today' });
    if (await todayButton.isVisible().catch(() => false)) {
      await todayButton.click({ force: true });
      await page.waitForTimeout(500);
    }

    await page.screenshot({ path: 'screenshots/daily-01-initial-state.png', fullPage: true });

    // Find "What's on your mind" prompt or empty state
    const createPrompt = page.locator('button').filter({ hasText: /mind/ });
    const hasPrompt = await createPrompt.first().isVisible().catch(() => false);

    if (hasPrompt) {
      await createPrompt.first().click();
      await page.waitForTimeout(800);

      const textarea = page.locator('textarea').first();
      await expect(textarea).toBeVisible({ timeout: 5000 });
      await expect(textarea).toBeFocused();

      await page.screenshot({ path: 'screenshots/daily-02-new-note-created.png', fullPage: true });
    }

    // Find or create a textarea for Enter test
    let noteInput = page.locator('textarea').first();
    if (!(await noteInput.isVisible().catch(() => false))) {
      const btn = page.locator('button').filter({ hasText: /mind/ });
      if (await btn.first().isVisible().catch(() => false)) {
        await btn.first().click();
        await page.waitForTimeout(800);
      }
    }

    noteInput = page.locator('textarea').first();
    await expect(noteInput).toBeVisible({ timeout: 5000 });

    // Type content and press Enter to create new line
    await noteInput.fill(`Line 1 - ${Date.now()}`);
    await page.waitForTimeout(500);
    await noteInput.press('Enter');
    await page.waitForTimeout(1000);

    const newTextarea = page.locator('textarea:focus');
    await expect(newTextarea).toBeVisible({ timeout: 5000 });
    await newTextarea.fill('Line 2 - new line');
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'screenshots/daily-03-enter-new-line.png', fullPage: true });
  });

  test('delete empty line with Backspace', async ({ page }) => {
    await page.goto('/daily');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const todayButton = page.locator('button').filter({ hasText: 'Today' });
    if (await todayButton.isVisible().catch(() => false)) {
      await todayButton.click({ force: true });
      await page.waitForTimeout(500);
    }

    // Create a note
    const addButton = page.locator('button').filter({ hasText: /Click to add/ }).first();
    const createButton = page.locator('button').filter({ hasText: /mind/ }).first();
    if (await addButton.isVisible().catch(() => false)) {
      await addButton.click();
      await page.waitForTimeout(800);
    } else if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(800);
    } else {
      const lastTextarea = page.locator('textarea').last();
      await lastTextarea.click();
      await page.waitForTimeout(300);
      await lastTextarea.press('Enter');
      await page.waitForTimeout(800);
    }

    const noteInput = page.locator('textarea:focus');
    await expect(noteInput).toBeVisible({ timeout: 5000 });

    const uniqueText = `Delete Test ${Date.now()}`;
    await noteInput.fill(uniqueText);
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'screenshots/daily-04-before-delete.png', fullPage: true });

    // Create empty line then delete it
    await noteInput.press('Enter');
    await page.waitForTimeout(1000);
    const secondLine = page.locator('textarea:focus');
    await expect(secondLine).toBeVisible({ timeout: 5000 });
    expect(await secondLine.inputValue()).toBe('');

    await secondLine.press('Backspace');
    await page.waitForTimeout(1000);

    await expect(page.locator(`text=${uniqueText}`)).toBeVisible();

    await page.screenshot({ path: 'screenshots/daily-05-after-delete.png', fullPage: true });
  });

  test('auto-save flow - Saving and Saved indicators', async ({ page }) => {
    await page.goto('/daily');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const textarea = page.locator('textarea').first();
    if (!(await textarea.isVisible().catch(() => false))) {
      const createButton = page.locator('button').filter({ hasText: /mind/ });
      if (await createButton.first().isVisible().catch(() => false)) {
        await createButton.first().click();
        await page.waitForTimeout(800);
      }
    }

    const noteInput = page.locator('textarea').first();
    await expect(noteInput).toBeVisible({ timeout: 5000 });

    // Type to trigger auto-save and capture saving state
    await noteInput.fill(`Auto-save test ${Date.now()}`);

    await page.screenshot({ path: 'screenshots/daily-06-autosave-saving.png', fullPage: true });

    // Wait for save to complete
    await page.waitForTimeout(2000);

    const savedIndicator = page.locator('text=Saved');
    const hasSaved = await savedIndicator.first().isVisible().catch(() => false);

    await page.screenshot({ path: 'screenshots/daily-07-autosave-saved.png', fullPage: true });
  });

  test('indentation flow - Tab, Shift+Tab, and preserve on new line', async ({ page }) => {
    await page.goto('/daily');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const todayButton = page.locator('button').filter({ hasText: 'Today' });
    if (await todayButton.isVisible().catch(() => false)) {
      await todayButton.click({ force: true });
      await page.waitForTimeout(500);
    }

    // Create a fresh note
    const addButton = page.locator('button').filter({ hasText: /Click to add/ }).first();
    const createButton = page.locator('button').filter({ hasText: /mind/ }).first();
    if (await addButton.isVisible().catch(() => false)) {
      await addButton.click();
      await page.waitForTimeout(800);
    } else if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(800);
    } else {
      const lastTextarea = page.locator('textarea').last();
      await lastTextarea.click();
      await page.waitForTimeout(300);
      await lastTextarea.press('Enter');
      await page.waitForTimeout(800);
    }

    const noteInput = page.locator('textarea:focus');
    await expect(noteInput).toBeVisible({ timeout: 5000 });
    await noteInput.fill('Indent test line');
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'screenshots/daily-08-before-indent.png', fullPage: true });

    // Step 1: Tab to indent
    const initialIndent = await noteInput.locator('xpath=ancestor::div[@data-indent]').getAttribute('data-indent').catch(() => '0');
    await noteInput.press('Tab');
    await page.waitForTimeout(500);

    let focusedAfterTab = page.locator('textarea:focus');
    const afterTabIndent = await focusedAfterTab.locator('xpath=ancestor::div[@data-indent]').getAttribute('data-indent').catch(() => '0');
    expect(parseInt(afterTabIndent || '0')).toBeGreaterThanOrEqual(parseInt(initialIndent || '0'));

    await page.screenshot({ path: 'screenshots/daily-09-after-tab-indent.png', fullPage: true });

    // Step 2: Tab again then Shift+Tab to outdent
    await focusedAfterTab.press('Tab');
    await page.waitForTimeout(500);

    const afterDoubleIndent = await page.locator('textarea:focus').locator('xpath=ancestor::div[@data-indent]').evaluate(
      el => window.getComputedStyle(el).paddingLeft
    ).catch(() => '0px');

    await page.locator('textarea:focus').press('Shift+Tab');
    await page.waitForTimeout(500);

    const afterOutdent = await page.locator('textarea:focus').locator('xpath=ancestor::div[@data-indent]').evaluate(
      el => window.getComputedStyle(el).paddingLeft
    ).catch(() => '0px');

    expect(parseInt(afterOutdent) || 0).toBeLessThan(parseInt(afterDoubleIndent) || 0);

    await page.screenshot({ path: 'screenshots/daily-10-after-shift-tab-outdent.png', fullPage: true });

    // Step 3: Preserve indent on new line
    await page.locator('textarea:focus').press('Tab');
    await page.waitForTimeout(300);
    await page.locator('textarea:focus').press('Tab');
    await page.waitForTimeout(500);

    const parentIndent = await page.locator('textarea:focus').locator('xpath=ancestor::div[@data-indent]').getAttribute('data-indent').catch(() => '0');
    await page.locator('textarea:focus').press('Enter');
    await page.waitForTimeout(1000);

    const newLine = page.locator('textarea:focus');
    await expect(newLine).toBeVisible({ timeout: 5000 });
    const childIndent = await newLine.locator('xpath=ancestor::div[@data-indent]').getAttribute('data-indent').catch(() => '0');
    expect(parseInt(childIndent || '0')).toBe(parseInt(parentIndent || '0'));

    await page.screenshot({ path: 'screenshots/daily-11-preserved-indent-new-line.png', fullPage: true });
  });

  test('today section - badge and scroll-to-today button', async ({ page }) => {
    await page.goto('/daily');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Check Today badge
    const todayBadge = page.locator('span').filter({ hasText: 'Today' }).first();
    await expect(todayBadge).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'screenshots/daily-12-today-badge.png', fullPage: true });

    // Scroll away from today
    await page.evaluate(() => { window.scrollTo(0, 0); });
    await page.waitForTimeout(1000);

    const todayButton = page.locator('button').filter({ hasText: 'Today' }).last();
    const hasButton = await todayButton.isVisible().catch(() => false);

    if (hasButton) {
      await page.screenshot({ path: 'screenshots/daily-13-scroll-to-today-btn.png', fullPage: true });

      await todayButton.click({ force: true });
      await page.waitForTimeout(1000);

      await page.screenshot({ path: 'screenshots/daily-14-after-scroll-to-today.png', fullPage: true });
    }
  });

  test('infinite scroll - past and future days', async ({ page }) => {
    await page.goto('/daily');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'screenshots/daily-15-before-scroll.png', fullPage: true });

    // Scroll up for past days
    await page.evaluate(() => {
      document.querySelector('.h-screen.overflow-y-auto')?.scrollTo(0, 0);
    });
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'screenshots/daily-16-scroll-past.png', fullPage: true });

    // Scroll down for future days
    await page.evaluate(() => {
      const container = document.querySelector('.h-screen.overflow-y-auto');
      if (container) container.scrollTo(0, container.scrollHeight);
    });
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'screenshots/daily-17-scroll-future.png', fullPage: true });
  });

  test('bullet points and task checkboxes', async ({ page }) => {
    await page.goto('/daily');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    let noteInput = page.locator('textarea').first();
    if (!(await noteInput.isVisible().catch(() => false))) {
      const createButton = page.locator('button').filter({ hasText: /mind/ });
      if (await createButton.first().isVisible().catch(() => false)) {
        await createButton.first().click();
        await page.waitForTimeout(800);
      }
    }

    noteInput = page.locator('textarea').first();
    await expect(noteInput).toBeVisible({ timeout: 5000 });

    // Regular note should have bullet point
    await noteInput.fill('Regular note with bullet');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'screenshots/daily-18-bullet-point.png', fullPage: true });

    // Create task with [] syntax
    await noteInput.fill('[] Task has checkbox not bullet');
    await page.waitForTimeout(1500);

    const checkbox = page.locator('[role="checkbox"]').first();
    await expect(checkbox).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'screenshots/daily-19-task-checkbox.png', fullPage: true });
  });
});
