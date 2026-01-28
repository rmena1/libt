'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { type Page } from '@/lib/db'
import { getDailyPagesRange, getProjectedTasksForRange, getChildPagesForParents } from '@/lib/actions/pages'
import { DayCard } from './day-card'
import { MobileAddBubble, MobileFAB } from './mobile-add-bubble'
import { MiniCalendar } from './mini-calendar'
import { MobileTimeline } from './mobile-timeline'
import { today, addDays } from '@/lib/utils'

interface DailyNotesProps {
  initialPages: Record<string, Page[]>
  initialProjectedTasks: Record<string, Page[]>
  initialStartDate: string
  initialEndDate: string
  initialFolders?: import('@/lib/db').Folder[]
  initialChildPages?: Record<string, Page[]>  // parentPageId → child pages
  initialOverdueTasks?: Page[]  // Tasks overdue (past date, not completed)
  scrollToDate?: string | null  // Date to scroll to on mount (from search/URL)
}

const DAYS_TO_LOAD = 7 // Load 7 days at a time
const SCROLL_THRESHOLD = 300 // px from edge to trigger load

export function DailyNotes({
  initialPages,
  initialProjectedTasks,
  initialStartDate,
  initialEndDate,
  initialFolders,
  initialChildPages,
  initialOverdueTasks,
  scrollToDate,
}: DailyNotesProps) {
  const [pages, setPages] = useState(initialPages)
  const [projectedTasks, setProjectedTasks] = useState(initialProjectedTasks)
  const [childPagesMap, setChildPagesMap] = useState<Record<string, Page[]>>(initialChildPages || {})
  const [overdueTasks, setOverdueTasks] = useState<Page[]>(initialOverdueTasks || [])
  const [startDate, setStartDate] = useState(initialStartDate)
  const [endDate, setEndDate] = useState(initialEndDate)
  const [isLoadingPast, setIsLoadingPast] = useState(false)
  const [isLoadingFuture, setIsLoadingFuture] = useState(false)
  
  // Scroll to Today button state
  const [isTodayVisible, setIsTodayVisible] = useState(true)
  
  // Current date being viewed (for calendar navigation)
  const [currentViewDate, setCurrentViewDate] = useState(today())
  
  // Mobile add bubble state
  const [isAddBubbleOpen, setIsAddBubbleOpen] = useState(false)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const todayRef = useRef<HTMLDivElement>(null)
  const dayRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  
  // Scroll to target date (from search) or today on mount
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
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  
  // Intersection Observer to detect if today is visible
  useEffect(() => {
    const todayElement = todayRef.current
    const container = containerRef.current
    if (!todayElement || !container) return
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsTodayVisible(entry.isIntersecting)
      },
      { 
        root: container,
        threshold: 0.1 
      }
    )
    
    observer.observe(todayElement)
    return () => observer.disconnect()
  }, [])
  
  // Scroll to today handler
  const scrollToToday = useCallback(() => {
    todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])
  
  // Track which date is currently visible via IntersectionObserver
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    
    const observer = new IntersectionObserver(
      (entries) => {
        // Find the topmost visible entry
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
      {
        root: container,
        rootMargin: '-10% 0px -70% 0px',
        threshold: 0,
      }
    )
    
    // Observe all day elements
    dayRefs.current.forEach(el => observer.observe(el))
    
    return () => observer.disconnect()
  }, [startDate, endDate]) // re-observe when date range changes
  
  // Handle date selection from calendar/timeline
  const handleDateSelect = useCallback(async (date: string) => {
    const el = dayRefs.current.get(date)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setCurrentViewDate(date)
      return
    }
    
    // Date not loaded — need to load range around it
    const newStart = addDays(date, -7)
    const newEnd = addDays(date, 7)
    
    try {
      const [newPages, newProjected] = await Promise.all([
        getDailyPagesRange(newStart, newEnd),
        getProjectedTasksForRange(newStart, newEnd),
      ])
      
      const newPageIds = Object.values(newPages).flat().map(p => p.id)
      let newChildren: Record<string, import('@/lib/db').Page[]> = {}
      if (newPageIds.length > 0) {
        newChildren = await getChildPagesForParents(newPageIds)
      }
      
      setPages(prev => ({ ...prev, ...newPages }))
      setProjectedTasks(prev => ({ ...prev, ...newProjected }))
      setChildPagesMap(prev => ({ ...prev, ...newChildren }))
      
      if (newStart < startDate) setStartDate(newStart)
      if (newEnd > endDate) setEndDate(newEnd)
      
      setCurrentViewDate(date)
      
      // Scroll after state update
      requestAnimationFrame(() => {
        setTimeout(() => {
          const el = dayRefs.current.get(date)
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 100)
      })
    } catch (error) {
      console.error('Failed to load date range:', error)
    }
  }, [startDate, endDate])
  
  // Compute dates that have notes
  const datesWithNotes = useMemo(() => {
    const set = new Set<string>()
    for (const [date, pageList] of Object.entries(pages)) {
      if (pageList.length > 0) set.add(date)
    }
    return set
  }, [pages])
  
  // Load more days in the past
  const loadPast = useCallback(async () => {
    if (isLoadingPast) return
    
    setIsLoadingPast(true)
    try {
      const newStartDate = addDays(startDate, -DAYS_TO_LOAD)
      const newEndDate = addDays(startDate, -1)
      
      const [newPages, newProjected] = await Promise.all([
        getDailyPagesRange(newStartDate, newEndDate),
        getProjectedTasksForRange(newStartDate, newEndDate),
      ])
      
      // Fetch child pages for newly loaded pages
      const newPageIds = Object.values(newPages).flat().map(p => p.id)
      if (newPageIds.length > 0) {
        const newChildren = await getChildPagesForParents(newPageIds)
        setChildPagesMap(prev => ({ ...newChildren, ...prev }))
      }
      
      setPages(prev => ({ ...newPages, ...prev }))
      setProjectedTasks(prev => ({ ...newProjected, ...prev }))
      setStartDate(newStartDate)
    } catch (error) {
      console.error('Failed to load past:', error)
    } finally {
      setIsLoadingPast(false)
    }
  }, [startDate, isLoadingPast])
  
  // Load more days in the future
  const loadFuture = useCallback(async () => {
    if (isLoadingFuture) return
    
    setIsLoadingFuture(true)
    try {
      const newStartDate = addDays(endDate, 1)
      const newEndDate = addDays(endDate, DAYS_TO_LOAD)
      
      const [newPages, newProjected] = await Promise.all([
        getDailyPagesRange(newStartDate, newEndDate),
        getProjectedTasksForRange(newStartDate, newEndDate),
      ])
      
      // Fetch child pages for newly loaded pages
      const newPageIds = Object.values(newPages).flat().map(p => p.id)
      if (newPageIds.length > 0) {
        const newChildren = await getChildPagesForParents(newPageIds)
        setChildPagesMap(prev => ({ ...prev, ...newChildren }))
      }
      
      setPages(prev => ({ ...prev, ...newPages }))
      setProjectedTasks(prev => ({ ...prev, ...newProjected }))
      setEndDate(newEndDate)
    } catch (error) {
      console.error('Failed to load future:', error)
    } finally {
      setIsLoadingFuture(false)
    }
  }, [endDate, isLoadingFuture])
  
  // Handle scroll for infinite loading
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      
      // Near top - load past
      if (scrollTop < SCROLL_THRESHOLD) {
        loadPast()
      }
      
      // Near bottom - load future
      if (scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD) {
        loadFuture()
      }
    }
    
    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [loadPast, loadFuture])
  
  // Generate array of dates to display
  const dates: string[] = []
  let currentDate = startDate
  while (currentDate <= endDate) {
    dates.push(currentDate)
    currentDate = addDays(currentDate, 1)
  }
  
  const todayDate = today()
  
  // Callback when a task is updated (toggle, save with new @date)
  // Syncs the update across all days in both pages and projectedTasks
  const handleTaskUpdate = useCallback((updatedTask: Page) => {
    // Update in projectedTasks
    setProjectedTasks(prev => {
      const newProjected = { ...prev }
      // Update the task in all days where it already appears
      for (const [date, tasks] of Object.entries(newProjected)) {
        newProjected[date] = tasks.map(t => t.id === updatedTask.id ? updatedTask : t)
      }
      // If task has a taskDate different from dailyDate, ensure it appears in that day
      if (updatedTask.taskDate && updatedTask.taskDate !== updatedTask.dailyDate) {
        if (!newProjected[updatedTask.taskDate]) {
          newProjected[updatedTask.taskDate] = []
        }
        const exists = newProjected[updatedTask.taskDate].find(t => t.id === updatedTask.id)
        if (!exists) {
          newProjected[updatedTask.taskDate] = [...newProjected[updatedTask.taskDate], updatedTask]
        }
      }
      return newProjected
    })
    
    // Update in overdue tasks
    setOverdueTasks(prev => {
      if (updatedTask.taskCompleted) {
        // Remove completed tasks from overdue
        return prev.filter(t => t.id !== updatedTask.id)
      }
      return prev.map(t => t.id === updatedTask.id ? updatedTask : t)
    })
    
    // Also update in pages
    setPages(prev => {
      const newPages = { ...prev }
      for (const [date, pageList] of Object.entries(newPages)) {
        newPages[date] = pageList.map(p => p.id === updatedTask.id ? updatedTask : p)
      }
      return newPages
    })
  }, [])
  
  // Refresh pages after adding from mobile bubble
  const handlePageCreated = useCallback(async () => {
    // Small delay to ensure DB write is complete
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Refresh today's and potentially the target date's pages
    try {
      const [newPages, newProjected, newChildren] = await Promise.all([
        getDailyPagesRange(startDate, endDate),
        getProjectedTasksForRange(startDate, endDate),
        getChildPagesForParents(Object.values(pages).flat().map(p => p.id)),
      ])
      setPages(newPages)
      setProjectedTasks(newProjected)
      setChildPagesMap(prev => ({ ...prev, ...newChildren }))
    } catch (error) {
      console.error('Failed to refresh pages:', error)
    }
  }, [startDate, endDate, pages])
  
  return (
    <div
      ref={containerRef}
      className="daily-notes-container"
      style={{ height: '100vh', overflowY: 'auto', backgroundColor: 'white', width: '100%' }}
    >
      {/* Mini Calendar - Desktop */}
      <MiniCalendar
        currentDate={currentViewDate}
        datesWithNotes={datesWithNotes}
        onDateSelect={handleDateSelect}
      />
      
      {/* Mobile Timeline */}
      <MobileTimeline
        currentDate={currentViewDate}
        datesWithNotes={datesWithNotes}
        onDateSelect={handleDateSelect}
      />
      
      {/* Loading indicator - past */}
      {isLoadingPast && (
        <div style={{ padding: '24px 0', textAlign: 'center' }}>
          <span style={{ fontSize: '14px', color: '#9ca3af' }}>Loading...</span>
        </div>
      )}
      
      {/* Days */}
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
            <DayCard
              date={date}
              initialPages={pages[date] || []}
              projectedTasks={projectedTasks[date] || []}
              overdueTasks={date === todayDate ? overdueTasks : undefined}
              onTaskUpdate={handleTaskUpdate}
              allFolders={initialFolders}
              childPagesMap={childPagesMap}
            />
          </div>
        ))}
      </div>
      
      {/* Loading indicator - future */}
      {isLoadingFuture && (
        <div style={{ padding: '24px 0', textAlign: 'center' }}>
          <span style={{ fontSize: '14px', color: '#9ca3af' }}>Loading...</span>
        </div>
      )}
      
      {/* Bottom padding for scroll */}
      <div className="h-40" />
      
      {/* Scroll to Today floating button */}
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
      
      {/* Mobile FAB and Add Bubble */}
      <MobileFAB onClick={() => setIsAddBubbleOpen(true)} />
      <MobileAddBubble 
        isOpen={isAddBubbleOpen} 
        onClose={() => setIsAddBubbleOpen(false)}
        onPageCreated={handlePageCreated}
      />
    </div>
  )
}
