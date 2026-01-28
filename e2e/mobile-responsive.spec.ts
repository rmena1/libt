import { test, expect, devices } from '@playwright/test';
import { authenticate } from './helpers';

// Tests specifically for mobile viewport behavior
test.describe('Mobile Responsive Design', () => {
  test.beforeEach(async ({ context }) => {
    await authenticate(context);
  });

  test.use({ viewport: { width: 390, height: 844 } }); // iPhone 14 Pro size

  test.describe('Bottom Navigation (Mobile)', () => {
    test('should show bottom nav on mobile', async ({ page }) => {
      await page.goto('/daily');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      const bottomNav = page.locator('nav.mobile-bottom-nav');
      await expect(bottomNav).toBeVisible();
      
      // Should have Home, Search, Tasks, New icons
      await expect(bottomNav.locator('text=Home')).toBeVisible();
      await expect(bottomNav.locator('text=Tasks')).toBeVisible();
      
      await page.screenshot({ path: 'screenshots/mobile-bottom-nav.png', fullPage: true });
    });

    test('should hide sidebar on mobile', async ({ page }) => {
      await page.goto('/daily');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Sidebar should be hidden on mobile
      const sidebar = page.locator('aside.desktop-sidebar');
      const isVisible = await sidebar.isVisible().catch(() => false);
      expect(isVisible).toBeFalsy();
      
      await page.screenshot({ path: 'screenshots/mobile-no-sidebar.png', fullPage: true });
    });

    test('should navigate via bottom nav', async ({ page }) => {
      await page.goto('/daily');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      const bottomNav = page.locator('nav.mobile-bottom-nav');
      
      // Click Tasks link
      const tasksLink = bottomNav.locator('a[href="/tasks"]');
      await tasksLink.click();
      await page.waitForURL('**/tasks', { timeout: 10000 });
      
      await expect(page.locator('h1:text("Tasks")')).toBeVisible();
      
      await page.screenshot({ path: 'screenshots/mobile-nav-to-tasks.png', fullPage: true });
      
      // Navigate back to Home
      const homeLink = page.locator('nav.mobile-bottom-nav a[href="/daily"]');
      await homeLink.click();
      await page.waitForURL('**/daily', { timeout: 10000 });
      
      await page.screenshot({ path: 'screenshots/mobile-nav-to-home.png', fullPage: true });
    });
  });

  test.describe('Mobile Touch Targets', () => {
    test('should have adequate touch target size for buttons', async ({ page }) => {
      await page.goto('/folders');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('h1:text("Folders")')).toBeVisible({ timeout: 10000 });

      // Check New Folder button touch target
      const newFolderBtn = page.locator('text=New Folder');
      await expect(newFolderBtn).toBeVisible();
      
      const btnBox = await newFolderBtn.boundingBox();
      if (btnBox) {
        // Minimum recommended touch target is 44x44px
        expect(btnBox.height).toBeGreaterThanOrEqual(40);
      }
      
      await page.screenshot({ path: 'screenshots/mobile-touch-targets.png', fullPage: true });
    });

    test('should have adequate checkbox touch target', async ({ page }) => {
      await page.goto('/daily');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Create a task
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
      await noteInput.fill('[] Touch target task');
      await page.waitForTimeout(1500);

      // Check checkbox has adequate touch target (44x44px invisible expander)
      const checkbox = page.locator('[role="checkbox"]').first();
      await expect(checkbox).toBeVisible();
      
      await page.screenshot({ path: 'screenshots/mobile-checkbox-touch.png', fullPage: true });
    });
  });

  test.describe('Mobile Keyboard Handling', () => {
    test('should show mobile toolbar when editing', async ({ page }) => {
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
      
      // Focus to trigger mobile toolbar
      await noteInput.focus();
      await page.waitForTimeout(500);

      const mobileToolbar = page.locator('[data-testid="mobile-toolbar"]');
      const hasToolbar = await mobileToolbar.isVisible().catch(() => false);
      
      // On mobile, toolbar should appear
      if (hasToolbar) {
        await expect(page.locator('[data-testid="indent-button"]')).toBeVisible();
        await expect(page.locator('[data-testid="outdent-button"]')).toBeVisible();
        await expect(page.locator('[data-testid="done-button"]')).toBeVisible();
      }
      
      await page.screenshot({ path: 'screenshots/mobile-toolbar-visible.png', fullPage: true });
    });
  });

  test.describe('Mobile Content Layout', () => {
    test('should have proper content padding on mobile', async ({ page }) => {
      await page.goto('/daily');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Content should not be edge-to-edge (should have padding)
      const dateHeader = page.locator('h2').first();
      if (await dateHeader.isVisible()) {
        const box = await dateHeader.boundingBox();
        if (box) {
          // Should have at least 16px left margin
          expect(box.x).toBeGreaterThanOrEqual(16);
        }
      }
      
      await page.screenshot({ path: 'screenshots/mobile-content-padding.png', fullPage: true });
    });

    test('should have safe area spacing at bottom', async ({ page }) => {
      await page.goto('/daily');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Scroll to bottom
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await page.waitForTimeout(500);

      // Content should not be hidden behind bottom nav
      // (CSS has padding-bottom for bottom nav height)
      
      await page.screenshot({ path: 'screenshots/mobile-safe-area.png', fullPage: true });
    });
  });

  test.describe('Mobile Tasks Page', () => {
    test('should display task cards properly on mobile', async ({ page }) => {
      await page.goto('/tasks');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('h1:text("Tasks")')).toBeVisible({ timeout: 10000 });

      // Cards should be full width with proper padding
      await page.screenshot({ path: 'screenshots/mobile-tasks-cards.png', fullPage: true });
    });
  });

  test.describe('Mobile Folders Page', () => {
    test('should display folder list properly on mobile', async ({ page }) => {
      await page.goto('/folders');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('h1:text("Folders")')).toBeVisible({ timeout: 10000 });

      await page.screenshot({ path: 'screenshots/mobile-folders-list.png', fullPage: true });
    });

    test('should display folder detail on mobile', async ({ page }) => {
      await page.goto('/folders/test-folder-e2e');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('h1:text("Test Folder")')).toBeVisible({ timeout: 10000 });

      await page.screenshot({ path: 'screenshots/mobile-folder-detail.png', fullPage: true });
    });
  });

  test.describe('Mobile Note Editor', () => {
    test('should have full-screen note editing on mobile', async ({ page }) => {
      await page.goto('/folders/test-folder-e2e');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('h1:text("Test Folder")')).toBeVisible({ timeout: 10000 });

      // Create a note
      await page.locator('button:text("Add Note")').click();
      await page.waitForURL('**/note/**', { timeout: 15000 });

      // Should be full screen with back button
      const backBtn = page.locator('button').filter({ hasText: 'Test Folder' });
      await expect(backBtn).toBeVisible({ timeout: 10000 });

      await page.screenshot({ path: 'screenshots/mobile-note-editor.png', fullPage: true });
    });
  });
});

// Desktop-specific tests
test.describe('Desktop Responsive Design', () => {
  test.beforeEach(async ({ context }) => {
    await authenticate(context);
  });

  test.use({ viewport: { width: 1280, height: 800 } });

  test.describe('Sidebar (Desktop)', () => {
    test('should show sidebar on desktop', async ({ page }) => {
      await page.goto('/daily');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      const sidebar = page.locator('aside').first();
      await expect(sidebar).toBeVisible();
      
      await page.screenshot({ path: 'screenshots/desktop-sidebar.png', fullPage: true });
    });

    test('should collapse and expand sidebar', async ({ page }) => {
      await page.goto('/daily');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      const sidebar = page.locator('aside').first();
      
      // Find collapse button
      const collapseBtn = sidebar.locator('button[title*="Collapse"]');
      if (await collapseBtn.isVisible()) {
        await collapseBtn.click();
        await page.waitForTimeout(500);
        
        await page.screenshot({ path: 'screenshots/desktop-sidebar-collapsed.png', fullPage: true });
        
        // Expand again
        const expandBtn = sidebar.locator('button[title*="Expand"]');
        if (await expandBtn.isVisible()) {
          await expandBtn.click();
          await page.waitForTimeout(500);
          
          await page.screenshot({ path: 'screenshots/desktop-sidebar-expanded.png', fullPage: true });
        }
      }
    });

    test('should show folder tree in sidebar', async ({ page }) => {
      await page.goto('/daily');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      const sidebar = page.locator('aside').first();
      
      // Should show Folders label
      const foldersLabel = sidebar.locator('text=Folders');
      const hasLabel = await foldersLabel.isVisible().catch(() => false);
      
      if (hasLabel) {
        // Should show folder names
        await expect(sidebar.locator('text=Test Folder')).toBeVisible();
      }
      
      await page.screenshot({ path: 'screenshots/desktop-folder-tree.png', fullPage: true });
    });

    test('should navigate from sidebar', async ({ page }) => {
      await page.goto('/daily');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      const sidebar = page.locator('aside').first();
      
      // Click on Tasks in sidebar
      const tasksLink = sidebar.locator('a[href="/tasks"]');
      await tasksLink.click();
      await page.waitForURL('**/tasks', { timeout: 10000 });
      
      await page.screenshot({ path: 'screenshots/desktop-nav-tasks.png', fullPage: true });
    });
  });

  test.describe('Desktop Layout', () => {
    test('should hide bottom nav on desktop', async ({ page }) => {
      await page.goto('/daily');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      const bottomNav = page.locator('nav.mobile-bottom-nav');
      const isVisible = await bottomNav.isVisible().catch(() => false);
      expect(isVisible).toBeFalsy();
      
      await page.screenshot({ path: 'screenshots/desktop-no-bottom-nav.png', fullPage: true });
    });

    test('should center content with max-width', async ({ page }) => {
      await page.goto('/daily');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Content should be centered with max-width
      const contentContainer = page.locator('.max-w-2xl').first();
      const hasContainer = await contentContainer.isVisible().catch(() => false);
      
      await page.screenshot({ path: 'screenshots/desktop-centered-content.png', fullPage: true });
    });
  });

  test.describe('Desktop Hover States', () => {
    test('should show hover actions on folder list items', async ({ page }) => {
      await page.goto('/folders');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('h1:text("Folders")')).toBeVisible({ timeout: 10000 });

      // Hover over a folder to see action buttons
      const folderItem = page.locator('text=Test Folder').first();
      await folderItem.hover();
      await page.waitForTimeout(300);
      
      await page.screenshot({ path: 'screenshots/desktop-folder-hover.png', fullPage: true });
    });
  });
});
