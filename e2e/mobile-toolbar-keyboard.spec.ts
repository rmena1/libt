import { test, expect, devices } from '@playwright/test';

const TEST_EMAIL = 'clod3@test.com';
const TEST_PASSWORD = 'testtest123';

// Simulated keyboard height (typical iOS keyboard is ~300px)
const KEYBOARD_HEIGHT = 300;

// Test with Mobile Chrome (Pixel 5) which is the default in playwright.config.ts
test.describe('Mobile Toolbar Keyboard Positioning', () => {
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

  test('Toolbar positions above keyboard when simulated', async ({ page }) => {
    const viewportSize = page.viewportSize()!;
    console.log(`Viewport size: ${viewportSize.width}x${viewportSize.height}`);
    
    // Screenshot initial state
    await page.screenshot({ path: 'screenshots/keyboard-01-initial.png' });
    
    // Find a textarea (create note if needed)
    const textarea = page.locator('textarea').first();
    const hasTextarea = await textarea.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!hasTextarea) {
      const createButton = page.locator('button', { hasText: /Click to add a note/ });
      if (await createButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await createButton.click();
        await page.waitForTimeout(500);
      }
    }
    
    const noteInput = page.locator('textarea').first();
    await noteInput.waitFor({ state: 'visible', timeout: 5000 });
    
    // Focus the textarea to show toolbar
    await noteInput.focus();
    await page.waitForTimeout(500);
    
    // Wait for toolbar to appear (use 'attached' since it might be partially off-screen)
    const toolbar = page.locator('[data-testid="mobile-toolbar"]');
    await toolbar.waitFor({ state: 'attached', timeout: 5000 });
    // Also verify it has some visibility
    await expect(toolbar).toBeInViewport({ ratio: 0.3 });
    
    // Screenshot before simulating keyboard
    await page.screenshot({ path: 'screenshots/keyboard-02-focused.png' });
    
    // Get toolbar position before keyboard simulation
    const toolbarBoxBefore = await toolbar.boundingBox();
    const bottomBefore = toolbarBoxBefore!.y + toolbarBoxBefore!.height;
    console.log(`Toolbar bottom BEFORE keyboard: ${bottomBefore}px (viewport: ${viewportSize.height}px)`);
    
    // Simulate keyboard opening using Visual Viewport API
    await page.evaluate((keyboardHeight) => {
      // Store original values
      const originalHeight = window.innerHeight;
      const mockHeight = originalHeight - keyboardHeight;
      
      console.log(`Simulating keyboard: original=${originalHeight}, mock=${mockHeight}, keyboard=${keyboardHeight}`);
      
      // Create mock visualViewport
      const mockViewport = {
        height: mockHeight,
        width: window.innerWidth,
        offsetTop: 0,
        offsetLeft: 0,
        pageTop: 0,
        pageLeft: 0,
        scale: 1,
        onresize: null,
        onscroll: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true,
      };
      
      // Replace visualViewport
      Object.defineProperty(window, 'visualViewport', {
        value: mockViewport,
        configurable: true,
        writable: true,
      });
      
      // Trigger resize event
      window.dispatchEvent(new Event('resize'));
      
      console.log(`New visualViewport.height: ${window.visualViewport?.height}`);
    }, KEYBOARD_HEIGHT);
    
    // Wait for React to re-render
    await page.waitForTimeout(500);
    
    // Screenshot after simulating keyboard
    await page.screenshot({ path: 'screenshots/keyboard-03-with-keyboard.png' });
    
    // Get toolbar position after keyboard simulation
    const toolbarBoxAfter = await toolbar.boundingBox();
    const bottomAfter = toolbarBoxAfter!.y + toolbarBoxAfter!.height;
    console.log(`Toolbar bottom AFTER keyboard: ${bottomAfter}px`);
    
    // Expected: toolbar should be at viewport height - keyboard height
    const expectedBottom = viewportSize.height - KEYBOARD_HEIGHT;
    console.log(`Expected bottom: ~${expectedBottom}px`);
    console.log(`Difference: ${bottomBefore - bottomAfter}px moved up`);
    
    // Verify toolbar moved up (should be above where keyboard would be)
    // Allow tolerance for safe area and padding
    expect(bottomAfter).toBeLessThanOrEqual(expectedBottom + 80);
    expect(bottomBefore - bottomAfter).toBeGreaterThan(100); // Should have moved up significantly
    
    console.log('✓ Toolbar positioned above keyboard area');
  });

  test('Visual verification with keyboard indicator overlay', async ({ page }) => {
    const viewportSize = page.viewportSize()!;
    
    // Find a textarea
    const textarea = page.locator('textarea').first();
    const hasTextarea = await textarea.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!hasTextarea) {
      const createButton = page.locator('button', { hasText: /Click to add a note/ });
      if (await createButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await createButton.click();
        await page.waitForTimeout(500);
      }
    }
    
    const noteInput = page.locator('textarea').first();
    await noteInput.waitFor({ state: 'visible', timeout: 5000 });
    await noteInput.focus();
    await page.waitForTimeout(500);
    
    const toolbar = page.locator('[data-testid="mobile-toolbar"]');
    await toolbar.waitFor({ state: 'attached', timeout: 5000 });
    await expect(toolbar).toBeInViewport({ ratio: 0.3 });
    
    // Simulate keyboard
    await page.evaluate((keyboardHeight) => {
      const mockHeight = window.innerHeight - keyboardHeight;
      
      const mockViewport = {
        height: mockHeight,
        width: window.innerWidth,
        offsetTop: 0,
        offsetLeft: 0,
        pageTop: 0,
        pageLeft: 0,
        scale: 1,
        onresize: null,
        onscroll: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true,
      };
      
      Object.defineProperty(window, 'visualViewport', {
        value: mockViewport,
        configurable: true,
        writable: true,
      });
      
      window.dispatchEvent(new Event('resize'));
    }, KEYBOARD_HEIGHT);
    
    await page.waitForTimeout(500);
    
    // Draw visual keyboard indicator
    await page.evaluate((keyboardHeight) => {
      const indicator = document.createElement('div');
      indicator.id = 'keyboard-indicator';
      indicator.style.cssText = `
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        height: ${keyboardHeight}px;
        background: linear-gradient(to bottom, rgba(100, 100, 100, 0.8), rgba(50, 50, 50, 0.9));
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 16px;
        font-weight: bold;
        z-index: 9998;
        pointer-events: none;
        border-top: 2px solid #666;
      `;
      indicator.innerHTML = '📱 VIRTUAL KEYBOARD AREA 📱<br><small>(${keyboardHeight}px)</small>';
      document.body.appendChild(indicator);
    }, KEYBOARD_HEIGHT);
    
    // Take verification screenshot
    await page.screenshot({ path: 'screenshots/keyboard-04-visual-verification.png' });
    
    // Verify toolbar is above keyboard
    const toolbarBox = await toolbar.boundingBox();
    const toolbarBottom = toolbarBox!.y + toolbarBox!.height;
    const keyboardTop = viewportSize.height - KEYBOARD_HEIGHT;
    
    console.log(`Toolbar bottom: ${toolbarBottom}px`);
    console.log(`Keyboard top: ${keyboardTop}px`);
    
    // Toolbar should be AT or ABOVE the keyboard top
    expect(toolbarBottom).toBeLessThanOrEqual(keyboardTop + 20);
    
    console.log('✓ Visual verification passed');
  });
});
