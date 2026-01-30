# CPU Audit: 120% Constant CPU Usage in Safari

**Date:** 2025-07-13  
**Context:** After removing `z.close()` on visibility change (which fixed 6.6GB→300MB memory leak), CPU sits at 120% constant.

---

## Findings (ordered by likelihood)

### 🔴 1. CRITICAL: Document-level `mousemove` listener on EVERY DayCard (HIGH LIKELIHOOD)

**File:** `src/components/daily/day-card.tsx` lines 228-249

Every `DayCard` instance registers a **global** `document.addEventListener('mousemove', ...)` and `document.addEventListener('mouseup', ...)` — **unconditionally, always active**.

```tsx
useEffect(() => {
    const handleDocMouseMove = (e: MouseEvent) => {
      if (!(e.buttons & 1)) return  // Still fires on every mousemove!
      if (!blockSelection.textDragOriginId) return
      // ...
    }
    document.addEventListener('mousemove', handleDocMouseMove)
    document.addEventListener('mouseup', handleDocMouseUp)
    // ...
}, [blockSelection, allOrderedIds])
```

**Problem:** With ~14-21 DayCards rendered (7 days × virtualization window), that's **14-21 mousemove listeners on `document`**. Every single mouse movement triggers all of them. The early returns (`buttons & 1`, `textDragOriginId`) are cheap but the sheer volume on every mouse pixel is not.

**Worse:** The dependency array includes `blockSelection` and `allOrderedIds`. `blockSelection` is an object from context — it gets a **new reference on every render** of `BlockSelectionProvider` (because the context value is an inline object). This means these listeners are constantly being removed and re-added.

**Impact:** HIGH — constant event storm + listener churn

---

### 🔴 2. CRITICAL: Zero queries with unstable `childIds` causing continuous re-querying (HIGH LIKELIHOOD)

**File:** `src/components/daily/daily-notes.tsx` lines 99-107

```tsx
const childIds = useMemo(() => (childPagesRaw ?? []).map(p => p.id), [childPagesRaw])
const childIdsKey = childIds.join(',')
const stableChildIds = useMemo(() => childIds, [childIdsKey])
```

The `childIdsKey` string comparison stabilizes the *reference*, but **every time Zero pushes an update** (even to unrelated data), `useQuery` returns a new array reference for `childPagesRaw`. This triggers:

1. `childIds` recomputes (new array, but same string key)
2. `childIdsKey` is recalculated (string `.join(',')` on potentially hundreds of IDs)
3. `stableChildIds` stays stable ✓

**BUT** the real issue is upstream: `parentIds` has the same pattern:
```tsx
const parentIdsKey = useMemo(() => {
    const ids = allPagesInRange.map(p => p.id)
    ids.sort()
    return ids.join(',')
}, [allPagesInRange])
```

Every Zero sync tick → new `allPagesInRange` reference → `parentIdsKey` recalculates (sort + join on all pages) → if parentIdsKey is stable, good. But the `.sort()` mutates the array created by `.map()`, and the **join of potentially 100+ IDs** runs on every tick.

**Without `z.close()`**, Zero's WebSocket stays open permanently and pushes updates on every server-side change (from any client). If the zero-cache server is doing periodic sync pings, this could be continuous.

**Impact:** HIGH — continuous computation on every Zero tick

---

### 🟡 3. MEDIUM: BlockSelectionProvider context value creates new object every render

**File:** `src/components/providers/block-selection-provider.tsx` lines 109-131

The context `value` prop is an **inline object literal** — new reference on every render:
```tsx
<BlockSelectionContext.Provider value={{
    selectedIds,    // new Set on state change
    anchorId,
    select,         // useCallback - stable
    // ...
    isSelected,     // useCallback with [selectedIds] dep — NEW on every selection change
    hasSelection,   // useCallback with [selectedIds] dep — NEW on every selection change
    getSelectedIds, // useCallback with [selectedIds] dep — NEW on every selection change
}}>
```

`isSelected`, `hasSelection`, `getSelectedIds` all have `[selectedIds]` as dependency. Even though `selectedIds` is usually empty, any state change in the provider causes ALL consumers to re-render (because the context value object is new).

This affects every `DayCard` (which uses `useBlockSelection()`), potentially causing cascade re-renders.

**Impact:** MEDIUM — amplifies other issues

---

### 🟡 4. MEDIUM: `useEffect` in DayCard with `blockSelection` dependency causes listener churn

**File:** `src/components/daily/day-card.tsx` line 250

```tsx
}, [blockSelection, allOrderedIds])
```

`blockSelection` is the full context object (see #3 above). It changes reference whenever BlockSelectionProvider re-renders. Combined with 14+ DayCards, this is constant effect cleanup/setup cycles.

**Impact:** MEDIUM — adds to CPU from listener management overhead

---

### 🟢 5. LOW: CSS animations running continuously

**Files:** 
- `recording-indicator.tsx` — `pulse-recording` animation (only when recording)
- `sidebar.tsx` — `pulse-rec` animation, `spin-s` animation (only when recording/transcribing)

These only run during active recording, so unlikely to be the constant 120% issue unless recording is active.

**Impact:** LOW

---

### 🟢 6. LOW: Calendar timeline interval

**File:** `src/components/daily/calendar-timeline.tsx` line 217

1-minute interval for updating current time indicator. Already has visibility gating. Negligible CPU.

**Impact:** NEGLIGIBLE

---

### 🟢 7. LOW: Recording timer

**File:** `src/components/recording/recording-context.tsx` line 209

1-second interval, only during recording. Has visibility-based pause. Fine.

**Impact:** NEGLIGIBLE

---

### ✅ 8. CLEARED: ZeroVisibilityManager

**File:** `src/zero/provider.tsx`

Now a no-op. No loops, no effects. Clean.

---

### ✅ 9. CLEARED: Mobile toolbar rAF loop

**File:** `src/components/providers/mobile-toolbar-provider.tsx`

Previously had a continuous rAF loop. Now correctly uses event-driven updates (scroll/resize listeners) with `requestAnimationFrame` throttling. Also properly gates on `pageVisible`. Clean.

---

### ✅ 10. CLEARED: usePageVisibility hook

**File:** `src/hooks/use-page-visibility.ts`

Simple `visibilitychange` listener. No issues.

---

## Root Cause Theory

The CPU spike is most likely a **combination of #1 and #2**:

1. **Zero keeps syncing** without `z.close()` (expected and desired), but each sync tick triggers `useQuery` to return new array references
2. New array references cascade through `useMemo` chains in `daily-notes.tsx`, triggering re-renders
3. Re-renders of DayCards cause the `blockSelection` context to be consumed, and the unstable context value (#3) amplifies re-renders
4. Each DayCard re-render tears down and re-adds document-level mousemove/mouseup listeners (#1)
5. The constant listener churn + mousemove firing across all cards creates sustained CPU load

## Recommended Fixes (Priority Order)

1. **DayCard mousemove/mouseup listeners** — Only add document listeners when `textDragOriginId` is set (i.e., user is actively dragging). Guard the `useEffect` with a condition.

2. **BlockSelectionProvider context value** — Memoize the context value object with `useMemo`, and move `isSelected`/`hasSelection`/`getSelectedIds` to use refs instead of closures over `selectedIds`.

3. **DayCard useEffect dependency** — Don't pass the entire `blockSelection` object. Destructure only the specific functions/values needed, which are stable `useCallback` references.

4. **Zero query stabilization** — Consider adding a deeper comparison for `allPagesInRange` that checks if the actual data changed (not just reference), or use Zero's built-in query deduplication if available.
