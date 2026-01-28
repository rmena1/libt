// LOCAL-FIRST STORE
// localStorage is the source of truth, server is backup

import type { Page } from '@/lib/db'

const PAGES_KEY = 'libt_pages'
const PENDING_KEY = 'libt_pending'
const SYNC_INTERVAL = 1000 // 1 second

export interface PendingOp {
  id: string
  type: 'create' | 'update' | 'delete'
  pageId: string
  data?: Partial<Page>
  timestamp: number
}

// ============================================================================
// PAGES STORAGE (source of truth)
// ============================================================================

export function getLocalPages(dailyDate: string): Page[] {
  if (typeof window === 'undefined') return []
  try {
    const all = localStorage.getItem(PAGES_KEY)
    if (!all) return []
    const parsed: Record<string, Page[]> = JSON.parse(all)
    return parsed[dailyDate] || []
  } catch {
    return []
  }
}

export function setLocalPages(dailyDate: string, pages: Page[]): void {
  if (typeof window === 'undefined') return
  try {
    const all = localStorage.getItem(PAGES_KEY)
    const parsed: Record<string, Page[]> = all ? JSON.parse(all) : {}
    parsed[dailyDate] = pages
    localStorage.setItem(PAGES_KEY, JSON.stringify(parsed))
  } catch (e) {
    console.error('Failed to save pages to localStorage:', e)
  }
}

export function updateLocalPage(dailyDate: string, pageId: string, updates: Partial<Page>): void {
  const pages = getLocalPages(dailyDate)
  const updated = pages.map(p => p.id === pageId ? { ...p, ...updates } : p)
  setLocalPages(dailyDate, updated)
}

export function addLocalPage(dailyDate: string, page: Page, afterIndex?: number): void {
  const pages = getLocalPages(dailyDate)
  if (afterIndex !== undefined) {
    pages.splice(afterIndex + 1, 0, page)
  } else {
    pages.push(page)
  }
  setLocalPages(dailyDate, pages)
}

export function deleteLocalPage(dailyDate: string, pageId: string): void {
  const pages = getLocalPages(dailyDate)
  setLocalPages(dailyDate, pages.filter(p => p.id !== pageId))
}

// ============================================================================
// PENDING OPERATIONS (for server sync)
// ============================================================================

export function getPendingOps(): PendingOp[] {
  if (typeof window === 'undefined') return []
  try {
    const ops = localStorage.getItem(PENDING_KEY)
    return ops ? JSON.parse(ops) : []
  } catch {
    return []
  }
}

export function addPendingOp(op: Omit<PendingOp, 'id' | 'timestamp'>): void {
  if (typeof window === 'undefined') return
  const ops = getPendingOps()
  
  // Dedupe: merge with existing op for same page
  const existingIdx = ops.findIndex(o => o.pageId === op.pageId)
  if (existingIdx !== -1) {
    const existing = ops[existingIdx]
    if (op.type === 'delete') {
      if (existing.type === 'create') {
        // Created then deleted = remove from queue
        ops.splice(existingIdx, 1)
        localStorage.setItem(PENDING_KEY, JSON.stringify(ops))
        return
      }
      ops[existingIdx] = { ...op, id: existing.id, timestamp: Date.now() }
    } else if (op.type === 'update') {
      ops[existingIdx] = {
        ...existing,
        data: { ...existing.data, ...op.data },
        timestamp: Date.now(),
      }
    }
  } else {
    ops.push({
      ...op,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    })
  }
  
  localStorage.setItem(PENDING_KEY, JSON.stringify(ops))
}

export function removePendingOp(opId: string): void {
  const ops = getPendingOps().filter(o => o.id !== opId)
  localStorage.setItem(PENDING_KEY, JSON.stringify(ops))
}

export function clearPendingOps(): void {
  localStorage.setItem(PENDING_KEY, '[]')
}

/**
 * Clear all local sync data (pages + pending ops).
 * Call this on logout to ensure clean state for next user.
 */
export function clearLocalSyncData(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(PAGES_KEY)
    localStorage.removeItem(PENDING_KEY)
    console.log('[sync] Cleared all local sync data')
  } catch (e) {
    console.error('[sync] Failed to clear local sync data:', e)
  }
}

// ============================================================================
// SYNC ENGINE
// ============================================================================

type CreateHandler = (data: Record<string, unknown>) => Promise<void>
type UpdateHandler = (id: string, data: Record<string, unknown>) => Promise<void>
type DeleteHandler = (id: string) => Promise<void>

let syncInterval: ReturnType<typeof setInterval> | null = null
let isSyncing = false
let handlers: {
  create?: CreateHandler
  update?: UpdateHandler
  delete?: DeleteHandler
} = {}

export function registerSyncHandlers(h: typeof handlers): void {
  handlers = h
}

export async function syncNow(): Promise<void> {
  if (isSyncing) return
  const ops = getPendingOps()
  if (ops.length === 0) return
  
  // Check if handlers are registered - need at least one
  const hasHandlers = handlers.create || handlers.update || handlers.delete
  if (!hasHandlers) {
    console.warn('[sync] No handlers registered, skipping sync')
    return
  }
  
  console.log('[sync] Processing', ops.length, 'operations')
  isSyncing = true
  
  for (const op of ops) {
    try {
      console.log('[sync] Processing op:', op.type, op.pageId, 'data:', JSON.stringify(op.data))
      if (op.type === 'create' && op.data) {
        if (!handlers.create) {
          console.warn('[sync] No create handler, skipping create op')
          continue
        }
        await handlers.create(op.data as Record<string, unknown>)
        console.log('[sync] CREATE success:', op.pageId)
      } else if (op.type === 'update' && op.data) {
        if (!handlers.update) {
          console.warn('[sync] No update handler, skipping update op')
          continue
        }
        await handlers.update(op.pageId, op.data as Record<string, unknown>)
        console.log('[sync] UPDATE success:', op.pageId)
      } else if (op.type === 'delete') {
        if (!handlers.delete) {
          console.warn('[sync] No delete handler, skipping delete op')
          continue
        }
        await handlers.delete(op.pageId)
        console.log('[sync] DELETE success:', op.pageId)
      }
      removePendingOp(op.id)
    } catch (e) {
      console.error('[sync] Failed for op:', op.id, op.type, e)
      // Keep in queue for retry
    }
  }
  
  isSyncing = false
  console.log('[sync] Done, remaining:', getPendingOps().length)
}

export function startSyncLoop(): void {
  if (typeof window === 'undefined') return
  if (syncInterval) return
  
  syncInterval = setInterval(syncNow, SYNC_INTERVAL)
  
  // Sync before page unload
  window.addEventListener('beforeunload', () => {
    syncNow() // Best effort
  })
}

export function stopSyncLoop(): void {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
  }
}

export function getPendingCount(): number {
  return getPendingOps().length
}

export function isSyncingNow(): boolean {
  return isSyncing
}
