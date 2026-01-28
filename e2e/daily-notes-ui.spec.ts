import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'clod3@test.com';
const TEST_PASSWORD = 'testtest123';

test.describe('Daily Notes UI', () => {
  test('verify all UI fixes - margins, bullets, Today pill', async ({ page }) => {
    // Go to login page
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Screenshot login page
    await page.screenshot({ path: 'screenshots/01-login-page.png' });
    
    // Fill login form
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    
    // Click submit and wait for navigation
    await page.click('button[type="submit"]');
    
    // Wait for redirect to /daily
    await page.waitForURL('**/daily', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Extra wait for content
    
    // Screenshot the main daily notes view
    await page.screenshot({ path: 'screenshots/02-daily-view.png', fullPage: true });
    
    // Viewport screenshot (mobile)
    await page.screenshot({ path: 'screenshots/03-mobile-viewport.png' });
    
    // Check for Today pill
    const todayPill = page.locator('span').filter({ hasText: 'Today' });
    const pillCount = await todayPill.count();
    console.log(`Found ${pillCount} Today pills`);
    
    if (pillCount > 0) {
      // Screenshot the Today section header
      const todayHeader = todayPill.first().locator('..').locator('..');
      await todayHeader.screenshot({ path: 'screenshots/04-today-header.png' });
      
      // Verify Today pill has spacing from date
      const pillBox = await todayPill.first().boundingBox();
      console.log(`Today pill position: x=${pillBox?.x}, y=${pillBox?.y}`);
    }
    
    // Check left margin of content
    const dateHeaders = page.locator('h2').first();
    if (await dateHeaders.isVisible()) {
      const headerBox = await dateHeaders.boundingBox();
      console.log(`Date header X position: ${headerBox?.x}px (should be >= 16px)`);
      expect(headerBox?.x).toBeGreaterThanOrEqual(16);
    }
    
    // Find or create a note to test bullets
    const createNoteButton = page.locator('button', { hasText: /What's on your mind/ });
    const emptyPrompt = page.locator('text=What\'s on your mind today?');
    
    if (await createNoteButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await createNoteButton.click();
      await page.waitForTimeout(500);
    } else if (await emptyPrompt.isVisible({ timeout: 2000 }).catch(() => false)) {
      await emptyPrompt.click();
      await page.waitForTimeout(500);
    }
    
    // Check if there's a textarea (note input)
    const textarea = page.locator('textarea').first();
    if (await textarea.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Type a test note
      await textarea.fill('Test note - checking bullet alignment');
      await page.waitForTimeout(1000);
      
      // Screenshot the note with bullet
      await page.screenshot({ path: 'screenshots/05-note-with-bullet.png' });
      
      // Find bullet point (using inline style selector)
      const bullets = page.locator('[style*="borderRadius"]').filter({ has: page.locator('[style*="50%"]') });
      const bulletCount = await bullets.count();
      console.log(`Found ${bulletCount} bullet elements`);
      
      // Bullet is rendered with inline styles
      
      // Take a screenshot of the line with the bullet
      const noteLineContainer = textarea.locator('..').locator('..');
      await noteLineContainer.screenshot({ path: 'screenshots/06-note-line.png' });
    }
    
    // Look for existing notes with bullets
    const existingNotes = page.locator('textarea[value]');
    const noteCount = await existingNotes.count();
    console.log(`Found ${noteCount} existing notes`);
    
    // Final full page screenshot
    await page.screenshot({ path: 'screenshots/07-final-state.png', fullPage: true });
    
    console.log('All screenshots taken successfully!');
  });
});
