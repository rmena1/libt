'use server'

import { db, pages, type Page } from '@/lib/db'
import { eq, and, asc, isNull, ne, inArray, gte } from 'drizzle-orm'
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

/**
 * Get tasks that should be "projected" onto a specific date
 * These are tasks where:
 * - taskDate = targetDate (due on this day)
 * - dailyDate != targetDate (but written on a different day)
 * - isTask = true
 */
export async function getProjectedTasksForDate(targetDate: string): Promise<Page[]> {
  const session = await requireAuth()
  
  const result = await db
    .select()
    .from(pages)
    .where(
      and(
        eq(pages.userId, session.id),
        eq(pages.isTask, true),
        eq(pages.taskDate, targetDate),
        ne(pages.dailyDate, targetDate) // dailyDate != targetDate
      )
    )
    .orderBy(asc(pages.taskPriority), asc(pages.createdAt))
  
  return result
}

/**
 * Get projected tasks for a date range
 * Returns a map: { date: Page[] } for tasks that should appear on each date
 */
export async function getProjectedTasksForRange(startDate: string, endDate: string): Promise<Record<string, Page[]>> {
  const session = await requireAuth()
  
  // Get all tasks where taskDate is within range but dailyDate is different from taskDate
  const result = await db
    .select()
    .from(pages)
    .where(
      and(
        eq(pages.userId, session.id),
        eq(pages.isTask, true)
      )
    )
    .orderBy(asc(pages.taskDate), asc(pages.taskPriority), asc(pages.createdAt))
  
  // Group by taskDate where taskDate != dailyDate and taskDate is in range
  const grouped: Record<string, Page[]> = {}
  
  for (const page of result) {
    // Only include if taskDate is in range and different from dailyDate
    if (page.taskDate && 
        page.taskDate >= startDate && 
        page.taskDate <= endDate && 
        page.taskDate !== page.dailyDate) {
      if (!grouped[page.taskDate]) {
        grouped[page.taskDate] = []
      }
      grouped[page.taskDate].push(page)
    }
  }
  
  return grouped
}

/**
 * Get child pages for multiple parent page IDs (batch fetch).
 * Used by the daily view to show children of folder notes inline.
 */
export async function getChildPagesForParents(parentPageIds: string[]): Promise<Record<string, Page[]>> {
  if (parentPageIds.length === 0) return {}
  
  const session = await requireAuth()
  
  const result = await db
    .select()
    .from(pages)
    .where(
      and(
        eq(pages.userId, session.id),
        inArray(pages.parentPageId, parentPageIds)
      )
    )
    .orderBy(asc(pages.order), asc(pages.createdAt))
  
  // Group by parentPageId
  const grouped: Record<string, Page[]> = {}
  for (const page of result) {
    if (page.parentPageId) {
      if (!grouped[page.parentPageId]) {
        grouped[page.parentPageId] = []
      }
      grouped[page.parentPageId].push(page)
    }
  }
  
  return grouped
}

/**
 * Find and link "visual children" from the daily flat list to a parent page.
 * 
 * In the daily view, pages are stored flat with indent levels.
 * When a page is linked to a folder, its indented pages below it
 * should become actual child pages (parentPageId set) so the folder
 * note view can display them.
 * 
 * This is idempotent — if children already exist or no visual children
 * are found, it returns an empty array.
 */
export async function linkDailyVisualChildren(parentPageId: string): Promise<Page[]> {
  const session = await requireAuth()
  
  // Get the parent page
  const [parent] = await db
    .select()
    .from(pages)
    .where(
      and(
        eq(pages.id, parentPageId),
        eq(pages.userId, session.id)
      )
    )
    .limit(1)
  
  if (!parent || !parent.dailyDate) return []
  
  // Get pages for the same daily date that were created at or after the parent.
  // We filter by createdAt to avoid picking up unrelated pages from other sessions
  // that happen to share the same dailyDate but have different order values.
  const allPages = await db
    .select()
    .from(pages)
    .where(
      and(
        eq(pages.userId, session.id),
        eq(pages.dailyDate, parent.dailyDate),
        isNull(pages.parentPageId),
        gte(pages.createdAt, parent.createdAt)
      )
    )
    .orderBy(asc(pages.createdAt))
  
  // Find the parent's position in the filtered list
  const parentIndex = allPages.findIndex(p => p.id === parentPageId)
  if (parentIndex === -1) return []
  
  // Collect visual children: subsequent pages with indent > parent's indent
  const parentIndent = parent.indent ?? 0
  const visualChildren: Page[] = []
  
  for (let i = parentIndex + 1; i < allPages.length; i++) {
    const page = allPages[i]
    const pageIndent = page.indent ?? 0
    
    // Stop at a page with indent <= parent's indent (sibling or parent level)
    if (pageIndent <= parentIndent) break
    
    visualChildren.push(page)
  }
  
  if (visualChildren.length === 0) return []
  
  // Convert visual children to actual children
  const linkedChildren: Page[] = []
  for (let i = 0; i < visualChildren.length; i++) {
    const child = visualChildren[i]
    const [updated] = await db
      .update(pages)
      .set({
        parentPageId: parentPageId,
        folderId: parent.folderId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(pages.id, child.id),
          eq(pages.userId, session.id)
        )
      )
      .returning()
    
    if (updated) linkedChildren.push(updated)
  }
  
  // Note: We don't call revalidatePath here because this function
  // may be called during server component render (e.g., from the folder note page).
  // The caller is responsible for revalidation if needed.
  
  return linkedChildren
}

/**
 * Link specific pages as children of a parent page.
 * Called from the client when a page is tagged with a folder in the daily view.
 * The client knows the exact array order (which is reliable), so it passes
 * the child page IDs directly.
 */
export async function linkPagesAsChildren(
  parentPageId: string,
  childPageIds: string[],
  folderId: string
): Promise<void> {
  if (childPageIds.length === 0) return
  
  const session = await requireAuth()
  
  for (const childId of childPageIds) {
    await db
      .update(pages)
      .set({
        parentPageId: parentPageId,
        folderId: folderId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(pages.id, childId),
          eq(pages.userId, session.id)
        )
      )
  }
  
  revalidatePath('/')
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
  
  const { id, content, indent, dailyDate, folderId, parentPageId, order } = parsed.data
  
  // Use client-provided ID if available (for local-first sync)
  const pageId = id || generateId()
  
  const [newPage] = await db
    .insert(pages)
    .values({
      id: pageId,
      userId: session.id,
      content,
      indent,
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

/**
 * Toggle starred status for a page
 */
export async function togglePageStarred(pageId: string): Promise<Page> {
  const session = await requireAuth()
  
  // Get current starred status
  const [page] = await db
    .select()
    .from(pages)
    .where(
      and(
        eq(pages.id, pageId),
        eq(pages.userId, session.id)
      )
    )
    .limit(1)
  
  if (!page) {
    throw new Error('Page not found')
  }
  
  const newStarred = !page.starred
  
  const [updated] = await db
    .update(pages)
    .set({ starred: newStarred, updatedAt: new Date() })
    .where(
      and(
        eq(pages.id, pageId),
        eq(pages.userId, session.id)
      )
    )
    .returning()
  
  revalidatePath('/')
  return updated
}

/**
 * Get all starred pages for the current user
 */
export type StarredPageWithFolder = Page & { folderSlug?: string | null }

export async function getStarredPages(): Promise<StarredPageWithFolder[]> {
  const session = await requireAuth()
  
  // Import folders table for join
  const { folders } = await import('@/lib/db')
  
  const result = await db
    .select({
      page: pages,
      folderSlug: folders.slug,
    })
    .from(pages)
    .leftJoin(folders, eq(pages.folderId, folders.id))
    .where(
      and(
        eq(pages.userId, session.id),
        eq(pages.starred, true)
      )
    )
    .orderBy(asc(pages.updatedAt))
  
  // Flatten the result
  return result.map(r => ({
    ...r.page,
    folderSlug: r.folderSlug,
  }))
}
