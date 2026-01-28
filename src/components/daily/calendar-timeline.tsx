'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { type CalendarEvent } from '@/lib/actions/calendar'
import { getCalendarEvents } from '@/lib/actions/calendar'

interface CalendarTimelineProps {
  currentDate: string
  onSettingsClick: () => void
}

const START_HOUR = 6
const END_HOUR = 24
const TOTAL_HOURS = END_HOUR - START_HOUR
const HOUR_HEIGHT = 28

function formatTime(date: Date): string {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

export function CalendarTimeline({ currentDate, onSettingsClick }: CalendarTimelineProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [hasUrl, setHasUrl] = useState<boolean | null>(null)
  const [loaded, setLoaded] = useState(false)

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    setLoaded(false)
    try {
      const evts = await getCalendarEvents(currentDate)
      setEvents(evts)
      setHasUrl(true)
    } catch {
      setEvents([])
      setHasUrl(false)
    } finally {
      setLoading(false)
      setTimeout(() => setLoaded(true), 50)
    }
  }, [currentDate])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  useEffect(() => {
    import('@/lib/actions/calendar').then(mod => mod.isGoogleConnected()).then(connected => {
      setHasUrl(connected)
    }).catch(() => setHasUrl(false))
  }, [])

  if (hasUrl === false) {
    return (
      <div className="mt-5 px-1">
        <button
          onClick={onSettingsClick}
          className="w-full text-left text-[11px] text-gray-400 hover:text-gray-600 transition-all duration-200 p-2.5 rounded-xl hover:bg-gray-50/80 group"
        >
          <span className="group-hover:translate-x-0.5 inline-block transition-transform duration-200">📅 Connect Google Calendar →</span>
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="mt-5 px-1">
        <div className="text-[10px] text-gray-300 text-center py-4 animate-pulse">Loading events...</div>
      </div>
    )
  }

  const timedEvents = events.filter(e => !e.allDay)
  const allDayEvents = events.filter(e => e.allDay)

  return (
    <div className={`mt-6 pt-4 transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}>
      {/* Subtle separator */}
      <div className="h-px bg-gradient-to-r from-transparent via-gray-200/60 to-transparent mb-4" />

      {/* Header */}
      <div className="flex items-center justify-between px-0.5 mb-2.5">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.08em]">Events</span>
        <button
          onClick={onSettingsClick}
          className="p-1 rounded-md text-gray-300 hover:text-gray-500 hover:bg-gray-100/60 transition-all duration-200"
          title="Calendar settings"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* All-day events */}
      {allDayEvents.map((ev, i) => (
        <div
          key={ev.uid}
          className="mx-0.5 mb-1.5 px-2.5 py-1.5 bg-blue-50/80 border border-blue-100/60 rounded-lg text-[10px] text-blue-600 font-medium truncate shadow-sm shadow-blue-100/20 transition-all duration-200 hover:bg-blue-50"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          {ev.title}
        </div>
      ))}

      {timedEvents.length === 0 && allDayEvents.length === 0 && (
        <div className="text-[10px] text-gray-300 text-center py-4 italic">No events today</div>
      )}

      {/* Timeline */}
      {timedEvents.length > 0 && (
        <TimelineGrid timedEvents={timedEvents} />
      )}
    </div>
  )
}

function TimelineGrid({ timedEvents }: { timedEvents: CalendarEvent[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    if (scrollRef.current) {
      const now = new Date()
      const hour = now.getHours() + now.getMinutes() / 60
      if (hour >= START_HOUR && hour <= END_HOUR) {
        const top = (hour - START_HOUR) * HOUR_HEIGHT
        const containerHeight = scrollRef.current.clientHeight
        scrollRef.current.scrollTop = Math.max(0, top - containerHeight / 2)
      }
    }
  }, [])
  
  return (
    <div ref={scrollRef} className="relative overflow-y-auto max-h-[280px] mt-1.5 rounded-lg" style={{ scrollbarWidth: 'thin' }}>
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
              <span className="text-[9px] text-gray-300/80 w-6 flex-shrink-0 -mt-1.5 text-right pr-1.5 font-medium tabular-nums">
                {hour < 24 ? `${hour}` : '0'}
              </span>
              <div className="flex-1 border-t border-gray-100/80" />
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
          const height = Math.max((clampedEnd - clampedStart) * HOUR_HEIGHT, 16)
          
          return (
            <div
              key={ev.uid}
              className="absolute rounded-md bg-blue-50/90 border border-blue-100/50 border-l-[2.5px] border-l-blue-400 overflow-hidden cursor-default hover:bg-blue-100/60 transition-colors duration-150 shadow-sm shadow-blue-100/10"
              style={{
                top: `${top}px`,
                height: `${height}px`,
                left: '28px',
                right: '2px',
              }}
              title={`${formatTime(start)} – ${formatTime(end)}\n${ev.title}`}
            >
              <div className="px-1.5 py-1">
                <div className="text-[9px] text-blue-400 leading-none font-medium tabular-nums">{formatTime(start)}</div>
                <div className="text-[10px] text-blue-700 font-semibold leading-tight truncate mt-0.5">{ev.title}</div>
              </div>
            </div>
          )
        })}

        {/* Current time indicator */}
        <CurrentTimeIndicator />
      </div>
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
    <div className="absolute left-5 right-0 flex items-center pointer-events-none" style={{ top: `${top}px` }}>
      <div className="w-2 h-2 rounded-full bg-red-400 shadow-sm shadow-red-400/30 -ml-1" />
      <div className="flex-1 h-px bg-gradient-to-r from-red-400 via-red-300 to-transparent" />
    </div>
  )
}
