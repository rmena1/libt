'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useZero, useQuery } from '@rocicorp/zero/react'
import type { ZeroPage } from '@/zero/hooks'
import { DayCard } from './day-card'
import { MobileAddBubble, MobileFAB } from './mobile-add-bubble'
import { MiniCalendar } from './mini-calendar'
import { MobileTimeline } from './mobile-timeline'
import { today, addDays, formatDateDisplay } from '@/lib/utils'

interface DailyNotesProps {
  initialStartDate: string
  initialEndDate: string
  initialFolders?: { id: string; name: string; slug: string }[]
  scrollToDate?: string | null
}

const DAYS_TO_LOAD = 7
const SCROLL_THRESHOLD = 300
const MAX_DAYS_LOADED = 21
const VIRTUALIZATION_WINDOW = 5

export function DailyNotes({
  initialStartDate,
  initialEndDate,
  initialFolders,
  scrollToDate,
}: DailyNotesProps) {
  const z = useZero()
  const [startDate, setStartDate] = useState(initialStartDate)
  const [endDate, setEndDate] = useState(initialEndDate)
  const [isLoadingPast, setIsLoadingPast] = useState(false)
  const [isLoadingFuture, setIsLoadingFuture] = useState(false)
  const [isTodayVisible, setIsTodayVisible] = useState(true)
  const [currentViewDate, setCurrentViewDate] = useState(today())
  const [isAddBubbleOpen, setIsAddBubbleOpen] = useState(false)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const todayRef = useRef<HTMLDivElement>(null)
  const dayRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const isProgrammaticScroll = useRef(false)
  const renderedDates = useRef<Set<string>>(new Set())
  
  const todayDate = today()
  
  // === CONSOLIDATED ZERO QUERIES ===
  // Single query for all pages in range (no per-day queries)
  const [allPagesInRange] = useQuery(
    z.query.page
      .where('dailyDate', '>=', startDate)
      .where('dailyDate', '<=', endDate)
      .where('parentPageId', 'IS', null)
  )
  
  // Query projected tasks for the date range
  const [projectedTasksRaw] = useQuery(
    z.query.page
      .where('isTask', true)
      .where('taskDate', '>=', startDate)
      .where('taskDate', '<=', endDate)
      .orderBy('taskDate', 'asc')
      .orderBy('createdAt', 'asc')
  )
  
  // Query overdue tasks (past date, not completed)
  const [overdueTasksRaw] = useQuery(
    z.query.page
      .where('isTask', true)
      .where('taskCompleted', false)
      .where('taskDate', '<', todayDate)
      .orderBy('taskDate', 'asc')
  )
  
  // Query child pages for parent pages in range (single consolidated query)
  // Stable parentIds: only recompute when the actual set of IDs changes,
  // not when page content changes (which triggers a new allPagesInRange array)
  const parentIdsKey = useMemo(() => {
    const ids = allPagesInRange.map(p => p.id)
    ids.sort()
    return ids.join(',')
  }, [allPagesInRange])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const parentIds = useMemo(() => allPagesInRange.map(p => p.id), [parentIdsKey])
  const [childPagesRaw] = useQuery(
    parentIds.length > 0
      ? z.query.page.where('parentPageId', 'IN', parentIds).orderBy('order', 'asc')
      : undefined
  )
  
  // === DERIVED DATA (useMemo for performance) ===
  
  // Group pages by dailyDate
  const pagesByDate = useMemo(() => {
    const map: Record<string, ZeroPage[]> = {}
    for (const page of allPagesInRange) {
      const d = page.dailyDate
      if (d) {
        if (!map[d]) map[d] = []
        map[d].push(page as ZeroPage)
      }
    }
    // Sort each date's pages
    for (const key in map) {
      map[key].sort((a, b) => {
        const orderDiff = (a.order ?? 0) - (b.order ?? 0)
        if (orderDiff !== 0) return orderDiff
        return (a.createdAt ?? 0) - (b.createdAt ?? 0)
      })
    }
    return map
  }, [allPagesInRange])
  
  // Group projected tasks by taskDate (excluding tasks on their own dailyDate)
  const projectedTasks = useMemo(() => {
    const map: Record<string, ZeroPage[]> = {}
    for (const task of projectedTasksRaw ?? []) {
      if (task.taskDate && task.taskDate !== task.dailyDate) {
        if (!map[task.taskDate]) map[task.taskDate] = []
        map[task.taskDate].push(task as ZeroPage)
      }
    }
    return map
  }, [projectedTasksRaw])
  
  // Group child pages by parentPageId
  const childPagesMap = useMemo(() => {
    const map: Record<string, ZeroPage[]> = {}
    for (const child of childPagesRaw ?? []) {
      const pid = child.parentPageId
      if (pid) {
        if (!map[pid]) map[pid] = []
        map[pid].push(child as ZeroPage)
      }
    }
    return map
  }, [childPagesRaw])
  
  // Dates that have notes
  const datesWithNotes = useMemo(() => {
    const set = new Set<string>()
    for (const page of allPagesInRange) {
      if (page.dailyDate) set.add(page.dailyDate)
    }
    return set
  }, [allPagesInRange])
  
  // === SCROLL & NAVIGATION ===
  
  useEffect(() => {
    setTimeout(() => {
      if (scrollToDate) {
        const el = dayRefs.current.get(scrollToDate)
        if (el) {
          el.scrollIntoView({ behavior: 'instant', block: 'start' })
          return
        }
      }
      todayRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' })
    }, 100)
  }, [scrollToDate]) // eslint-disable-line react-hooks/exhaustive-deps
  
  useEffect(() => {
    const todayElement = todayRef.current
    const container = containerRef.current
    if (!todayElement || !container) return
    
    const observer = new IntersectionObserver(
      ([entry]) => setIsTodayVisible(entry.isIntersecting),
      { root: container, threshold: 0.1 }
    )
    observer.observe(todayElement)
    return () => observer.disconnect()
  }, [])
  
  const scrollToToday = useCallback(() => {
    todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])
  
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    
    const observer = new IntersectionObserver(
      (entries) => {
        // Don't update view date during programmatic scrolls (calendar click)
        if (isProgrammaticScroll.current) return
        
        let topEntry: IntersectionObserverEntry | null = null
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (!topEntry || entry.boundingClientRect.top < topEntry.boundingClientRect.top) {
              topEntry = entry
            }
          }
        }
        if (topEntry) {
          const date = (topEntry.target as HTMLElement).dataset.date
          if (date) setCurrentViewDate(date)
        }
      },
      { root: container, rootMargin: '-10% 0px -70% 0px', threshold: 0 }
    )
    dayRefs.current.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [startDate, endDate])
  
  const handleDateSelect = useCallback((date: string) => {
    // Mark as programmatic scroll so IntersectionObserver won't fight us
    isProgrammaticScroll.current = true
    setCurrentViewDate(date)
    
    const el = dayRefs.current.get(date)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      // Clear flag after scroll settles
      setTimeout(() => { isProgrammaticScroll.current = false }, 800)
      return
    }
    
    const newStart = addDays(date, -7)
    const newEnd = addDays(date, 7)
    if (newStart < startDate) setStartDate(newStart)
    if (newEnd > endDate) setEndDate(newEnd)
    
    requestAnimationFrame(() => {
      setTimeout(() => {
        const el = dayRefs.current.get(date)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        setTimeout(() => { isProgrammaticScroll.current = false }, 800)
      }, 100)
    })
  }, [startDate, endDate])
  
  // === INFINITE SCROLL ===
  
  const loadPast = useCallback(() => {
    if (isLoadingPast) return
    setIsLoadingPast(true)
    setStartDate(prev => addDays(prev, -DAYS_TO_LOAD))
    setEndDate(prev => {
      const newStart = addDays(startDate, -DAYS_TO_LOAD)
      const totalDays = Math.round((new Date(prev).getTime() - new Date(newStart).getTime()) / 86400000)
      if (totalDays > MAX_DAYS_LOADED) return addDays(newStart, MAX_DAYS_LOADED)
      return prev
    })
    setTimeout(() => setIsLoadingPast(false), 200)
  }, [isLoadingPast, startDate])
  
  const loadFuture = useCallback(() => {
    if (isLoadingFuture) return
    setIsLoadingFuture(true)
    setEndDate(prev => addDays(prev, DAYS_TO_LOAD))
    setStartDate(prev => {
      const newEnd = addDays(endDate, DAYS_TO_LOAD)
      const totalDays = Math.round((new Date(newEnd).getTime() - new Date(prev).getTime()) / 86400000)
      if (totalDays > MAX_DAYS_LOADED) return addDays(newEnd, -MAX_DAYS_LOADED)
      return prev
    })
    setTimeout(() => setIsLoadingFuture(false), 200)
  }, [isLoadingFuture, endDate])
  
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    
    let ticking = false
    const handleScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const { scrollTop, scrollHeight, clientHeight } = container
        if (scrollTop < SCROLL_THRESHOLD) loadPast()
        if (scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD) loadFuture()
        ticking = false
      })
    }
    
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [loadPast, loadFuture])
  
  // === DATES ARRAY (memoized to avoid recreating on every render) ===
  
  const dates = useMemo(() => {
    const result: string[] = []
    let d = startDate
    while (d <= endDate) {
      result.push(d)
      d = addDays(d, 1)
    }
    return result
  }, [startDate, endDate])
  
  // Virtualization — expand-only: once a date is rendered, keep it rendered
  // to prevent height changes that cause scroll jumps
  const visibleDates = useMemo(() => {
    const currentIdx = dates.indexOf(currentViewDate)
    const center = currentIdx !== -1 ? currentIdx : (() => {
      const todayIdx = dates.indexOf(todayDate)
      return todayIdx !== -1 ? todayIdx : Math.floor(dates.length / 2)
    })()
    const start = Math.max(0, center - VIRTUALIZATION_WINDOW)
    const end = Math.min(dates.length, center + VIRTUALIZATION_WINDOW + 1)
    // Add new dates to the persistent set
    for (let i = start; i < end; i++) {
      renderedDates.current.add(dates[i])
    }
    // Clean up dates no longer in the dates array (range shifted)
    const dateSet = new Set(dates)
    for (const d of renderedDates.current) {
      if (!dateSet.has(d)) renderedDates.current.delete(d)
    }
    return new Set(renderedDates.current)
  }, [dates, currentViewDate, todayDate])
  
  return (
    <div
      ref={containerRef}
      className="daily-notes-container"
      style={{ height: '100vh', overflowY: 'auto', backgroundColor: 'white', width: '100%' }}
    >
      <MiniCalendar
        currentDate={currentViewDate}
        datesWithNotes={datesWithNotes}
        onDateSelect={handleDateSelect}
      />
      
      <MobileTimeline
        currentDate={currentViewDate}
        datesWithNotes={datesWithNotes}
        onDateSelect={handleDateSelect}
      />
      
      {isLoadingPast && (
        <div style={{ padding: '24px 0', textAlign: 'center' }}>
          <span style={{ fontSize: '14px', color: '#9ca3af' }}>Loading...</span>
        </div>
      )}
      
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0 20px' }}>
        {dates.map((date) => (
          <div
            key={date}
            data-date={date}
            ref={(el) => {
              if (date === todayDate && el) (todayRef as React.MutableRefObject<HTMLDivElement | null>).current = el
              if (el) dayRefs.current.set(date, el)
              else dayRefs.current.delete(date)
            }}
          >
            {visibleDates.has(date) ? (
              <DayCard
                date={date}
                pages={pagesByDate[date] || []}
                projectedTasks={projectedTasks[date] || []}
                overdueTasks={date === todayDate ? (overdueTasksRaw as ZeroPage[] ?? []) : undefined}
                allFolders={initialFolders}
                childPagesMap={childPagesMap}
              />
            ) : (
              <div style={{ minHeight: '280px', padding: '32px 16px' }}>
                <div style={{ color: '#d1d5db', fontSize: '14px' }}>
                  {formatDateDisplay(date)}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {isLoadingFuture && (
        <div style={{ padding: '24px 0', textAlign: 'center' }}>
          <span style={{ fontSize: '14px', color: '#9ca3af' }}>Loading...</span>
        </div>
      )}
      
      <div className="h-40" />
      
      <button
        onClick={scrollToToday}
        style={{
          position: 'fixed',
          bottom: '100px',
          left: '50%',
          transform: `translateX(-50%) scale(${isTodayVisible ? 0.9 : 1})`,
          backgroundColor: '#111827',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '20px',
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          border: 'none',
          opacity: isTodayVisible ? 0 : 1,
          transition: 'opacity 0.2s ease, transform 0.2s ease',
          pointerEvents: isTodayVisible ? 'none' : 'auto',
        }}
        aria-label="Scroll to today"
      >
        Today
      </button>
      
      <MobileFAB onClick={() => setIsAddBubbleOpen(true)} />
      <MobileAddBubble 
        isOpen={isAddBubbleOpen} 
        onClose={() => setIsAddBubbleOpen(false)}
      />
    </div>
  )
}
