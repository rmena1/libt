import { getDailyPagesRange, getProjectedTasksForRange, getChildPagesForParents } from '@/lib/actions/pages'
import { getAllFolders } from '@/lib/actions/folders'
import { DailyNotes } from '@/components/daily/daily-notes'
import { today, addDays } from '@/lib/utils'

export default async function HomePage() {
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
