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
    const response = await fetch(user.icalUrl, { 
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'libt-calendar/1.0' }
    })
    if (!response.ok) {
      console.error(`iCal fetch failed: ${response.status}`)
      return []
    }
    const text = await response.text()
    const events = parseIcal(text)
    
    cache.set(session.id, { events, fetchedAt: Date.now() })
    return filterEventsForDate(events, dateStr)
  } catch (error) {
    console.error('Failed to fetch iCal:', error)
    return []
  }
}

/**
 * Lightweight iCal parser — no external dependencies.
 * Handles VEVENT with DTSTART, DTEND, SUMMARY, DESCRIPTION, RRULE (daily/weekly/monthly/yearly).
 */
function parseIcal(text: string): CalendarEvent[] {
  const events: CalendarEvent[] = []
  
  // Unfold lines (RFC 5545: lines starting with space/tab are continuations)
  const unfolded = text.replace(/\r\n[ \t]/g, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = unfolded.split('\n')
  
  let inEvent = false
  let ev: Record<string, string> = {}
  
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed === 'BEGIN:VEVENT') {
      inEvent = true
      ev = {}
      continue
    }
    if (trimmed === 'END:VEVENT') {
      inEvent = false
      const parsed = parseEvent(ev)
      if (parsed) {
        events.push(...parsed)
      }
      continue
    }
    if (inEvent) {
      const colonIdx = trimmed.indexOf(':')
      if (colonIdx > 0) {
        const key = trimmed.substring(0, colonIdx)
        const value = trimmed.substring(colonIdx + 1)
        // Use the property name without parameters (e.g., DTSTART;VALUE=DATE -> DTSTART)
        const propName = key.split(';')[0]
        ev[propName] = value
        // Also store with params for date type detection
        if (key !== propName) {
          ev[`_params_${propName}`] = key
        }
      }
    }
  }
  
  return events
}

function parseIcalDate(value: string, paramsKey?: string): { date: Date, dateOnly: boolean } | null {
  if (!value) return null
  
  const isDateOnly = paramsKey?.includes('VALUE=DATE') || /^\d{8}$/.test(value)
  
  if (isDateOnly) {
    // YYYYMMDD
    const y = parseInt(value.substring(0, 4))
    const m = parseInt(value.substring(4, 6)) - 1
    const d = parseInt(value.substring(6, 8))
    return { date: new Date(y, m, d), dateOnly: true }
  }
  
  // YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/)
  if (match) {
    const [, yr, mo, dy, hr, mn, sc, z] = match
    if (z) {
      return { date: new Date(Date.UTC(+yr, +mo - 1, +dy, +hr, +mn, +sc)), dateOnly: false }
    }
    return { date: new Date(+yr, +mo - 1, +dy, +hr, +mn, +sc), dateOnly: false }
  }
  
  // Fallback: try native parsing
  const d = new Date(value)
  if (!isNaN(d.getTime())) {
    return { date: d, dateOnly: false }
  }
  
  return null
}

function parseEvent(ev: Record<string, string>): CalendarEvent[] | null {
  const startParsed = parseIcalDate(ev.DTSTART, ev._params_DTSTART)
  if (!startParsed) return null
  
  const endParsed = parseIcalDate(ev.DTEND, ev._params_DTEND)
  const duration = ev.DURATION ? parseDuration(ev.DURATION) : null
  
  const start = startParsed.date
  let end: Date
  if (endParsed) {
    end = endParsed.date
  } else if (duration) {
    end = new Date(start.getTime() + duration)
  } else {
    end = new Date(start.getTime() + (startParsed.dateOnly ? 86400000 : 3600000))
  }
  
  const allDay = startParsed.dateOnly
  const title = (ev.SUMMARY || 'Untitled').replace(/\\,/g, ',').replace(/\\n/g, ' ').replace(/\\/g, '')
  const description = ev.DESCRIPTION?.replace(/\\,/g, ',').replace(/\\n/g, '\n').replace(/\\/g, '')
  const uid = ev.UID || String(Math.random())
  
  const baseEvent: CalendarEvent = {
    uid,
    title,
    start: start.toISOString(),
    end: end.toISOString(),
    description,
    allDay,
  }
  
  const results: CalendarEvent[] = [baseEvent]
  
  // Handle RRULE — expand occurrences for ±90 days from now
  if (ev.RRULE) {
    const occurrences = expandRrule(ev.RRULE, start, end.getTime() - start.getTime())
    for (const occ of occurrences) {
      results.push({
        uid: `${uid}-${occ.start.toISOString()}`,
        title,
        start: occ.start.toISOString(),
        end: occ.end.toISOString(),
        description,
        allDay,
      })
    }
  }
  
  return results
}

function parseDuration(dur: string): number | null {
  // P[n]W or P[n]DT[n]H[n]M[n]S
  const match = dur.match(/^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/)
  if (!match) return null
  const [, w, d, h, m, s] = match
  return ((+(w || 0)) * 7 * 86400 + (+(d || 0)) * 86400 + (+(h || 0)) * 3600 + (+(m || 0)) * 60 + (+(s || 0))) * 1000
}

function expandRrule(rrule: string, originalStart: Date, durationMs: number): { start: Date, end: Date }[] {
  const parts: Record<string, string> = {}
  for (const part of rrule.split(';')) {
    const [k, v] = part.split('=')
    if (k && v) parts[k] = v
  }
  
  const freq = parts.FREQ
  if (!freq) return []
  
  const interval = parseInt(parts.INTERVAL || '1')
  const count = parts.COUNT ? parseInt(parts.COUNT) : undefined
  const until = parts.UNTIL ? parseIcalDate(parts.UNTIL)?.date : undefined
  
  const now = new Date()
  const rangeStart = new Date(now.getTime() - 90 * 86400000)
  const rangeEnd = new Date(now.getTime() + 90 * 86400000)
  const maxOccurrences = count || 365 // safety limit
  
  const results: { start: Date, end: Date }[] = []
  let current = new Date(originalStart)
  let generated = 0
  
  for (let i = 0; i < 1000 && generated < maxOccurrences; i++) {
    // Advance to next occurrence
    if (i > 0) {
      switch (freq) {
        case 'DAILY':
          current = new Date(current.getTime() + interval * 86400000)
          break
        case 'WEEKLY':
          current = new Date(current.getTime() + interval * 7 * 86400000)
          break
        case 'MONTHLY': {
          const next = new Date(current)
          next.setMonth(next.getMonth() + interval)
          current = next
          break
        }
        case 'YEARLY': {
          const next = new Date(current)
          next.setFullYear(next.getFullYear() + interval)
          current = next
          break
        }
        default:
          return results
      }
    }
    
    if (until && current > until) break
    if (current > rangeEnd) break
    
    // Skip the original event (already included)
    if (Math.abs(current.getTime() - originalStart.getTime()) < 60000) continue
    
    if (current >= rangeStart) {
      results.push({
        start: new Date(current),
        end: new Date(current.getTime() + durationMs),
      })
      generated++
    }
  }
  
  return results
}

function filterEventsForDate(events: CalendarEvent[], dateStr: string): CalendarEvent[] {
  const dayStart = new Date(dateStr + 'T00:00:00')
  const dayEnd = new Date(dateStr + 'T23:59:59')
  
  return events
    .filter(ev => {
      const start = new Date(ev.start)
      const end = new Date(ev.end)
      return start <= dayEnd && end >= dayStart
    })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
}
