'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { type Page } from '@/lib/db'
import { getDailyPagesRange } from '@/lib/actions/pages'
import { DayCard } from './day-card'
import { today, addDays, formatDate } from '@/lib/utils'

interface DailyNotesProps {
  initialPages: Record<string, Page[]>
  initialStartDate: string
  initialEndDate: string
}

const DAYS_TO_LOAD = 7 // Load 7 days at a time
const SCROLL_THRESHOLD = 200 // px from edge to trigger load

export function DailyNotes({
  initialPages,
  initialStartDate,
  initialEndDate,
}: DailyNotesProps) {
  const [pages, setPages] = useState(initialPages)
  const [startDate, setStartDate] = useState(initialStartDate)
  const [endDate, setEndDate] = useState(initialEndDate)
  const [isLoadingPast, setIsLoadingPast] = useState(false)
  const [isLoadingFuture, setIsLoadingFuture] = useState(false)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const todayRef = useRef<HTMLDivElement>(null)
  
  // Scroll to today on mount
  useEffect(() => {
    if (todayRef.current) {
      todayRef.current.scrollIntoView({ behavior: 'instant', block: 'start' })
    }
  }, [])
  
  // Load more days in the past
  const loadPast = useCallback(async () => {
    if (isLoadingPast) return
    
    setIsLoadingPast(true)
    try {
      const newStartDate = addDays(startDate, -DAYS_TO_LOAD)
      const newEndDate = addDays(startDate, -1)
      
      const newPages = await getDailyPagesRange(newStartDate, newEndDate)
      
      setPages(prev => ({ ...newPages, ...prev }))
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
      
      const newPages = await getDailyPagesRange(newStartDate, newEndDate)
      
      setPages(prev => ({ ...prev, ...newPages }))
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
  
  return (
    <div
      ref={containerRef}
      className="h-screen overflow-y-auto px-4 md:px-8 lg:px-12"
    >
      {/* Loading indicator - past */}
      {isLoadingPast && (
        <div className="py-4 text-center text-sm text-gray-400">
          Loading...
        </div>
      )}
      
      {/* Days */}
      <div className="mx-auto max-w-2xl divide-y divide-gray-100">
        {dates.map((date) => (
          <div
            key={date}
            ref={date === todayDate ? todayRef : undefined}
          >
            <DayCard
              date={date}
              initialPages={pages[date] || []}
            />
          </div>
        ))}
      </div>
      
      {/* Loading indicator - future */}
      {isLoadingFuture && (
        <div className="py-4 text-center text-sm text-gray-400">
          Loading...
        </div>
      )}
      
      {/* Bottom padding */}
      <div className="h-32" />
    </div>
  )
}
