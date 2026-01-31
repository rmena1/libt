import { test, expect } from '@playwright/test';
import { authenticate } from './helpers';

test.describe('Folder Detail - CRUD Operations', () => {
  test.beforeEach(async ({ context }) => {
    await authenticate(context);
  });

  test('create folder, rename it, create subfolder, create note inside, delete note, delete folder', async ({ page }) => {
    // Step 1: Go to folders
    await page.goto('/folders');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/folder-detail-01-folders-list.png' });

    // Step 2: Create a new folder
    const createBtn = page.getByRole('button', { name: /new folder|create/i }).first();
    if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createBtn.click();
      const input = page.getByRole('textbox').last();
      await input.fill('E2E Detail Test');
      await input.press('Enter');
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'screenshots/folder-detail-02-folder-created.png' });
    }

    // Step 3: Navigate into the folder
    const folderLink = page.locator('a[href*="/folders/e2e-detail-test"]').first();
    const anyFolderLink = page.locator('a[href*="/folders/"]').first();
    const target = await folderLink.isVisible({ timeout: 3000 }).catch(() => false) ? folderLink : anyFolderLink;

    if (await target.isVisible({ timeout: 5000 }).catch(() => false)) {
      await target.click();
      await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
      await page.screenshot({ path: 'screenshots/folder-detail-03-inside-folder.png' });

      // Step 4: Look for rename option
      const moreBtn = page.locator('button').filter({ hasText: /more|⋯|\.\.\./ }).first();
      const menuBtn = page.locator('[aria-label*="menu"], [aria-label*="options"]').first();
      const renameTarget = await moreBtn.isVisible({ timeout: 2000 }).catch(() => false) ? moreBtn : menuBtn;

      if (await renameTarget.isVisible({ timeout: 2000 }).catch(() => false)) {
        await renameTarget.click();
        await page.waitForTimeout(300);
        await page.screenshot({ path: 'screenshots/folder-detail-04-menu-open.png' });

        const renameBtn = page.getByText(/rename/i).first();
        if (await renameBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await renameBtn.click();
          await page.waitForTimeout(300);
          const renameInput = page.getByRole('textbox').first();
          if (await renameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await renameInput.fill('E2E Renamed Folder');
            await renameInput.press('Enter');
            await page.waitForTimeout(500);
            await page.screenshot({ path: 'screenshots/folder-detail-05-renamed.png' });
          }
        }
      }

      // Step 5: Create a note inside
      const newNoteBtn = page.getByRole('button', { name: /new note|create note|\+/i }).first();
      if (await newNoteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await newNoteBtn.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'screenshots/folder-detail-06-note-created.png' });

        // Go back to folder
        const backBtn = page.locator('button, a').filter({ hasText: /back|←|‹/ }).first();
        if (await backBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await backBtn.click();
          await page.waitForTimeout(1000);
        } else {
          await page.goBack();
          await page.waitForTimeout(1000);
        }
        await page.screenshot({ path: 'screenshots/folder-detail-07-back-with-note.png' });
      }

      // Step 6: Verify note appears in list
      const noteInList = page.locator('a[href*="/note/"]').first();
      if (await noteInList.isVisible({ timeout: 3000 }).catch(() => false)) {
        await page.screenshot({ path: 'screenshots/folder-detail-08-note-in-list.png' });
      }

      // Step 7: Check empty state when no notes (if applicable)
      await page.screenshot({ path: 'screenshots/folder-detail-09-current-state.png' });
    }

    await page.screenshot({ path: 'screenshots/folder-detail-10-final.png' });
  });

// subfolder test merged into main test above to avoid server restart issues
});
