'use client'

import { createContext, useContext, useState, useCallback, useRef, useMemo, type ReactNode } from 'react'

interface BlockSelectionContextType {
  selectedIds: Set<string>
  anchorId: string | null
  select: (id: string) => void
  setAnchor: (id: string) => void
  toggleSelect: (id: string) => void
  selectRange: (fromId: string, toId: string, allIds: string[]) => void
  selectAll: (allIds: string[]) => void
  clearSelection: () => void
  isSelected: (id: string) => boolean
  hasSelection: () => boolean
  getSelectedIds: () => string[]
  // Drag selection
  isDragSelecting: boolean
  startDragSelection: (id: string) => void
  updateDragSelection: (id: string, allIds: string[]) => void
  endDragSelection: () => void
  dragAnchorId: string | null
  // Textarea-originated drag (Notion-style)
  textDragOriginId: string | null
  setTextDragOrigin: (id: string) => void
  activateTextDrag: () => void
  clearTextDrag: () => void
  isTextDragActive: boolean
}

const BlockSelectionContext = createContext<BlockSelectionContextType | null>(null)

export function BlockSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [anchorId, setAnchorId] = useState<string | null>(null)
  const [isDragSelecting, setIsDragSelecting] = useState(false)
  const [dragAnchorId, setDragAnchorId] = useState<string | null>(null)
  const [textDragOriginId, setTextDragOriginIdState] = useState<string | null>(null)
  const [isTextDragActive, setIsTextDragActive] = useState(false)

  // Refs for stable callbacks that read current state
  const selectedIdsRef = useRef(selectedIds)
  selectedIdsRef.current = selectedIds
  const dragAnchorIdRef = useRef(dragAnchorId)
  dragAnchorIdRef.current = dragAnchorId
  const textDragOriginIdRef = useRef(textDragOriginId)
  textDragOriginIdRef.current = textDragOriginId

  const select = useCallback((id: string) => {
    setSelectedIds(new Set([id]))
    setAnchorId(id)
  }, [])

  const setAnchor = useCallback((id: string) => {
    setAnchorId(id)
  }, [])

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
    setAnchorId(id)
  }, [])

  const selectRange = useCallback((fromId: string, toId: string, allIds: string[]) => {
    const fromIndex = allIds.indexOf(fromId)
    const toIndex = allIds.indexOf(toId)
    if (fromIndex === -1 || toIndex === -1) return
    const start = Math.min(fromIndex, toIndex)
    const end = Math.max(fromIndex, toIndex)
    const range = new Set(allIds.slice(start, end + 1))
    setSelectedIds(range)
  }, [])

  const selectAll = useCallback((allIds: string[]) => {
    setSelectedIds(new Set(allIds))
    if (allIds.length > 0) setAnchorId(allIds[0])
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
    setAnchorId(null)
  }, [])

  // Stable callbacks using refs — don't depend on selectedIds
  const isSelected = useCallback((id: string) => {
    return selectedIdsRef.current.has(id)
  }, [])

  const hasSelection = useCallback(() => {
    return selectedIdsRef.current.size > 0
  }, [])

  const getSelectedIds = useCallback(() => {
    return Array.from(selectedIdsRef.current)
  }, [])

  // Drag selection
  const startDragSelection = useCallback((id: string) => {
    setIsDragSelecting(true)
    setDragAnchorId(id)
    setSelectedIds(new Set([id]))
    setAnchorId(id)
  }, [])

  const updateDragSelection = useCallback((id: string, allIds: string[]) => {
    const anchor = dragAnchorIdRef.current
    if (!anchor) return
    const fromIndex = allIds.indexOf(anchor)
    const toIndex = allIds.indexOf(id)
    if (fromIndex === -1 || toIndex === -1) return
    const start = Math.min(fromIndex, toIndex)
    const end = Math.max(fromIndex, toIndex)
    setSelectedIds(new Set(allIds.slice(start, end + 1)))
  }, [])

  const endDragSelection = useCallback(() => {
    setIsDragSelecting(false)
    setDragAnchorId(null)
  }, [])

  // Textarea-originated drag (Notion-style)
  const setTextDragOrigin = useCallback((id: string) => {
    setTextDragOriginIdState(id)
    setIsTextDragActive(false)
  }, [])

  const activateTextDrag = useCallback(() => {
    const origin = textDragOriginIdRef.current
    if (origin) {
      setIsTextDragActive(true)
      setSelectedIds(new Set([origin]))
      setAnchorId(origin)
    }
  }, [])

  const clearTextDrag = useCallback(() => {
    setTextDragOriginIdState(null)
    setIsTextDragActive(false)
  }, [])

  const value = useMemo<BlockSelectionContextType>(() => ({
    selectedIds,
    anchorId,
    select,
    setAnchor,
    toggleSelect,
    selectRange,
    selectAll,
    clearSelection,
    isSelected,
    hasSelection,
    getSelectedIds,
    isDragSelecting,
    startDragSelection,
    updateDragSelection,
    endDragSelection,
    dragAnchorId,
    textDragOriginId,
    setTextDragOrigin,
    activateTextDrag,
    clearTextDrag,
    isTextDragActive,
  }), [
    selectedIds, anchorId, isDragSelecting, dragAnchorId, textDragOriginId, isTextDragActive,
    select, setAnchor, toggleSelect, selectRange, selectAll, clearSelection,
    isSelected, hasSelection, getSelectedIds,
    startDragSelection, updateDragSelection, endDragSelection,
    setTextDragOrigin, activateTextDrag, clearTextDrag,
  ])

  return (
    <BlockSelectionContext.Provider value={value}>
      {children}
    </BlockSelectionContext.Provider>
  )
}

export function useBlockSelection() {
  const context = useContext(BlockSelectionContext)
  if (!context) {
    throw new Error('useBlockSelection must be used within a BlockSelectionProvider')
  }
  return context
}
