import { test, expect } from '@playwright/test';

test.describe('Login UI Redesign', () => {
  test('should display a premium login card with gradient background', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    // Should show welcome text
    await expect(page.locator('h1:text("Welcome back")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Sign in to continue to libt')).toBeVisible();

    // Should show logo icon
    await expect(page.locator('text=libt').first()).toBeVisible();

    // Should have email and password inputs with labels
    await expect(page.locator('label:text("Email")')).toBeVisible();
    await expect(page.locator('label:text("Password")')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // Should have Sign in button
    await expect(page.locator('button:text("Sign in")')).toBeVisible();

    // Should have register link
    await expect(page.locator('a:text("Create one")')).toBeVisible();

    await page.screenshot({ path: 'screenshots/login-redesign.png', fullPage: true });
  });

  test('should show input focus styles', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1:text("Welcome back")')).toBeVisible({ timeout: 10000 });

    // Focus on email input
    const emailInput = page.locator('input[type="email"]');
    await emailInput.focus();

    // Take screenshot of focused state
    await page.screenshot({ path: 'screenshots/login-input-focus.png', fullPage: true });
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('h1:text("Welcome back")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:text("Sign in")')).toBeVisible();

    await page.screenshot({ path: 'screenshots/login-mobile.png', fullPage: true });
  });
});

test.describe('Register UI Redesign', () => {
  test('should display a premium register card matching login style', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('domcontentloaded');

    // Should show create account text
    await expect(page.locator('h1:text("Create your account")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Start organizing your thoughts')).toBeVisible();

    // Should have email and password inputs with labels
    await expect(page.locator('label:text("Email")')).toBeVisible();
    await expect(page.locator('label:text("Password")')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // Should have Create account button
    await expect(page.locator('button:text("Create account")')).toBeVisible();

    // Should have login link
    await expect(page.locator('a:text("Sign in")')).toBeVisible();

    // Should show password hint
    await expect(page.locator('text=Must be at least 8 characters')).toBeVisible();

    await page.screenshot({ path: 'screenshots/register-redesign.png', fullPage: true });
  });

  test('should navigate between login and register', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1:text("Welcome back")')).toBeVisible({ timeout: 10000 });

    // Click "Create one"
    await page.locator('a:text("Create one")').click();
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('h1:text("Create your account")')).toBeVisible({ timeout: 10000 });

    // Click "Sign in"
    await page.locator('a:text("Sign in")').click();
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('h1:text("Welcome back")')).toBeVisible({ timeout: 10000 });
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/register');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('h1:text("Create your account")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:text("Create account")')).toBeVisible();

    await page.screenshot({ path: 'screenshots/register-mobile.png', fullPage: true });
  });
});
