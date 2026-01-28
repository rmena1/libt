'use client'

import { useState, useMemo } from 'react'
import { cn, today } from '@/lib/utils'
import { CalendarTimeline } from './calendar-timeline'
import { CalendarSettings } from './calendar-settings'

interface MiniCalendarProps {
  currentDate: string
  datesWithNotes: Set<string>
  onDateSelect: (date: string) => void
}

const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

function pad(n: number) {
  return n.toString().padStart(2, '0')
}

function getMonthData(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()

  let startDow = firstDay.getDay() - 1
  if (startDow < 0) startDow = 6

  const weeks: (number | null)[][] = []
  let week: (number | null)[] = new Array(startDow).fill(null)

  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d)
    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null)
    weeks.push(week)
  }

  return { weeks, year, month, daysInMonth }
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function MiniCalendar({ currentDate, datesWithNotes, onDateSelect }: MiniCalendarProps) {
  const todayStr = today()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [viewYear, viewMonth] = useMemo(() => {
    const [y, m] = currentDate.split('-').map(Number)
    return [y, m - 1]
  }, [currentDate])

  const [year, setYear] = useState(viewYear)
  const [month, setMonth] = useState(viewMonth)

  const { weeks } = useMemo(() => getMonthData(year, month), [year, month])

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const makeDate = (day: number) => `${year}-${pad(month + 1)}-${pad(day)}`

  return (
    <div className="hidden md:block fixed top-0 right-0 z-40 bg-gray-50/60 backdrop-blur-xl shadow-[-1px_0_4px_rgba(0,0,0,0.03)] p-6 pt-7 w-[240px] h-screen select-none overflow-y-auto scrollbar-thin">
      {/* Month Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          className="p-1.5 rounded-lg hover:bg-gray-100/80 text-gray-400 hover:text-gray-600 transition-all duration-200 active:scale-90"
          aria-label="Previous month"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="text-[13px] font-semibold text-gray-800 tracking-[-0.01em]">
          {MONTH_NAMES[month]} {year}
        </span>
        <button
          onClick={nextMonth}
          className="p-1.5 rounded-lg hover:bg-gray-100/80 text-gray-400 hover:text-gray-600 transition-all duration-200 active:scale-90"
          aria-label="Next month"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-2">
        {DAYS.map(d => (
          <div key={d} className="text-[10px] text-gray-400/70 text-center font-medium tracking-wider uppercase">{d}</div>
        ))}
      </div>

      {/* Weeks */}
      <div className="space-y-[3px]">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-0">
            {week.map((day, di) => {
              if (day === null) return <div key={di} />
              const dateStr = makeDate(day)
              const isSelected = dateStr === currentDate
              const isToday = dateStr === todayStr
              const hasNotes = datesWithNotes.has(dateStr)

              return (
                <button
                  key={di}
                  onClick={() => onDateSelect(dateStr)}
                  className={cn(
                    'relative w-[28px] h-[28px] mx-auto flex items-center justify-center text-[11.5px] rounded-full transition-all duration-150',
                    isSelected
                      ? 'bg-gray-900 text-white font-semibold shadow-sm shadow-gray-900/20'
                      : isToday
                        ? 'ring-[1.5px] ring-gray-400/30 text-gray-900 font-semibold hover:bg-white/80'
                        : 'text-gray-600 hover:bg-white/70',
                  )}
                >
                  {day}
                  {hasNotes && !isSelected && (
                    <span className="absolute bottom-[1px] left-1/2 -translate-x-1/2 w-[3px] h-[3px] rounded-full bg-gray-400/50" />
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Calendar Timeline */}
      <CalendarTimeline
        currentDate={currentDate}
        onSettingsClick={() => setSettingsOpen(true)}
      />

      {/* Settings Modal */}
      <CalendarSettings
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  )
}
