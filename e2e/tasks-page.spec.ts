import { test, expect } from '@playwright/test';
import { authenticate } from './helpers';

test.describe('Tasks Page - Complete Flow', () => {
  test.beforeEach(async ({ context }) => {
    await authenticate(context);
  });

  test('tasks page layout, sections, and empty state', async ({ page }) => {
    // Step 1: Navigate to tasks page
    await page.goto('/tasks');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    await expect(page.locator('h1:text("Tasks")')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'screenshots/tasks-01-initial-page.png', fullPage: true });

    // Step 2: Check for task sections or empty state
    const allCaughtUp = page.locator('text=All caught up');
    const overdueSection = page.locator('text=Overdue');
    const todaySection = page.locator('text=Today');
    const upcomingSection = page.locator('text=Upcoming');

    const isEmpty = await allCaughtUp.isVisible().catch(() => false);
    const hasOverdue = await overdueSection.isVisible().catch(() => false);
    const hasToday = await todaySection.isVisible().catch(() => false);
    const hasUpcoming = await upcomingSection.isVisible().catch(() => false);

    if (isEmpty) {
      // Step 3a: Empty state with helpful hint
      await expect(page.locator('text=All caught up')).toBeVisible();
      await expect(page.locator('code:text("[]")')).toBeVisible();
      await page.screenshot({ path: 'screenshots/tasks-02-empty-state.png', fullPage: true });
    } else {
      // Step 3b: Task sections exist
      await page.screenshot({ path: 'screenshots/tasks-02-with-tasks.png', fullPage: true });

      // Step 4: Check task items have checkboxes
      const checkboxes = page.locator('[role="checkbox"]');
      const checkboxCount = await checkboxes.count();

      if (checkboxCount > 0) {
        // Step 5: Toggle first task completion
        const firstCheckbox = checkboxes.first();
        const wasChecked = await firstCheckbox.getAttribute('aria-checked');
        await firstCheckbox.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'screenshots/tasks-03-toggled-task.png', fullPage: true });

        // Step 6: Toggle back to restore state
        await firstCheckbox.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'screenshots/tasks-04-restored-task.png', fullPage: true });
      }

      // Step 7: Test section collapse/expand
      if (hasOverdue) {
        await overdueSection.click();
        await page.waitForTimeout(300);
        await page.screenshot({ path: 'screenshots/tasks-05-overdue-collapsed.png', fullPage: true });
        await overdueSection.click();
        await page.waitForTimeout(300);
      } else if (hasToday) {
        await todaySection.click();
        await page.waitForTimeout(300);
        await page.screenshot({ path: 'screenshots/tasks-05-today-collapsed.png', fullPage: true });
        await todaySection.click();
        await page.waitForTimeout(300);
      }

      // Step 8: Check completed section
      const completedSection = page.locator('text=/\\d+ completed/');
      const hasCompleted = await completedSection.isVisible().catch(() => false);
      if (hasCompleted) {
        await page.screenshot({ path: 'screenshots/tasks-06-completed-section.png', fullPage: true });
      }
    }

    // Step 9: Check sticky header behavior by scrolling
    await page.evaluate(() => window.scrollTo(0, 200));
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'screenshots/tasks-07-scrolled.png', fullPage: true });
  });
});
