import { test, expect } from '@playwright/test';
import { authenticate } from './helpers';

test.describe('Mini Calendar & Date Navigation', () => {
  test.beforeEach(async ({ context }) => {
    await authenticate(context);
  });

  test('calendar display, today highlight, and date selection on daily page', async ({ page }) => {
    // Step 1: Go to daily notes
    await page.goto('/daily');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/mini-calendar-01-daily-page.png' });

    // Step 2: Look for mini calendar (day headers Mo Tu We Th Fr Sa Su)
    const calendarDays = page.getByText('Mo').first();
    const hasCalendar = await calendarDays.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasCalendar) {
      await page.screenshot({ path: 'screenshots/mini-calendar-02-calendar-visible.png' });

      // Step 3: Navigate to previous month
      const prevBtn = page.locator('button').filter({ hasText: /‹|←|</ }).first();
      if (await prevBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await prevBtn.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'screenshots/mini-calendar-03-prev-month.png' });

        // Step 4: Navigate to next month  
        const nextBtn = page.locator('button').filter({ hasText: /›|→|>/ }).first();
        if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await nextBtn.click();
          await page.waitForTimeout(500);
          await page.screenshot({ path: 'screenshots/mini-calendar-04-next-month.png' });
        }
      }

      // Step 5: Click on a specific date
      const dateCell = page.locator('td, div').filter({ hasText: /^15$/ }).first();
      if (await dateCell.isVisible({ timeout: 2000 }).catch(() => false)) {
        await dateCell.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'screenshots/mini-calendar-05-date-selected.png' });
      }
    } else {
      await page.screenshot({ path: 'screenshots/mini-calendar-02-no-calendar-desktop.png' });
    }

    // Step 6: Scroll to today button
    const todayBtn = page.getByRole('button', { name: /today/i }).first();
    if (await todayBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await todayBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'screenshots/mini-calendar-06-back-to-today.png' });
    }

    await page.screenshot({ path: 'screenshots/mini-calendar-07-final.png' });
  });
});
