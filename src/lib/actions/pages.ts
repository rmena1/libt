'use server'

import { db, pages, type Page } from '@/lib/db'
import { eq, and, asc, isNull } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import { createPageSchema, updatePageSchema, type CreatePageInput, type UpdatePageInput } from '@/lib/validations'
import { generateId } from '@/lib/utils'
import { revalidatePath } from 'next/cache'

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get pages for a specific daily date
 */
export async function getDailyPages(dailyDate: string): Promise<Page[]> {
  const session = await requireAuth()
  
  const result = await db
    .select()
    .from(pages)
    .where(
      and(
        eq(pages.userId, session.id),
        eq(pages.dailyDate, dailyDate),
        isNull(pages.parentPageId) // Only top-level pages
      )
    )
    .orderBy(asc(pages.order), asc(pages.createdAt))
  
  return result
}

/**
 * Get child pages (nested content)
 */
export async function getChildPages(parentPageId: string): Promise<Page[]> {
  const session = await requireAuth()
  
  const result = await db
    .select()
    .from(pages)
    .where(
      and(
        eq(pages.userId, session.id),
        eq(pages.parentPageId, parentPageId)
      )
    )
    .orderBy(asc(pages.order), asc(pages.createdAt))
  
  return result
}

/**
 * Get pages for multiple dates (for infinite scroll)
 */
export async function getDailyPagesRange(startDate: string, endDate: string): Promise<Record<string, Page[]>> {
  const session = await requireAuth()
  
  const result = await db
    .select()
    .from(pages)
    .where(
      and(
        eq(pages.userId, session.id),
        isNull(pages.parentPageId) // Only top-level pages
      )
    )
    .orderBy(asc(pages.dailyDate), asc(pages.order), asc(pages.createdAt))
  
  // Group by daily date
  const grouped: Record<string, Page[]> = {}
  
  for (const page of result) {
    if (page.dailyDate && page.dailyDate >= startDate && page.dailyDate <= endDate) {
      if (!grouped[page.dailyDate]) {
        grouped[page.dailyDate] = []
      }
      grouped[page.dailyDate].push(page)
    }
  }
  
  return grouped
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new page
 */
export async function createPage(input: CreatePageInput): Promise<Page> {
  const session = await requireAuth()
  
  const parsed = createPageSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || 'Invalid input')
  }
  
  const { content, dailyDate, folderId, parentPageId, order } = parsed.data
  
  const pageId = generateId()
  
  const [newPage] = await db
    .insert(pages)
    .values({
      id: pageId,
      userId: session.id,
      content,
      dailyDate,
      folderId,
      parentPageId,
      order,
    })
    .returning()
  
  if (dailyDate) {
    revalidatePath('/')
  }
  
  return newPage
}

/**
 * Update a page
 */
export async function updatePage(pageId: string, input: UpdatePageInput): Promise<Page> {
  const session = await requireAuth()
  
  const parsed = updatePageSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || 'Invalid input')
  }
  
  // Build update object
  const updates: Partial<Page> = {
    ...parsed.data,
    updatedAt: new Date(),
  }
  
  // Handle task completion timestamp
  if (parsed.data.taskCompleted === true) {
    updates.taskCompletedAt = new Date()
  } else if (parsed.data.taskCompleted === false) {
    updates.taskCompletedAt = null
  }
  
  const [updatedPage] = await db
    .update(pages)
    .set(updates)
    .where(
      and(
        eq(pages.id, pageId),
        eq(pages.userId, session.id)
      )
    )
    .returning()
  
  if (!updatedPage) {
    throw new Error('Page not found')
  }
  
  return updatedPage
}

/**
 * Delete a page
 */
export async function deletePage(pageId: string): Promise<void> {
  const session = await requireAuth()
  
  await db
    .delete(pages)
    .where(
      and(
        eq(pages.id, pageId),
        eq(pages.userId, session.id)
      )
    )
  
  revalidatePath('/')
}

/**
 * Reorder pages within a day
 */
export async function reorderPages(pageIds: string[]): Promise<void> {
  const session = await requireAuth()
  
  // Update order for each page
  for (let i = 0; i < pageIds.length; i++) {
    await db
      .update(pages)
      .set({ order: i, updatedAt: new Date() })
      .where(
        and(
          eq(pages.id, pageIds[i]),
          eq(pages.userId, session.id)
        )
      )
  }
  
  revalidatePath('/')
}
