import { NoteFullView } from './note-full-view'

export const dynamic = 'force-dynamic'

interface NotePageProps {
  params: Promise<{ slug: string; noteId: string }>
}

export default async function NotePage({ params }: NotePageProps) {
  const { slug, noteId } = await params
  return <NoteFullView noteId={noteId} folderSlug={slug} />
}
