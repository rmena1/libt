import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/sidebar/sidebar'

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
    <div className="min-h-screen bg-white">
      <Sidebar email={session.email} />
      
      {/* Main content */}
      <main className="lg:pl-64">
        {/* Mobile header spacer */}
        <div className="h-14 lg:h-0" />
        
        <div className="min-h-[calc(100vh-3.5rem)] lg:min-h-screen">
          {children}
        </div>
      </main>
    </div>
  )
}
