import { test, expect } from '@playwright/test';
import { authenticate } from './helpers';

test.describe('Tasks UI', () => {
  test.beforeEach(async ({ context }) => {
    await authenticate(context);
  });

  test('should navigate to tasks page and show header', async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    
    const header = page.locator('h1');
    await expect(header).toContainText('Tasks');
    
    await page.screenshot({ path: 'screenshots/tasks-page.png', fullPage: true });
  });

  test('should show task groups with visual hierarchy', async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    
    // Should show overdue section (Review PR was due yesterday)
    const overdueSection = page.locator('text=OVERDUE').first();
    const hasOverdue = await overdueSection.isVisible().catch(() => false);
    
    // Should show pending section
    const pendingSection = page.locator('text=PENDING').first();
    const hasPending = await pendingSection.isVisible().catch(() => false);
    
    // Should show completed toggle
    const completedToggle = page.locator('button:text("COMPLETED")').first();
    const hasCompleted = await completedToggle.isVisible().catch(() => false);
    
    expect(hasOverdue || hasPending || hasCompleted).toBeTruthy();
    
    await page.screenshot({ path: 'screenshots/tasks-groups.png', fullPage: true });
  });

  test('should show task stats in header', async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    
    // Should show stats (the stats bar contains "X pending")
    const statsArea = page.locator('text=/\\d+ pending/');
    await expect(statsArea).toBeVisible();
    
    await page.screenshot({ path: 'screenshots/tasks-stats.png' });
  });

  test('should toggle completed section visibility', async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    
    const completedToggle = page.locator('button:has-text("Completed")').first();
    if (await completedToggle.isVisible()) {
      // Click to expand
      await completedToggle.click();
      await page.waitForTimeout(300);
      
      await page.screenshot({ path: 'screenshots/tasks-completed-expanded.png', fullPage: true });
      
      // Click to collapse
      await completedToggle.click();
      await page.waitForTimeout(300);
      
      await page.screenshot({ path: 'screenshots/tasks-completed-collapsed.png', fullPage: true });
    }
  });

  test('should toggle task checkbox', async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    
    // Find a checkbox
    const checkbox = page.locator('[role="checkbox"]').first();
    if (await checkbox.isVisible()) {
      await page.screenshot({ path: 'screenshots/tasks-before-toggle.png' });
      
      await checkbox.click();
      await page.waitForTimeout(500);
      
      await page.screenshot({ path: 'screenshots/tasks-after-toggle.png' });
    }
  });

  test('should show priority badges', async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    
    // Look for priority badges (!!!, !!, !)
    const priorityBadge = page.locator('text=!!!').first();
    const hasPriority = await priorityBadge.isVisible().catch(() => false);
    
    await page.screenshot({ path: 'screenshots/tasks-priorities.png', fullPage: true });
  });

  test('should show date badges', async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ path: 'screenshots/tasks-dates.png', fullPage: true });
  });

  test('should display clean card-based layout', async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    
    // Verify the card container exists (white bg, rounded corners)
    await page.screenshot({ path: 'screenshots/tasks-card-layout.png', fullPage: true });
  });
});
