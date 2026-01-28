import { getDailyPagesRange, getProjectedTasksForRange, getChildPagesForParents } from '@/lib/actions/pages'
import { getAllFolders } from '@/lib/actions/folders'
import { handleGoogleCallback } from '@/lib/actions/calendar'
import { DailyNotes } from '@/components/daily/daily-notes'
import { today, addDays } from '@/lib/utils'
import { redirect } from 'next/navigation'

export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const code = typeof params.code === 'string' ? params.code : undefined

  // Handle Google OAuth callback
  if (code) {
    await handleGoogleCallback(code)
    redirect('/daily')
  }
  // Load initial range: 7 days before today to 7 days after
  const todayDate = today()
  const startDate = addDays(todayDate, -7)
  const endDate = addDays(todayDate, 7)
  
  const [initialPages, initialProjectedTasks, initialFolders] = await Promise.all([
    getDailyPagesRange(startDate, endDate),
    getProjectedTasksForRange(startDate, endDate),
    getAllFolders(),
  ])
  
  // Fetch child pages for all top-level pages (folder notes have children)
  const allPageIds = Object.values(initialPages).flat().map(p => p.id)
  const initialChildPages = await getChildPagesForParents(allPageIds)
  
  return (
    <DailyNotes
      initialPages={initialPages}
      initialProjectedTasks={initialProjectedTasks}
      initialStartDate={startDate}
      initialEndDate={endDate}
      initialFolders={initialFolders}
      initialChildPages={initialChildPages}
    />
  )
}
