'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { type Page } from '@/lib/db'
import { createPage, updatePage, deletePage, linkPagesAsChildren } from '@/lib/actions/pages'
import { PageLine, type PageLineHandle, parseTaskContent } from './page-line'
import { useToast } from '@/components/providers/toast-provider'
import { formatDateDisplay, isToday, cn, generateId } from '@/lib/utils'
import { 
  getLocalPages, 
  setLocalPages, 
  addLocalPage, 
  updateLocalPage, 
  deleteLocalPage,
  addPendingOp,
  registerSyncHandlers,
  startSyncLoop,
  getPendingCount
} from '@/lib/local-sync/local-store'

interface DayCardProps {
  date: string // YYYY-MM-DD
  initialPages: Page[]
  projectedTasks?: Page[] // Tasks from other days that are due on this date
  onTaskUpdate?: (updatedTask: Page) => void // Callback to sync task updates across days
  allFolders?: import('@/lib/db').Folder[] // For #folder-name autocomplete in page lines
  childPagesMap?: Record<string, Page[]> // parentPageId → child pages (for folder notes)
}

export function DayCard({ date, initialPages, projectedTasks = [], onTaskUpdate, allFolders, childPagesMap }: DayCardProps) {
  // LOCAL-FIRST: Load from localStorage first, fallback to server data
  const [pages, setPages] = useState<Page[]>(() => {
    if (typeof window === 'undefined') return initialPages
    const local = getLocalPages(date)
    return local.length > 0 ? local : initialPages
  })
  const [projected, setProjected] = useState<Page[]>(projectedTasks)
  const [pendingCount, setPendingCount] = useState(0)
  const isCreatingRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const pageLineRefs = useRef<Map<string, PageLineHandle>>(new Map())
  const [focusPageId, setFocusPageId] = useState<string | null>(null)
  const [focusCursorPos, setFocusCursorPos] = useState<number | undefined>(undefined)
  const { showError } = useToast()
  
  // LOCAL-FIRST: Initialize sync on mount
  useEffect(() => {
    // Register server sync handlers
    registerSyncHandlers({
      create: async (data) => {
        await createPage(data as Parameters<typeof createPage>[0])
      },
      update: async (id, data) => {
        await updatePage(id, data as Parameters<typeof updatePage>[1])
      },
      delete: async (id) => {
        await deletePage(id)
      },
    })
    
    // Start background sync
    startSyncLoop()
    
    // Track pending count
    const interval = setInterval(() => {
      setPendingCount(getPendingCount())
    }, 500)
    
    // If localStorage was empty, save server data to localStorage
    const local = getLocalPages(date)
    if (local.length === 0 && initialPages.length > 0) {
      setLocalPages(date, initialPages)
    }
    
    return () => clearInterval(interval)
  }, [date, initialPages])
  
  // Sync projected tasks when parent updates them (cross-day sync)
  useEffect(() => {
    setProjected(projectedTasks)
  }, [projectedTasks])
  
  // Clear focusPageId after a delay (to allow component to use it for autoFocus)
  useEffect(() => {
    if (focusPageId) {
      const timer = setTimeout(() => {
        setFocusPageId(null)
        setFocusCursorPos(undefined)
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [focusPageId])
  
  // Create a new page - LOCAL-FIRST (optimistic, instant)
  const handleCreatePage = useCallback((afterIndex?: number, indent?: number, shouldFocus?: boolean, initialContent?: string) => {
    if (isCreatingRef.current) return
    isCreatingRef.current = true
    
    const order = afterIndex !== undefined ? afterIndex + 1 : pages.length
    const now = new Date()
    
    const newPage: Page = {
      id: generateId(),
      userId: '',
      content: initialContent ?? '',
      indent: indent ?? 0,
      dailyDate: date,
      folderId: null,
      parentPageId: null,
      order,
      isTask: false,
      taskCompleted: false,
      taskCompletedAt: null,
      taskDate: null,
      taskPriority: null,
      starred: false,
      createdAt: now,
      updatedAt: now,
    }
    
    // Update React state
    setPages(prev => {
      const newPages = [...prev]
      if (afterIndex !== undefined) {
        newPages.splice(afterIndex + 1, 0, newPage)
      } else {
        newPages.push(newPage)
      }
      // Save to localStorage immediately
      setLocalPages(date, newPages)
      return newPages
    })
    
    // Queue for server sync
    addPendingOp({
      type: 'create',
      pageId: newPage.id,
      data: {
        id: newPage.id,
        dailyDate: date,
        content: newPage.content,
        indent: newPage.indent,
        order: newPage.order,
      },
    })
    
    if (shouldFocus) {
      setFocusPageId(newPage.id)
      setFocusCursorPos(initialContent ? 0 : undefined)
    }
    
    isCreatingRef.current = false
  }, [date, pages.length])
  
  // Update a page - LOCAL-FIRST
  const handleUpdatePage = useCallback((updatedPage: Page) => {
    // Update React state
    setPages(prev => {
      const newPages = prev.map(p => p.id === updatedPage.id ? updatedPage : p)
      // Save to localStorage immediately
      setLocalPages(date, newPages)
      return newPages
    })
    setProjected(prev => prev.map(p => p.id === updatedPage.id ? updatedPage : p))
    onTaskUpdate?.(updatedPage)
    
    // Queue for server sync
    addPendingOp({
      type: 'update',
      pageId: updatedPage.id,
      data: {
        content: updatedPage.content,
        indent: updatedPage.indent,
        isTask: updatedPage.isTask,
        taskCompleted: updatedPage.taskCompleted,
        taskDate: updatedPage.taskDate,
        taskPriority: updatedPage.taskPriority,
        starred: updatedPage.starred,
        folderId: updatedPage.folderId,
      },
    })
  }, [date, onTaskUpdate])
  
  // Delete a page - LOCAL-FIRST
  const handleDeletePage = useCallback((pageId: string, deletedIndex?: number) => {
    if (deletedIndex !== undefined && deletedIndex > 0) {
      const prevPage = pages[deletedIndex - 1]
      if (prevPage) {
        setFocusPageId(prevPage.id)
      }
    }
    
    // Update React state
    setPages(prev => {
      const newPages = prev.filter(p => p.id !== pageId)
      // Save to localStorage immediately
      setLocalPages(date, newPages)
      return newPages
    })
    
    // Queue for server sync
    addPendingOp({
      type: 'delete',
      pageId: pageId,
    })
  }, [date, pages])
  
  // Handle merge - LOCAL-FIRST
  const handleMergeWithPrevious = useCallback((currentIndex: number, currentDisplayedContent: string) => {
    if (currentIndex <= 0) return
    
    const currentPage = pages[currentIndex]
    const prevPage = pages[currentIndex - 1]
    if (!prevPage || !currentPage) return
    
    const prevRef = pageLineRefs.current.get(prevPage.id)
    const prevDisplayedContent = prevRef?.getDisplayedContent() ?? ''
    const prevDisplayedLen = prevDisplayedContent.length
    const prevTaskInfo = parseTaskContent(prevPage.content)
    
    let newPrevContent: string
    if (prevTaskInfo.isTask) {
      const prefix = prevTaskInfo.isCompleted ? '[x] ' : '[] '
      newPrevContent = prefix + prevDisplayedContent + currentDisplayedContent
    } else {
      newPrevContent = prevDisplayedContent + currentDisplayedContent
    }
    
    // Update UI
    if (prevRef) {
      prevRef.setContentAndFocus(newPrevContent, prevDisplayedLen)
    }
    
    // Update React state and localStorage
    setPages(prev => {
      const newPages = prev
        .filter(p => p.id !== currentPage.id)
        .map(p => p.id === prevPage.id ? { ...p, content: newPrevContent } : p)
      setLocalPages(date, newPages)
      return newPages
    })
    
    // Queue for server sync
    addPendingOp({
      type: 'update',
      pageId: prevPage.id,
      data: { content: newPrevContent },
    })
    addPendingOp({
      type: 'delete',
      pageId: currentPage.id,
    })
  }, [date, pages])
  
  // Handle folder tagging: when a page is tagged with #folder in the daily view,
  // find its visual children (subsequent pages with higher indent) and link them
  // as actual child pages (set parentPageId and folderId).
  const handleFolderTag = useCallback(async (taggedPageId: string, folderId: string) => {
    const taggedIndex = pages.findIndex(p => p.id === taggedPageId)
    if (taggedIndex === -1) return
    
    const taggedPage = pages[taggedIndex]
    const taggedIndent = taggedPage.indent ?? 0
    
    // Collect visual children: pages after the tagged page with indent > taggedIndent
    const childIds: string[] = []
    for (let i = taggedIndex + 1; i < pages.length; i++) {
      const page = pages[i]
      const pageIndent = page.indent ?? 0
      if (pageIndent <= taggedIndent) break
      childIds.push(page.id)
    }
    
    if (childIds.length === 0) return
    
    try {
      await linkPagesAsChildren(taggedPageId, childIds, folderId)
      // Don't remove children from the flat list — they should stay visible
      // as indented bullets in the daily view. The DB link (parentPageId + folderId)
      // ensures they also show up in the folder's note view.
    } catch (error) {
      console.error('Failed to link children:', error)
    }
  }, [pages])

  // Click on empty area to create new page
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    // Only trigger if clicking on the container itself, not children
    if (e.target === containerRef.current && pages.length === 0) {
      handleCreatePage()
    }
  }, [pages.length, handleCreatePage])
  
  const isTodayDate = isToday(date)
  
  return (
    <div 
      style={{ 
        paddingLeft: '16px', 
        paddingRight: '16px',
        paddingTop: '32px',
        paddingBottom: '32px',
        minHeight: '280px',
      }}
      className={cn(
      'md:min-h-[320px] sm:px-6 md:px-10',
      'border-b border-gray-100 last:border-b-0',
      isTodayDate && 'bg-gray-50/50'
    )}>
      {/* Date header */}
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <h2 className={cn(
          'text-sm font-medium tracking-wide',
          isTodayDate ? 'text-gray-900' : 'text-gray-400'
        )}>
          {formatDateDisplay(date)}
        </h2>
        {isTodayDate && (
          <span 
            style={{ 
              marginLeft: '8px',
              borderRadius: '9999px', 
              backgroundColor: '#111827', 
              paddingLeft: '12px', 
              paddingRight: '12px', 
              paddingTop: '4px', 
              paddingBottom: '4px',
              fontSize: '12px',
              fontWeight: 500,
              color: 'white',
            }}
          >
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
        {pages.length > 0 || projected.length > 0 ? (
          <div className="space-y-1">
            {/* Projected tasks from other days - shown FIRST */}
            {projected.length > 0 && (
              <>
                {projected.map((task) => (
                  <PageLine
                    key={`projected-${task.id}`}
                    page={task}
                    dailyDate={task.dailyDate || undefined}
                    onUpdate={handleUpdatePage}
                    isProjected={true}
                  />
                ))}
                {pages.length > 0 && (
                  <div className="border-t border-dashed border-gray-200 my-3" />
                )}
              </>
            )}
            
            {/* Regular pages for this day */}
            {pages.map((page, index) => {
              // Determine if this page is a "title" (root level with children)
              const pageIndent = page.indent ?? 0
              const hasVisualChildren = pageIndent === 0 && 
                index < pages.length - 1 && 
                (pages[index + 1]?.indent ?? 0) > pageIndent
              const hasFolderChildren = (childPagesMap?.[page.id]?.length ?? 0) > 0
              const isTitle = pageIndent === 0 && (hasVisualChildren || hasFolderChildren)
              
              // Determine if we need margin after this page
              // The margin should go AFTER the last child of a group (not the title itself)
              // A "group" is a title (indent 0) followed by its children (indent > 0)
              let needsMarginAfter = false
              
              // Check if this page is the LAST element of a group
              // (either the last child of a title, or a standalone root page)
              const isRootLevel = pageIndent === 0
              const nextPage = pages[index + 1]
              const nextIndent = nextPage?.indent ?? 0
              
              if (isRootLevel && !isTitle) {
                // This is a standalone root page (no children)
                // Add margin if the next page IS a title (starts a new group)
                if (nextPage) {
                  const nextHasVisualChildren = nextIndent === 0 && 
                    index + 1 < pages.length - 1 && 
                    (pages[index + 2]?.indent ?? 0) > nextIndent
                  const nextHasFolderChildren = (childPagesMap?.[nextPage.id]?.length ?? 0) > 0
                  const nextIsTitle = nextIndent === 0 && (nextHasVisualChildren || nextHasFolderChildren)
                  needsMarginAfter = nextIsTitle
                }
              } else if (!isRootLevel) {
                // This is a child page (indent > 0)
                // Add margin if this is the last child AND the next root page is NOT a title
                const isLastChild = !nextPage || nextIndent === 0
                if (isLastChild && nextPage) {
                  const nextHasVisualChildren = nextIndent === 0 && 
                    index + 1 < pages.length - 1 && 
                    (pages[index + 2]?.indent ?? 0) > nextIndent
                  const nextHasFolderChildren = (childPagesMap?.[nextPage.id]?.length ?? 0) > 0
                  const nextIsTitle = nextIndent === 0 && (nextHasVisualChildren || nextHasFolderChildren)
                  // Add margin after last child if next is NOT a title
                  needsMarginAfter = !nextIsTitle
                }
              }
              // Note: If isTitle, we never add margin (the margin goes on the last child instead)
              
              return (
              <div key={page.id} style={{ marginBottom: needsMarginAfter ? '24px' : undefined }}>
                <PageLine
                  page={page}
                  dailyDate={date}
                  onUpdate={handleUpdatePage}
                  onDelete={(deletedIndex) => handleDeletePage(page.id, deletedIndex)}
                  onEnter={(indent, contentForNewLine) => handleCreatePage(index, indent, true, contentForNewLine)}
                  autoFocus={focusPageId === page.id || (index === pages.length - 1 && page.content === '')}
                  focusCursorPosition={focusPageId === page.id ? focusCursorPos : undefined}
                  placeholder={index === 0 ? "What's on your mind?" : ''}
                  allFolders={allFolders}
                  onFolderTag={handleFolderTag}
                  isTitle={isTitle}
                  index={index}
                  onMergeWithPrevious={handleMergeWithPrevious}
                  onNavigateUp={() => {
                    if (index > 0) {
                      const prevPage = pages[index - 1]
                      if (prevPage) {
                        const prevRef = pageLineRefs.current.get(prevPage.id)
                        prevRef?.focus()
                      }
                    }
                  }}
                  onNavigateDown={() => {
                    if (index < pages.length - 1) {
                      const nextPage = pages[index + 1]
                      if (nextPage) {
                        const nextRef = pageLineRefs.current.get(nextPage.id)
                        nextRef?.focus(0) // Focus at start of next line
                      }
                    }
                  }}
                  ref={(el: PageLineHandle | null) => {
                    if (el) {
                      pageLineRefs.current.set(page.id, el)
                    } else {
                      pageLineRefs.current.delete(page.id)
                    }
                  }}
                />
                {/* Render child pages (from folder notes) below the parent — 
                    only if not already in the flat pages list (avoids duplicates) */}
                {childPagesMap?.[page.id]
                  ?.filter(child => !pages.some(p => p.id === child.id))
                  .map((child, childIndex) => (
                  <PageLine
                    key={child.id}
                    page={child}
                    dailyDate={date}
                    onUpdate={handleUpdatePage}
                    onDelete={() => handleDeletePage(child.id)}
                    onEnter={(indent, contentForNewLine) => handleCreatePage(
                      pages.findIndex(p => p.id === page.id) + (childIndex + 1),
                      indent,
                      true,
                      contentForNewLine
                    )}
                    indentOffset={1}
                  />
                ))}
              </div>
              );
            })}
            
            {/* Add new line button */}
            <button
              onClick={() => handleCreatePage(pages.length - 1, 0, true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                paddingTop: '8px',
                paddingBottom: '8px',
                paddingLeft: '0',
                width: '100%',
                background: 'none',
                border: 'none',
                cursor: 'text',
                textAlign: 'left',
              }}
            >
              <div 
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#e5e7eb',
                }}
              />
              <span style={{ color: '#d1d5db', fontSize: '16px' }}>
                Click to add...
              </span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => handleCreatePage(undefined, 0, true)}
            className={cn(
              'w-full text-left text-base text-gray-300 transition-colors',
              'hover:text-gray-400 focus:outline-none',
              isTodayDate ? 'text-gray-400' : 'text-gray-300'
            )}
          >
            {isTodayDate ? "What's on your mind today?" : 'Click to add a note...'}
          </button>
        )}
      </div>
    </div>
  )
}
