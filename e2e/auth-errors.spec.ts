import { test, expect } from '@playwright/test';

test.describe('Authentication Error Handling', () => {
  test('complete login error flow - validation and wrong credentials', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1:text("Welcome back")')).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'screenshots/auth-01-login-page.png', fullPage: true });

    // Step 1: Try invalid email format
    await page.fill('input[type="email"]', 'invalid-email');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);

    const emailInput = page.locator('input[type="email"]');
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(page.url()).toContain('/login');

    await page.screenshot({ path: 'screenshots/auth-02-login-invalid-email.png', fullPage: true });

    // Step 2: Try empty password
    await page.fill('input[type="email"]', 'test@test.com');
    await page.locator('input[type="password"]').fill('');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/login');

    await page.screenshot({ path: 'screenshots/auth-03-login-empty-password.png', fullPage: true });

    // Step 3: Try wrong credentials
    await page.fill('input[type="email"]', 'nonexistent@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/login');

    await page.screenshot({ path: 'screenshots/auth-04-login-wrong-credentials.png', fullPage: true });

    // Step 4: Submit with valid-looking credentials and capture loading state
    await page.fill('input[type="email"]', 'test@test.com');
    await page.fill('input[type="password"]', 'testpassword');
    await page.click('button[type="submit"]');

    await page.screenshot({ path: 'screenshots/auth-05-login-loading-state.png', fullPage: true });
  });

  test('complete register error flow - validation and duplicate email', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1:text("Create your account")')).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'screenshots/auth-06-register-page.png', fullPage: true });

    // Step 1: Try invalid email
    await page.fill('input[type="email"]', 'not-an-email');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/register');

    await page.screenshot({ path: 'screenshots/auth-07-register-invalid-email.png', fullPage: true });

    // Step 2: Try short password
    await page.fill('input[type="email"]', 'newuser@test.com');
    await page.fill('input[type="password"]', 'short');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);

    const errorBox = page.locator('[style*="background-color: #fef2f2"]');
    const hasError = await errorBox.isVisible().catch(() => false);
    const currentUrl = page.url();
    expect(currentUrl.includes('/register') || hasError).toBeTruthy();

    await page.screenshot({ path: 'screenshots/auth-08-register-short-password.png', fullPage: true });

    // Step 3: Try duplicate email
    await page.fill('input[type="email"]', 'clod3@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/register');

    await page.screenshot({ path: 'screenshots/auth-09-register-duplicate-email.png', fullPage: true });
  });

  test('should redirect to daily after successful login', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1:text("Welcome back")')).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'screenshots/auth-10-before-login.png', fullPage: true });

    await page.fill('input[type="email"]', 'clod3@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/daily', { timeout: 15000 });

    await page.screenshot({ path: 'screenshots/auth-11-login-success-redirect.png', fullPage: true });
  });
});
