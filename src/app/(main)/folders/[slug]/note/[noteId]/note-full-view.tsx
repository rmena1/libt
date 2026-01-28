'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { type Page, type Folder } from '@/lib/db'
import { updatePage, createPage, deletePage, togglePageStarred } from '@/lib/actions/pages'
import { useToast } from '@/components/providers/toast-provider'
import { useRouter } from 'next/navigation'
import { PageLine } from '@/components/daily/page-line'
import { debounce } from '@/lib/utils'

interface NoteFullViewProps {
  note: Page
  childPages: Page[]
  folder: Folder
  folderSlug: string
}

export function NoteFullView({ note, childPages: initialChildPages, folder, folderSlug }: NoteFullViewProps) {
  const [title, setTitle] = useState(note.content)
  const [children, setChildren] = useState<Page[]>(initialChildPages)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isStarred, setIsStarred] = useState(note.starred ?? false)
  const isCreatingRef = useRef(false)
  const [focusPageId, setFocusPageId] = useState<string | null>(null)
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const lastSavedTitle = useRef(note.content)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { showError } = useToast()
  
  // Handle star toggle
  const handleStarToggle = async () => {
    const newStarred = !isStarred
    setIsStarred(newStarred) // Optimistic update
    try {
      const updated = await togglePageStarred(note.id)
      setIsStarred(updated.starred ?? false)
    } catch (error) {
      setIsStarred(!newStarred) // Revert on error
      console.error('Failed to toggle star:', error)
      showError('Failed to update star.')
    }
  }

  // Auto-resize title textarea
  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = 'auto'
      titleRef.current.style.height = Math.max(titleRef.current.scrollHeight, 40) + 'px'
    }
  }, [title])

  // Focus title on mount
  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.focus()
      const len = titleRef.current.value.length
      titleRef.current.setSelectionRange(len, len)
    }
  }, [])

  // Debounced save for title
  const debouncedSaveTitle = useMemo(
    () => debounce(async (newTitle: string) => {
      if (newTitle === lastSavedTitle.current) return
      setIsSaving(true)
      try {
        await updatePage(note.id, { content: newTitle })
        lastSavedTitle.current = newTitle
        setLastSaved(new Date())
      } catch (error) {
        console.error('Failed to save title:', error)
        showError('Failed to save title.')
      } finally {
        setIsSaving(false)
      }
    }, 500),
    [note.id, showError]
  )

  // Handle title change
  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newTitle = e.target.value
    setTitle(newTitle)
    debouncedSaveTitle(newTitle)
  }

  // Handle title key events
  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      // Create first child page (at position 0)
      handleCreateChild(undefined, 0)
    }
  }

  // Save title on blur
  const handleTitleBlur = async () => {
    if (title !== lastSavedTitle.current) {
      debouncedSaveTitle.cancel()
      setIsSaving(true)
      try {
        await updatePage(note.id, { content: title })
        lastSavedTitle.current = title
        setLastSaved(new Date())
      } catch (error) {
        console.error('Failed to save title:', error)
        showError('Failed to save title.')
      } finally {
        setIsSaving(false)
      }
    }
  }

  // Create a child page
  const handleCreateChild = useCallback(async (afterIndex?: number, indent?: number) => {
    if (isCreatingRef.current) return
    isCreatingRef.current = true
    
    const safetyTimeout = setTimeout(() => {
      isCreatingRef.current = false
    }, 5000)
    
    try {
      const order = afterIndex !== undefined ? afterIndex + 1 : children.length
      const newPage = await createPage({
        content: '',
        indent: indent ?? 0,
        parentPageId: note.id,
        dailyDate: note.dailyDate || undefined,
        folderId: folder.id,
        order,
      })

      setChildren(prev => {
        const newList = [...prev]
        if (afterIndex !== undefined) {
          newList.splice(afterIndex + 1, 0, newPage)
        } else {
          newList.push(newPage)
        }
        return newList
      })

      // Set focus to the new page
      setFocusPageId(newPage.id)
    } catch (error) {
      console.error('Failed to create line:', error)
      showError('Failed to create line.')
    } finally {
      clearTimeout(safetyTimeout)
      isCreatingRef.current = false
    }
  }, [children.length, note.id, showError])

  // Update a child page
  const handleUpdateChild = useCallback((updatedPage: Page) => {
    setChildren(prev => prev.map(p => p.id === updatedPage.id ? updatedPage : p))
    setLastSaved(new Date())
  }, [])

  // Delete a child page
  const handleDeleteChild = useCallback((pageId: string) => {
    setChildren(prev => prev.filter(p => p.id !== pageId))
  }, [])

  // Click on empty area to create new child
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    if (e.target === containerRef.current) {
      handleCreateChild()
    }
  }, [handleCreateChild])

  // Navigate back
  const handleBack = async () => {
    // Save title immediately before navigating
    if (title !== lastSavedTitle.current) {
      debouncedSaveTitle.cancel()
      await updatePage(note.id, { content: title })
    }
    router.push(`/folders/${folderSlug}`)
  }

  // Format last saved time
  const savedText = lastSaved
    ? `Saved ${lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : null

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          backgroundColor: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
        }}
      >
        <div
          style={{
            maxWidth: '720px',
            margin: '0 auto',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Back button */}
          <button
            onClick={handleBack}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              marginLeft: '-12px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#007aff',
              fontSize: '15px',
              fontWeight: 500,
              borderRadius: '8px',
              transition: 'background-color 150ms ease',
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
            {folder.name}
          </button>

          {/* Star button + Save indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={handleStarToggle}
              style={{
                padding: '6px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: isStarred ? '#eab308' : '#c7c7cc',
                borderRadius: '6px',
                transition: 'color 150ms ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title={isStarred ? "Remove from starred" : "Add to starred"}
            >
              <svg 
                width="18" 
                height="18" 
                viewBox="0 0 24 24" 
                fill={isStarred ? "currentColor" : "none"}
                stroke="currentColor" 
                strokeWidth="2"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </button>
            
            <div
              style={{
                fontSize: '13px',
                color: isSaving ? '#8e8e93' : '#c7c7cc',
                fontWeight: 400,
                transition: 'color 200ms ease',
              }}
            >
              {isSaving ? 'Saving...' : savedText || ''}
            </div>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div
        style={{
          flex: 1,
          maxWidth: '720px',
          width: '100%',
          margin: '0 auto',
          padding: '32px 20px 120px',
        }}
      >
        {/* Title input */}
        <textarea
          ref={titleRef}
          value={title}
          onChange={handleTitleChange}
          onKeyDown={handleTitleKeyDown}
          onBlur={handleTitleBlur}
          placeholder="Note title..."
          rows={1}
          style={{
            width: '100%',
            border: 'none',
            outline: 'none',
            resize: 'none',
            fontSize: '24px',
            fontWeight: 700,
            lineHeight: '1.3',
            color: '#1a1a1a',
            backgroundColor: 'transparent',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            caretColor: '#007aff',
            letterSpacing: '-0.025em',
            padding: '0',
            marginBottom: '16px',
          }}
        />

        {/* Content lines - PageLine editor */}
        <div
          ref={containerRef}
          onClick={handleContainerClick}
          style={{
            minHeight: '200px',
            cursor: 'text',
          }}
        >
          {children.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {children.map((child, index) => (
                <PageLine
                  key={child.id}
                  page={child}
                  onUpdate={handleUpdateChild}
                  onDelete={() => handleDeleteChild(child.id)}
                  onEnter={(indent) => handleCreateChild(index, indent)}
                  autoFocus={child.id === focusPageId}
                  placeholder={index === 0 ? 'Start writing...' : ''}
                />
              ))}
              
              {/* Add new line button */}
              <button
                onClick={() => handleCreateChild(children.length - 1, 0)}
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
              onClick={() => handleCreateChild()}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#c7c7cc',
                fontSize: '16px',
                padding: '8px 0',
                textAlign: 'left',
                width: '100%',
              }}
            >
              Press Enter on the title or click here to start writing...
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
