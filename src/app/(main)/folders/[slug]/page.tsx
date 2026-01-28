import { notFound } from 'next/navigation'
import { getFolderBySlug, getFolderPages, getChildFolders, getFolderBreadcrumbs } from '@/lib/actions/folders'
import { FolderDetailView } from './folder-detail-view'

export const dynamic = 'force-dynamic'

interface FolderPageProps {
  params: Promise<{ slug: string }>
}

export default async function FolderPage({ params }: FolderPageProps) {
  const { slug } = await params
  const folder = await getFolderBySlug(slug)
  
  if (!folder) {
    notFound()
  }
  
  const [pages, childFolders, breadcrumbs] = await Promise.all([
    getFolderPages(folder.id),
    getChildFolders(folder.id),
    getFolderBreadcrumbs(folder.id),
  ])
  
  return (
    <FolderDetailView
      folder={folder}
      pages={pages}
      childFolders={childFolders}
      breadcrumbs={breadcrumbs}
    />
  )
}
