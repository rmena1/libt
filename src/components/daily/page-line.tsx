'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { type Page } from '@/lib/db'
import { updatePage, deletePage } from '@/lib/actions/pages'
import { cn, debounce } from '@/lib/utils'

interface PageLineProps {
  page: Page
  onUpdate?: (page: Page) => void
  onDelete?: () => void
  onEnter?: () => void
  autoFocus?: boolean
  placeholder?: string
}

export function PageLine({
  page,
  onUpdate,
  onDelete,
  onEnter,
  autoFocus = false,
  placeholder = 'Write something...',
}: PageLineProps) {
  const [content, setContent] = useState(page.content)
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const lastSavedContent = useRef(page.content)
  
  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = inputRef.current.scrollHeight + 'px'
    }
  }, [content])
  
  // Auto-focus
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
      // Move cursor to end
      inputRef.current.selectionStart = inputRef.current.value.length
    }
  }, [autoFocus])
  
  // Debounced save function
  const debouncedSave = useCallback(
    debounce(async (newContent: string) => {
      if (newContent === lastSavedContent.current) return
      
      setIsSaving(true)
      try {
        const updated = await updatePage(page.id, { content: newContent })
        lastSavedContent.current = newContent
        onUpdate?.(updated)
      } catch (error) {
        console.error('Failed to save:', error)
        // Optionally show error toast
      } finally {
        setIsSaving(false)
      }
    }, 500),
    [page.id, onUpdate]
  )
  
  // Handle content change
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    setContent(newContent)
    debouncedSave(newContent)
  }
  
  // Handle key events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter without shift creates a new line (new page)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onEnter?.()
    }
    
    // Backspace on empty line deletes the page
    if (e.key === 'Backspace' && content === '') {
      e.preventDefault()
      handleDelete()
    }
  }
  
  // Handle delete
  const handleDelete = async () => {
    try {
      await deletePage(page.id)
      onDelete?.()
    } catch (error) {
      console.error('Failed to delete:', error)
    }
  }
  
  // Handle blur - save immediately
  const handleBlur = async () => {
    if (content !== lastSavedContent.current) {
      setIsSaving(true)
      try {
        const updated = await updatePage(page.id, { content })
        lastSavedContent.current = content
        onUpdate?.(updated)
      } catch (error) {
        console.error('Failed to save:', error)
      } finally {
        setIsSaving(false)
      }
    }
  }
  
  return (
    <div className="group relative flex items-start gap-2">
      {/* Drag handle (future) */}
      <div className="mt-2.5 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
        <div className="h-4 w-4 cursor-grab text-gray-300">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="6" r="1.5" />
            <circle cx="15" cy="6" r="1.5" />
            <circle cx="9" cy="12" r="1.5" />
            <circle cx="15" cy="12" r="1.5" />
            <circle cx="9" cy="18" r="1.5" />
            <circle cx="15" cy="18" r="1.5" />
          </svg>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <textarea
          ref={inputRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder}
          rows={1}
          className={cn(
            'w-full resize-none overflow-hidden bg-transparent py-1.5 text-base leading-relaxed',
            'placeholder:text-gray-300 focus:outline-none',
            'text-gray-900'
          )}
        />
      </div>
      
      {/* Saving indicator */}
      {isSaving && (
        <div className="absolute right-0 top-2 text-xs text-gray-400">
          Saving...
        </div>
      )}
    </div>
  )
}
