'use client'

import { useState, useMemo } from 'react'
import { cn, today } from '@/lib/utils'

interface MiniCalendarProps {
  currentDate: string // YYYY-MM-DD the user is viewing
  datesWithNotes: Set<string> // dates that have content
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

  // Monday = 0, Sunday = 6
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
    <div className="hidden md:block fixed top-0 right-0 z-40 bg-white border-l border-gray-100 p-5 pt-6 w-[220px] h-screen select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 text-sm">
          ←
        </button>
        <span className="text-xs font-medium text-gray-700">
          {MONTH_NAMES[month]} {year}
        </span>
        <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 text-sm">
          →
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => (
          <div key={d} className="text-[10px] text-gray-400 text-center font-medium">{d}</div>
        ))}
      </div>

      {/* Weeks */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7">
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
                  'relative w-7 h-7 flex items-center justify-center text-[11px] rounded-full transition-colors',
                  isSelected
                    ? 'bg-gray-900 text-white font-medium'
                    : isToday
                      ? 'ring-1 ring-gray-300 text-gray-900 font-medium hover:bg-gray-100'
                      : 'text-gray-600 hover:bg-gray-100',
                )}
              >
                {day}
                {hasNotes && !isSelected && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gray-400" />
                )}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
