# Code Review - libt

## Critical

### 1. Dead code in deleteFolder (folders.ts:285-295)
**File:** `src/lib/actions/folders.ts` lines ~285-295
**Issue:** The `findDescendants` function is declared but never called, and only one level of children is being unlinked. For deeply nested folder hierarchies, pages in grandchild folders won't be unlinked before deletion.
**Fix:** Remove the dead code and use recursive unlinking or rely on the FK cascade properly.

### 2. Missing `deletePage` import in task-item.tsx
**File:** `src/app/(main)/tasks/task-item.tsx`
**Issue:** `deletePage` is imported but never used. The delete action is called from the parent via `onDelete` but the import is dead code.
**Fix:** Remove unused import.

## High

### 3. No input sanitization on folder names (folders.ts)
**File:** `src/lib/actions/folders.ts`
**Issue:** Folder names are only trimmed. No check for excessive length, special characters that could cause issues in URLs, or empty strings after slugification.
**Fix:** Add additional validation.

### 4. Unbounded while loop in slug generation (folders.ts:196-223, 275-300)
**File:** `src/lib/actions/folders.ts`
**Issue:** The while(true) loop for generating unique slugs has no upper bound. If something goes wrong, it could loop indefinitely.
**Fix:** Add a max iterations limit (e.g., 100).

### 5. DRY violation: duplicate slug uniqueness logic (folders.ts)
**File:** `src/lib/actions/folders.ts`
**Issue:** The slug uniqueness check and counter logic is duplicated in `createFolder` and `renameFolder`.
**Fix:** Extract to a shared `getUniqueSlug` helper.

### 6. `useCallback` deps missing in page-line.tsx
**File:** `src/components/daily/page-line.tsx`
**Issue:** `handleIndent` and `handleOutdent` callbacks reference `saveIndent` but don't include it in deps. The `saveIndent` function closes over `lastSavedIndent` ref so it works, but the `useCallback` for `handleBlurAction` is also missing deps.
**Fix:** Add proper deps or use refs.

### 7. Potential stale closure in DayCard (day-card.tsx)
**File:** `src/components/daily/day-card.tsx`
**Issue:** `handleCreatePage` uses `pages.length` from state but with `useCallback` deps on `[date, pages, isCreating, showError]` — since it depends on `pages`, it recreates on every pages change which is correct, but the function could be simplified.

## Medium

### 8. No error boundary for folder pages
**File:** `src/app/(main)/folders/[slug]/page.tsx`
**Issue:** If `getFolderBySlug` throws an unexpected error (not just "not found"), there's no error boundary to catch it gracefully.

### 9. Console.log statements in production code
**Files:** `src/components/daily/page-line.tsx`, `src/components/daily/mobile-toolbar.tsx`, `src/components/providers/mobile-toolbar-provider.tsx`
**Issue:** Multiple `console.log` statements used for debugging remain in production code.
**Fix:** Remove or wrap in development-only checks.

### 10. Type casting in task-item.tsx
**File:** `src/app/(main)/tasks/task-item.tsx`
**Issue:** `task.taskPriority as 'low' | 'medium' | 'high' | null` — unnecessary type assertion since the schema already defines these values.

### 11. Inline styles vs Tailwind inconsistency
**Issue:** The codebase mixes Tailwind classes and inline styles inconsistently. Some components use mostly inline styles (sidebar, bottom-nav), others mix both (page-line).
**Note:** This is acknowledged as a Turbopack bug workaround, but it should be documented.

## Low

### 12. Missing proper TypeScript return types
**Files:** Multiple action files
**Issue:** Several server actions don't have explicit return type annotations, relying on inference.

### 13. Missing aria labels
**Files:** `folder-list-view.tsx`, `folder-detail-view.tsx`
**Issue:** Some interactive elements (edit/delete buttons) could use better aria labels.

### 14. No loading states for folder operations
**File:** `folder-list-view.tsx`
**Issue:** Rename and delete operations don't show loading indicators.
