'use server'

import { db, folders, pages, type Folder, type Page } from '@/lib/db'
import { eq, and, asc, isNull } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import { createFolderSchema, type CreateFolderInput } from '@/lib/validations'
import { generateId, slugify } from '@/lib/utils'
import { revalidatePath } from 'next/cache'

const MAX_SLUG_ATTEMPTS = 100

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Generate a unique slug for a folder (shared between create & rename)
 */
async function getUniqueSlug(
  userId: string,
  baseSlug: string,
  excludeFolderId?: string
): Promise<string> {
  // Check if base slug is available
  const existing = await db
    .select({ id: folders.id })
    .from(folders)
    .where(
      and(
        eq(folders.userId, userId),
        eq(folders.slug, baseSlug)
      )
    )
    .limit(1)

  if (existing.length === 0 || (excludeFolderId && existing[0].id === excludeFolderId)) {
    return baseSlug
  }

  // Try with counter
  for (let counter = 1; counter <= MAX_SLUG_ATTEMPTS; counter++) {
    const testSlug = `${baseSlug}-${counter}`
    const check = await db
      .select({ id: folders.id })
      .from(folders)
      .where(
        and(
          eq(folders.userId, userId),
          eq(folders.slug, testSlug)
        )
      )
      .limit(1)

    if (check.length === 0 || (excludeFolderId && check[0].id === excludeFolderId)) {
      return testSlug
    }
  }

  // Fallback: use timestamp
  return `${baseSlug}-${Date.now()}`
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all folders for the current user as a flat list
 */
export async function getAllFolders(): Promise<Folder[]> {
  const session = await requireAuth()

  return db
    .select()
    .from(folders)
    .where(eq(folders.userId, session.id))
    .orderBy(asc(folders.order), asc(folders.name))
}

/**
 * Get root folders (no parent)
 */
export async function getRootFolders(): Promise<Folder[]> {
  const session = await requireAuth()

  return db
    .select()
    .from(folders)
    .where(
      and(
        eq(folders.userId, session.id),
        isNull(folders.parentId)
      )
    )
    .orderBy(asc(folders.order), asc(folders.name))
}

/**
 * Get child folders of a parent
 */
export async function getChildFolders(parentId: string): Promise<Folder[]> {
  const session = await requireAuth()

  return db
    .select()
    .from(folders)
    .where(
      and(
        eq(folders.userId, session.id),
        eq(folders.parentId, parentId)
      )
    )
    .orderBy(asc(folders.order), asc(folders.name))
}

/**
 * Get a folder by its slug
 */
export async function getFolderBySlug(slug: string): Promise<Folder | null> {
  const session = await requireAuth()

  const result = await db
    .select()
    .from(folders)
    .where(
      and(
        eq(folders.userId, session.id),
        eq(folders.slug, slug)
      )
    )
    .limit(1)

  return result[0] || null
}

/**
 * Get a folder by ID
 */
export async function getFolderById(id: string): Promise<Folder | null> {
  const session = await requireAuth()

  const result = await db
    .select()
    .from(folders)
    .where(
      and(
        eq(folders.userId, session.id),
        eq(folders.id, id)
      )
    )
    .limit(1)

  return result[0] || null
}

/**
 * Get pages in a folder (only top-level pages, not children)
 */
export async function getFolderPages(folderId: string): Promise<Page[]> {
  const session = await requireAuth()

  return db
    .select()
    .from(pages)
    .where(
      and(
        eq(pages.userId, session.id),
        eq(pages.folderId, folderId),
        isNull(pages.parentPageId)
      )
    )
    .orderBy(asc(pages.order), asc(pages.createdAt))
}

/**
 * Build folder tree structure
 */
export interface FolderTreeNode {
  folder: Folder
  children: FolderTreeNode[]
}

export async function getFolderTree(): Promise<FolderTreeNode[]> {
  const allFolders = await getAllFolders()

  // Build map for O(1) lookup
  const folderMap = new Map<string, FolderTreeNode>()
  for (const folder of allFolders) {
    folderMap.set(folder.id, { folder, children: [] })
  }

  // Build tree
  const roots: FolderTreeNode[] = []
  for (const folder of allFolders) {
    const node = folderMap.get(folder.id)!
    if (folder.parentId && folderMap.has(folder.parentId)) {
      folderMap.get(folder.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}

/**
 * Get breadcrumb path for a folder (from root to current)
 */
export async function getFolderBreadcrumbs(folderId: string): Promise<Folder[]> {
  const allFolders = await getAllFolders()
  const folderMap = new Map<string, Folder>()
  for (const f of allFolders) {
    folderMap.set(f.id, f)
  }

  const breadcrumbs: Folder[] = []
  let current = folderMap.get(folderId)
  while (current) {
    breadcrumbs.unshift(current)
    current = current.parentId ? folderMap.get(current.parentId) : undefined
  }

  return breadcrumbs
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new folder
 */
export async function createFolder(input: CreateFolderInput): Promise<Folder> {
  const session = await requireAuth()

  const parsed = createFolderSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || 'Invalid input')
  }

  const { name, parentId } = parsed.data
  const baseSlug = slugify(name)

  if (!baseSlug) {
    throw new Error('Invalid folder name — must contain at least one alphanumeric character')
  }

  const finalSlug = await getUniqueSlug(session.id, baseSlug)

  // Get max order for siblings
  const siblings = parentId
    ? await getChildFolders(parentId)
    : await getRootFolders()
  const maxOrder = siblings.length > 0
    ? Math.max(...siblings.map(f => f.order)) + 1
    : 0

  const folderId = generateId()

  const [newFolder] = await db
    .insert(folders)
    .values({
      id: folderId,
      userId: session.id,
      name: name.trim(),
      slug: finalSlug,
      parentId: parentId || null,
      order: maxOrder,
    })
    .returning()

  revalidatePath('/folders')
  revalidatePath('/')

  return newFolder
}

/**
 * Rename a folder
 */
export async function renameFolder(folderId: string, name: string): Promise<Folder> {
  const session = await requireAuth()

  if (!name || name.trim().length === 0) {
    throw new Error('Folder name is required')
  }

  const baseSlug = slugify(name.trim())
  const finalSlug = await getUniqueSlug(session.id, baseSlug, folderId)

  const [updatedFolder] = await db
    .update(folders)
    .set({
      name: name.trim(),
      slug: finalSlug,
      updatedAt: Date.now(),
    })
    .where(
      and(
        eq(folders.id, folderId),
        eq(folders.userId, session.id)
      )
    )
    .returning()

  if (!updatedFolder) {
    throw new Error('Folder not found')
  }

  revalidatePath('/folders')
  revalidatePath('/')

  return updatedFolder
}

/**
 * Collect all descendant folder IDs (recursive)
 */
function collectDescendantIds(folderId: string, allFolders: { id: string; parentId: string | null }[]): string[] {
  const descendants: string[] = []
  const queue = [folderId]

  while (queue.length > 0) {
    const currentId = queue.shift()!
    for (const f of allFolders) {
      if (f.parentId === currentId) {
        descendants.push(f.id)
        queue.push(f.id)
      }
    }
  }

  return descendants
}

/**
 * Delete a folder and unlink all nested pages (cascades to child folders via FK)
 */
export async function deleteFolder(folderId: string): Promise<void> {
  const session = await requireAuth()

  // Get all folders to find descendants
  const allFolders = await db
    .select({ id: folders.id, parentId: folders.parentId })
    .from(folders)
    .where(eq(folders.userId, session.id))

  // Collect all descendant folder IDs
  const descendantIds = collectDescendantIds(folderId, allFolders)
  const allFolderIds = [folderId, ...descendantIds]

  // Unlink pages from all affected folders AND reset parentPageId
  // for child pages so they become visible in the daily view again.
  // First, get all page IDs in these folders (they may be parents of child pages)
  for (const id of allFolderIds) {
    const folderPageIds = await db
      .select({ id: pages.id })
      .from(pages)
      .where(
        and(
          eq(pages.userId, session.id),
          eq(pages.folderId, id)
        )
      )

    // Reset parentPageId on any child pages pointing to these folder pages
    for (const fp of folderPageIds) {
      await db
        .update(pages)
        .set({ parentPageId: null, folderId: null, updatedAt: Date.now() })
        .where(
          and(
            eq(pages.userId, session.id),
            eq(pages.parentPageId, fp.id)
          )
        )
    }

    // Unlink the top-level folder pages themselves
    await db
      .update(pages)
      .set({ folderId: null, updatedAt: Date.now() })
      .where(
        and(
          eq(pages.userId, session.id),
          eq(pages.folderId, id)
        )
      )
  }

  // Delete the folder (child folders cascade via FK)
  await db
    .delete(folders)
    .where(
      and(
        eq(folders.id, folderId),
        eq(folders.userId, session.id)
      )
    )

  revalidatePath('/folders')
  revalidatePath('/')
}

/**
 * Move a page to a folder (or remove from folder with null)
 */
export async function movePageToFolder(pageId: string, folderId: string | null): Promise<Page> {
  const session = await requireAuth()

  const [updatedPage] = await db
    .update(pages)
    .set({
      folderId: folderId,
      updatedAt: Date.now(),
    })
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

  revalidatePath('/folders')
  revalidatePath('/')

  return updatedPage
}

/**
 * Create a note inside a folder (linked to today's daily note)
 */
export async function createNoteInFolder(folderId: string, content: string = ''): Promise<Page> {
  const session = await requireAuth()

  // Get today's date for daily_date link
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })

  // Get the order for the new page
  const existingPages = await getFolderPages(folderId)
  const maxOrder = existingPages.length > 0
    ? Math.max(...existingPages.map(p => p.order)) + 1
    : 0

  const pageId = generateId()

  const [newPage] = await db
    .insert(pages)
    .values({
      id: pageId,
      userId: session.id,
      content,
      dailyDate: today,
      folderId,
      order: maxOrder,
    })
    .returning()

  revalidatePath('/folders')
  revalidatePath('/')

  return newPage
}
