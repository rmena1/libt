'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { type Page } from '@/lib/db'
import { syncStore } from './sync-store'
import { 
  getDailyPages, 
  createPage as serverCreatePage,
  updatePage as serverUpdatePage,
  deletePage as serverDeletePage 
} from '@/lib/actions/pages'
import { generateId } from '@/lib/utils'

interface UseLocalPagesOptions {
  dailyDate: string
  userId?: string
}

interface UseLocalPagesReturn {
  pages: Page[]
  isLoading: boolean
  isSyncing: boolean
  pendingCount: number
  createPage: (data: { content?: string; indent?: number; order?: number }) => Page
  updatePage: (id: string, data: Partial<Page>) => void
  deletePage: (id: string) => void
  reorderPages: (pageIds: string[]) => void
}

// Local storage key for pages cache
const PAGES_CACHE_KEY = 'libt_pages_cache'

function loadPagesCache(): Map<string, Page[]> {
  if (typeof window === 'undefined') return new Map()
  try {
    const stored = localStorage.getItem(PAGES_CACHE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return new Map(Object.entries(parsed))
    }
  } catch (e) {
    console.error('Failed to load pages cache:', e)
  }
  return new Map()
}

function savePagesCache(cache: Map<string, Page[]>) {
  if (typeof window === 'undefined') return
  try {
    const obj = Object.fromEntries(cache.entries())
    localStorage.setItem(PAGES_CACHE_KEY, JSON.stringify(obj))
  } catch (e) {
    console.error('Failed to save pages cache:', e)
  }
}

// Register sync handlers (only once)
let handlersRegistered = false

function registerSyncHandlers() {
  if (handlersRegistered || !syncStore) return
  handlersRegistered = true

  syncStore.registerHandler('pages.create', async (op) => {
    await serverCreatePage(op.data as Parameters<typeof serverCreatePage>[0])
  })

  syncStore.registerHandler('pages.update', async (op) => {
    await serverUpdatePage(op.entityId, op.data as Parameters<typeof serverUpdatePage>[1])
  })

  syncStore.registerHandler('pages.delete', async (op) => {
    await serverDeletePage(op.entityId)
  })
}

export function useLocalPages({ dailyDate }: UseLocalPagesOptions): UseLocalPagesReturn {
  const [pages, setPages] = useState<Page[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [syncState, setSyncState] = useState({ isSyncing: false, pendingCount: 0 })
  const pagesCache = useRef<Map<string, Page[]>>(new Map())

  // Register handlers on mount
  useEffect(() => {
    registerSyncHandlers()
  }, [])

  // Subscribe to sync state
  useEffect(() => {
    if (!syncStore) return

    const store = syncStore // Capture for closure
    const updateSyncState = () => {
      const state = store.getState()
      setSyncState({
        isSyncing: state.isSyncing,
        pendingCount: state.pending.length,
      })
    }

    updateSyncState()
    return store.subscribe(updateSyncState)
  }, [])

  // Load pages - first from cache, then from server
  useEffect(() => {
    let cancelled = false

    const loadPages = async () => {
      // 1. Load from local cache first (instant)
      if (pagesCache.current.size === 0) {
        pagesCache.current = loadPagesCache()
      }
      
      const cached = pagesCache.current.get(dailyDate)
      if (cached) {
        setPages(cached)
        setIsLoading(false)
      }

      // 2. Fetch from server in background
      try {
        const serverPages = await getDailyPages(dailyDate)
        if (cancelled) return

        setPages(serverPages)
        setIsLoading(false)

        // Update cache
        pagesCache.current.set(dailyDate, serverPages)
        savePagesCache(pagesCache.current)
      } catch (e) {
        console.error('Failed to fetch pages:', e)
        if (!cached) {
          setIsLoading(false)
        }
      }
    }

    loadPages()
    return () => { cancelled = true }
  }, [dailyDate])

  // Create page - optimistic
  const createPage = useCallback((data: { content?: string; indent?: number; order?: number }): Page => {
    const now = Date.now()
    const newPage: Page = {
      id: generateId(),
      userId: '', // Will be set by server
      content: data.content ?? '',
      indent: data.indent ?? 0,
      dailyDate,
      folderId: null,
      parentPageId: null,
      order: data.order ?? pages.length,
      isTask: false,
      taskCompleted: false,
      taskCompletedAt: null,
      taskDate: null,
      taskPriority: null,
      starred: false,
      createdAt: now,
      updatedAt: now,
    }

    // 1. Update local state immediately
    setPages(prev => {
      const updated = [...prev]
      // Insert at correct position based on order
      const insertIndex = updated.findIndex(p => (p.order ?? 0) > (newPage.order ?? 0))
      if (insertIndex === -1) {
        updated.push(newPage)
      } else {
        updated.splice(insertIndex, 0, newPage)
      }
      
      // Update cache
      pagesCache.current.set(dailyDate, updated)
      savePagesCache(pagesCache.current)
      
      return updated
    })

    // 2. Queue for server sync
    syncStore?.addOperation({
      type: 'create',
      table: 'pages',
      entityId: newPage.id,
      data: {
        id: newPage.id,
        dailyDate,
        content: newPage.content,
        indent: newPage.indent,
        order: newPage.order,
      },
    })

    return newPage
  }, [dailyDate, pages.length])

  // Update page - optimistic
  const updatePage = useCallback((id: string, data: Partial<Page>) => {
    // 1. Update local state immediately
    setPages(prev => {
      const updated = prev.map(p => 
        p.id === id ? { ...p, ...data, updatedAt: Date.now() } : p
      )
      
      // Update cache
      pagesCache.current.set(dailyDate, updated)
      savePagesCache(pagesCache.current)
      
      return updated
    })

    // 2. Queue for server sync
    syncStore?.addOperation({
      type: 'update',
      table: 'pages',
      entityId: id,
      data,
    })
  }, [dailyDate])

  // Delete page - optimistic
  const deletePage = useCallback((id: string) => {
    // 1. Update local state immediately
    setPages(prev => {
      const updated = prev.filter(p => p.id !== id)
      
      // Update cache
      pagesCache.current.set(dailyDate, updated)
      savePagesCache(pagesCache.current)
      
      return updated
    })

    // 2. Queue for server sync
    syncStore?.addOperation({
      type: 'delete',
      table: 'pages',
      entityId: id,
    })
  }, [dailyDate])

  // Reorder pages - optimistic
  const reorderPages = useCallback((pageIds: string[]) => {
    setPages(prev => {
      const pageMap = new Map(prev.map(p => [p.id, p]))
      const updated = pageIds.map((id, index) => {
        const page = pageMap.get(id)
        if (!page) return null
        return { ...page, order: index }
      }).filter((p): p is Page => p !== null)
      
      // Update cache
      pagesCache.current.set(dailyDate, updated)
      savePagesCache(pagesCache.current)
      
      return updated
    })

    // Queue order updates
    pageIds.forEach((id, index) => {
      syncStore?.addOperation({
        type: 'update',
        table: 'pages',
        entityId: id,
        data: { order: index },
      })
    })
  }, [dailyDate])

  return {
    pages,
    isLoading,
    isSyncing: syncState.isSyncing,
    pendingCount: syncState.pendingCount,
    createPage,
    updatePage,
    deletePage,
    reorderPages,
  }
}
