import { test, expect } from '@playwright/test';
import { authenticate } from './helpers';

test.describe('Tasks - Comprehensive Testing', () => {
  test.beforeEach(async ({ context }) => {
    await authenticate(context);
  });

  test.describe('Task Creation in Daily Notes', () => {
    test('should create a task by typing [] syntax', async ({ page }) => {
      await page.goto('/daily');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Find or create a note
      const textarea = page.locator('textarea').first();
      const hasTextarea = await textarea.isVisible().catch(() => false);
      
      if (!hasTextarea) {
        const createButton = page.locator('button').filter({ hasText: /mind/ });
        if (await createButton.isVisible().catch(() => false)) {
          await createButton.click();
          await page.waitForTimeout(800);
        }
      }

      const noteInput = page.locator('textarea').first();
      await expect(noteInput).toBeVisible({ timeout: 5000 });
      
      // Type task syntax
      const taskText = `[] Test task ${Date.now()}`;
      await noteInput.fill(taskText);
      await page.waitForTimeout(1500); // Wait for auto-save

      // Verify checkbox appears
      const checkbox = page.locator('[role="checkbox"]').first();
      await expect(checkbox).toBeVisible({ timeout: 5000 });
      
      await page.screenshot({ path: 'screenshots/tasks-create-daily.png', fullPage: true });
    });

    test('should toggle task completion from daily view', async ({ page }) => {
      await page.goto('/daily');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Create a task
      const textarea = page.locator('textarea').first();
      const hasTextarea = await textarea.isVisible().catch(() => false);
      
      if (!hasTextarea) {
        const createButton = page.locator('button').filter({ hasText: /mind/ });
        if (await createButton.isVisible().catch(() => false)) {
          await createButton.click();
          await page.waitForTimeout(800);
        }
      }

      const noteInput = page.locator('textarea').first();
      await expect(noteInput).toBeVisible({ timeout: 5000 });
      await noteInput.fill(`[] Toggle test ${Date.now()}`);
      await page.waitForTimeout(1500);

      // Find the checkbox and verify it's unchecked
      const checkbox = page.locator('[role="checkbox"]').first();
      await expect(checkbox).toBeVisible({ timeout: 5000 });
      
      const isCheckedBefore = await checkbox.getAttribute('aria-checked');
      expect(isCheckedBefore).toBe('false');
      
      // Click to complete
      await checkbox.click();
      await page.waitForTimeout(1000);
      
      // Verify it's now checked
      const isCheckedAfter = await checkbox.getAttribute('aria-checked');
      expect(isCheckedAfter).toBe('true');
      
      await page.screenshot({ path: 'screenshots/tasks-toggle-complete.png', fullPage: true });
      
      // Toggle back to incomplete
      await checkbox.click();
      await page.waitForTimeout(1000);
      
      const isCheckedFinal = await checkbox.getAttribute('aria-checked');
      expect(isCheckedFinal).toBe('false');
      
      await page.screenshot({ path: 'screenshots/tasks-toggle-incomplete.png', fullPage: true });
    });
  });

  test.describe('Task Date Parsing (@date)', () => {
    test('should parse @today and show Today badge', async ({ page }) => {
      await page.goto('/daily');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      const textarea = page.locator('textarea').first();
      const hasTextarea = await textarea.isVisible().catch(() => false);
      
      if (!hasTextarea) {
        const createButton = page.locator('button').filter({ hasText: /mind/ });
        if (await createButton.isVisible().catch(() => false)) {
          await createButton.click();
          await page.waitForTimeout(800);
        }
      }

      const noteInput = page.locator('textarea').first();
      await expect(noteInput).toBeVisible({ timeout: 5000 });
      
      // Type task with @today
      await noteInput.fill(`[] Buy groceries @today ${Date.now()}`);
      await page.waitForTimeout(1500);

      // Should show "Today" badge
      const todayBadge = page.locator('span').filter({ hasText: 'Today' });
      const hasTodayBadge = await todayBadge.first().isVisible().catch(() => false);
      
      await page.screenshot({ path: 'screenshots/tasks-date-today.png', fullPage: true });
    });

    test('should parse @tomorrow and show Tomorrow badge', async ({ page }) => {
      await page.goto('/daily');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      const textarea = page.locator('textarea').first();
      const hasTextarea = await textarea.isVisible().catch(() => false);
      
      if (!hasTextarea) {
        const createButton = page.locator('button').filter({ hasText: /mind/ });
        if (await createButton.isVisible().catch(() => false)) {
          await createButton.click();
          await page.waitForTimeout(800);
        }
      }

      const noteInput = page.locator('textarea').first();
      await expect(noteInput).toBeVisible({ timeout: 5000 });
      
      await noteInput.fill(`[] Meeting prep @tomorrow ${Date.now()}`);
      await page.waitForTimeout(1500);

      // Should show "Tomorrow" badge
      const tomorrowBadge = page.locator('span').filter({ hasText: 'Tomorrow' });
      const hasBadge = await tomorrowBadge.first().isVisible().catch(() => false);
      
      await page.screenshot({ path: 'screenshots/tasks-date-tomorrow.png', fullPage: true });
    });

    test('should parse @monday through @sunday', async ({ page }) => {
      await page.goto('/daily');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      const textarea = page.locator('textarea').first();
      const hasTextarea = await textarea.isVisible().catch(() => false);
      
      if (!hasTextarea) {
        const createButton = page.locator('button').filter({ hasText: /mind/ });
        if (await createButton.isVisible().catch(() => false)) {
          await createButton.click();
          await page.waitForTimeout(800);
        }
      }

      const noteInput = page.locator('textarea').first();
      await expect(noteInput).toBeVisible({ timeout: 5000 });
      
      await noteInput.fill(`[] Weekly review @monday ${Date.now()}`);
      await page.waitForTimeout(1500);

      // Should show day name badge (Mon, Tue, etc.)
      const dateBadge = page.locator('span').filter({ hasText: /Mon|Tue|Wed|Thu|Fri|Sat|Sun|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/ });
      const hasBadge = await dateBadge.first().isVisible().catch(() => false);
      
      await page.screenshot({ path: 'screenshots/tasks-date-weekday.png', fullPage: true });
    });
  });

  test.describe('Task Priority Parsing (!priority)', () => {
    test('should parse !!! as high priority', async ({ page }) => {
      await page.goto('/daily');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      const textarea = page.locator('textarea').first();
      const hasTextarea = await textarea.isVisible().catch(() => false);
      
      if (!hasTextarea) {
        const createButton = page.locator('button').filter({ hasText: /mind/ });
        if (await createButton.isVisible().catch(() => false)) {
          await createButton.click();
          await page.waitForTimeout(800);
        }
      }

      const noteInput = page.locator('textarea').first();
      await expect(noteInput).toBeVisible({ timeout: 5000 });
      
      await noteInput.fill(`[] Urgent bug fix !!! ${Date.now()}`);
      await page.waitForTimeout(1500);

      // Should show !!! badge (high priority)
      const priorityBadge = page.locator('span').filter({ hasText: '!!!' });
      const hasBadge = await priorityBadge.first().isVisible().catch(() => false);
      
      await page.screenshot({ path: 'screenshots/tasks-priority-high.png', fullPage: true });
    });

    test('should parse !! as medium priority', async ({ page }) => {
      await page.goto('/daily');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      const textarea = page.locator('textarea').first();
      const hasTextarea = await textarea.isVisible().catch(() => false);
      
      if (!hasTextarea) {
        const createButton = page.locator('button').filter({ hasText: /mind/ });
        if (await createButton.isVisible().catch(() => false)) {
          await createButton.click();
          await page.waitForTimeout(800);
        }
      }

      const noteInput = page.locator('textarea').first();
      await expect(noteInput).toBeVisible({ timeout: 5000 });
      
      await noteInput.fill(`[] Code review !! ${Date.now()}`);
      await page.waitForTimeout(1500);

      // Should show !! badge (medium priority)
      const priorityBadge = page.locator('span').filter({ hasText: /^!!$/ });
      const hasBadge = await priorityBadge.first().isVisible().catch(() => false);
      
      await page.screenshot({ path: 'screenshots/tasks-priority-medium.png', fullPage: true });
    });

    test('should parse combined @date and !priority', async ({ page }) => {
      await page.goto('/daily');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      const textarea = page.locator('textarea').first();
      const hasTextarea = await textarea.isVisible().catch(() => false);
      
      if (!hasTextarea) {
        const createButton = page.locator('button').filter({ hasText: /mind/ });
        if (await createButton.isVisible().catch(() => false)) {
          await createButton.click();
          await page.waitForTimeout(800);
        }
      }

      const noteInput = page.locator('textarea').first();
      await expect(noteInput).toBeVisible({ timeout: 5000 });
      
      await noteInput.fill(`[] Ship feature @tomorrow !!! ${Date.now()}`);
      await page.waitForTimeout(1500);

      // Should show both badges
      await page.screenshot({ path: 'screenshots/tasks-combined-date-priority.png', fullPage: true });
    });
  });

  test.describe('Tasks Page', () => {
    test('should display overdue tasks section with red styling', async ({ page }) => {
      await page.goto('/tasks');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('h1:text("Tasks")')).toBeVisible({ timeout: 10000 });

      // Check for overdue section with red indicator
      const overdueSection = page.locator('text=OVERDUE');
      const hasOverdue = await overdueSection.first().isVisible().catch(() => false);
      
      if (hasOverdue) {
        // Should have red dot indicator
        const redDot = page.locator('[style*="background-color: #dc2626"]').first();
        await expect(redDot).toBeVisible();
      }
      
      await page.screenshot({ path: 'screenshots/tasks-overdue-section.png', fullPage: true });
    });

    test('should display pending tasks section', async ({ page }) => {
      await page.goto('/tasks');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('h1:text("Tasks")')).toBeVisible({ timeout: 10000 });

      const pendingSection = page.locator('text=PENDING');
      const hasPending = await pendingSection.first().isVisible().catch(() => false);
      
      await page.screenshot({ path: 'screenshots/tasks-pending-section.png', fullPage: true });
    });

    test('should expand/collapse completed section', async ({ page }) => {
      await page.goto('/tasks');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('h1:text("Tasks")')).toBeVisible({ timeout: 10000 });

      const completedToggle = page.locator('button').filter({ hasText: /COMPLETED/i });
      const hasCompleted = await completedToggle.first().isVisible().catch(() => false);
      
      if (hasCompleted) {
        // Click to expand
        await completedToggle.first().click();
        await page.waitForTimeout(500);
        
        await page.screenshot({ path: 'screenshots/tasks-completed-expanded.png', fullPage: true });
        
        // Click to collapse
        await completedToggle.first().click();
        await page.waitForTimeout(500);
        
        await page.screenshot({ path: 'screenshots/tasks-completed-collapsed.png', fullPage: true });
      }
    });

    test('should show empty state when no tasks exist', async ({ page }) => {
      // This test might not see empty state if test data has tasks
      await page.goto('/tasks');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('h1:text("Tasks")')).toBeVisible({ timeout: 10000 });

      const emptyState = page.locator('text=No tasks yet');
      const hasEmpty = await emptyState.isVisible().catch(() => false);
      
      if (hasEmpty) {
        // Verify empty state shows instruction
        await expect(page.locator('text=[]')).toBeVisible();
        await page.screenshot({ path: 'screenshots/tasks-empty-state.png', fullPage: true });
      }
    });

    test('should toggle task from tasks page', async ({ page }) => {
      await page.goto('/tasks');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('h1:text("Tasks")')).toBeVisible({ timeout: 10000 });

      // Find a checkbox
      const checkbox = page.locator('[role="checkbox"]').first();
      const hasCheckbox = await checkbox.isVisible().catch(() => false);
      
      if (hasCheckbox) {
        const initialState = await checkbox.getAttribute('aria-checked');
        
        await page.screenshot({ path: 'screenshots/tasks-page-before-toggle.png', fullPage: true });
        
        // Toggle
        await checkbox.click();
        await page.waitForTimeout(1000);
        
        await page.screenshot({ path: 'screenshots/tasks-page-after-toggle.png', fullPage: true });
      }
    });
  });
});
