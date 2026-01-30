import { test, expect } from '@playwright/test';

test.describe('Registration UI & Validation', () => {
  test('complete registration page UI and validation flow', async ({ page }) => {
    // Step 1: Desktop registration card
    await page.goto('/register');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('h1:text("Create your account")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Start organizing your thoughts')).toBeVisible();
    await expect(page.locator('label:text("Email")')).toBeVisible();
    await expect(page.locator('label:text("Password")')).toBeVisible();
    await expect(page.locator('button:text("Create account")')).toBeVisible();
    await expect(page.locator('a:text("Sign in")')).toBeVisible();

    await page.screenshot({ path: 'screenshots/register-01-desktop-card.png', fullPage: true });

    // Step 2: Focus styles on inputs
    const emailInput = page.locator('input[type="email"]');
    await emailInput.focus();
    await page.screenshot({ path: 'screenshots/register-02-email-focus.png', fullPage: true });

    // Step 3: Try submitting with invalid email
    await emailInput.fill('not-an-email');
    await page.locator('input[type="password"]').fill('password123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/register');
    await page.screenshot({ path: 'screenshots/register-03-invalid-email.png', fullPage: true });

    // Step 4: Try with short password (< 8 chars)
    await emailInput.fill('test@example.com');
    await page.locator('input[type="password"]').fill('short');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/register');
    await page.screenshot({ path: 'screenshots/register-04-short-password.png', fullPage: true });

    // Step 5: Password hint text visible
    await expect(page.locator('text=Must be at least 8 characters')).toBeVisible();

    // Step 6: Mobile responsive
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'screenshots/register-05-mobile.png', fullPage: true });

    // Step 7: Navigate to login via link
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.click('a:text("Sign in")');
    await page.waitForURL('**/login');
    await expect(page.locator('h1:text("Welcome back")')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'screenshots/register-06-navigated-to-login.png', fullPage: true });
  });
});
