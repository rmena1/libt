// Types for local-first sync system

export interface PendingOperation {
  id: string
  type: 'create' | 'update' | 'delete'
  table: 'pages' | 'folders'
  entityId: string
  data?: Record<string, unknown>
  timestamp: number
  retries: number
}

export interface SyncState {
  pending: PendingOperation[]
  lastSyncedAt: number | null
  isSyncing: boolean
  error: string | null
}

export interface LocalCache<T> {
  data: Map<string, T>
  version: number
}
