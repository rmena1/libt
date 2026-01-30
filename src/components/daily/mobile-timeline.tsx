'use client'

import { useRef, useEffect, useMemo, useState } from 'react'
import { cn, today, addDays } from '@/lib/utils'

interface MobileTimelineProps {
  currentDate: string
  datesWithNotes: Set<string>
  onDateSelect: (date: string) => void
}

const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

export function MobileTimeline({ currentDate, datesWithNotes, onDateSelect }: MobileTimelineProps) {
  const todayStr = today()
  const scrollRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLButtonElement>(null)

  // Generate 31 days centered on currentDate (±15)
  const dates = useMemo(() => {
    const result: string[] = []
    for (let i = -15; i <= 15; i++) {
      result.push(addDays(currentDate, i))
    }
    return result
  }, [currentDate])

  // Track previous date to distinguish user tap (handled in onClick) from scroll-detected changes
  const prevDateRef = useRef(currentDate)
  
  // Scroll the horizontal timeline to show the selected date pill,
  // but use 'instant' to avoid visual jank during rapid scroll detection
  useEffect(() => {
    if (prevDateRef.current !== currentDate && selectedRef.current && scrollRef.current) {
      const container = scrollRef.current
      const el = selectedRef.current
      const left = el.offsetLeft - container.clientWidth / 2 + el.clientWidth / 2
      container.scrollTo({ left, behavior: 'instant' })
    }
    prevDateRef.current = currentDate
  }, [currentDate])

  const [cy, cm] = currentDate.split('-').map(Number)

  return (
    <div className="md:hidden sticky top-0 z-30 bg-white border-b border-gray-100">
      {/* Month label */}
      <div className="px-4 pt-2 pb-1">
        <span className="text-xs font-medium text-gray-500">
          {MONTH_NAMES[cm - 1]} {cy}
        </span>
      </div>

      {/* Scrollable days */}
      <div
        ref={scrollRef}
        className="flex overflow-x-auto no-scrollbar px-2 pb-2 gap-1"
      >
        {dates.map(dateStr => {
          const d = new Date(dateStr + 'T12:00:00')
          const day = d.getDate()
          const dow = SHORT_DAYS[d.getDay()]
          const isSelected = dateStr === currentDate
          const isToday = dateStr === todayStr
          const hasNotes = datesWithNotes.has(dateStr)

          return (
            <button
              key={dateStr}
              ref={isSelected ? selectedRef : undefined}
              onClick={() => onDateSelect(dateStr)}
              className={cn(
                'flex-shrink-0 flex flex-col items-center w-10 py-1 rounded-lg transition-colors',
                isSelected ? 'bg-gray-900' : 'hover:bg-gray-100',
              )}
            >
              <span className={cn(
                'text-[10px] font-medium',
                isSelected ? 'text-gray-300' : 'text-gray-400',
              )}>
                {dow}
              </span>
              <span className={cn(
                'text-sm font-medium mt-0.5',
                isSelected ? 'text-white' : isToday ? 'text-gray-900' : 'text-gray-600',
              )}>
                {day}
              </span>
              {hasNotes && !isSelected && (
                <span className="w-1 h-1 rounded-full bg-gray-400 mt-0.5" />
              )}
              {isSelected && (
                <span className="w-1 h-1 rounded-full bg-gray-400 mt-0.5 opacity-0" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
