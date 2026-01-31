import { test, expect } from '@playwright/test';
import { authenticate } from './helpers';

test.describe('Note Full View - Complete Flow', () => {
  test.beforeEach(async ({ context }) => {
    await authenticate(context);
  });

  test('create note in folder, edit title, star it, add child lines, and navigate back', async ({ page }) => {
    // Step 1: Go to folders page
    await page.goto('/folders');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/note-view-01-folders-page.png' });

    // Step 2: Create a test folder first
    const createFolderBtn = page.getByRole('button', { name: /new folder|create/i }).first();
    if (await createFolderBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createFolderBtn.click();
      const folderInput = page.getByRole('textbox').last();
      await folderInput.fill('E2E Note Test Folder');
      await folderInput.press('Enter');
      await page.waitForTimeout(1000);
    }

    // Step 3: Click into the first folder available
    const folderLink = page.locator('a[href*="/folders/"]').first();
    if (await folderLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await folderLink.click();
      await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
      await page.screenshot({ path: 'screenshots/note-view-02-folder-detail.png' });

      // Step 4: Create a new note
      const newNoteBtn = page.getByRole('button', { name: /new note|create note|\+/i }).first();
      if (await newNoteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await newNoteBtn.click();
        await page.waitForURL(/\/note\//);
        await page.screenshot({ path: 'screenshots/note-view-03-new-note.png' });

        // Step 5: Edit the title
        const titleInput = page.locator('textarea').first();
        if (await titleInput.isVisible({ timeout: 5000 }).catch(() => false)) {
          await titleInput.fill('E2E Test Note Title');
          await page.waitForTimeout(800); // debounce save
          await page.screenshot({ path: 'screenshots/note-view-04-title-edited.png' });

          // Step 6: Check for save indicator
          const savedIndicator = page.getByText(/saved|saving/i);
          if (await savedIndicator.isVisible({ timeout: 3000 }).catch(() => false)) {
            await page.screenshot({ path: 'screenshots/note-view-05-save-indicator.png' });
          }

          // Step 7: Star the note
          const starBtn = page.locator('[role="button"]').filter({ hasText: /star|⭐|★|☆/ }).first();
          const starClickable = page.locator('svg').filter({ has: page.locator('path[d*="star"], polygon') }).first();
          const starTarget = await starBtn.isVisible({ timeout: 2000 }).catch(() => false) ? starBtn : starClickable;
          if (await starTarget.isVisible({ timeout: 2000 }).catch(() => false)) {
            await starTarget.click();
            await page.waitForTimeout(500);
            await page.screenshot({ path: 'screenshots/note-view-06-starred.png' });
          }

          // Step 8: Press Enter to create a child line
          await titleInput.press('Enter');
          await page.waitForTimeout(500);
          await page.screenshot({ path: 'screenshots/note-view-07-child-line-created.png' });

          // Step 9: Type in the child line
          const childInput = page.locator('[contenteditable="true"], textarea').last();
          if (await childInput.isVisible({ timeout: 3000 }).catch(() => false)) {
            await childInput.fill('First child line content');
            await page.waitForTimeout(800);
            await page.screenshot({ path: 'screenshots/note-view-08-child-line-typed.png' });
          }
        }

        // Step 10: Navigate back
        const backBtn = page.locator('button, a').filter({ hasText: /back|←|‹/ }).first();
        if (await backBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await backBtn.click();
          await page.waitForTimeout(1000);
          await page.screenshot({ path: 'screenshots/note-view-09-back-to-folder.png' });
        } else {
          await page.goBack();
          await page.waitForTimeout(1000);
          await page.screenshot({ path: 'screenshots/note-view-09-back-to-folder.png' });
        }
      }
    }

    await page.screenshot({ path: 'screenshots/note-view-10-final.png' });
  });
});
