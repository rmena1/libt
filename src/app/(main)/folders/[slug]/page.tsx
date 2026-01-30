import { FolderDetailView } from './folder-detail-view'

export const dynamic = 'force-dynamic'

interface FolderPageProps {
  params: Promise<{ slug: string }>
}

export default async function FolderPage({ params }: FolderPageProps) {
  const { slug } = await params
  return <FolderDetailView folderSlug={slug} />
}
