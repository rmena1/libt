import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/sidebar/sidebar'
import { BottomNav } from '@/components/navigation/bottom-nav'
import { SearchModal } from '@/components/search/search-modal'
import { ZeroAppProvider } from '@/zero/provider'

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  
  if (!session) {
    redirect('/login')
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
      <ZeroAppProvider userID={session.id}>
        <div style={{ minHeight: '100vh', backgroundColor: 'white' }}>
          <Sidebar email={session.email} />
          <BottomNav />
          <SearchModal />
          
          <main className="main-layout-main">
            <div className="main-layout-content">
              {children}
            </div>
          </main>
        </div>
      </ZeroAppProvider>
    </>
  )
}
