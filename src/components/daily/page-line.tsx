'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
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
  placeholder = '',
}: PageLineProps) {
  const [content, setContent] = useState(page.content)
  const [isSaving, setIsSaving] = useState(false)
  const [hasSaved, setHasSaved] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const lastSavedContent = useRef(page.content)
  
  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = Math.max(inputRef.current.scrollHeight, 28) + 'px'
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
  const debouncedSave = useMemo(
    () => debounce(async (newContent: string) => {
      if (newContent === lastSavedContent.current) return
      
      setIsSaving(true)
      try {
        const updated = await updatePage(page.id, { content: newContent })
        lastSavedContent.current = newContent
        onUpdate?.(updated)
        setHasSaved(true)
        setTimeout(() => setHasSaved(false), 1500)
      } catch (error) {
        console.error('Failed to save:', error)
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
    <div className="group relative flex items-start gap-3 py-1">
      {/* Bullet point */}
      <div className="mt-[13px] flex-shrink-0 w-[5px] h-[5px] rounded-full bg-gray-300 group-focus-within:bg-gray-400 transition-colors" />
      
      {/* Content */}
      <div className="flex-1 min-w-0 relative">
        <textarea
          ref={inputRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder}
          rows={1}
          className={cn(
            'w-full resize-none overflow-hidden bg-transparent py-0.5 pr-16',
            'text-base leading-7 text-gray-900',
            'placeholder:text-gray-300',
            'focus:outline-none',
            'selection:bg-gray-200'
          )}
        />
        
        {/* Save indicator */}
        <div className="absolute right-0 top-1 text-xs">
          {isSaving && (
            <span className="text-gray-400">Saving...</span>
          )}
          {hasSaved && !isSaving && (
            <span className="text-gray-300">Saved</span>
          )}
        </div>
      </div>
    </div>
  )
}
