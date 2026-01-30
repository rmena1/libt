'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useZero, useQuery } from '@rocicorp/zero/react'
import { type ZeroPage, type ZeroFolder, newPageInsert } from '@/zero/hooks'
import { useToast } from '@/components/providers/toast-provider'
import { useRouter } from 'next/navigation'
import { PageLine } from '@/components/daily/page-line'
import { debounce, generateId } from '@/lib/utils'

interface NoteFullViewProps {
  noteId: string
  folderSlug: string
}

export function NoteFullView({ noteId, folderSlug }: NoteFullViewProps) {
  const z = useZero()
  const router = useRouter()
  const { showError } = useToast()

  const [noteResult] = useQuery(z.query.page.where('id', noteId).limit(1))
  const note = noteResult?.[0] as ZeroPage | undefined

  const [folderResult] = useQuery(z.query.folder.where('slug', folderSlug).limit(1))
  const folder = folderResult?.[0] as ZeroFolder | undefined

  const [childPages] = useQuery(
    z.query.page.where('parentPageId', noteId).orderBy('order', 'asc').orderBy('createdAt', 'asc')
  )

  const [title, setTitle] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isStarred, setIsStarred] = useState(false)
  const isCreatingRef = useRef(false)
  const [focusPageId, setFocusPageId] = useState<string | null>(null)
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const lastSavedTitle = useRef('')
  const containerRef = useRef<HTMLDivElement>(null)

  // Sync title from Zero
  useEffect(() => {
    if (note) {
      if (title === '' || title === lastSavedTitle.current) {
        setTitle(note.content)
        lastSavedTitle.current = note.content
      }
      setIsStarred(note.starred ?? false)
    }
  }, [note?.content, note?.starred]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleStarToggle = async () => {
    if (!note) return
    const newStarred = !isStarred
    setIsStarred(newStarred)
    try { await z.mutate.page.update({ id: note.id, starred: newStarred }) }
    catch (error) { setIsStarred(!newStarred); console.error('Failed to toggle star:', error); showError('Failed to update star.') }
  }

  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = 'auto'
      titleRef.current.style.height = Math.max(titleRef.current.scrollHeight, 40) + 'px'
    }
  }, [title])

  useEffect(() => {
    if (titleRef.current && note) {
      titleRef.current.focus()
      const len = titleRef.current.value.length
      titleRef.current.setSelectionRange(len, len)
    }
  }, [!!note]) // eslint-disable-line react-hooks/exhaustive-deps

  const debouncedSaveTitle = useMemo(
    () => debounce(async (newTitle: string) => {
      if (!note || newTitle === lastSavedTitle.current) return
      setIsSaving(true)
      try {
        await z.mutate.page.update({ id: note.id, content: newTitle })
        lastSavedTitle.current = newTitle; setLastSaved(new Date())
      } catch (error) { console.error('Failed to save title:', error); showError('Failed to save title.') }
      finally { setIsSaving(false) }
    }, 500),
    [note?.id, z.mutate, showError]
  )

  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTitle(e.target.value); debouncedSaveTitle(e.target.value)
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCreateChild(undefined, 0) }
  }

  const handleTitleBlur = async () => {
    if (!note || title === lastSavedTitle.current) return
    debouncedSaveTitle.cancel(); setIsSaving(true)
    try {
      await z.mutate.page.update({ id: note.id, content: title })
      lastSavedTitle.current = title; setLastSaved(new Date())
    } catch (error) { console.error('Failed to save title:', error); showError('Failed to save title.') }
    finally { setIsSaving(false) }
  }

  const handleCreateChild = useCallback(async (afterIndex?: number, indent?: number) => {
    if (isCreatingRef.current || !note) return
    isCreatingRef.current = true
    const safetyTimeout = setTimeout(() => { isCreatingRef.current = false }, 5000)
    try {
      const order = afterIndex !== undefined ? afterIndex + 1 : (childPages?.length ?? 0)
      const newId = generateId()
      await z.mutate.page.insert(newPageInsert(z.userID, {
        id: newId, content: '', indent: indent ?? 0, parentPageId: note.id,
        dailyDate: note.dailyDate || undefined, folderId: folder?.id, order,
      }))
      setFocusPageId(newId)
    } catch (error) { console.error('Failed to create line:', error); showError('Failed to create line.') }
    finally { clearTimeout(safetyTimeout); isCreatingRef.current = false }
  }, [note, childPages?.length, folder?.id, z.mutate, z.userID, showError])

  const handleUpdateChild = useCallback((updatedPage: any) => {
    z.mutate.page.update({
      id: updatedPage.id, content: updatedPage.content, indent: updatedPage.indent,
      isTask: updatedPage.isTask, taskCompleted: updatedPage.taskCompleted,
      taskDate: updatedPage.taskDate, taskPriority: updatedPage.taskPriority, starred: updatedPage.starred,
    })
    setLastSaved(new Date())
  }, [z.mutate])

  const handleDeleteChild = useCallback((pageId: string) => {
    z.mutate.page.delete({ id: pageId })
  }, [z.mutate])

  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    if (e.target === containerRef.current) handleCreateChild()
  }, [handleCreateChild])

  const handleBack = async () => {
    if (note && title !== lastSavedTitle.current) {
      debouncedSaveTitle.cancel()
      await z.mutate.page.update({ id: note.id, content: title })
    }
    router.push(`/folders/${folderSlug}`)
  }

  const savedText = lastSaved ? `Saved ${lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : null

  if (!note || !folder) return <div style={{ padding: '40px', textAlign: 'center', color: '#8e8e93' }}>Loading...</div>

  const children = (childPages ?? []) as ZeroPage[]

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', width: '100%' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 30, backgroundColor: 'rgba(255, 255, 255, 0.92)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(0, 0, 0, 0.06)' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={handleBack}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', marginLeft: '-12px', background: 'none', border: 'none', cursor: 'pointer', color: '#007aff', fontSize: '15px', fontWeight: 500, borderRadius: '8px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            {folder.name}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={handleStarToggle}
              style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: isStarred ? '#eab308' : '#c7c7cc', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title={isStarred ? 'Remove from starred' : 'Add to starred'}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill={isStarred ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </button>
            <div style={{ fontSize: '13px', color: isSaving ? '#8e8e93' : '#c7c7cc', fontWeight: 400 }}>
              {isSaving ? 'Saving...' : savedText || ''}
            </div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, maxWidth: '720px', width: '100%', margin: '0 auto', padding: '32px 20px 120px' }}>
        <textarea ref={titleRef} value={title} onChange={handleTitleChange} onKeyDown={handleTitleKeyDown} onBlur={handleTitleBlur}
          placeholder="Note title..." rows={1}
          style={{ width: '100%', border: 'none', outline: 'none', resize: 'none', fontSize: '24px', fontWeight: 700, lineHeight: '1.3', color: '#1a1a1a', backgroundColor: 'transparent', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', caretColor: '#007aff', letterSpacing: '-0.025em', padding: '0', marginBottom: '16px' }} />

        <div ref={containerRef} onClick={handleContainerClick} style={{ minHeight: '200px', cursor: 'text' }}>
          {children.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {children.map((child, index) => (
                <PageLine key={child.id} page={child as any} onUpdate={handleUpdateChild}
                  onDelete={() => handleDeleteChild(child.id)}
                  onEnter={(indent) => handleCreateChild(index, indent)}
                  autoFocus={child.id === focusPageId}
                  placeholder={index === 0 ? 'Start writing...' : ''} />
              ))}
              <button onClick={() => handleCreateChild(children.length - 1, 0)}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '8px', paddingBottom: '8px', paddingLeft: '0', width: '100%', background: 'none', border: 'none', cursor: 'text', textAlign: 'left' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#e5e7eb' }} />
                <span style={{ color: '#d1d5db', fontSize: '16px' }}>Click to add...</span>
              </button>
            </div>
          ) : (
            <button onClick={() => handleCreateChild()}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c7c7cc', fontSize: '16px', padding: '8px 0', textAlign: 'left', width: '100%' }}>
              Press Enter on the title or click here to start writing...
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
