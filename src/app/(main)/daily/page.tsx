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

  const targetDate = typeof params.date === 'string' ? params.date : null
  const todayDate = today()
  const centerDate = targetDate || todayDate
  const startDate = addDays(centerDate, -7)
  const endDate = addDays(centerDate, 7)
  
  // Only fetch folders for autocomplete (pages now come from Zero)
  const initialFolders = await getAllFolders()
  
  return (
    <DailyNotes
      initialStartDate={startDate}
      initialEndDate={endDate}
      initialFolders={initialFolders}
      scrollToDate={targetDate}
    />
  )
}
