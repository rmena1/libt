'use client'

import { useRef, useEffect, useMemo, memo } from 'react'
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

export const MobileTimeline = memo(function MobileTimeline({ currentDate, datesWithNotes, onDateSelect }: MobileTimelineProps) {
  const todayStr = today()
  const scrollRef = useRef<HTMLDivElement>(null)
  const pillRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  // Generate a wide fixed range centered on today (±60 days) so the array
  // doesn't regenerate when currentDate changes — this preserves DOM elements
  // and allows CSS transitions to animate the selection change
  const dates = useMemo(() => {
    const t = today()
    const result: string[] = []
    for (let i = -60; i <= 60; i++) {
      result.push(addDays(t, i))
    }
    return result
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally empty — fixed range based on today

  // Smooth-scroll the timeline to center the selected date pill
  const prevDateRef = useRef(currentDate)
  useEffect(() => {
    const el = pillRefs.current.get(currentDate)
    const container = scrollRef.current
    if (!el || !container) return

    const left = el.offsetLeft - container.clientWidth / 2 + el.clientWidth / 2
    const isInitial = prevDateRef.current === currentDate
    container.scrollTo({ left, behavior: isInitial ? 'instant' : 'smooth' })
    prevDateRef.current = currentDate
  }, [currentDate])

  // Also do initial scroll on mount
  useEffect(() => {
    const el = pillRefs.current.get(currentDate)
    const container = scrollRef.current
    if (el && container) {
      const left = el.offsetLeft - container.clientWidth / 2 + el.clientWidth / 2
      container.scrollTo({ left, behavior: 'instant' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [cy, cm] = currentDate.split('-').map(Number)

  return (
    <div className="md:hidden sticky top-0 z-30 bg-white border-b border-gray-100">
      {/* Month label */}
      <div className="px-4 pt-2 pb-1">
        <span
          key={`${cy}-${cm}`}
          className="text-xs font-medium text-gray-500 inline-block animate-fade-in"
        >
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
              ref={(el) => {
                if (el) pillRefs.current.set(dateStr, el)
              }}
              onClick={() => onDateSelect(dateStr)}
              className={cn(
                'flex-shrink-0 flex flex-col items-center w-10 py-1 rounded-lg transition-colors duration-200',
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
})
