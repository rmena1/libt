import { getDailyPagesRange } from '@/lib/actions/pages'
import { DailyNotes } from '@/components/daily/daily-notes'
import { today, addDays } from '@/lib/utils'

export default async function HomePage() {
  // Load initial range: 7 days before today to 7 days after
  const todayDate = today()
  const startDate = addDays(todayDate, -7)
  const endDate = addDays(todayDate, 7)
  
  const initialPages = await getDailyPagesRange(startDate, endDate)
  
  return (
    <DailyNotes
      initialPages={initialPages}
      initialStartDate={startDate}
      initialEndDate={endDate}
    />
  )
}
