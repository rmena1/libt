import { test, expect } from '@playwright/test';

test.describe('Login UI', () => {
  test('complete login UI flow - card display, focus styles, and mobile responsive', async ({ page }) => {
    // Step 1: Desktop login card
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('h1:text("Welcome back")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Sign in to continue to libt')).toBeVisible();
    await expect(page.locator('text=libt').first()).toBeVisible();
    await expect(page.locator('label:text("Email")')).toBeVisible();
    await expect(page.locator('label:text("Password")')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button:text("Sign in")')).toBeVisible();
    await expect(page.locator('a:text("Create one")')).toBeVisible();

    await page.screenshot({ path: 'screenshots/login-ui-01-desktop-card.png', fullPage: true });

    // Step 2: Focus styles
    const emailInput = page.locator('input[type="email"]');
    await emailInput.focus();

    await page.screenshot({ path: 'screenshots/login-ui-02-input-focus.png', fullPage: true });

    // Step 3: Mobile responsive
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);

    await expect(page.locator('h1:text("Welcome back")')).toBeVisible();
    await expect(page.locator('button:text("Sign in")')).toBeVisible();

    await page.screenshot({ path: 'screenshots/login-ui-03-mobile.png', fullPage: true });
  });
});

test.describe('Register UI', () => {
  test('complete register UI flow - card display, navigation, and mobile responsive', async ({ page }) => {
    // Step 1: Desktop register card
    await page.goto('/register');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('h1:text("Create your account")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Start organizing your thoughts')).toBeVisible();
    await expect(page.locator('label:text("Email")')).toBeVisible();
    await expect(page.locator('label:text("Password")')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button:text("Create account")')).toBeVisible();
    await expect(page.locator('a:text("Sign in")')).toBeVisible();
    await expect(page.locator('text=Must be at least 8 characters')).toBeVisible();

    await page.screenshot({ path: 'screenshots/login-ui-04-register-card.png', fullPage: true });

    // Step 2: Navigate to login
    await page.locator('a:text("Sign in")').click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1:text("Welcome back")')).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'screenshots/login-ui-05-nav-to-login.png', fullPage: true });

    // Step 3: Navigate back to register
    await page.locator('a:text("Create one")').click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1:text("Create your account")')).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'screenshots/login-ui-06-nav-back-to-register.png', fullPage: true });

    // Step 4: Mobile responsive
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);

    await expect(page.locator('h1:text("Create your account")')).toBeVisible();
    await expect(page.locator('button:text("Create account")')).toBeVisible();

    await page.screenshot({ path: 'screenshots/login-ui-07-register-mobile.png', fullPage: true });
  });
});
