'use client'

import { useState, useRef, useEffect, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react'
import { type Page, type Folder } from '@/lib/db'
import { updatePage, deletePage, togglePageStarred } from '@/lib/actions/pages'
import { useToast } from '@/components/providers/toast-provider'
import { useMobileToolbar } from '@/components/providers/mobile-toolbar-provider'
import { cn, debounce, parseTaskDate, parseTaskPriority, getPriorityInfo, isOverdue, isTaskToday, formatDateDisplay } from '@/lib/utils'
import { FolderAutocomplete, getFilteredFolders } from './folder-autocomplete'
import Link from 'next/link'

const MAX_INDENT = 4
const INDENT_WIDTH = 24 // pixels per indent level

// Task detection regex: matches [] or [ ] or [x] or [X] at the start
const TASK_REGEX = /^\[([ xX]?)\]\s*/

interface TaskInfo {
  isTask: boolean
  isCompleted: boolean
  textContent: string // content without the checkbox syntax
}

export function parseTaskContent(content: string): TaskInfo {
  const match = content.match(TASK_REGEX)
  if (match) {
    return {
      isTask: true,
      isCompleted: match[1].toLowerCase() === 'x',
      textContent: content.replace(TASK_REGEX, ''),
    }
  }
  return {
    isTask: false,
    isCompleted: false,
    textContent: content,
  }
}

/** Detect hashtag at cursor position in text */
function getHashtagAtCursor(text: string, cursorPos: number): string | null {
  const textBefore = text.substring(0, cursorPos)
  // Match # preceded by start of string or whitespace, followed by word chars
  const match = textBefore.match(/(^|\s)#([a-zA-Z0-9-]*)$/)
  if (match) {
    return match[2] // The text after #
  }
  return null
}

// Handle exposed by PageLine for imperative control from parent
export interface PageLineHandle {
  focus: (cursorPosition?: number) => void
  setContentAndFocus: (newContent: string, cursorPosition: number) => void
  getTextarea: () => HTMLTextAreaElement | null
  getDisplayedContent: () => string
}

interface PageLineProps {
  page: Page
  dailyDate?: string // YYYY-MM-DD - used as default task_date when no @date
  onUpdate?: (page: Page) => void
  onDelete?: (index?: number) => void // Optional index for focus handling on delete
  onEnter?: (indent?: number, contentForNewLine?: string) => void // indent + optional content for text splitting
  autoFocus?: boolean
  focusCursorPosition?: number // Where to place cursor when autoFocus is true (undefined = end)
  placeholder?: string
  isProjected?: boolean // True if this task is shown in a day different from where it was written
  allFolders?: Folder[] // For #folder-name autocomplete
  indentOffset?: number // Extra indent levels (used for child pages in daily view)
  onFolderTag?: (pageId: string, folderId: string) => void // Callback when page is tagged with a folder
  isTitle?: boolean // True if this page has nested content (children) - renders as title style
  index?: number // Index in the page list (for delete focus handling)
  onMergeWithPrevious?: (currentIndex: number, currentDisplayedContent: string) => void // Merge with previous line
  onNavigateUp?: () => void // Navigate to previous line
  onNavigateDown?: () => void // Navigate to next line
}

export const PageLine = forwardRef<PageLineHandle, PageLineProps>(function PageLine({
  page,
  dailyDate,
  onUpdate,
  onDelete,
  onEnter,
  autoFocus = false,
  focusCursorPosition,
  placeholder = '',
  isProjected = false,
  allFolders,
  indentOffset = 0,
  onFolderTag,
  isTitle = false,
  index,
  onMergeWithPrevious,
  onNavigateUp,
  onNavigateDown,
}, ref) {
  const [content, setContent] = useState(page.content)
  const [indent, setIndent] = useState(page.indent ?? 0)
  const [isTaskCompleted, setIsTaskCompleted] = useState(page.taskCompleted ?? false)
  const [isStarred, setIsStarred] = useState(page.starred ?? false)
  const [isSaving, setIsSaving] = useState(false)
  const [hasSaved, setHasSaved] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const lastSavedContent = useRef(page.content)
  const lastSavedIndent = useRef(page.indent ?? 0)
  const { showError } = useToast()
  const { registerActions, unregisterActions } = useMobileToolbar()
  
  // Folder autocomplete state
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [autocompleteQuery, setAutocompleteQuery] = useState('')
  const [selectedAutocompleteIndex, setSelectedAutocompleteIndex] = useState(0)
  const pendingCursorRef = useRef<{ position: number; shouldFocus: boolean } | null>(null)
  
  // Ref to read latest focusCursorPosition in effects without re-triggering
  const focusCursorPosRef = useRef<number | undefined>(focusCursorPosition)
  focusCursorPosRef.current = focusCursorPosition
  
  // Expose imperative handle to parent for merge/focus operations
  useImperativeHandle(ref, () => ({
    focus: (cursorPosition?: number) => {
      if (inputRef.current) {
        inputRef.current.focus()
        if (cursorPosition !== undefined) {
          inputRef.current.setSelectionRange(cursorPosition, cursorPosition)
        } else {
          const len = inputRef.current.value?.length || 0
          inputRef.current.setSelectionRange(len, len)
        }
      }
    },
    setContentAndFocus: (newContent: string, cursorPosition: number) => {
      debouncedSave.cancel() // Cancel any pending save to prevent stale overwrites
      setContent(newContent)
      lastSavedContent.current = newContent
      // Use pendingCursorRef to apply focus after React re-renders with new content
      pendingCursorRef.current = { position: cursorPosition, shouldFocus: true }
    },
    getTextarea: () => inputRef.current,
    // Get current displayed content (for merge operations - reads live state, not stale props)
    getDisplayedContent: () => {
      // Read from state, not props, to get the latest unsaved content
      const currentTaskInfo = parseTaskContent(content)
      return currentTaskInfo.isTask ? currentTaskInfo.textContent : content
    },
  }))
  
  // Parse task info from content
  const taskInfo = useMemo(() => parseTaskContent(content), [content])
  
  // Parse date and priority for display (only for tasks)
  const dateInfo = useMemo(() => 
    taskInfo.isTask ? parseTaskDate(taskInfo.textContent) : null
  , [taskInfo.isTask, taskInfo.textContent])
  
  const priorityInfo = useMemo(() => {
    if (!taskInfo.isTask) return null
    const parsed = parseTaskPriority(taskInfo.textContent)
    return parsed.priority ? getPriorityInfo(parsed.priority) : null
  }, [taskInfo.isTask, taskInfo.textContent])
  
  // Check if task is overdue
  const taskIsOverdue = useMemo(() => 
    taskInfo.isTask && !isTaskCompleted && page.taskDate && isOverdue(page.taskDate)
  , [taskInfo.isTask, isTaskCompleted, page.taskDate])
  
  // Check if task is due today  
  const taskIsDueToday = useMemo(() => 
    taskInfo.isTask && !isTaskCompleted && page.taskDate && isTaskToday(page.taskDate)
  , [taskInfo.isTask, isTaskCompleted, page.taskDate])
  
  // Matched folder for badge display
  const matchedFolder = useMemo(() => {
    if (!allFolders?.length || !page.folderId) return null
    return allFolders.find(f => f.id === page.folderId) || null
  }, [allFolders, page.folderId])
  
  // Filtered folders for autocomplete
  const filteredFolders = useMemo(() => {
    if (!showAutocomplete || !allFolders?.length) return []
    return getFilteredFolders(allFolders, autocompleteQuery)
  }, [showAutocomplete, allFolders, autocompleteQuery])
  
  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = Math.max(inputRef.current.scrollHeight, 28) + 'px'
    }
  }, [content])
  
  // Auto-focus with optional cursor position
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
          const pos = focusCursorPosRef.current
          if (pos !== undefined) {
            inputRef.current.setSelectionRange(pos, pos)
          } else {
            // Default: move cursor to end
            const len = inputRef.current.value?.length || 0
            inputRef.current.setSelectionRange(len, len)
          }
        }
      }, 50)
    }
  }, [autoFocus])
  
  // Restore cursor position after folder selection or merge
  useEffect(() => {
    if (pendingCursorRef.current !== null && inputRef.current) {
      const { position, shouldFocus } = pendingCursorRef.current
      pendingCursorRef.current = null
      if (shouldFocus) {
        inputRef.current.focus()
      }
      inputRef.current.setSelectionRange(position, position)
    }
  }, [content])
  
  // Check for hashtag pattern at cursor
  const checkHashtag = useCallback((text: string, cursorPos: number) => {
    if (!allFolders?.length) {
      setShowAutocomplete(false)
      return
    }
    const query = getHashtagAtCursor(text, cursorPos)
    if (query !== null) {
      setAutocompleteQuery(query)
      setSelectedAutocompleteIndex(0)
      setShowAutocomplete(true)
    } else {
      setShowAutocomplete(false)
    }
  }, [allFolders])
  
  // LOCAL-FIRST: Debounced notification to parent (parent handles sync)
  const debouncedSave = useMemo(
    () => debounce((newContent: string) => {
      if (newContent === lastSavedContent.current) return
      
      // Parse task info
      const parsed = parseTaskContent(newContent)
      
      let taskDate: string | null = null
      let taskPriority: 'low' | 'medium' | 'high' | null = null
      
      if (parsed.isTask) {
        const dateInfo = parseTaskDate(parsed.textContent)
        const priorityInfo = parseTaskPriority(parsed.textContent)
        taskDate = dateInfo.date ?? dailyDate ?? null
        taskPriority = priorityInfo.priority
      }
      
      lastSavedContent.current = newContent
      setIsTaskCompleted(parsed.isTask ? parsed.isCompleted : false)
      
      // Notify parent with updated page (parent queues for sync)
      onUpdate?.({
        ...page,
        content: newContent,
        isTask: parsed.isTask,
        taskCompleted: parsed.isTask ? parsed.isCompleted : false,
        taskDate,
        taskPriority,
        updatedAt: new Date(),
      })
    }, 300), // Reduced debounce for more responsive feel
    [page, dailyDate, onUpdate]
  )
  
  // Handle checkbox toggle - LOCAL-FIRST
  const handleCheckboxToggle = () => {
    if (!taskInfo.isTask) return
    
    const newCompleted = !isTaskCompleted
    setIsTaskCompleted(newCompleted)
    
    const newCheckbox = newCompleted ? '[x] ' : '[] '
    const newContent = newCheckbox + taskInfo.textContent
    setContent(newContent)
    lastSavedContent.current = newContent
    
    // Notify parent (will queue for sync)
    onUpdate?.({
      ...page,
      content: newContent,
      isTask: true,
      taskCompleted: newCompleted,
      taskCompletedAt: newCompleted ? new Date() : null,
      updatedAt: new Date(),
    })
  }
  
  // Handle folder selection from autocomplete - LOCAL-FIRST
  const handleFolderSelect = useCallback((folder: Folder) => {
    const textarea = inputRef.current
    if (!textarea) return
    
    const displayedText = taskInfo.isTask ? taskInfo.textContent : content
    const cursorPos = textarea.selectionStart
    const textBefore = displayedText.substring(0, cursorPos)
    
    const hashIndex = textBefore.lastIndexOf('#')
    if (hashIndex === -1) return
    
    const beforeHash = displayedText.substring(0, hashIndex).trimEnd()
    const afterCursor = displayedText.substring(cursorPos).trimStart()
    const newDisplayedText = beforeHash + (beforeHash && afterCursor ? ' ' : '') + afterCursor
    
    let newContent: string
    if (taskInfo.isTask) {
      const prefix = isTaskCompleted ? '[x] ' : '[] '
      newContent = prefix + newDisplayedText
    } else {
      newContent = newDisplayedText
    }
    
    debouncedSave.cancel()
    setContent(newContent)
    setShowAutocomplete(false)
    lastSavedContent.current = newContent
    
    const newCursorPos = beforeHash.length + (beforeHash && afterCursor ? 1 : 0)
    pendingCursorRef.current = { position: newCursorPos, shouldFocus: true }
    
    // Notify parent (will queue for sync)
    onUpdate?.({
      ...page,
      content: newContent,
      folderId: folder.id,
      updatedAt: new Date(),
    })
    onFolderTag?.(page.id, folder.id)
  }, [content, taskInfo, isTaskCompleted, page, debouncedSave, onUpdate, onFolderTag])
  
  // Handle content change
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value
    const cursorPos = e.target.selectionStart
    
    // Check if the new text itself defines a task (user typed [] themselves)
    const newTaskInfo = parseTaskContent(newText)
    
    let contentToSave: string
    if (newTaskInfo.isTask) {
      // User typed [] themselves, use as-is
      contentToSave = newText
    } else if (taskInfo.isTask) {
      // Was already a task - preserve the checkbox prefix
      const prefix = isTaskCompleted ? '[x] ' : '[] '
      contentToSave = prefix + newText
    } else {
      // Regular content
      contentToSave = newText
    }
    
    setContent(contentToSave)
    debouncedSave(contentToSave)
    
    // Check for hashtag at cursor position (in displayed text)
    checkHashtag(newText, cursorPos)
  }
  
  // Save indent change - LOCAL-FIRST
  const saveIndent = (newIndent: number) => {
    if (newIndent === lastSavedIndent.current) return
    lastSavedIndent.current = newIndent
    onUpdate?.({
      ...page,
      indent: newIndent,
      updatedAt: new Date(),
    })
  }
  
  // Indent functions for mobile toolbar
  const handleIndent = useCallback(() => {
    setIndent(prev => {
      const newIndent = Math.min(prev + 1, MAX_INDENT)
      if (newIndent !== prev) {
        saveIndent(newIndent)
      }
      return newIndent
    })
  }, [])
  
  const handleOutdent = useCallback(() => {
    setIndent(prev => {
      const newIndent = Math.max(prev - 1, 0)
      if (newIndent !== prev) {
        saveIndent(newIndent)
      }
      return newIndent
    })
  }, [])
  
  const handleBlurAction = useCallback(() => {
    inputRef.current?.blur()
  }, [])
  
  // Toggle task state - LOCAL-FIRST
  const handleToggleTask = useCallback(() => {
    let newContent: string
    let newIsTask: boolean
    
    if (taskInfo.isTask) {
      newContent = taskInfo.textContent
      newIsTask = false
    } else {
      newContent = '[] ' + content
      newIsTask = true
    }
    
    setContent(newContent)
    lastSavedContent.current = newContent
    
    onUpdate?.({
      ...page,
      content: newContent,
      isTask: newIsTask,
      taskCompleted: false,
      taskDate: newIsTask ? (dailyDate ?? null) : null,
      taskPriority: null,
      updatedAt: new Date(),
    })
  }, [content, taskInfo.isTask, page, dailyDate, onUpdate])
  
  // Handle key events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle autocomplete keyboard navigation first
    if (showAutocomplete && filteredFolders.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedAutocompleteIndex(prev => Math.min(prev + 1, filteredFolders.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedAutocompleteIndex(prev => Math.max(prev - 1, 0))
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        if (filteredFolders[selectedAutocompleteIndex]) {
          handleFolderSelect(filteredFolders[selectedAutocompleteIndex])
        }
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setShowAutocomplete(false)
        return
      }
    }
    
    // Arrow Up - navigate to previous line when cursor is on first line
    if (e.key === 'ArrowUp' && onNavigateUp) {
      const textarea = e.currentTarget
      const cursorPos = textarea.selectionStart
      const textBeforeCursor = textarea.value.substring(0, cursorPos)
      // If no newline before cursor, we're on the first line
      const isFirstLine = !textBeforeCursor.includes('\n')
      if (isFirstLine) {
        e.preventDefault()
        onNavigateUp()
        return
      }
    }
    
    // Arrow Down - navigate to next line when cursor is on last line
    if (e.key === 'ArrowDown' && onNavigateDown) {
      const textarea = e.currentTarget
      const cursorPos = textarea.selectionStart
      const textAfterCursor = textarea.value.substring(cursorPos)
      // If no newline after cursor, we're on the last line
      const isLastLine = !textAfterCursor.includes('\n')
      if (isLastLine) {
        e.preventDefault()
        onNavigateDown()
        return
      }
    }
    
    // Tab → increase indent
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault()
      handleIndent()
      return
    }
    
    // Shift+Tab → decrease indent
    if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault()
      handleOutdent()
      return
    }
    
    // Enter without shift creates a new line (new page) with same indent
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const textarea = e.currentTarget
      const cursorPos = textarea.selectionStart
      const displayedText = taskInfo.isTask ? taskInfo.textContent : content
      
      // Split text at cursor position
      const textBefore = displayedText.substring(0, cursorPos)
      const textAfter = displayedText.substring(cursorPos)
      
      if (textAfter.length > 0) {
        // Truncate current line to text before cursor
        let newContent: string
        if (taskInfo.isTask) {
          const prefix = isTaskCompleted ? '[x] ' : '[] '
          newContent = prefix + textBefore
        } else {
          newContent = textBefore
        }
        setContent(newContent)
        debouncedSave.cancel()
        // Save truncated content immediately
        updatePage(page.id, { content: newContent }).then(updated => {
          lastSavedContent.current = newContent
          onUpdate?.(updated)
        }).catch(err => console.error('Failed to save split:', err))
      }
      
      // Create new line with the remainder text (or empty)
      onEnter?.(indent, textAfter)
      return
    }
    
    // Backspace handling
    const displayedText = taskInfo.isTask ? taskInfo.textContent : content
    if (e.key === 'Backspace') {
      if (displayedText === '') {
        // Empty line: delete it
        e.preventDefault()
        handleDelete()
      } else {
        // Non-empty line: check if cursor is at position 0 → merge with previous
        const textarea = e.currentTarget
        const cursorPos = textarea.selectionStart
        const selectionEnd = textarea.selectionEnd
        if (cursorPos === 0 && selectionEnd === 0 && onMergeWithPrevious && index !== undefined && index > 0) {
          e.preventDefault()
          onMergeWithPrevious(index, displayedText)
        }
      }
    }
  }
  
  // Handle delete - LOCAL-FIRST (parent handles actual deletion + sync)
  const handleDelete = () => {
    onDelete?.(index)
  }
  
  // Handle star toggle - LOCAL-FIRST
  const handleStarToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    const newStarred = !isStarred
    setIsStarred(newStarred)
    onUpdate?.({
      ...page,
      starred: newStarred,
      updatedAt: new Date(),
    })
  }
  
  // Handle focus - register toolbar actions
  const handleFocus = () => {
    registerActions({
      indent: handleIndent,
      outdent: handleOutdent,
      blur: handleBlurAction,
      toggleTask: handleToggleTask,
    }, inputRef.current || undefined, taskInfo.isTask)
  }
  
  // Handle touch - re-register if already focused (for iOS Safari)
  const handleTouchEnd = () => {
    if (document.activeElement === inputRef.current) {
      registerActions({
        indent: handleIndent,
        outdent: handleOutdent,
        blur: handleBlurAction,
        toggleTask: handleToggleTask,
      }, inputRef.current || undefined, taskInfo.isTask)
    }
  }
  
  // Re-register toolbar when task state changes (to update icon immediately)
  useEffect(() => {
    if (inputRef.current && document.activeElement === inputRef.current) {
      registerActions({
        indent: handleIndent,
        outdent: handleOutdent,
        blur: handleBlurAction,
        toggleTask: handleToggleTask,
      }, inputRef.current, taskInfo.isTask)
    }
  }, [taskInfo.isTask]) // eslint-disable-line react-hooks/exhaustive-deps
  
  // Handle blur - LOCAL-FIRST (save any pending changes immediately)
  const handleBlur = () => {
    unregisterActions()
    setShowAutocomplete(false)
    
    // Save any pending changes immediately
    if (content !== lastSavedContent.current) {
      debouncedSave.cancel()
      debouncedSave(content)
    }
  }
  
  // Checkbox styles
  const checkboxStyles = {
    uncompleted: {
      flexShrink: 0,
      width: '16px',
      height: '16px',
      borderRadius: '3px',
      border: taskIsOverdue ? '1.5px solid #dc2626' : '1.5px solid #d1d5db',
      backgroundColor: 'transparent',
      marginTop: '6px', // center with text
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      // Larger touch area
      position: 'relative' as const,
    },
    completed: {
      flexShrink: 0,
      width: '16px',
      height: '16px',
      borderRadius: '3px',
      border: '1.5px solid #10b981',
      backgroundColor: '#10b981',
      marginTop: '6px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative' as const,
    },
  }
  
  // For projected tasks, show where they came from
  const sourceDate = isProjected && page.dailyDate ? formatDateDisplay(page.dailyDate) : null
  
  return (
    <div 
      className={cn(
        "group relative flex py-1",
        isProjected && "bg-blue-50/50 rounded-md -mx-2 px-2"
      )}
      style={{ 
        display: 'flex', 
        alignItems: 'flex-start', 
        gap: '12px', 
        paddingTop: isTitle ? '16px' : '4px', 
        paddingBottom: '4px',
        paddingLeft: `${(indent + indentOffset) * INDENT_WIDTH + (isProjected ? 8 : 0)}px`,
        transition: 'padding-left 150ms ease-out',
      }}
      data-indent={indent}
      data-projected={isProjected || undefined}
    >
      {/* Bullet point OR Checkbox - vertically centered with first line of text */}
      {taskInfo.isTask ? (
        // Checkbox for tasks
        <div
          onClick={handleCheckboxToggle}
          style={isTaskCompleted ? checkboxStyles.completed : checkboxStyles.uncompleted}
          role="checkbox"
          aria-checked={isTaskCompleted}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleCheckboxToggle()
            }
          }}
        >
          {/* Touch area expander (invisible, 44x44px) */}
          <div 
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '44px',
              height: '44px',
            }}
          />
          {/* Checkmark */}
          {isTaskCompleted && (
            <svg 
              width="12" 
              height="12" 
              viewBox="0 0 12 12" 
              fill="none"
              style={{ position: 'relative', zIndex: 1 }}
            >
              <path 
                d="M2.5 6L5 8.5L9.5 4" 
                stroke="white" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      ) : (
        // Regular bullet point
        <div 
          style={{
            flexShrink: 0,
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: indent > 0 ? '#9ca3af' : '#d1d5db',
            marginTop: '11px', // (28px line-height - 6px bullet) / 2 = 11px
          }}
          className="group-focus-within:bg-gray-400 transition-colors" 
        />
      )}
      
      {/* Content */}
      <div className="flex-1 min-w-0 relative">
        <div className={cn(
          "flex gap-2",
          isProjected ? "flex-col md:flex-row md:items-start" : "items-start"
        )}>
          {/* Main content row */}
          <div className="flex items-start gap-2 flex-1 min-w-0">
            {/* Priority badge */}
            {taskInfo.isTask && priorityInfo && !isTaskCompleted && (
              <span 
                className="flex-shrink-0 text-xs font-semibold px-1 py-0.5 rounded mt-1"
                style={{ 
                  color: priorityInfo.color, 
                  backgroundColor: priorityInfo.bgColor,
                }}
              >
                {priorityInfo.label}
              </span>
            )}
            
            {/* Textarea */}
            <div className="flex-1 min-w-0" style={{ position: 'relative' }}>
              <textarea
                ref={inputRef}
                value={taskInfo.isTask ? taskInfo.textContent : content}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onTouchEnd={handleTouchEnd}
                placeholder={placeholder}
                rows={1}
                className={cn(
                  'w-full resize-none overflow-hidden bg-transparent py-0.5 pr-16',
                  'placeholder:text-gray-300',
                  'focus:outline-none',
                  'selection:bg-gray-200',
                  // Title styles (root pages with children)
                  isTitle ? 'text-lg leading-8 font-semibold' : 'text-base leading-7',
                  // Task completed styles
                  taskInfo.isTask && isTaskCompleted 
                    ? 'text-gray-400 line-through' 
                    : taskIsOverdue 
                      ? 'text-red-700'
                      : 'text-gray-900'
                )}
              />
              
              {/* Folder autocomplete dropdown */}
              {showAutocomplete && filteredFolders.length > 0 && (
                <FolderAutocomplete
                  query={autocompleteQuery}
                  folders={allFolders || []}
                  selectedIndex={selectedAutocompleteIndex}
                  onSelect={handleFolderSelect}
                />
              )}
            </div>
            
            {/* Non-projected badges stay inline */}
            {!isProjected && (
              <>
                {/* Date badge */}
                {taskInfo.isTask && dateInfo?.displayText && !isTaskCompleted && (
                  <span 
                    className="flex-shrink-0 text-xs px-1.5 py-0.5 rounded mt-1"
                    style={{ 
                      color: taskIsOverdue ? '#dc2626' : taskIsDueToday ? '#2563eb' : '#6b7280',
                      backgroundColor: taskIsOverdue ? '#fef2f2' : taskIsDueToday ? '#eff6ff' : '#f3f4f6',
                    }}
                  >
                    {dateInfo.displayText}
                  </span>
                )}
                
                {/* Star button - inline with other badges */}
                <button
                  onClick={handleStarToggle}
                  className={cn(
                    "flex-shrink-0 p-1 rounded transition-all mt-0.5",
                    isStarred 
                      ? "text-yellow-500 opacity-100" 
                      : "text-gray-300 opacity-0 group-hover:opacity-100 hover:text-yellow-500"
                  )}
                  title={isStarred ? "Remove from starred" : "Add to starred"}
                >
                  <svg 
                    width="14" 
                    height="14" 
                    viewBox="0 0 24 24" 
                    fill={isStarred ? "currentColor" : "none"}
                    stroke="currentColor" 
                    strokeWidth="2"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </button>
                
                {/* Folder tag badge */}
                {matchedFolder && (
                  <Link
                    href={`/folders/${matchedFolder.slug}`}
                    style={{
                      flexShrink: 0,
                      fontSize: '12px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      color: '#007aff',
                      backgroundColor: '#eff6ff',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      marginTop: '4px',
                      lineHeight: '18px',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                    </svg>
                    {matchedFolder.name}
                  </Link>
                )}
              </>
            )}
          </div>
          
          {/* Projected task badges - stacked vertically on mobile */}
          {isProjected && (
            <div className="flex flex-wrap gap-1.5 md:flex-nowrap md:items-start">
              {/* Date badge */}
              {taskInfo.isTask && dateInfo?.displayText && !isTaskCompleted && (
                <span 
                  className="flex-shrink-0 text-xs px-1.5 py-0.5 rounded"
                  style={{ 
                    color: taskIsOverdue ? '#dc2626' : taskIsDueToday ? '#2563eb' : '#6b7280',
                    backgroundColor: taskIsOverdue ? '#fef2f2' : taskIsDueToday ? '#eff6ff' : '#f3f4f6',
                  }}
                >
                  {dateInfo.displayText}
                </span>
              )}
              
              {/* Source indicator for projected tasks */}
              {sourceDate && (
                <span 
                  className="flex-shrink-0 text-xs px-1.5 py-0.5 rounded flex items-center gap-1"
                  style={{ 
                    color: '#6366f1',
                    backgroundColor: '#eef2ff',
                  }}
                >
                  <svg 
                    width="10" 
                    height="10" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                  from {sourceDate.split(',')[0]}
                </span>
              )}
              
              {/* Star button */}
              <button
                onClick={handleStarToggle}
                className={cn(
                  "flex-shrink-0 p-1 rounded transition-all",
                  isStarred 
                    ? "text-yellow-500 opacity-100" 
                    : "text-gray-300 opacity-0 group-hover:opacity-100 hover:text-yellow-500"
                )}
                title={isStarred ? "Remove from starred" : "Add to starred"}
              >
                <svg 
                  width="14" 
                  height="14" 
                  viewBox="0 0 24 24" 
                  fill={isStarred ? "currentColor" : "none"}
                  stroke="currentColor" 
                  strokeWidth="2"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </button>
            </div>
          )}
        </div>
        
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
})
