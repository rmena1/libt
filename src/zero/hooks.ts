/**
 * Zero hooks and type helpers for the app.
 * 
 * Zero uses string dates (ISO) instead of Date objects.
 * This file provides the ZeroPage / ZeroFolder types matching Zero's schema,
 * and helpers for creating pages/folders with all required fields.
 */

// Re-export for convenience
export { useQuery, useZero } from '@rocicorp/zero/react'

/** Create a full page insert payload with defaults */
export function newPageInsert(userId: string, fields: {
  id: string
  content?: string
  indent?: number
  dailyDate?: string | null
  folderId?: string | null
  parentPageId?: string | null
  order?: number
}) {
  const now = Date.now()
  return {
    id: fields.id,
    userId,
    content: fields.content ?? '',
    indent: fields.indent ?? 0,
    dailyDate: fields.dailyDate ?? null,
    folderId: fields.folderId ?? null,
    parentPageId: fields.parentPageId ?? null,
    order: fields.order ?? 0,
    isTask: false,
    taskCompleted: false,
    taskCompletedAt: null,
    taskDate: null,
    taskPriority: null,
    starred: false,
    createdAt: now,
    updatedAt: now,
  }
}

/** Create a full folder insert payload with defaults */
export function newFolderInsert(userId: string, fields: {
  id: string
  name: string
  slug: string
  parentId?: string | null
  order?: number
}) {
  const now = Date.now()
  return {
    id: fields.id,
    userId,
    name: fields.name,
    slug: fields.slug,
    parentId: fields.parentId ?? null,
    order: fields.order ?? 0,
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Zero Page type - matches the Zero schema (strings for dates, not Date objects)
 */
export interface ZeroPage {
  id: string
  userId: string
  content: string
  indent: number
  dailyDate: string | null
  folderId: string | null
  parentPageId: string | null
  order: number
  isTask: boolean
  taskCompleted: boolean
  taskCompletedAt: number | null
  taskDate: string | null
  taskPriority: string | null
  starred: boolean
  createdAt: number
  updatedAt: number
}

/**
 * Zero Folder type - matches the Zero schema
 */
export interface ZeroFolder {
  id: string
  userId: string
  name: string
  slug: string
  parentId: string | null
  order: number
  createdAt: number
  updatedAt: number
}
