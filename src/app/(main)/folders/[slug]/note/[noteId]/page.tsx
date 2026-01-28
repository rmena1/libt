import { notFound } from 'next/navigation'
import { getFolderBySlug } from '@/lib/actions/folders'
import { getChildPages, createPage, updatePage, linkDailyVisualChildren } from '@/lib/actions/pages'
import { NoteFullView } from './note-full-view'
import { db, pages } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

interface NotePageProps {
  params: Promise<{ slug: string; noteId: string }>
}

export default async function NotePage({ params }: NotePageProps) {
  const { slug, noteId } = await params
  const session = await requireAuth()
  const folder = await getFolderBySlug(slug)

  if (!folder) {
    notFound()
  }

  // Get the note
  let [note] = await db
    .select()
    .from(pages)
    .where(
      and(
        eq(pages.id, noteId),
        eq(pages.userId, session.id)
      )
    )
    .limit(1)

  if (!note) {
    notFound()
  }

  // Get child pages (content lines)
  let childPages = await getChildPages(noteId)

  // Migration: if note has no children but has dailyDate,
  // try to find and link "visual children" from the daily flat list.
  // This handles the case where a page was created in the daily view
  // with indented content, then tagged with #folder-name.
  if (childPages.length === 0 && note.dailyDate) {
    childPages = await linkDailyVisualChildren(noteId)
  }

  // Migration: if note has multi-line content but no children,
  // split first line as title and create child pages for the rest
  if (childPages.length === 0 && note.content.includes('\n')) {
    const lines = note.content.split('\n')
    const title = lines[0]
    const bodyLines = lines.slice(1)

    // Update note content to title only
    note = await updatePage(note.id, { content: title })

    // Create child pages for remaining lines
    const newChildren = []
    let order = 0
    for (const line of bodyLines) {
      if (line.trim()) {
        const child = await createPage({
          content: line.trimStart(),
          indent: 0,
          parentPageId: note.id,
          order: order++,
        })
        newChildren.push(child)
      }
    }
    childPages = newChildren
  }

  return (
    <NoteFullView
      note={note}
      childPages={childPages}
      folder={folder}
      folderSlug={slug}
    />
  )
}
