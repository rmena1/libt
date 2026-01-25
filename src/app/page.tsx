import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'

export default async function RootPage() {
  const session = await getSession()
  
  if (!session) {
    redirect('/login')
  }
  
  // Redirect to daily notes (handled by (main) group)
  // Since we can't redirect to same path, we'll render the daily notes here
  redirect('/daily')
}
