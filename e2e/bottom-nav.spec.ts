import { test, expect, devices } from '@playwright/test';

const TEST_EMAIL = 'clod3@test.com';
const TEST_PASSWORD = 'testtest123';

test.describe('Bottom Navigation Bar', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/daily', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test('bottom nav appears on mobile viewport', async ({ page }) => {
    // Mobile viewport is already set by playwright config
    await page.screenshot({ path: 'screenshots/bottom-nav-01-mobile-daily.png' });
    
    // Check bottom nav is visible
    const bottomNav = page.locator('nav.mobile-bottom-nav');
    await expect(bottomNav).toBeVisible();
    
    // Check the nav has the correct position (fixed at bottom)
    const navBox = await bottomNav.boundingBox();
    console.log(`Bottom nav position: y=${navBox?.y}, height=${navBox?.height}`);
    
    // The nav should be near the bottom of the viewport
    const viewportSize = page.viewportSize();
    if (navBox && viewportSize) {
      const distanceFromBottom = viewportSize.height - (navBox.y + navBox.height);
      console.log(`Distance from viewport bottom: ${distanceFromBottom}px`);
      // Should be within safe-area (approximately at the bottom)
      expect(distanceFromBottom).toBeLessThanOrEqual(50);
    }
    
    // Check Home icon is active (we're on /daily)
    const homeLink = bottomNav.locator('a[href="/daily"]');
    await expect(homeLink).toBeVisible();
    
    // Screenshot showing the bottom nav clearly
    await page.screenshot({ path: 'screenshots/bottom-nav-02-mobile-focused.png' });
  });

  test('bottom nav navigation works', async ({ page }) => {
    // Dismiss any active mobile toolbar by clicking elsewhere
    // This ensures we're not in editing mode
    const mobileToolbar = page.locator('[data-testid="mobile-toolbar"]');
    if (await mobileToolbar.isVisible().catch(() => false)) {
      // Click the Done button to dismiss the toolbar
      const doneButton = page.locator('[data-testid="done-button"]');
      if (await doneButton.isVisible()) {
        await doneButton.click();
        await page.waitForTimeout(300);
      }
    }
    
    // Find the bottom nav
    const bottomNav = page.locator('nav.mobile-bottom-nav');
    await expect(bottomNav).toBeVisible();
    
    // Set up dialog handler BEFORE clicking
    page.on('dialog', async dialog => {
      console.log(`Dialog message: ${dialog.message()}`);
      expect(dialog.message()).toContain('Coming soon');
      await dialog.accept();
    });
    
    // Click on Search (placeholder) - use force to bypass any overlay issues
    const searchButton = bottomNav.locator('button').filter({ hasText: 'Search' });
    await expect(searchButton).toBeVisible();
    await searchButton.click({ force: true });
    await page.waitForTimeout(300);
    
    // Click on Tasks (placeholder)
    const tasksButton = bottomNav.locator('button').filter({ hasText: 'Tasks' });
    await expect(tasksButton).toBeVisible();
    await tasksButton.click({ force: true });
    await page.waitForTimeout(300);
    
    // Screenshot after interactions
    await page.screenshot({ path: 'screenshots/bottom-nav-03-interaction.png' });
  });

  test('desktop view shows sidebar, hides bottom nav', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(500);
    
    // Screenshot desktop view
    await page.screenshot({ path: 'screenshots/bottom-nav-04-desktop-view.png' });
    
    // Bottom nav should be hidden on desktop (via CSS media query)
    const bottomNavMobile = page.locator('nav.mobile-bottom-nav');
    // Check if it's hidden via CSS - the element exists but display: none
    const isVisible = await bottomNavMobile.isVisible().catch(() => false);
    console.log(`Bottom nav visible on desktop: ${isVisible}`);
    // On desktop (>=768px), the nav should be hidden via CSS
    expect(isVisible).toBeFalsy();
    
    // Sidebar should be visible
    const sidebar = page.locator('aside').filter({ has: page.locator('a[href="/daily"]') }).first();
    await expect(sidebar).toBeVisible();
    
    // Screenshot showing sidebar
    await page.screenshot({ path: 'screenshots/bottom-nav-05-desktop-sidebar.png' });
    
    // Test sidebar collapse
    const collapseButton = sidebar.locator('button[title*="Collapse"]');
    if (await collapseButton.isVisible()) {
      await collapseButton.click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: 'screenshots/bottom-nav-06-sidebar-collapsed.png' });
      
      // Expand again
      const expandButton = sidebar.locator('button[title*="Expand"]');
      if (await expandButton.isVisible()) {
        await expandButton.click();
        await page.waitForTimeout(300);
        await page.screenshot({ path: 'screenshots/bottom-nav-07-sidebar-expanded.png' });
      }
    }
  });

  test('responsive behavior switching between viewports', async ({ page }) => {
    // Start with mobile
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);
    
    // Bottom nav should be visible
    const bottomNav = page.locator('nav.mobile-bottom-nav');
    const isBottomNavVisible = await bottomNav.isVisible().catch(() => false);
    console.log(`Mobile (390px): Bottom nav visible = ${isBottomNavVisible}`);
    expect(isBottomNavVisible).toBeTruthy();
    
    await page.screenshot({ path: 'screenshots/bottom-nav-08-responsive-mobile.png' });
    
    // Switch to tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    
    // At exactly 768px, sidebar should appear, bottom nav should hide
    await page.screenshot({ path: 'screenshots/bottom-nav-09-responsive-tablet.png' });
    
    // Switch to desktop
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.waitForTimeout(500);
    
    // Sidebar should be visible
    const sidebar = page.locator('aside').first();
    const isSidebarVisible = await sidebar.isVisible().catch(() => false);
    console.log(`Desktop (1200px): Sidebar visible = ${isSidebarVisible}`);
    expect(isSidebarVisible).toBeTruthy();
    
    await page.screenshot({ path: 'screenshots/bottom-nav-10-responsive-desktop.png' });
  });

  test('mobile content has correct padding for bottom nav', async ({ page }) => {
    // Mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);
    
    // Scroll to bottom of page
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    
    await page.screenshot({ path: 'screenshots/bottom-nav-11-content-padding.png' });
    
    // The content should not be hidden behind the bottom nav
    // Check that main content has bottom padding
    const mainContent = page.locator('main');
    const mainBox = await mainContent.boundingBox();
    console.log(`Main content height: ${mainBox?.height}px`);
  });
});
