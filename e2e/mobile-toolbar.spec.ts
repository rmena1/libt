import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'clod3@test.com';
const TEST_PASSWORD = 'testtest123';

// Uses Mobile Chrome (Pixel 5) from playwright.config.ts

test.describe('Mobile Toolbar for Indentation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/daily', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
  });

  test('Mobile toolbar appears when textarea has focus', async ({ page }) => {
    // Screenshot initial state
    await page.screenshot({ path: 'screenshots/mobile-toolbar-01-initial.png' });
    
    // Find or create a note
    const textarea = page.locator('textarea').first();
    const hasTextarea = await textarea.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!hasTextarea) {
      const createButton = page.locator('button', { hasText: /What's on your mind/ });
      if (await createButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await createButton.click();
        await page.waitForTimeout(500);
      }
    }
    
    const noteInput = page.locator('textarea').first();
    await noteInput.waitFor({ state: 'visible', timeout: 5000 });
    
    // Toolbar should NOT be visible before focus
    const toolbar = page.locator('[data-testid="mobile-toolbar"]');
    const toolbarVisibleBefore = await toolbar.isVisible({ timeout: 1000 }).catch(() => false);
    expect(toolbarVisibleBefore).toBe(false);
    console.log('Toolbar hidden before focus ✓');
    
    // Focus the textarea
    await noteInput.focus();
    await page.waitForTimeout(300);
    
    // Toolbar should now be visible
    await toolbar.waitFor({ state: 'visible', timeout: 3000 });
    await page.screenshot({ path: 'screenshots/mobile-toolbar-02-visible.png' });
    console.log('Toolbar visible after focus ✓');
    
    // Check buttons exist
    const indentBtn = page.locator('[data-testid="indent-button"]');
    const outdentBtn = page.locator('[data-testid="outdent-button"]');
    const doneBtn = page.locator('[data-testid="done-button"]');
    
    await expect(indentBtn).toBeVisible();
    await expect(outdentBtn).toBeVisible();
    await expect(doneBtn).toBeVisible();
    console.log('All toolbar buttons visible ✓');
  });

  test('Indent button increases indent level', async ({ page }) => {
    // Create or find a note
    const textarea = page.locator('textarea').first();
    const hasTextarea = await textarea.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!hasTextarea) {
      const createButton = page.locator('button', { hasText: /What's on your mind/ });
      if (await createButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await createButton.click();
        await page.waitForTimeout(500);
      }
    }
    
    const noteInput = page.locator('textarea').first();
    await noteInput.waitFor({ state: 'visible', timeout: 5000 });
    await noteInput.fill('Testing mobile indent');
    await noteInput.focus();
    await page.waitForTimeout(300);
    
    // Get initial indent
    const initialPadding = await noteInput.locator('xpath=ancestor::div[contains(@class, "group")]').evaluate(
      (el) => window.getComputedStyle(el).paddingLeft
    );
    console.log(`Initial padding: ${initialPadding}`);
    
    // Screenshot before indent
    await page.screenshot({ path: 'screenshots/mobile-toolbar-03-before-indent.png' });
    
    // Click indent button
    const indentBtn = page.locator('[data-testid="indent-button"]');
    await indentBtn.tap();
    await page.waitForTimeout(500);
    
    // Get new indent
    const newPadding = await noteInput.locator('xpath=ancestor::div[contains(@class, "group")]').evaluate(
      (el) => window.getComputedStyle(el).paddingLeft
    );
    console.log(`After indent button: ${newPadding}`);
    
    // Should have increased by 24px
    const initialPx = parseInt(initialPadding) || 0;
    const newPx = parseInt(newPadding) || 0;
    expect(newPx).toBeGreaterThan(initialPx);
    console.log(`Indent increased from ${initialPx}px to ${newPx}px ✓`);
    
    await page.screenshot({ path: 'screenshots/mobile-toolbar-04-after-indent.png' });
  });

  test('Outdent button decreases indent level', async ({ page }) => {
    // Create or find a note
    const textarea = page.locator('textarea').first();
    const hasTextarea = await textarea.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!hasTextarea) {
      const createButton = page.locator('button', { hasText: /What's on your mind/ });
      if (await createButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await createButton.click();
        await page.waitForTimeout(500);
      }
    }
    
    const noteInput = page.locator('textarea').first();
    await noteInput.waitFor({ state: 'visible', timeout: 5000 });
    await noteInput.fill('Testing mobile outdent');
    await noteInput.focus();
    await page.waitForTimeout(300);
    
    // First indent twice
    const indentBtn = page.locator('[data-testid="indent-button"]');
    await indentBtn.tap();
    await page.waitForTimeout(300);
    await indentBtn.tap();
    await page.waitForTimeout(500);
    
    const afterIndent = await noteInput.locator('xpath=ancestor::div[contains(@class, "group")]').evaluate(
      (el) => window.getComputedStyle(el).paddingLeft
    );
    console.log(`After 2 indents: ${afterIndent}`);
    
    // Now click outdent
    const outdentBtn = page.locator('[data-testid="outdent-button"]');
    await outdentBtn.tap();
    await page.waitForTimeout(500);
    
    const afterOutdent = await noteInput.locator('xpath=ancestor::div[contains(@class, "group")]').evaluate(
      (el) => window.getComputedStyle(el).paddingLeft
    );
    console.log(`After outdent: ${afterOutdent}`);
    
    const indentPx = parseInt(afterIndent) || 0;
    const outdentPx = parseInt(afterOutdent) || 0;
    expect(outdentPx).toBeLessThan(indentPx);
    console.log(`Indent decreased from ${indentPx}px to ${outdentPx}px ✓`);
    
    await page.screenshot({ path: 'screenshots/mobile-toolbar-05-after-outdent.png' });
  });

  test('Done button closes keyboard (blurs textarea)', async ({ page }) => {
    // Create or find a note
    const textarea = page.locator('textarea').first();
    const hasTextarea = await textarea.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!hasTextarea) {
      const createButton = page.locator('button', { hasText: /What's on your mind/ });
      if (await createButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await createButton.click();
        await page.waitForTimeout(500);
      }
    }
    
    const noteInput = page.locator('textarea').first();
    await noteInput.waitFor({ state: 'visible', timeout: 5000 });
    await noteInput.focus();
    await page.waitForTimeout(300);
    
    // Toolbar should be visible
    const toolbar = page.locator('[data-testid="mobile-toolbar"]');
    await toolbar.waitFor({ state: 'visible', timeout: 3000 });
    
    // Click Done button
    const doneBtn = page.locator('[data-testid="done-button"]');
    await doneBtn.tap();
    await page.waitForTimeout(500);
    
    // Toolbar should disappear (after delay)
    const toolbarHidden = await toolbar.isHidden({ timeout: 2000 });
    expect(toolbarHidden).toBe(true);
    console.log('Toolbar hidden after Done ✓');
    
    await page.screenshot({ path: 'screenshots/mobile-toolbar-06-after-done.png' });
  });

  test('Toolbar is fixed at bottom', async ({ page }) => {
    // Create or find a note
    const textarea = page.locator('textarea').first();
    const hasTextarea = await textarea.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!hasTextarea) {
      const createButton = page.locator('button', { hasText: /What's on your mind/ });
      if (await createButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await createButton.click();
        await page.waitForTimeout(500);
      }
    }
    
    const noteInput = page.locator('textarea').first();
    await noteInput.waitFor({ state: 'visible', timeout: 5000 });
    await noteInput.focus();
    await page.waitForTimeout(300);
    
    // Check toolbar position
    const toolbar = page.locator('[data-testid="mobile-toolbar"]');
    await toolbar.waitFor({ state: 'visible', timeout: 3000 });
    
    const toolbarBox = await toolbar.boundingBox();
    const viewportHeight = page.viewportSize()?.height || 0;
    
    console.log(`Toolbar bottom: ${(toolbarBox?.y ?? 0) + (toolbarBox?.height ?? 0)}px, Viewport height: ${viewportHeight}px`);
    
    // Toolbar should be at the bottom of viewport
    const toolbarBottom = (toolbarBox?.y ?? 0) + (toolbarBox?.height ?? 0);
    expect(toolbarBottom).toBeGreaterThan(viewportHeight - 100); // Within 100px of bottom
    console.log('Toolbar is positioned at bottom ✓');
    
    await page.screenshot({ path: 'screenshots/mobile-toolbar-07-position.png', fullPage: false });
  });
});

test.describe('Mobile Toolbar - Desktop Hidden', () => {
  test('Toolbar does not appear on desktop', async ({ page }) => {
    // Override viewport for this test
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/daily', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    
    // Create or find a note
    const textarea = page.locator('textarea').first();
    const hasTextarea = await textarea.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!hasTextarea) {
      const createButton = page.locator('button', { hasText: /What's on your mind/ });
      if (await createButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await createButton.click();
        await page.waitForTimeout(500);
      }
    }
    
    const noteInput = page.locator('textarea').first();
    await noteInput.waitFor({ state: 'visible', timeout: 5000 });
    await noteInput.focus();
    await page.waitForTimeout(500);
    
    // Toolbar should NOT be visible on desktop
    const toolbar = page.locator('[data-testid="mobile-toolbar"]');
    const toolbarVisible = await toolbar.isVisible({ timeout: 1000 }).catch(() => false);
    expect(toolbarVisible).toBe(false);
    console.log('Toolbar hidden on desktop ✓');
    
    await page.screenshot({ path: 'screenshots/mobile-toolbar-08-desktop-hidden.png' });
  });
});
