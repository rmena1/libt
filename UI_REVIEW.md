# UI/UX Review - libt

## Overall Assessment
The app has a clean, minimal foundation with good typography and spacing. The design language is consistent across pages — light backgrounds, card-based layouts, and Apple-like color palette (#007aff blues, #8e8e93 grays). The sidebar, bottom nav, and daily notes view are well executed.

### Strengths
- Clean header with frosted glass effect
- Card-based layout for task groups and folders
- Consistent color palette
- Good use of whitespace
- Folder tree in sidebar works well

### Areas for Improvement

## Specific Issues

### 1. Bottom Nav overlaps page icon (visible in screenshots)
**File:** `src/components/navigation/bottom-nav.tsx`
**Issue:** The "Home" icon in the bottom nav has the favicon/PWA icon overlapping it
**Severity:** Low (aesthetic)

### 2. Tasks - Empty state "Completed" section too subtle
**File:** `src/app/(main)/tasks/task-list.tsx`
**Issue:** When all tasks are completed, the COMPLETED toggle is very subtle and could be missed.
**Priority:** Low

### 3. Folder list shows edit/delete buttons always visible
**File:** `src/app/(main)/folders/folder-list-view.tsx`
**Issue:** The edit (pencil) and delete (trash) icons are always visible at 40% opacity. On mobile touch interfaces, hover states don't work — these should either always be visible at higher opacity or hidden behind a swipe/menu.
**Fix:** Increase opacity to 0.6 and add proper touch targets.

### 4. Action button opacity in folder detail notes
**File:** `src/app/(main)/folders/[slug]/folder-detail-view.tsx`
**Issue:** Action icons (remove from folder, delete) at 0.3 opacity are too hard to see.
**Fix:** Increase to 0.5 opacity minimum.

### 5. Sidebar folder tree needs scroll handling
**File:** `src/components/sidebar/sidebar.tsx`
**Issue:** With many folders, the sidebar needs proper scroll behavior. The sidebar already has overflow-y: auto but the user section could get pushed off screen.
**Fix:** Already has overflowY: auto — looks handled.

### 6. Minor: Date links could be more interactive
**Files:** `task-item.tsx`, `folder-detail-view.tsx`
**Issue:** Date links (e.g. "2026-01-26") are plain text-like. Could benefit from subtle hover underline.
**Priority:** Low

## Priority Ranking
1. High: Increase action button opacity on folders (items 3 & 4)
2. Medium: None needed — the app is well-designed
3. Low: Minor aesthetic fixes (items 1, 2, 5, 6)

## Overall Score: 8/10
The app follows Apple/Craft design principles well. Clean, focused, minimal.
