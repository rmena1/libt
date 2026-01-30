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

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI!
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'

export async function getGoogleAuthUrl(): Promise<string> {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar.events.readonly',
    access_type: 'offline',
    prompt: 'consent',
  })
  return `https://accounts.google.com/o/oauth2/auth?${params.toString()}`
}

export async function handleGoogleCallback(code: string): Promise<{ success: boolean; error?: string }> {
  const session = await requireAuth()

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('Google token exchange failed:', err)
    return { success: false, error: 'Failed to exchange code for tokens' }
  }

  const data = await res.json()
  const expiresAt = Math.floor(Date.now() / 1000) + (data.expires_in || 3600)

  await db.update(users).set({
    googleAccessToken: data.access_token,
    googleRefreshToken: data.refresh_token || null,
    googleTokenExpiry: expiresAt,
    updatedAt: Date.now(),
  }).where(eq(users.id, session.id))

  return { success: true }
}

export async function disconnectGoogle(): Promise<void> {
  const session = await requireAuth()
  await db.update(users).set({
    googleAccessToken: null,
    googleRefreshToken: null,
    googleTokenExpiry: null,
    updatedAt: Date.now(),
  }).where(eq(users.id, session.id))
  revalidatePath('/')
}

export async function isGoogleConnected(): Promise<boolean> {
  const session = await requireAuth()
  const [user] = await db.select({
    token: users.googleRefreshToken,
  }).from(users).where(eq(users.id, session.id)).limit(1)
  return !!user?.token
}

async function getValidAccessToken(userId: string): Promise<string | null> {
  const [user] = await db.select({
    accessToken: users.googleAccessToken,
    refreshToken: users.googleRefreshToken,
    expiry: users.googleTokenExpiry,
  }).from(users).where(eq(users.id, userId)).limit(1)

  if (!user?.refreshToken) return null

  // If access token is still valid (with 60s buffer)
  if (user.accessToken && user.expiry && user.expiry > Math.floor(Date.now() / 1000) + 60) {
    return user.accessToken
  }

  // Refresh the token
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: user.refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) {
    console.error('Token refresh failed:', await res.text())
    return null
  }

  const data = await res.json()
  const expiresAt = Math.floor(Date.now() / 1000) + (data.expires_in || 3600)

  await db.update(users).set({
    googleAccessToken: data.access_token,
    googleTokenExpiry: expiresAt,
    updatedAt: Date.now(),
  }).where(eq(users.id, userId))

  return data.access_token
}

export async function getCalendarEvents(dateStr: string): Promise<CalendarEvent[]> {
  const session = await requireAuth()
  const accessToken = await getValidAccessToken(session.id)
  if (!accessToken) return []

  // Parse date in the user's timezone (America/Santiago) to get correct UTC boundaries
  // dateStr is YYYY-MM-DD; we need the start/end of that day in Chile time
  const [year, month, day] = dateStr.split('-').map(Number)
  // Create a date formatter that gives us the UTC offset for the target date in Chile
  const tzDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0)) // noon UTC as reference
  const chileFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Santiago',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
    timeZoneName: 'longOffset',
  })
  // Extract the UTC offset for this date in Chile (handles DST correctly)
  const parts = chileFmt.formatToParts(tzDate)
  const offsetPart = parts.find(p => p.type === 'timeZoneName')?.value ?? 'GMT-03:00'
  // offsetPart looks like "GMT-03:00" or "GMT-04:00"
  const offsetMatch = offsetPart.match(/GMT([+-])(\d{2}):(\d{2})/)
  let offsetMinutes = 0
  if (offsetMatch) {
    const sign = offsetMatch[1] === '+' ? 1 : -1
    offsetMinutes = sign * (parseInt(offsetMatch[2]) * 60 + parseInt(offsetMatch[3]))
  }
  // Start of day in Chile = midnight Chile time = midnight - offset in UTC
  const startUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - offsetMinutes * 60000)
  const endUtc = new Date(Date.UTC(year, month - 1, day, 23, 59, 59) - offsetMinutes * 60000)
  const timeMin = startUtc.toISOString()
  const timeMax = endUtc.toISOString()

  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '50',
  })

  try {
    const res = await fetch(`${CALENDAR_API}?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) {
      console.error('Google Calendar API error:', res.status, await res.text())
      return []
    }

    const data = await res.json()
    return (data.items || []).map((item: Record<string, unknown>): CalendarEvent => {
      const startObj = item.start as Record<string, string> | undefined
      const endObj = item.end as Record<string, string> | undefined
      const allDay = !!startObj?.date
      return {
        uid: item.id as string,
        title: (item.summary as string) || 'Untitled',
        start: startObj?.dateTime || startObj?.date || '',
        end: endObj?.dateTime || endObj?.date || '',
        description: item.description as string | undefined,
        allDay,
      }
    })
  } catch (error) {
    console.error('Failed to fetch calendar events:', error)
    return []
  }
}
