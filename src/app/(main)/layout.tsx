import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/sidebar/sidebar'
import { BottomNav } from '@/components/navigation/bottom-nav'
import { SearchModal } from '@/components/search/search-modal'
import { getFolderTree } from '@/lib/actions/folders'
import { getStarredPages } from '@/lib/actions/pages'

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  
  if (!session) {
    redirect('/login')
  }
  
  // Load folder tree and starred pages for sidebar
  let folderTree: any[]
  let starredPages: any[]
  try {
    folderTree = await getFolderTree()
  } catch {
    folderTree = []
  }
  try {
    starredPages = await getStarredPages()
  } catch {
    starredPages = []
  }
  
  return (
    <>
      <style>{`
        .main-layout-content {
          min-height: 100vh;
          padding-bottom: 60px;
        }
        .main-layout-main {
          min-height: 100vh;
        }
        @media (min-width: 768px) {
          .main-layout-main {
            padding-left: 256px;
          }
          .main-layout-content {
            padding-bottom: 0;
          }
        }
      `}</style>
      <div style={{ minHeight: '100vh', backgroundColor: 'white' }}>
        <Sidebar email={session.email} folderTree={folderTree} starredPages={starredPages} />
        <BottomNav />
        <SearchModal />
        
        <main className="main-layout-main">
          <div className="main-layout-content">
            {children}
          </div>
        </main>
      </div>
    </>
  )
}
