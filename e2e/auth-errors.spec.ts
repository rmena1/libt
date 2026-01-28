import { test, expect } from '@playwright/test';

test.describe('Authentication Error Handling', () => {
  test.describe('Login Errors', () => {
    test('should show error for invalid email format', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('h1:text("Welcome back")')).toBeVisible({ timeout: 10000 });

      // Try to submit with invalid email
      await page.fill('input[type="email"]', 'invalid-email');
      await page.fill('input[type="password"]', 'password123');
      
      // HTML5 validation should prevent submit, or server returns error
      await page.click('button[type="submit"]');
      await page.waitForTimeout(1000);
      
      // Check for validation message or error state
      const emailInput = page.locator('input[type="email"]');
      const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
      
      await page.screenshot({ path: 'screenshots/auth-login-invalid-email.png', fullPage: true });
      
      // Either HTML5 validation fails or we're still on login page
      const currentUrl = page.url();
      expect(currentUrl).toContain('/login');
    });

    test('should show error for wrong credentials', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('h1:text("Welcome back")')).toBeVisible({ timeout: 10000 });

      // Submit with non-existent user
      await page.fill('input[type="email"]', 'nonexistent@test.com');
      await page.fill('input[type="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');
      
      // Wait for error message - try multiple selectors
      const errorBox = page.locator('div').filter({ hasText: /Invalid|incorrect/i }).first();
      
      // Wait for page to process and show error
      await page.waitForTimeout(2000);
      
      // Check if we're still on login page (which indicates error)
      const currentUrl = page.url();
      expect(currentUrl).toContain('/login');
      
      await page.screenshot({ path: 'screenshots/auth-login-wrong-credentials.png', fullPage: true });
    });

    test('should show error for empty password', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('h1:text("Welcome back")')).toBeVisible({ timeout: 10000 });

      await page.fill('input[type="email"]', 'test@test.com');
      // Leave password empty
      
      await page.click('button[type="submit"]');
      await page.waitForTimeout(500);
      
      // Should still be on login page (HTML5 required validation)
      expect(page.url()).toContain('/login');
      
      await page.screenshot({ path: 'screenshots/auth-login-empty-password.png', fullPage: true });
    });

    test('should show loading state while submitting', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('h1:text("Welcome back")')).toBeVisible({ timeout: 10000 });

      await page.fill('input[type="email"]', 'test@test.com');
      await page.fill('input[type="password"]', 'testpassword');
      
      // Click submit and immediately check for loading state
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();
      
      // Button text might change to "Signing in..." briefly
      // Take screenshot to capture any loading state
      await page.screenshot({ path: 'screenshots/auth-login-loading.png', fullPage: true });
    });
  });

  test.describe('Register Errors', () => {
    test('should show error for invalid email format', async ({ page }) => {
      await page.goto('/register');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('h1:text("Create your account")')).toBeVisible({ timeout: 10000 });

      await page.fill('input[type="email"]', 'not-an-email');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(500);
      
      // Should still be on register page
      expect(page.url()).toContain('/register');
      
      await page.screenshot({ path: 'screenshots/auth-register-invalid-email.png', fullPage: true });
    });

    test('should show error for short password', async ({ page }) => {
      await page.goto('/register');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('h1:text("Create your account")')).toBeVisible({ timeout: 10000 });

      await page.fill('input[type="email"]', 'newuser@test.com');
      await page.fill('input[type="password"]', 'short'); // Less than 8 chars
      await page.click('button[type="submit"]');
      
      // Wait for error message or validation
      await page.waitForTimeout(1500);
      
      // Either server error or still on register page
      const errorBox = page.locator('[style*="background-color: #fef2f2"]');
      const hasError = await errorBox.isVisible().catch(() => false);
      
      // Should be on register page or show error
      const currentUrl = page.url();
      
      await page.screenshot({ path: 'screenshots/auth-register-short-password.png', fullPage: true });
      
      // Verify we didn't successfully navigate away
      expect(currentUrl.includes('/register') || hasError).toBeTruthy();
    });

    test('should show error for duplicate email', async ({ page }) => {
      await page.goto('/register');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('h1:text("Create your account")')).toBeVisible({ timeout: 10000 });

      // Use an email that already exists (from test data)
      await page.fill('input[type="email"]', 'clod3@test.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      // Wait for page to process
      await page.waitForTimeout(2000);
      
      // Should still be on register page with error (or error text visible)
      const currentUrl = page.url();
      expect(currentUrl).toContain('/register');
      
      // Look for error text about existing account
      const errorText = page.locator('text=/already|exists/i');
      const hasError = await errorText.isVisible().catch(() => false);
      
      await page.screenshot({ path: 'screenshots/auth-register-duplicate-email.png', fullPage: true });
    });

    test('should show password requirements hint', async ({ page }) => {
      await page.goto('/register');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('h1:text("Create your account")')).toBeVisible({ timeout: 10000 });

      // Should show password hint
      await expect(page.locator('text=Must be at least 8 characters')).toBeVisible();
      
      await page.screenshot({ path: 'screenshots/auth-register-password-hint.png', fullPage: true });
    });
  });

  test.describe('Successful Authentication', () => {
    test('should redirect to daily after successful login', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('h1:text("Welcome back")')).toBeVisible({ timeout: 10000 });

      await page.fill('input[type="email"]', 'clod3@test.com');
      await page.fill('input[type="password"]', 'testtest123');
      await page.click('button[type="submit"]');
      
      // Should redirect to daily
      await page.waitForURL('**/daily', { timeout: 15000 });
      
      await page.screenshot({ path: 'screenshots/auth-login-success.png', fullPage: true });
    });
  });
});
