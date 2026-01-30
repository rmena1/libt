# CPU Audit #2 — Deep Investigation

**Date:** 2025-07-13  
**Issue:** libt.app consumes ~120% CPU in Safari web app on macOS (M1 Pro)  
**Focus:** Beyond React — Zero sync engine, CSS, WebSockets, IDB, server

---

## Executive Summary

The CPU issue is **almost certainly caused by the Zero sync engine's client-side behavior**, specifically its interaction with Safari's IndexedDB and WebSocket handling. The app code itself is clean — no runaway loops, no leaked intervals, no heavy CSS animations. The problem is structural: **Zero (built on Replicache) continuously writes to IndexedDB, and Safari's IDB implementation is notoriously slow and CPU-hungry.**

---

## 1. Zero Sync Engine — THE PRIMARY SUSPECT ⚠️

### Run Loop
Zero has a **permanent run loop** (`#runLoop()`) with a 5-second interval (`RUN_LOOP_INTERVAL_MS = 5_000`). When connected, it:
1. Waits for a **ping timeout** (5 seconds idle → sends ping)
2. Processes **poke messages** (server pushes data changes)
3. Each poke triggers **IDB writes** via Replicache

### Ping/Pong Cycle
- `DEFAULT_PING_TIMEOUT_MS = 5_000` — every 5s of inactivity, Zero sends a ping
- This means the WebSocket is **never truly idle** — there's constant ping/pong traffic
- Each pong resets the cycle, so it's a perpetual 5-second heartbeat

### Connection Manager Timeout Check
- `ConnectionManager` has a `setInterval` checking connection timeout every **1 second** (`DEFAULT_TIMEOUT_CHECK_INTERVAL_MS = 1_000`)
- This is active whenever the connection is in "connecting" state

### IDB Writes — Safari's Achilles Heel
Zero uses IndexedDB (via Replicache) as its local store. Every mutation, every poke from the server triggers IDB writes. **Safari's IDB implementation is known to:**
- Use **significantly more CPU** than Chrome/Firefox for the same operations
- **Block the main thread** during writes (Safari doesn't fully parallelize IDB)
- Cause **high CPU even for small writes** due to SQLite journaling overhead
- Get progressively worse as the database grows

### Multiple Active Queries
The app has **7 concurrent Zero queries** active on the daily page:
1. `allPagesInRange` — all pages in date range
2. `projectedTasksRaw` — tasks in range
3. `overdueTasksRaw` — overdue tasks
4. `childPagesRaw` — child pages (via `IN` clause with all parent IDs)
5. `grandchildPagesRaw` — grandchild pages (via `IN` clause)
6. Sidebar: `allFolders`
7. Sidebar: `starredPagesRaw`

Each query is a **live subscription** — any change to the `page` or `folder` table triggers re-evaluation of ALL of these queries, which means IDB reads + React re-renders.

### Query Change Throttle
Default is only **10ms** (`DEFAULT_QUERY_CHANGE_THROTTLE_MS = 10`). This means query updates can fire up to 100 times/second.

---

## 2. Server-Side — NOT the problem

- Server CPU is essentially **idle** (0.0% across all zero-cache processes)
- No rapid cycling in pm2 logs
- The syncer processes show modest cumulative CPU time (30-44 min over 16+ hours)
- `next.config.ts` is clean — no polling, no revalidation
- Middleware is lightweight (just cookie check)

---

## 3. CSS/DOM — NOT the problem

- **No infinite CSS animations** when not recording
- The recording indicator only renders when `isRecording || isTranscribing` — returns null otherwise
- Its `pulse-recording` and `spin` animations only exist in the DOM during recording
- The sidebar has `pulse-rec` animation but only rendered when `isRecording` is true
- `globals.css` has only a one-shot `fade-in` animation (200ms, not infinite)
- No `will-change` properties
- No heavy transforms or filters on persistent elements

---

## 4. Service Workers — NONE

- No `sw.js` or `service-worker.js` in public/
- No service worker registration in the codebase
- `manifest.json` exists (for PWA "Add to Home Screen") but no SW

---

## 5. Dev Artifacts — Clean

- No dev-only polling
- No HMR code in production
- `next.config.ts` is production-clean

---

## 6. Client-Side Timers — Clean

All timers are properly guarded:
- `CalendarTimeline`: 60-second interval, visibility-gated ✓
- `RecordingProvider`: timer only active during recording, visibility-gated ✓
- `MobileToolbar`: resize listener only ✓
- `useVisibleInterval`: properly pauses on hidden ✓
- No leaked `requestAnimationFrame` loops

---

## 7. React Rendering — Previously addressed, likely not the main issue

- `DayCard` is memoized
- `BlockSelectionProvider` context is memoized
- Document mousemove/mouseup listeners are guarded
- Stable empty array refs prevent unnecessary re-renders

---

## Recommended Fixes (Priority Order)

### 🔴 P0: Reduce Zero IDB pressure on Safari

**1. Increase query change throttle**
```tsx
// In ZeroProvider, add to options:
queryChangeThrottleMs: 100  // Default is 10ms — way too aggressive for Safari
```

**2. Switch Zero to memory store on Safari PWA**
```tsx
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
// In ZeroProvider:
kvStore: isSafari ? 'mem' : 'idb'
```
This eliminates IDB entirely. Downside: data doesn't persist across sessions (but Zero re-syncs from server anyway). **This is the single most likely fix.**

**3. Reduce concurrent queries**
- Combine `childPagesRaw` and `grandchildPagesRaw` into a single query if possible
- Consider lazy-loading sidebar queries (don't query starred pages unless sidebar is open)
- Use `limit` on overdue tasks query

### 🟡 P1: Reduce WebSocket activity

**4. Increase ping timeout**
```tsx
<ZeroProvider
  pingTimeoutMs={30_000}  // Default is 5s — too aggressive
  ...
>
```
This reduces the ping/pong heartbeat from every 5s to every 30s.

**5. Increase hidden tab disconnect delay** (or decrease it)
Current default is 5 minutes. Consider disconnecting sooner when hidden:
```tsx
hiddenTabDisconnectDelay={30_000}  // Disconnect after 30s hidden
```

### 🟢 P2: Monitor & Debug

**6. Profile in Safari's Web Inspector**
- Open the PWA in Safari → Develop menu → Web Inspector
- Use the **Timelines** tab → record for 10 seconds
- Look for: IndexedDB read/write activity, WebSocket frames, JS execution

**7. Check Zero's internal IDB database size**
```js
// In Safari console:
const dbs = await indexedDB.databases()
console.log(dbs) // Check for large Zero databases
```

**8. Test with `kvStore: 'mem'`**
If CPU drops to normal with memory store, the diagnosis is confirmed: Safari IDB is the bottleneck.

---

## Root Cause Analysis

The Zero sync engine is designed for Chrome, where IDB is fast and non-blocking. Safari's IDB implementation:
- Uses a **serial access model** (one write at a time)
- Has **higher per-operation overhead** due to its SQLite backend
- **Blocks the main thread** more aggressively during transactions
- Gets worse with **frequent small writes** (exactly what Zero does)

With 7 live queries, constant ping/pong keeping the connection active, and every data change triggering IDB writes + query re-evaluation, Safari's CPU stays pegged.

The 10ms query change throttle means that a burst of changes (e.g., loading a date range) can trigger hundreds of IDB reads in rapid succession — each one blocking the main thread briefly but cumulatively consuming massive CPU.

---

## TL;DR

**Problem:** Zero/Replicache's IDB usage + Safari's slow IDB = 120% CPU  
**Quick test:** Set `kvStore: 'mem'` in ZeroProvider and see if CPU drops  
**Best fix:** `kvStore: 'mem'` for Safari + increase `queryChangeThrottleMs` to 100+  
**Also helps:** Increase `pingTimeoutMs` to 30s, reduce concurrent queries
