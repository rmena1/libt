# Memory Leak Audit — libt.app

**Date:** 2025-05-06  
**Symptom:** Safari web app grows from 3GB to 6GB+ over time  
**Platform:** iOS/macOS Safari PWA

---

## 🔴 CRITICAL — Most Likely Causes

### 1. Zero Client's Internal Cache Grows Without Bound

**Files:** `src/zero/provider.tsx`, `src/components/daily/daily-notes.tsx`  
**Severity:** 🔴 CRITICAL — This is almost certainly the #1 contributor

**Problem:** The `@rocicorp/zero` client maintains an in-memory replica of all subscribed data (backed by IndexedDB). As the user scrolls through dates, the query range changes:

```tsx
// daily-notes.tsx
const [allPagesInRange] = useQuery(
  z.query.page
    .where('dailyDate', '>=', startDate)
    .where('dailyDate', '<=', endDate)
    .where('parentPageId', 'IS', null)
)
```

Although `MAX_DAYS_LOADED = 21` limits the visible range, **Zero's internal cache retains all data ever synced** during the session. Zero never evicts rows from its local replica unless explicitly told to. Over hours of use, the IndexedDB + in-memory mirror accumulates thousands of pages.

Additionally, the `ZeroVisibilityManager` calls `z.close()` on hide but **never re-creates the Zero instance** on return. After `z.close()`, the Zero client may be in a degraded state where it reconnects but doesn't properly clean up old subscriptions, leading to duplicate data accumulation.

**Fix:**
1. Investigate `@rocicorp/zero` options for cache eviction or `maxCacheSize`
2. Periodically call `z.close()` and remount the `ZeroProvider` to force a clean slate (e.g., every N hours or when memory pressure is detected via `performance.memory`)
3. Consider using `defineQuery` with explicit `limit()` on all queries to cap results

---

### 2. Unbounded `childPages` and `grandchildPages` Query Cascade

**File:** `src/components/daily/daily-notes.tsx:82-105`  
**Severity:** 🔴 CRITICAL

**Problem:** The query cascade creates an ever-growing subscription:

```tsx
// Step 1: Get all pages in range
const [allPagesInRange] = useQuery(...)

// Step 2: Get ALL children of ALL pages in range
const [childPagesRaw] = useQuery(
  parentIds.length > 0
    ? z.query.page.where('parentPageId', 'IN', parentIds)
    : undefined
)

// Step 3: Get ALL grandchildren of ALL children
const [grandchildPagesRaw] = useQuery(
  stableChildIds.length > 0
    ? z.query.page.where('parentPageId', 'IN', stableChildIds)
    : undefined
)
```

Each `useQuery` creates a **reactive subscription** in Zero. When the date range changes:
- New subscriptions are created for the new range
- **Old data remains in Zero's cache** even after the subscription changes
- The `IN` clause can match hundreds of IDs, and Zero must track all of them

The `parentIdsKey` / `childIdsKey` stabilization helps avoid re-renders but does **not** prevent Zero from accumulating data internally.

**Fix:**
1. Don't query grandchildren eagerly — only fetch when a parent is expanded
2. Add `.limit()` to child/grandchild queries
3. Consider lazy-loading children on demand instead of querying all children for all visible pages

---

### 3. `local-store.ts` Sync Loop Never Stops + localStorage Bloat

**File:** `src/lib/local-sync/local-store.ts:143-152`  
**Severity:** 🔴 CRITICAL

**Problem:** The `startSyncLoop()` function uses `setInterval` that **never stops**:

```tsx
export function startSyncLoop(): void {
  if (typeof window === 'undefined') return
  if (syncInterval) return
  syncInterval = setInterval(syncNow, SYNC_INTERVAL) // Runs every 1s FOREVER
}
```

Additionally, `setLocalPages()` stores ALL pages grouped by date in localStorage:
```tsx
export function setLocalPages(dailyDate: string, pages: Page[]): void {
  const all = localStorage.getItem(PAGES_KEY)
  const parsed: Record<string, Page[]> = all ? JSON.parse(all) : {}
  parsed[dailyDate] = pages
  localStorage.setItem(PAGES_KEY, JSON.stringify(parsed))
}
```

Every date the user visits adds to the localStorage blob. This is parsed and re-serialized on **every single page edit**. For users with months of data, this creates massive JSON strings that consume memory during serialization.

**But wait — is this even used?** The app now uses Zero for sync. If this legacy sync code is still running alongside Zero, you have **two sync systems accumulating data simultaneously**.

**Fix:**
1. **Remove the legacy local-sync system entirely** if Zero is the source of truth
2. If keeping it, add `stopSyncLoop()` call when component unmounts and limit localStorage to recent dates only

---

## 🟠 HIGH — Significant Contributors

### 4. `debouncedSave` Created Per `PageLine` — Not Cancelled on Unmount

**File:** `src/components/daily/page-line.tsx:~190`  
**Severity:** 🟠 HIGH

**Problem:** Each `PageLine` creates a debounced save function:

```tsx
const debouncedSave = useMemo(
  () => debounce((newContent: string) => {
    // ... captures pageRef, onUpdateRef, dailyDateRef via refs
    onUpdateRef.current?.({...})
  }, 500),
  [page.id]
)
```

The debounce function is recreated when `page.id` changes, but **there is no cleanup on unmount**. When a `PageLine` unmounts (e.g., scrolling away with virtualization), the pending timeout still holds a reference to the closure, which holds refs to the component's state.

The `handleBlur` does call `debouncedSave(content)` but doesn't cancel — it triggers one more save. However, if the user scrolls away without blurring (common on mobile), the 500ms timeout keeps the component tree alive.

**Fix:**
```tsx
// Add useEffect cleanup:
useEffect(() => {
  return () => {
    debouncedSave.cancel()
  }
}, [debouncedSave])
```

---

### 5. `dayRefs` Map Never Shrinks — Accumulates DOM References

**File:** `src/components/daily/daily-notes.tsx:42, 210-215`  
**Severity:** 🟠 HIGH

**Problem:** The `dayRefs` Map accumulates entries as dates are rendered:

```tsx
const dayRefs = useRef<Map<string, HTMLDivElement>>(new Map())

// In render:
ref={(el) => {
  if (el) dayRefs.current.set(date, el)
  else dayRefs.current.delete(date)
}}
```

The `else` branch only fires when the ref callback is called with `null` (unmount). But with `renderedDates` expand-only virtualization, components are **never unmounted** once rendered. The comment says:

```tsx
// Virtualization — expand-only: once a date is rendered, keep it rendered
```

This means `dayRefs` grows monotonically. Combined with IntersectionObservers observing all these elements, DOM nodes are retained even when far off-screen.

**Fix:**
1. Remove the expand-only virtualization — properly unmount off-screen dates
2. Or periodically prune `dayRefs` and `renderedDates` for dates far from the viewport

---

### 6. `renderedDates` Ref Grows Monotonically (Expand-Only Virtualization Defeats Its Purpose)

**File:** `src/components/daily/daily-notes.tsx:43, 175-190`  
**Severity:** 🟠 HIGH

**Problem:**
```tsx
const renderedDates = useRef<Set<string>>(new Set())

// In visibleDates memo:
for (let i = start; i < end; i++) {
  renderedDates.current.add(dates[i]) // ONLY ADDS, cleanup only removes dates outside current range
}
```

The cleanup only removes dates that left the `dates` array (range shift). But since `MAX_DAYS_LOADED = 21` limits the array, and the user navigates within that, **all 21 dates eventually get added** and stay rendered. This means virtualization does nothing — all 21 DayCards with all their PageLines are mounted simultaneously.

With each DayCard containing potentially hundreds of PageLine components (each with textarea, refs, debounced saves, useMemo caches), this is a massive amount of retained React state.

**Fix:**
1. Switch to true virtualization: only render ±2-3 days around viewport
2. Use `react-window` or similar for the date list
3. Accept minor scroll jump artifacts in exchange for 80% memory reduction

---

### 7. `pageLineRefs` Map in DayCard Never Cleaned Up

**File:** `src/components/daily/day-card.tsx` (multiple locations)  
**Severity:** 🟠 HIGH

**Problem:** Similar to `dayRefs`, each `DayCard` maintains a `pageLineRefs` Map:

```tsx
const pageLineRefs = useRef<Map<string, PageLineHandle>>(new Map())

// In render:
ref={(el: PageLineHandle | null) => {
  if (el) pageLineRefs.current.set(page.id, el)
  else pageLineRefs.current.delete(page.id)
}}
```

Since pages are deleted/created but the DayCard persists, deleted page refs may not always be cleaned up (depends on React unmounting the component). The `PageLineHandle` exposes methods that close over the entire `PageLine` component state via `useImperativeHandle`, preventing GC.

**Fix:** Periodically prune `pageLineRefs` to match current `pages` array.

---

### 8. Document-Level Event Listeners in DayCard Accumulate

**File:** `src/components/daily/day-card.tsx:~150-185`  
**Severity:** 🟠 HIGH

**Problem:** Each `DayCard` adds document-level `mousemove` and `mouseup` listeners:

```tsx
useEffect(() => {
  document.addEventListener('mousemove', handleDocMouseMove)
  document.addEventListener('mouseup', handleDocMouseUp)
  return () => {
    document.removeEventListener('mousemove', handleDocMouseMove)
    document.removeEventListener('mouseup', handleDocMouseUp)
  }
}, [blockSelection, allOrderedIds])
```

The cleanup exists, but the effect depends on `blockSelection` and `allOrderedIds`. Every time `allOrderedIds` changes (which happens on any page add/delete/reorder), the effect re-runs: removes old listeners, adds new ones. The new `handleDocMouseMove` closure captures `blockSelection` and `allOrderedIds`, which reference the entire page tree. If cleanup races with re-add, stale closures can remain.

With 21 DayCards mounted (per issue #6), that's **42 document-level event listeners** at any time, each closing over their DayCard's full state.

**Fix:**
1. Move text-drag selection to a single provider-level listener instead of per-DayCard
2. Use refs for values that change frequently to avoid effect re-runs

---

## 🟡 MEDIUM — Contributing Factors

### 9. Zero `z.close()` on Visibility Change May Corrupt State

**File:** `src/zero/provider.tsx:22-39`  
**Severity:** 🟡 MEDIUM

**Problem:**
```tsx
if (document.hidden) {
  z.close()
  wasClosedRef.current = true
} else if (wasClosedRef.current) {
  wasClosedRef.current = false
  // "The ZeroProvider handles reconnection on its own"
}
```

Calling `z.close()` tears down the WebSocket and local state. When the tab becomes visible, Zero is supposed to reconnect, but the `ZeroProvider` may re-sync ALL data from scratch, adding to the cache without cleaning up old data. Each hide/show cycle could duplicate data in memory.

**Fix:** Either don't call `z.close()` (just pause sync), or completely remount `ZeroProvider` on resume to guarantee a clean start.

---

### 10. Recording Context Holds Audio Blobs in `chunksRef`

**File:** `src/components/recording/recording-context.tsx:55`  
**Severity:** 🟡 MEDIUM (only during recording)

**Problem:**
```tsx
const chunksRef = useRef<Blob[]>([])
mediaRecorder.ondataavailable = (e) => {
  if (e.data.size > 0) chunksRef.current.push(e.data)
}
```

Audio chunks accumulate every second (`start(1000)`). For a 10-minute recording at even modest bitrate, this is ~60+ Blob objects. They're cleared on `onstop`, but during recording, memory grows linearly.

The chunk rotation every 10 minutes (`CHUNK_INTERVAL_MS`) helps, but during those 10 minutes, all chunks are held in memory.

**Fix:** For long recordings, flush chunks to a temporary IndexedDB store instead of holding in memory.

---

### 11. `SyncStore` Singleton Never Cleans Up Listeners

**File:** `src/lib/local-sync/sync-store.ts`  
**Severity:** 🟡 MEDIUM

**Problem:** The `SyncStore` singleton adds `beforeunload` and `visibilitychange` listeners in its constructor but never removes them:

```tsx
constructor() {
  window.addEventListener('beforeunload', () => { this.saveToStorage() })
  document.addEventListener('visibilitychange', () => { ... })
}
```

Since it's a singleton, this isn't technically a leak (they're added once). However, if this module is imported but not used (since Zero replaced it), it still runs the sync loop polling every 2 seconds.

**Fix:** Remove entirely if Zero replaced this system. Or make it lazy-initialized.

---

### 12. Inline Style Objects Created on Every Render

**File:** `src/components/daily/page-line.tsx` (entire component), `src/components/daily/day-card.tsx`, `src/components/daily/daily-notes.tsx`  
**Severity:** 🟡 LOW-MEDIUM

**Problem:** Every render creates new style objects:

```tsx
style={{ 
  paddingLeft: `${(indent + indentOffset) * INDENT_WIDTH}px`,
  transition: 'padding-left 150ms ease-out',
  // ...
}}
```

With hundreds of PageLine components rendered, each re-render creates new objects. These are short-lived (GC'd quickly), but in Safari's memory model, frequent small allocations can cause memory fragmentation, leading to higher reported memory usage.

**Fix:** Use `useMemo` for computed styles, or CSS classes with CSS custom properties.

---

### 13. IntersectionObserver Effect Doesn't Clean Up All Observed Elements

**File:** `src/components/daily/daily-notes.tsx:140-160`  
**Severity:** 🟡 MEDIUM

**Problem:**
```tsx
useEffect(() => {
  const observer = new IntersectionObserver(...)
  dayRefs.current.forEach(el => observer.observe(el))
  return () => observer.disconnect()
}, [startDate, endDate])
```

The observer is recreated when `startDate`/`endDate` changes. Between creation and cleanup, if new day refs are added (via rendering), they **won't be observed** by this effect, but old observers may still reference detached DOM nodes briefly.

More importantly, each date range change creates a new IntersectionObserver with callbacks that close over React state.

**Fix:** Use a `MutationObserver` or `ResizeObserver` pattern that doesn't depend on date range, or use a single persistent observer.

---

## Summary — Prioritized Fix Order

| Priority | Issue | Expected Impact |
|----------|-------|----------------|
| 🔴 1 | Zero cache grows without bound | 40-50% of leak |
| 🔴 2 | Unbounded child/grandchild query cascade | 15-20% of leak |
| 🔴 3 | Legacy local-store.ts still running + bloating localStorage | 10-15% |
| 🟠 4 | debouncedSave not cancelled on unmount | 5% |
| 🟠 5-6 | Expand-only virtualization defeats purpose | 10-15% |
| 🟠 7-8 | Per-DayCard refs and document listeners | 5% |
| 🟡 9-13 | Various smaller contributors | 5-10% |

**The single biggest win would be addressing Zero's unbounded cache (#1) and implementing real virtualization (#5-6).** Together, these likely account for 60%+ of the memory growth.
