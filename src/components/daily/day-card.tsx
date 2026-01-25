'use client'

import { useState, useCallback, useRef } from 'react'
import { type Page } from '@/lib/db'
import { createPage } from '@/lib/actions/pages'
import { PageLine } from './page-line'
import { formatDateDisplay, isToday, cn } from '@/lib/utils'

interface DayCardProps {
  date: string // YYYY-MM-DD
  initialPages: Page[]
}

export function DayCard({ date, initialPages }: DayCardProps) {
  const [pages, setPages] = useState<Page[]>(initialPages)
  const [isCreating, setIsCreating] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Create a new page
  const handleCreatePage = useCallback(async (afterIndex?: number) => {
    if (isCreating) return
    
    setIsCreating(true)
    try {
      const order = afterIndex !== undefined ? afterIndex + 1 : pages.length
      const newPage = await createPage({
        dailyDate: date,
        order,
        content: '',
      })
      
      // Insert at the right position
      const newPages = [...pages]
      if (afterIndex !== undefined) {
        newPages.splice(afterIndex + 1, 0, newPage)
      } else {
        newPages.push(newPage)
      }
      setPages(newPages)
    } catch (error) {
      console.error('Failed to create page:', error)
    } finally {
      setIsCreating(false)
    }
  }, [date, pages, isCreating])
  
  // Update a page in the list
  const handleUpdatePage = useCallback((updatedPage: Page) => {
    setPages(prev => prev.map(p => p.id === updatedPage.id ? updatedPage : p))
  }, [])
  
  // Delete a page from the list
  const handleDeletePage = useCallback((pageId: string) => {
    setPages(prev => prev.filter(p => p.id !== pageId))
  }, [])
  
  // Click on empty area to create new page
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    // Only trigger if clicking on the container itself, not children
    if (e.target === containerRef.current && pages.length === 0) {
      handleCreatePage()
    }
  }, [pages.length, handleCreatePage])
  
  const isTodayDate = isToday(date)
  
  return (
    <div className={cn(
      'min-h-[280px] md:min-h-[320px] py-6 px-5 md:px-8',
      'border-b border-gray-100 last:border-b-0',
      isTodayDate && 'bg-gray-50/50'
    )}>
      {/* Date header */}
      <div className="mb-6 flex items-center gap-3">
        <h2 className={cn(
          'text-sm font-medium tracking-wide',
          isTodayDate ? 'text-gray-900' : 'text-gray-400'
        )}>
          {formatDateDisplay(date)}
        </h2>
        {isTodayDate && (
          <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-medium text-white">
            Today
          </span>
        )}
      </div>
      
      {/* Content area */}
      <div 
        ref={containerRef}
        onClick={handleContainerClick}
        className={cn(
          'min-h-[180px] md:min-h-[220px] cursor-text',
          pages.length === 0 && 'flex items-start'
        )}
      >
        {pages.length > 0 ? (
          <div className="space-y-1">
            {pages.map((page, index) => (
              <PageLine
                key={page.id}
                page={page}
                onUpdate={handleUpdatePage}
                onDelete={() => handleDeletePage(page.id)}
                onEnter={() => handleCreatePage(index)}
                autoFocus={index === pages.length - 1 && page.content === ''}
                placeholder={index === 0 ? "What's on your mind?" : ''}
              />
            ))}
          </div>
        ) : (
          <button
            onClick={() => handleCreatePage()}
            disabled={isCreating}
            className={cn(
              'w-full text-left text-base text-gray-300 transition-colors',
              'hover:text-gray-400 focus:outline-none',
              isTodayDate ? 'text-gray-400' : 'text-gray-300'
            )}
          >
            {isCreating ? 'Creating...' : isTodayDate ? "What's on your mind today?" : 'Click to add a note...'}
          </button>
        )}
      </div>
    </div>
  )
}
