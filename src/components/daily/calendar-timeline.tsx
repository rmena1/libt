'use client'

import { useState, useEffect, useCallback } from 'react'
import { type CalendarEvent } from '@/lib/actions/calendar'
import { getCalendarEvents } from '@/lib/actions/calendar'

interface CalendarTimelineProps {
  currentDate: string // YYYY-MM-DD
  onSettingsClick: () => void
}

const START_HOUR = 6
const END_HOUR = 24
const TOTAL_HOURS = END_HOUR - START_HOUR
const HOUR_HEIGHT = 28 // px per hour

function formatTime(date: Date): string {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

export function CalendarTimeline({ currentDate, onSettingsClick }: CalendarTimelineProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [hasUrl, setHasUrl] = useState<boolean | null>(null)

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const evts = await getCalendarEvents(currentDate)
      setEvents(evts)
      setHasUrl(true)
    } catch {
      setEvents([])
      setHasUrl(false)
    } finally {
      setLoading(false)
    }
  }, [currentDate])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  // Check if Google Calendar is connected
  useEffect(() => {
    import('@/lib/actions/calendar').then(mod => mod.isGoogleConnected()).then(connected => {
      setHasUrl(connected)
    }).catch(() => setHasUrl(false))
  }, [])

  if (hasUrl === false) {
    return (
      <div className="mt-3 px-1">
        <button
          onClick={onSettingsClick}
          className="w-full text-left text-[11px] text-gray-400 hover:text-gray-600 transition-colors p-2 rounded hover:bg-gray-50"
        >
          📅 Connect Google Calendar →
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="mt-3 px-1">
        <div className="text-[10px] text-gray-300 text-center py-2">Loading events...</div>
      </div>
    )
  }

  const timedEvents = events.filter(e => !e.allDay)
  const allDayEvents = events.filter(e => e.allDay)

  return (
    <div className="mt-3 border-t border-gray-100 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between px-1 mb-1">
        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Events</span>
        <button
          onClick={onSettingsClick}
          className="text-gray-300 hover:text-gray-500 transition-colors"
          title="Calendar settings"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* All-day events */}
      {allDayEvents.map(ev => (
        <div key={ev.uid} className="mx-1 mb-1 px-1.5 py-0.5 bg-blue-50 border-l-2 border-blue-300 rounded-r text-[10px] text-blue-700 truncate">
          {ev.title}
        </div>
      ))}

      {timedEvents.length === 0 && allDayEvents.length === 0 && (
        <div className="text-[10px] text-gray-300 text-center py-3">No events</div>
      )}

      {/* Timeline */}
      {timedEvents.length > 0 && (
        <div className="relative overflow-y-auto max-h-[280px] scrollbar-thin" style={{ scrollbarWidth: 'thin' }}>
          <div className="relative" style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT}px` }}>
            {/* Hour lines */}
            {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => {
              const hour = START_HOUR + i
              if (hour > END_HOUR) return null
              return (
                <div
                  key={hour}
                  className="absolute left-0 right-0 flex items-start"
                  style={{ top: `${i * HOUR_HEIGHT}px` }}
                >
                  <span className="text-[9px] text-gray-300 w-6 flex-shrink-0 -mt-1.5 text-right pr-1">
                    {hour < 24 ? `${hour}` : '0'}
                  </span>
                  <div className="flex-1 border-t border-gray-50" />
                </div>
              )
            })}

            {/* Event blocks */}
            {timedEvents.map(ev => {
              const start = new Date(ev.start)
              const end = new Date(ev.end)
              const startHour = start.getHours() + start.getMinutes() / 60
              const endHour = end.getHours() + end.getMinutes() / 60
              
              const clampedStart = Math.max(startHour, START_HOUR)
              const clampedEnd = Math.min(endHour || 24, END_HOUR)
              
              if (clampedEnd <= clampedStart) return null
              
              const top = (clampedStart - START_HOUR) * HOUR_HEIGHT
              const height = Math.max((clampedEnd - clampedStart) * HOUR_HEIGHT, 14)
              
              return (
                <div
                  key={ev.uid}
                  className="absolute rounded-sm bg-blue-100 border-l-2 border-blue-400 overflow-hidden cursor-default group"
                  style={{
                    top: `${top}px`,
                    height: `${height}px`,
                    left: '28px',
                    right: '2px',
                  }}
                  title={`${formatTime(start)} - ${formatTime(end)}\n${ev.title}`}
                >
                  <div className="px-1 py-0.5">
                    <div className="text-[9px] text-blue-500 leading-none">{formatTime(start)}</div>
                    <div className="text-[10px] text-blue-800 font-medium leading-tight truncate">{ev.title}</div>
                  </div>
                </div>
              )
            })}

            {/* Current time indicator */}
            <CurrentTimeIndicator />
          </div>
        </div>
      )}
    </div>
  )
}

function CurrentTimeIndicator() {
  const [now, setNow] = useState(new Date())
  
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])
  
  const hour = now.getHours() + now.getMinutes() / 60
  if (hour < START_HOUR || hour > END_HOUR) return null
  
  const top = (hour - START_HOUR) * HOUR_HEIGHT
  
  return (
    <div className="absolute left-6 right-0 flex items-center" style={{ top: `${top}px` }}>
      <div className="w-1.5 h-1.5 rounded-full bg-red-400 -ml-0.5" />
      <div className="flex-1 border-t border-red-400" />
    </div>
  )
}
