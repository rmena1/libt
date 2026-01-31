'use client'

import { useState, useCallback, useRef, useEffect, useMemo, memo } from 'react'
import { useZero } from '@rocicorp/zero/react'
import { type ZeroPage, newPageInsert } from '@/zero/hooks'
import { PageLine, type PageLineHandle, parseTaskContent } from './page-line'
import { useToast } from '@/components/providers/toast-provider'
import { useBlockSelection } from '@/components/providers/block-selection-provider'
import { formatDateDisplay, isToday, cn, generateId } from '@/lib/utils'

const CHILD_DROP_INDENT = 40 // indent for drop indicators in folder children
const MAX_INDENT = 4

interface DayCardProps {
  date: string
  pages?: ZeroPage[]
  projectedTasks?: ZeroPage[]
  overdueTasks?: ZeroPage[]
  onTaskUpdate?: (updatedTask: ZeroPage) => void
  allFolders?: { id: string; name: string; slug: string }[]
  childPagesMap?: Record<string, ZeroPage[]>
}

export const DayCard = memo(function DayCard({ date, pages: pagesProp = [], projectedTasks: projected = [], overdueTasks: overdue = [], onTaskUpdate, allFolders, childPagesMap }: DayCardProps) {
  const z = useZero()
  const pages = pagesProp
  const isCreatingRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const pageLineRefs = useRef<Map<string, PageLineHandle>>(new Map())
  const [focusPageId, setFocusPageId] = useState<string | null>(null)
  const [focusCursorPos, setFocusCursorPos] = useState<number | undefined>(undefined)
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())
  const [draggedPageId, setDraggedPageId] = useState<string | null>(null)
  const [dropIndicatorIndex, setDropIndicatorIndex] = useState<number | null>(null)
  const [dropTarget, setDropTarget] = useState<{ type: 'main'; index: number } | { type: 'child'; parentId: string; index: number } | null>(null)
  const { showError } = useToast()
  const blockSelection = useBlockSelection()
  
  // Refs for blockSelection values used in event handlers/effects
  const blockSelectionRef = useRef(blockSelection)
  blockSelectionRef.current = blockSelection
  
  // Build flat ordered list of all visible page IDs (main + folder children)
  const allOrderedIds = useMemo(() => {
    const ids: string[] = []
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i]
      const pageIndent = page.indent ?? 0
      // Check if hidden by collapse
      let hidden = false
      for (let j = i - 1; j >= 0; j--) {
        const ancestorIndent = pages[j].indent ?? 0
        if (ancestorIndent < pageIndent) {
          if (collapsedIds.has(pages[j].id)) { hidden = true; break }
          if (ancestorIndent === 0) break
        }
      }
      if (hidden) continue
      ids.push(page.id)
      // Add folder children if not collapsed
      if (!collapsedIds.has(page.id)) {
        const children = childPagesMap?.[page.id]?.filter(c => !pages.some(p => p.id === c.id)) ?? []
        for (const child of children) {
          ids.push(child.id)
        }
      }
    }
    return ids
  }, [pages, childPagesMap, collapsedIds])

  const allOrderedIdsRef = useRef(allOrderedIds)
  allOrderedIdsRef.current = allOrderedIds

  // Handle block click (shift+click for range, meta+click for toggle, plain click clears)
  const handleBlockClick = useCallback((e: React.MouseEvent, pageId: string) => {
    const bs = blockSelectionRef.current
    const ids = allOrderedIdsRef.current
    if (e.shiftKey) {
      e.preventDefault()
      const active = document.activeElement as HTMLElement
      if (active?.tagName === 'TEXTAREA') active.blur()
      const anchor = bs.anchorId
      if (anchor && ids.includes(anchor)) {
        bs.selectRange(anchor, pageId, ids)
      } else {
        bs.select(pageId)
      }
      return
    }
    if (e.metaKey || e.ctrlKey) {
      e.preventDefault()
      bs.toggleSelect(pageId)
      return
    }
    if (bs.hasSelection()) {
      bs.clearSelection()
    }
    bs.setAnchor(pageId)
  }, [])

  // Keyboard handler for block selection actions
  const handleContainerKeyDown = useCallback((e: React.KeyboardEvent) => {
    const bs = blockSelectionRef.current
    const orderedIds = allOrderedIdsRef.current
    const sel = bs.hasSelection()
    
    // Cmd+A / Ctrl+A — select all
    if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
      const active = document.activeElement
      if (active?.tagName === 'TEXTAREA' && !sel) return
      e.preventDefault()
      bs.selectAll(orderedIds)
      return
    }

    if (!sel) return

    if (e.key === 'Escape') {
      e.preventDefault()
      bs.clearSelection()
      return
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      const active = document.activeElement as HTMLElement | null
      if (active?.tagName === 'TEXTAREA') active.blur()
      const ids = bs.getSelectedIds()
      bs.clearSelection()
      for (const id of ids) {
        z.mutate.page.delete({ id })
      }
      return
    }

    if (e.key === 'Tab') {
      e.preventDefault()
      const ids = bs.getSelectedIds()
      for (const id of ids) {
        const page = pages.find(p => p.id === id)
        if (!page) continue
        const currentIndent = page.indent ?? 0
        const newIndent = e.shiftKey
          ? Math.max(0, currentIndent - 1)
          : Math.min(MAX_INDENT, currentIndent + 1)
        if (newIndent !== currentIndent) {
          z.mutate.page.update({ id, indent: newIndent })
        }
      }
      return
    }

    if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
      e.preventDefault()
      const ids = bs.getSelectedIds()
      const filtered = orderedIds.filter(id => ids.includes(id))
      const texts: string[] = []
      for (const id of filtered) {
        const page = pages.find(p => p.id === id)
        if (page) {
          texts.push(page.content)
        } else {
          for (const parentId in childPagesMap ?? {}) {
            const child = childPagesMap?.[parentId]?.find(c => c.id === id)
            if (child) { texts.push(child.content); break }
          }
        }
      }
      navigator.clipboard.writeText(texts.join('\n')).catch(() => {})
      return
    }
  }, [pages, childPagesMap, z.mutate])

  // Text-to-block drag selection (Notion-style)
  const textDragOriginRect = useRef<DOMRect | null>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const pageEl = (e.target as HTMLElement).closest('[data-page-id]')
    if (!pageEl) return
    const pageId = pageEl.getAttribute('data-page-id')
    if (!pageId) return
    if ((e.target as HTMLElement).closest('button')) return
    if ((e.target as HTMLElement).closest('[draggable]')) return

    const bs = blockSelectionRef.current
    if ((e.target as HTMLElement).tagName === 'TEXTAREA') {
      const textarea = e.target as HTMLTextAreaElement
      bs.setTextDragOrigin(pageId)
      textDragOriginRect.current = textarea.getBoundingClientRect()
      return
    }

    bs.setTextDragOrigin(pageId)
    textDragOriginRect.current = pageEl.getBoundingClientRect()
  }, [])

  useEffect(() => {
    // Only attach document listeners when a text drag is in progress
    if (!blockSelection.textDragOriginId) return

    const handleDocMouseMove = (e: MouseEvent) => {
      if (!(e.buttons & 1)) return
      const bs = blockSelectionRef.current

      const originRect = textDragOriginRect.current
      if (!originRect) return

      const mouseY = e.clientY
      const isOutsideOrigin = mouseY < originRect.top - 5 || mouseY > originRect.bottom + 5

      if (isOutsideOrigin && !bs.isTextDragActive) {
        bs.activateTextDrag()
        window.getSelection()?.removeAllRanges()
      }

      if (bs.isTextDragActive) {
        e.preventDefault()
        window.getSelection()?.removeAllRanges()

        const el = document.elementFromPoint(e.clientX, e.clientY)
        const pageEl = el?.closest?.('[data-page-id]')
        if (pageEl) {
          const targetId = pageEl.getAttribute('data-page-id')
          if (targetId && bs.textDragOriginId) {
            bs.selectRange(bs.textDragOriginId, targetId, allOrderedIdsRef.current)
          }
        }
      }
    }

    const handleDocMouseUp = () => {
      const bs = blockSelectionRef.current
      if (bs.textDragOriginId) {
        bs.clearTextDrag()
        textDragOriginRect.current = null
      }
    }

    document.addEventListener('mousemove', handleDocMouseMove)
    document.addEventListener('mouseup', handleDocMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleDocMouseMove)
      document.removeEventListener('mouseup', handleDocMouseUp)
    }
  }, [blockSelection.textDragOriginId])

  const toggleCollapse = useCallback((pageId: string) => {
    setCollapsedIds(prev => {
      const next = new Set(prev)
      if (next.has(pageId)) next.delete(pageId)
      else next.add(pageId)
      return next
    })
  }, [])

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, pageId: string) => {
    setDraggedPageId(pageId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', pageId)
    // Style the drag ghost
    const target = e.currentTarget.closest('[data-page-id]') as HTMLElement | null
    if (target) {
      e.dataTransfer.setDragImage(target, 20, 20)
    }
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggedPageId(null)
    setDropIndicatorIndex(null)
    setDropTarget(null)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!draggedPageId) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'

    const container = containerRef.current
    if (!container) return

    const pageElements = container.querySelectorAll('[data-page-id]')
    
    // Build a flat list of all visible lines: main pages + folder children
    type LineInfo = { el: Element; pageId: string; type: 'main'; mainIndex: number } | { el: Element; pageId: string; type: 'child'; parentId: string; childIndex: number }
    const allLines: LineInfo[] = []
    
    pageElements.forEach((el) => {
      const pageId = el.getAttribute('data-page-id')
      if (!pageId) return
      
      const mainIdx = pages.findIndex(p => p.id === pageId)
      if (mainIdx !== -1) {
        allLines.push({ el, pageId, type: 'main', mainIndex: mainIdx })
      } else {
        // It's a folder child — find which parent it belongs to
        for (const parentPage of pages) {
          const children = childPagesMap?.[parentPage.id]?.filter(c => !pages.some(p => p.id === c.id)) ?? []
          const childIdx = children.findIndex(c => c.id === pageId)
          if (childIdx !== -1) {
            allLines.push({ el, pageId, type: 'child', parentId: parentPage.id, childIndex: childIdx })
            break
          }
        }
      }
    })
    
    // Find closest line
    let closestLine: LineInfo | null = null
    let closestAfter = true // true = drop after, false = drop before
    let minDistance = Infinity
    
    for (const line of allLines) {
      const rect = line.el.getBoundingClientRect()
      const midY = rect.top + rect.height / 2
      const distance = e.clientY - midY
      const absDist = Math.abs(distance)
      
      if (absDist < minDistance) {
        minDistance = absDist
        closestLine = line
        closestAfter = distance > 0
      }
    }
    
    if (!closestLine) {
      setDropTarget({ type: 'main', index: pages.length })
      setDropIndicatorIndex(pages.length)
      return
    }
    
    if (closestLine.type === 'main') {
      const idx = closestAfter ? closestLine.mainIndex + 1 : closestLine.mainIndex
      setDropTarget({ type: 'main', index: idx })
      setDropIndicatorIndex(idx)
    } else {
      const idx = closestAfter ? closestLine.childIndex + 1 : closestLine.childIndex
      setDropTarget({ type: 'child', parentId: closestLine.parentId, index: idx })
      setDropIndicatorIndex(null) // Don't show main drop indicator
    }
  }, [draggedPageId, pages, childPagesMap])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!draggedPageId || !dropTarget) {
      handleDragEnd()
      return
    }

    // Multi-select move: if dragged page is part of selection, move all selected
    const selectedIds = blockSelection.getSelectedIds()
    const isMultiMove = selectedIds.length > 1 && selectedIds.includes(draggedPageId)

    // Dropping into a folder's children
    if (dropTarget.type === 'child') {
      const parentPage = pages.find(p => p.id === dropTarget.parentId)
      if (!parentPage?.folderId) { handleDragEnd(); return }
      
      const children = childPagesMap?.[dropTarget.parentId]?.filter(c => !pages.some(p => p.id === c.id)) ?? []
      const insertIdx = dropTarget.index
      
      // Calculate order
      let order: number
      if (children.length === 0) {
        order = 0
      } else if (insertIdx <= 0) {
        order = (children[0]?.order ?? 0) - 1
      } else if (insertIdx >= children.length) {
        order = (children[children.length - 1]?.order ?? children.length - 1) + 1
      } else {
        const prev = children[insertIdx - 1]?.order ?? (insertIdx - 1)
        const next = children[insertIdx]?.order ?? insertIdx
        order = Math.floor((prev + next) / 2)
        if (order <= prev) {
          // No gap available — shift items at insertIdx and beyond to make room
          for (let i = insertIdx; i < children.length; i++) {
            z.mutate.page.update({ id: children[i].id, order: (children[i].order ?? i) + 2 })
          }
          order = prev + 1
        }
      }
      
      // Remove from main pages if it was there
      const draggedMainIdx = pages.findIndex(p => p.id === draggedPageId)
      if (draggedMainIdx !== -1) {
        // It's a main page being dropped into folder children
      }
      
      z.mutate.page.update({
        id: draggedPageId,
        order,
        indent: 0,
        parentPageId: dropTarget.parentId,
        folderId: parentPage.folderId,
      })
      
      setFocusPageId(draggedPageId)
      handleDragEnd()
      return
    }

    // Dropping into main pages list
    const dropIdx = dropTarget.index
    const draggedIndex = pages.findIndex(p => p.id === draggedPageId)
    
    if (draggedIndex === -1) {
      // Dragged page is a folder child — insert into main pages
      // Shift pages at and after drop position
      for (let i = dropIdx; i < pages.length; i++) {
        z.mutate.page.update({ id: pages[i].id, order: (pages[i].order ?? i) + 1 })
      }
      
      const targetOrder = dropIdx < pages.length
        ? (pages[dropIdx]?.order ?? dropIdx)
        : (pages[pages.length - 1]?.order ?? pages.length - 1) + 1
      
      z.mutate.page.update({
        id: draggedPageId,
        order: targetOrder,
        indent: 0,
        parentPageId: null,
        folderId: null,
      })
      
      setFocusPageId(draggedPageId)
      handleDragEnd()
      return
    }

    if (isMultiMove) {
      // Multi-select move: remove all selected pages, insert them at drop position
      const selectedSet = new Set(selectedIds)
      const remaining = pages.filter(p => !selectedSet.has(p.id))
      const movedPages = pages.filter(p => selectedSet.has(p.id))
      // Maintain their original relative order
      const insertAt = Math.min(dropIdx, remaining.length)
      const reordered = [...remaining.slice(0, insertAt), ...movedPages, ...remaining.slice(insertAt)]
      
      for (let i = 0; i < reordered.length; i++) {
        if ((reordered[i].order ?? 0) !== i) {
          z.mutate.page.update({ id: reordered[i].id, order: i })
        }
      }
      
      setFocusPageId(draggedPageId)
      handleDragEnd()
      return
    }

    let targetIndex = dropIdx
    if (targetIndex > draggedIndex) targetIndex--
    if (targetIndex === draggedIndex) { handleDragEnd(); return }

    const reordered = [...pages]
    const [moved] = reordered.splice(draggedIndex, 1)
    reordered.splice(targetIndex, 0, moved)

    for (let i = 0; i < reordered.length; i++) {
      const p = reordered[i]
      const needsUpdate = p.id === draggedPageId ? true : (p.order ?? 0) !== i
      if (needsUpdate) {
        const update: any = { id: p.id, order: i }
        if (p.id === draggedPageId) {
          update.indent = 0
          update.parentPageId = null
          update.folderId = null
        }
        z.mutate.page.update(update)
      }
    }

    setFocusPageId(draggedPageId)
    handleDragEnd()
  }, [draggedPageId, dropTarget, pages, childPagesMap, z.mutate, handleDragEnd])

  // Handle indent: check if the page should be linked to a folder
  const handleIndentLink = useCallback((pageId: string, pageIndex: number, newIndent: number) => {
    if (newIndent !== 1) return // Only link when going from 0 to 1
    
    // Walk backwards to find the root-level page (indent 0) this page falls under
    for (let i = pageIndex - 1; i >= 0; i--) {
      const candidate = pages[i]
      if ((candidate.indent ?? 0) === 0) {
        if (candidate.folderId) {
          // This root page has a folder — link the indented page to it
          // Convert to a folder child: set parentPageId, folderId, indent back to 0
          // (visual indent comes from indentOffset={1})
          z.mutate.page.update({
            id: pageId,
            indent: 0,
            parentPageId: candidate.id,
            folderId: candidate.folderId,
          })
        }
        break
      }
    }
  }, [pages, z.mutate])

  // Determine which pages have visual children (indented lines below them)
  const pagesWithChildren = useMemo(() => {
    const set = new Set<string>()
    for (let i = 0; i < pages.length; i++) {
      const pageIndent = pages[i].indent ?? 0
      if (i < pages.length - 1 && (pages[i + 1]?.indent ?? 0) > pageIndent) {
        set.add(pages[i].id)
      }
      // Also check folder children
      if ((childPagesMap?.[pages[i].id]?.length ?? 0) > 0) {
        set.add(pages[i].id)
      }
    }
    return set
  }, [pages, childPagesMap])
  
  useEffect(() => {
    if (focusPageId) {
      const timer = setTimeout(() => {
        setFocusPageId(null)
        setFocusCursorPos(undefined)
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [focusPageId])
  
  // Create a new page via Zero mutate
  const handleCreatePage = useCallback((afterIndex?: number, indent?: number, shouldFocus?: boolean, initialContent?: string, folderInfo?: { folderId: string; parentPageId: string }) => {
    if (isCreatingRef.current) return
    isCreatingRef.current = true
    
    try {
      // Calculate order with midpoint/shift logic
      let order: number
      if (afterIndex !== undefined && afterIndex < pages.length) {
        const currentOrder = pages[afterIndex].order ?? afterIndex
        const nextPage = pages[afterIndex + 1]
        if (nextPage) {
          const nextOrder = nextPage.order ?? (afterIndex + 1)
          if (nextOrder - currentOrder > 1) {
            order = Math.floor((currentOrder + nextOrder) / 2)
            if (order <= currentOrder) {
              for (let i = afterIndex + 1; i < pages.length; i++) {
                z.mutate.page.update({ id: pages[i].id, order: (pages[i].order ?? i) + 2 })
              }
              order = currentOrder + 1
            }
          } else {
            for (let i = afterIndex + 1; i < pages.length; i++) {
              z.mutate.page.update({ id: pages[i].id, order: (pages[i].order ?? i) + 2 })
            }
            order = currentOrder + 1
          }
        } else {
          order = currentOrder + 1
        }
      } else {
        const lastPage = pages[pages.length - 1]
        order = lastPage ? (lastPage.order ?? pages.length - 1) + 1 : 0
      }
      
      const newId = generateId()
      const finalIndent = indent ?? 0
      
      // Determine folder info
      let parentPageId: string | null | undefined = folderInfo?.parentPageId
      let folderId: string | null | undefined = folderInfo?.folderId
      if (!folderId && finalIndent > 0 && afterIndex !== undefined) {
        for (let i = afterIndex; i >= 0; i--) {
          if ((pages[i].indent ?? 0) === 0) {
            if (pages[i].folderId) {
              parentPageId = pages[i].id
              folderId = pages[i].folderId
            }
            break
          }
        }
      }
      
      const insertPayload = newPageInsert(z.userID, {
        id: newId,
        content: initialContent ?? '',
        indent: finalIndent,
        dailyDate: date,
        order,
        ...(folderId ? { folderId, parentPageId } : {}),
      })
      z.mutate.page.insert(insertPayload)
      
      if (shouldFocus) {
        setFocusPageId(newId)
        setFocusCursorPos(initialContent ? 0 : undefined)
      }
    } catch (err) {
      console.error('handleCreatePage error:', err)
    } finally {
      isCreatingRef.current = false
    }
  }, [date, pages, z.mutate, z.userID])
  
  // Create a child page under a folder-tagged parent
  const handleCreateChildPage = useCallback((
    parentPageId: string,
    folderId: string,
    afterChildIndex: number,
    shouldFocus: boolean,
    initialContent?: string
  ) => {
    if (isCreatingRef.current) return
    isCreatingRef.current = true

    try {
      const children = childPagesMap?.[parentPageId]?.filter(c => !pages.some(p => p.id === c.id)) ?? []
      let order: number

      if (afterChildIndex < 0 || children.length === 0) {
        const firstChild = children[0]
        order = firstChild ? (firstChild.order ?? 0) - 1 : 0
      } else {
        const current = children[afterChildIndex]
        const next = children[afterChildIndex + 1]
        const currentOrder = current?.order ?? afterChildIndex
        if (next) {
          const nextOrder = next.order ?? (afterChildIndex + 1)
          order = Math.floor((currentOrder + nextOrder) / 2)
          if (order <= currentOrder) order = currentOrder + 1
        } else {
          order = currentOrder + 1
        }
      }

      const newId = generateId()
      const insertPayload = newPageInsert(z.userID, {
        id: newId,
        content: initialContent ?? '',
        indent: 0,
        dailyDate: date,
        order,
        folderId,
        parentPageId,
      })
      z.mutate.page.insert(insertPayload)

      if (shouldFocus) {
        setFocusPageId(newId)
        setFocusCursorPos(initialContent ? 0 : undefined)
      }
    } catch (err) {
      console.error('handleCreateChildPage error:', err)
    } finally {
      isCreatingRef.current = false
    }
  }, [date, childPagesMap, pages, z.mutate, z.userID])

  // Update a page via Zero mutate
  const handleUpdatePage = useCallback((updatedPage: any) => {
    z.mutate.page.update({
      id: updatedPage.id,
      content: updatedPage.content,
      indent: updatedPage.indent,
      isTask: updatedPage.isTask,
      taskCompleted: updatedPage.taskCompleted,
      taskCompletedAt: updatedPage.taskCompletedAt,
      taskDate: updatedPage.taskDate,
      taskPriority: updatedPage.taskPriority,
      starred: updatedPage.starred,
      folderId: updatedPage.folderId,
    })
    
    if (updatedPage.isTask || updatedPage.taskCompleted !== undefined) {
      onTaskUpdate?.(updatedPage)
    }
  }, [z.mutate, onTaskUpdate])
  
  // Delete a page via Zero mutate
  const handleDeletePage = useCallback((pageId: string, deletedIndex?: number) => {
    if (deletedIndex !== undefined && deletedIndex > 0) {
      const prevPage = pages[deletedIndex - 1]
      if (prevPage) setFocusPageId(prevPage.id)
    }
    z.mutate.page.delete({ id: pageId })
  }, [pages, z.mutate])
  
  // Handle merge
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
    
    if (prevRef) prevRef.setContentAndFocus(newPrevContent, prevDisplayedLen)
    
    z.mutate.page.update({ id: prevPage.id, content: newPrevContent })
    z.mutate.page.delete({ id: currentPage.id })
  }, [pages, z.mutate])
  
  // Handle folder tagging
  const handleFolderTag = useCallback(async (taggedPageId: string, folderId: string) => {
    const taggedIndex = pages.findIndex(p => p.id === taggedPageId)
    if (taggedIndex === -1) return
    
    const taggedPage = pages[taggedIndex]
    const taggedIndent = taggedPage.indent ?? 0
    
    const childIds: string[] = []
    for (let i = taggedIndex + 1; i < pages.length; i++) {
      const page = pages[i]
      if ((page.indent ?? 0) <= taggedIndent) break
      childIds.push(page.id)
    }
    
    if (childIds.length === 0) return
    
    try {
      for (const childId of childIds) {
        z.mutate.page.update({ id: childId, parentPageId: taggedPageId, folderId })
      }
    } catch (error) {
      console.error('Failed to link children:', error)
    }
  }, [pages, z.mutate])

  const handleContainerClick = useCallback((e: React.MouseEvent) => {
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
          'text-base md:text-lg font-medium tracking-wide',
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
        onKeyDown={handleContainerKeyDown}
        onMouseDown={handleMouseDown}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragLeave={() => { setDropIndicatorIndex(null); setDropTarget(null) }}
        className={cn(
          'min-h-[180px] md:min-h-[220px] cursor-text',
          pages.length === 0 && 'flex items-start',
          blockSelection.isTextDragActive && 'select-none'
        )}
        tabIndex={-1}
      >
        {pages.length > 0 || projected.length > 0 || overdue.length > 0 ? (
          <div className="space-y-1">
            {/* Overdue tasks */}
            {isTodayDate && overdue.length > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', paddingLeft: '2px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#dc2626' }}>Overdue</span>
                  <span style={{ fontSize: '11px', color: '#dc2626', opacity: 0.6 }}>{overdue.length}</span>
                </div>
                {overdue.map((task) => (
                  <PageLine
                    key={`overdue-${task.id}`}
                    page={task as any}
                    dailyDate={task.dailyDate || undefined}
                    onUpdate={handleUpdatePage}
                    isProjected={true}
                  />
                ))}
                {(projected.length > 0 || pages.length > 0) && (
                  <div className="border-t border-dashed border-red-200 my-3" />
                )}
              </>
            )}
            
            {/* Projected tasks */}
            {projected.length > 0 && (
              <>
                {projected.map((task) => (
                  <PageLine
                    key={`projected-${task.id}`}
                    page={task as any}
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
            
            {/* Regular pages */}
            {pages.map((page, index) => {
              const pageIndent = page.indent ?? 0
              const hasVisualChildren = index < pages.length - 1 && 
                (pages[index + 1]?.indent ?? 0) > pageIndent
              const hasFolderChildren = (childPagesMap?.[page.id]?.length ?? 0) > 0
              const hasChildren = pagesWithChildren.has(page.id)
              const isTitle = pageIndent === 0 && (hasVisualChildren || hasFolderChildren)
              
              // Skip rendering if this page is a child of a collapsed parent
              // Walk backwards to find if any ancestor is collapsed
              let isHiddenByCollapse = false
              for (let j = index - 1; j >= 0; j--) {
                const ancestorIndent = pages[j].indent ?? 0
                if (ancestorIndent < pageIndent) {
                  if (collapsedIds.has(pages[j].id)) {
                    isHiddenByCollapse = true
                    break
                  }
                  if (ancestorIndent === 0) break
                }
              }
              if (isHiddenByCollapse) return null
              
              let needsMarginAfter = false
              const isRootLevel = pageIndent === 0
              const nextPage = pages[index + 1]
              const nextIndent = nextPage?.indent ?? 0
              
              if (isRootLevel && !isTitle) {
                if (nextPage) {
                  const nextHasVisualChildren = nextIndent === 0 && 
                    index + 1 < pages.length - 1 && 
                    (pages[index + 2]?.indent ?? 0) > nextIndent
                  const nextHasFolderChildren = (childPagesMap?.[nextPage.id]?.length ?? 0) > 0
                  const nextIsTitle = nextIndent === 0 && (nextHasVisualChildren || nextHasFolderChildren)
                  needsMarginAfter = nextIsTitle
                }
              } else if (!isRootLevel) {
                const isLastChild = !nextPage || nextIndent === 0
                if (isLastChild && nextPage) {
                  const nextHasVisualChildren = nextIndent === 0 && 
                    index + 1 < pages.length - 1 && 
                    (pages[index + 2]?.indent ?? 0) > nextIndent
                  const nextHasFolderChildren = (childPagesMap?.[nextPage.id]?.length ?? 0) > 0
                  const nextIsTitle = nextIndent === 0 && (nextHasVisualChildren || nextHasFolderChildren)
                  needsMarginAfter = !nextIsTitle
                }
              }
              
              return (
              <div key={page.id} style={{ marginBottom: needsMarginAfter ? '24px' : undefined, position: 'relative' }}>
                {/* Drop indicator */}
                {dropIndicatorIndex === index && draggedPageId && (
                  <div style={{
                    position: 'absolute',
                    top: '-2px',
                    left: '16px',
                    right: '16px',
                    height: '3px',
                    backgroundColor: '#3b82f6',
                    borderRadius: '2px',
                    zIndex: 10,
                    pointerEvents: 'none',
                  }} />
                )}
                {(() => {
                  const folderChildren = childPagesMap?.[page.id]?.filter(c => !pages.some(p => p.id === c.id)) ?? []
                  return (<>
                <PageLine
                  page={page as any}
                  dailyDate={date}
                  onUpdate={handleUpdatePage}
                  onDelete={(deletedIndex) => handleDeletePage(page.id, deletedIndex)}
                  onEnter={(indent, contentForNewLine) => {
                    if (page.folderId) {
                      handleCreateChildPage(page.id, page.folderId, -1, true, contentForNewLine)
                    } else {
                      handleCreatePage(index, indent, true, contentForNewLine)
                    }
                  }}
                  autoFocus={focusPageId === page.id || (index === pages.length - 1 && page.content === '')}
                  focusCursorPosition={focusPageId === page.id ? focusCursorPos : undefined}
                  placeholder={index === 0 ? "What's on your mind?" : ''}
                  allFolders={allFolders as any}
                  onFolderTag={handleFolderTag}
                  isTitle={isTitle}
                  hasChildren={hasChildren}
                  isCollapsed={collapsedIds.has(page.id)}
                  onToggleCollapse={() => toggleCollapse(page.id)}
                  onIndent={(newIndent: number) => handleIndentLink(page.id, index, newIndent)}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  isDragging={draggedPageId === page.id}
                  isBlockSelected={blockSelection.isSelected(page.id)}
                  onBlockClick={handleBlockClick}
                  index={index}
                  onMergeWithPrevious={handleMergeWithPrevious}
                  onNavigateUp={() => {
                    if (index > 0) {
                      const prevPage = pages[index - 1]
                      if (prevPage) {
                        const prevChildren = childPagesMap?.[prevPage.id]?.filter(c => !pages.some(p => p.id === c.id)) ?? []
                        if (prevChildren.length > 0 && !collapsedIds.has(prevPage.id)) {
                          const lastChild = prevChildren[prevChildren.length - 1]
                          pageLineRefs.current.get(lastChild.id)?.focus()
                        } else {
                          pageLineRefs.current.get(prevPage.id)?.focus()
                        }
                      }
                    }
                  }}
                  onNavigateDown={() => {
                    if (folderChildren.length > 0 && !collapsedIds.has(page.id)) {
                      pageLineRefs.current.get(folderChildren[0].id)?.focus(0)
                    } else {
                      // Skip over collapsed visual children
                      let nextIdx = index + 1
                      if (collapsedIds.has(page.id)) {
                        while (nextIdx < pages.length && (pages[nextIdx].indent ?? 0) > pageIndent) {
                          nextIdx++
                        }
                      }
                      if (nextIdx < pages.length) {
                        pageLineRefs.current.get(pages[nextIdx].id)?.focus(0)
                      }
                    }
                  }}
                  ref={(el: PageLineHandle | null) => {
                    if (el) pageLineRefs.current.set(page.id, el)
                    else pageLineRefs.current.delete(page.id)
                  }}
                />
                {/* Render folder children */}
                <div style={{
                  display: 'grid',
                  gridTemplateRows: collapsedIds.has(page.id) ? '0fr' : '1fr',
                  // FIX #10: Removed expensive grid-template-rows transition
                }}>
                <div style={{ overflow: 'hidden' }}>
                {folderChildren.map((child, childIndex) => (
                  <div key={child.id} style={{ position: 'relative' }}>
                  {/* Drop indicator between folder children */}
                  {dropTarget?.type === 'child' && dropTarget.parentId === page.id && dropTarget.index === childIndex && draggedPageId && (
                    <div style={{
                      position: 'absolute',
                      top: '-2px',
                      left: `${CHILD_DROP_INDENT}px`,
                      right: '16px',
                      height: '3px',
                      backgroundColor: '#3b82f6',
                      borderRadius: '2px',
                      zIndex: 10,
                      pointerEvents: 'none',
                    }} />
                  )}
                  <PageLine
                    key={child.id}
                    page={child as any}
                    dailyDate={date}
                    onUpdate={handleUpdatePage}
                    onDelete={() => {
                      if (childIndex > 0) setFocusPageId(folderChildren[childIndex - 1].id)
                      else setFocusPageId(page.id)
                      z.mutate.page.delete({ id: child.id })
                    }}
                    onEnter={(_indent, contentForNewLine) => {
                      if (page.folderId) {
                        handleCreateChildPage(page.id, page.folderId, childIndex, true, contentForNewLine)
                      }
                    }}
                    autoFocus={focusPageId === child.id}
                    focusCursorPosition={focusPageId === child.id ? focusCursorPos : undefined}
                    indentOffset={1}
                    hasChildren={(childPagesMap?.[child.id]?.length ?? 0) > 0}
                    isCollapsed={collapsedIds.has(child.id)}
                    onToggleCollapse={() => toggleCollapse(child.id)}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    isDragging={draggedPageId === child.id}
                    isBlockSelected={blockSelection.isSelected(child.id)}
                    onBlockClick={handleBlockClick}
                    onNavigateUp={() => {
                      if (childIndex > 0) pageLineRefs.current.get(folderChildren[childIndex - 1].id)?.focus()
                      else pageLineRefs.current.get(page.id)?.focus()
                    }}
                    onNavigateDown={() => {
                      const grandchildren = childPagesMap?.[child.id] ?? []
                      if (grandchildren.length > 0 && !collapsedIds.has(child.id)) {
                        pageLineRefs.current.get(grandchildren[0].id)?.focus(0)
                      } else if (childIndex < folderChildren.length - 1) {
                        pageLineRefs.current.get(folderChildren[childIndex + 1].id)?.focus(0)
                      } else if (index < pages.length - 1) {
                        pageLineRefs.current.get(pages[index + 1].id)?.focus(0)
                      }
                    }}
                    onUnlinkFromFolder={() => {
                      z.mutate.page.update({ id: child.id, parentPageId: null, folderId: null })
                    }}
                    ref={(el: PageLineHandle | null) => {
                      if (el) pageLineRefs.current.set(child.id, el)
                      else pageLineRefs.current.delete(child.id)
                    }}
                  />
                  {/* Render grandchildren (e.g., meeting transcriptions under @HH:MM) */}
                  {(() => {
                    const grandchildren = childPagesMap?.[child.id] ?? []
                    if (grandchildren.length === 0) return null
                    return (
                      <div style={{
                        display: 'grid',
                        gridTemplateRows: collapsedIds.has(child.id) ? '0fr' : '1fr',
                        // FIX #10: Removed expensive grid-template-rows transition
                      }}>
                      <div style={{ overflow: 'hidden' }}>
                      {grandchildren.map((gc, gcIndex) => (
                        <PageLine
                          key={gc.id}
                          page={gc as any}
                          dailyDate={date}
                          onUpdate={handleUpdatePage}
                          onDelete={() => {
                            if (gcIndex > 0) setFocusPageId(grandchildren[gcIndex - 1].id)
                            else setFocusPageId(child.id)
                            z.mutate.page.delete({ id: gc.id })
                          }}
                          autoFocus={focusPageId === gc.id}
                          focusCursorPosition={focusPageId === gc.id ? focusCursorPos : undefined}
                          indentOffset={2}
                          onDragStart={handleDragStart}
                          onDragEnd={handleDragEnd}
                          isDragging={draggedPageId === gc.id}
                          onNavigateUp={() => {
                            if (gcIndex > 0) pageLineRefs.current.get(grandchildren[gcIndex - 1].id)?.focus()
                            else pageLineRefs.current.get(child.id)?.focus()
                          }}
                          onNavigateDown={() => {
                            if (gcIndex < grandchildren.length - 1) pageLineRefs.current.get(grandchildren[gcIndex + 1].id)?.focus(0)
                            else if (childIndex < folderChildren.length - 1) pageLineRefs.current.get(folderChildren[childIndex + 1].id)?.focus(0)
                            else if (index < pages.length - 1) pageLineRefs.current.get(pages[index + 1].id)?.focus(0)
                          }}
                          ref={(el: PageLineHandle | null) => {
                            if (el) pageLineRefs.current.set(gc.id, el)
                            else pageLineRefs.current.delete(gc.id)
                          }}
                        />
                      ))}
                      </div>
                      </div>
                    )
                  })()}
                  </div>
                ))}
                {/* Drop indicator after last folder child */}
                {dropTarget?.type === 'child' && dropTarget.parentId === page.id && dropTarget.index === folderChildren.length && draggedPageId && (
                  <div style={{
                    position: 'relative',
                    height: '3px',
                    marginLeft: `${CHILD_DROP_INDENT}px`,
                    marginRight: '16px',
                    backgroundColor: '#3b82f6',
                    borderRadius: '2px',
                    zIndex: 10,
                    pointerEvents: 'none',
                  }} />
                )}
                </div>
                </div>
                </>)
                })()}
              </div>
              );
            })}
            
            {/* Drop indicator at end */}
            {dropIndicatorIndex === pages.length && draggedPageId && (
              <div style={{
                position: 'relative',
                height: '3px',
                marginLeft: '16px',
                marginRight: '16px',
                backgroundColor: '#3b82f6',
                borderRadius: '2px',
                zIndex: 10,
                pointerEvents: 'none',
              }} />
            )}
            
            {/* Add new line button */}
            <button
              onClick={() => handleCreatePage(pages.length - 1, 0, true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                paddingTop: '8px', paddingBottom: '8px', paddingLeft: '0',
                width: '100%', background: 'none', border: 'none', cursor: 'text', textAlign: 'left',
              }}
            >
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#e5e7eb' }} />
              <span style={{ color: '#d1d5db', fontSize: '16px' }}>Click to add...</span>
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
})
