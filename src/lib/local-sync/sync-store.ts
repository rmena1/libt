// Local-first sync store
// Handles optimistic updates + background sync with server

import { type PendingOperation, type SyncState } from './types'

const STORAGE_KEY = 'libt_pending_ops'
const SYNC_INTERVAL = 2000 // 2 seconds
const MAX_RETRIES = 5

type SyncHandler = (op: PendingOperation) => Promise<void>

class SyncStore {
  private pending: PendingOperation[] = []
  private handlers: Map<string, SyncHandler> = new Map()
  private isSyncing = false
  private syncInterval: ReturnType<typeof setInterval> | null = null
  private listeners: Set<() => void> = new Set()

  constructor() {
    // Load pending operations from localStorage on init
    if (typeof window !== 'undefined') {
      this.loadFromStorage()
      this.startSyncLoop()
      
      // Sync before page unload
      window.addEventListener('beforeunload', () => {
        this.saveToStorage()
      })
    }
  }

  // Register a handler for syncing operations
  registerHandler(key: string, handler: SyncHandler) {
    this.handlers.set(key, handler)
  }

  // Add an operation to the pending queue
  addOperation(op: Omit<PendingOperation, 'id' | 'timestamp' | 'retries'>) {
    const operation: PendingOperation = {
      ...op,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retries: 0,
    }
    
    // Dedupe: if there's already a pending op for the same entity, merge/replace
    const existingIndex = this.pending.findIndex(
      p => p.entityId === op.entityId && p.table === op.table
    )
    
    if (existingIndex !== -1) {
      const existing = this.pending[existingIndex]
      if (op.type === 'delete') {
        // Delete supersedes everything
        if (existing.type === 'create') {
          // Created then deleted = remove from queue entirely
          this.pending.splice(existingIndex, 1)
          this.saveToStorage()
          return
        }
        this.pending[existingIndex] = operation
      } else if (op.type === 'update') {
        // Merge update data
        this.pending[existingIndex] = {
          ...existing,
          data: { ...existing.data, ...op.data },
          timestamp: Date.now(),
        }
      }
    } else {
      this.pending.push(operation)
    }
    
    this.saveToStorage()
    this.notifyListeners()
  }

  // Get current sync state
  getState(): SyncState {
    return {
      pending: [...this.pending],
      lastSyncedAt: null,
      isSyncing: this.isSyncing,
      error: null,
    }
  }

  // Subscribe to state changes
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notifyListeners() {
    this.listeners.forEach(l => l())
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        this.pending = JSON.parse(stored)
      }
    } catch (e) {
      console.error('Failed to load pending ops from storage:', e)
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.pending))
    } catch (e) {
      console.error('Failed to save pending ops to storage:', e)
    }
  }

  private startSyncLoop() {
    if (this.syncInterval) return
    
    this.syncInterval = setInterval(() => {
      this.processQueue()
    }, SYNC_INTERVAL)
    
    // Also process immediately
    this.processQueue()
  }

  private async processQueue() {
    if (this.isSyncing || this.pending.length === 0) return
    
    this.isSyncing = true
    this.notifyListeners()

    // Process operations in order
    const toProcess = [...this.pending]
    const completed: string[] = []
    const failed: PendingOperation[] = []

    for (const op of toProcess) {
      const handlerKey = `${op.table}.${op.type}`
      const handler = this.handlers.get(handlerKey)
      
      if (!handler) {
        console.warn(`No handler for ${handlerKey}`)
        completed.push(op.id)
        continue
      }

      try {
        await handler(op)
        completed.push(op.id)
      } catch (e) {
        console.error(`Sync failed for ${op.id}:`, e)
        op.retries++
        if (op.retries < MAX_RETRIES) {
          failed.push(op)
        } else {
          console.error(`Max retries reached for ${op.id}, dropping operation`)
          completed.push(op.id)
        }
      }
    }

    // Update pending queue
    this.pending = this.pending.filter(op => !completed.includes(op.id))
    // Update retry counts for failed ops
    for (const failedOp of failed) {
      const idx = this.pending.findIndex(op => op.id === failedOp.id)
      if (idx !== -1) {
        this.pending[idx] = failedOp
      }
    }

    this.saveToStorage()
    this.isSyncing = false
    this.notifyListeners()
  }

  // Force sync now
  async syncNow() {
    await this.processQueue()
  }

  // Clear all pending (use with caution)
  clearPending() {
    this.pending = []
    this.saveToStorage()
    this.notifyListeners()
  }

  // Get pending count
  getPendingCount(): number {
    return this.pending.length
  }
}

// Singleton instance
export const syncStore = typeof window !== 'undefined' ? new SyncStore() : null

// Hook for React components
export function useSyncState() {
  if (typeof window === 'undefined') {
    return { pending: [], isSyncing: false, pendingCount: 0 }
  }
  
  // This will be used with useSyncExternalStore in the provider
  return syncStore?.getState() ?? { pending: [], isSyncing: false, pendingCount: 0 }
}
