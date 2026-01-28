'use server'

import { db, users } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export interface CalendarEvent {
  uid: string
  title: string
  start: string // ISO string
  end: string   // ISO string
  description?: string
  allDay: boolean
}

// In-memory cache: userId -> { events, fetchedAt }
const cache = new Map<string, { events: CalendarEvent[], fetchedAt: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function getIcalUrl(): Promise<string | null> {
  const session = await requireAuth()
  const [user] = await db.select({ icalUrl: users.icalUrl }).from(users).where(eq(users.id, session.id)).limit(1)
  return user?.icalUrl ?? null
}

export async function saveIcalUrl(url: string): Promise<void> {
  const session = await requireAuth()
  const trimmed = url.trim()
  
  await db.update(users).set({ 
    icalUrl: trimmed || null, 
    updatedAt: new Date() 
  }).where(eq(users.id, session.id))
  
  // Clear cache
  cache.delete(session.id)
  revalidatePath('/')
}

export async function getCalendarEvents(dateStr: string): Promise<CalendarEvent[]> {
  const session = await requireAuth()
  
  const [user] = await db.select({ icalUrl: users.icalUrl }).from(users).where(eq(users.id, session.id)).limit(1)
  if (!user?.icalUrl) return []
  
  // Check cache
  const cached = cache.get(session.id)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return filterEventsForDate(cached.events, dateStr)
  }
  
  // Fetch and parse
  try {
    const ical = await import('node-ical')
    const data = await ical.async.fromURL(user.icalUrl)
    
    const events: CalendarEvent[] = []
    for (const [, value] of Object.entries(data)) {
      if (value.type !== 'VEVENT') continue
      const ev = value as any
      
      const start = ev.start ? new Date(ev.start) : null
      const end = ev.end ? new Date(ev.end) : null
      if (!start) continue
      
      // Handle recurring events - node-ical expands recurrences
      // Check if it's an all-day event
      const allDay = ev.start?.dateOnly === true || 
        (ev.start && ev.end && (end!.getTime() - start.getTime()) >= 86400000 && 
         start.getHours() === 0 && start.getMinutes() === 0)
      
      events.push({
        uid: ev.uid || String(Math.random()),
        title: ev.summary || 'Untitled',
        start: start.toISOString(),
        end: end ? end.toISOString() : new Date(start.getTime() + 3600000).toISOString(),
        description: ev.description,
        allDay,
      })
      
      // Handle recurrence instances
      if (ev.rrule) {
        try {
          // Get occurrences for next 90 days
          const now = new Date()
          const future = new Date(now.getTime() + 90 * 86400000)
          const dates = ev.rrule.between(new Date(now.getTime() - 30 * 86400000), future)
          const duration = end ? end.getTime() - start.getTime() : 3600000
          
          for (const d of dates) {
            const occStart = new Date(d)
            // Skip if same as original
            if (Math.abs(occStart.getTime() - start.getTime()) < 60000) continue
            
            events.push({
              uid: `${ev.uid}-${occStart.toISOString()}`,
              title: ev.summary || 'Untitled',
              start: occStart.toISOString(),
              end: new Date(occStart.getTime() + duration).toISOString(),
              description: ev.description,
              allDay,
            })
          }
        } catch {
          // rrule parsing failed, skip recurrences
        }
      }
    }
    
    cache.set(session.id, { events, fetchedAt: Date.now() })
    return filterEventsForDate(events, dateStr)
  } catch (error) {
    console.error('Failed to fetch iCal:', error)
    return []
  }
}

function filterEventsForDate(events: CalendarEvent[], dateStr: string): CalendarEvent[] {
  // dateStr is YYYY-MM-DD
  const dayStart = new Date(dateStr + 'T00:00:00')
  const dayEnd = new Date(dateStr + 'T23:59:59')
  
  return events
    .filter(ev => {
      const start = new Date(ev.start)
      const end = new Date(ev.end)
      // Event overlaps with this day
      return start <= dayEnd && end >= dayStart
    })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
}
