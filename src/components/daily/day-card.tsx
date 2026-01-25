'use client'

import { useState, useCallback } from 'react'
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
  const handleDeletePage = useCallback((pageId: string, index: number) => {
    setPages(prev => prev.filter(p => p.id !== pageId))
    // Focus previous page if exists
    // This would need refs to implement properly
  }, [])
  
  const isTodayDate = isToday(date)
  
  return (
    <div className="py-6">
      {/* Date header */}
      <div className="mb-4 flex items-center gap-3">
        <h2 className={cn(
          'text-sm font-medium',
          isTodayDate ? 'text-gray-900' : 'text-gray-500'
        )}>
          {formatDateDisplay(date)}
        </h2>
        {isTodayDate && (
          <span className="rounded-full bg-gray-900 px-2 py-0.5 text-xs text-white">
            Today
          </span>
        )}
      </div>
      
      {/* Pages */}
      <div className="space-y-1 pl-1">
        {pages.map((page, index) => (
          <PageLine
            key={page.id}
            page={page}
            onUpdate={handleUpdatePage}
            onDelete={() => handleDeletePage(page.id, index)}
            onEnter={() => handleCreatePage(index)}
            autoFocus={index === pages.length - 1 && page.content === ''}
            placeholder={index === 0 ? "What's on your mind?" : 'Continue writing...'}
          />
        ))}
        
        {/* Empty state / Add button */}
        {pages.length === 0 && (
          <button
            onClick={() => handleCreatePage()}
            disabled={isCreating}
            className="w-full py-2 text-left text-sm text-gray-300 hover:text-gray-400 transition-colors"
          >
            {isCreating ? 'Creating...' : 'Click to start writing...'}
          </button>
        )}
      </div>
    </div>
  )
}
