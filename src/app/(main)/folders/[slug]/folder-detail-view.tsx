'use client'

import { useState, useCallback, useMemo } from 'react'
import { useZero, useQuery } from '@rocicorp/zero/react'
import { type ZeroFolder, type ZeroPage, newPageInsert, newFolderInsert } from '@/zero/hooks'
import { useToast } from '@/components/providers/toast-provider'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { generateId } from '@/lib/utils'

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function getNoteTitle(content: string): string {
  if (!content?.trim()) return 'Untitled'
  return content.split('\n').find(l => l.trim().length > 0)?.trim() || 'Untitled'
}

function getNotePreview(content: string): string {
  if (!content?.trim()) return 'No additional text'
  const lines = content.split('\n').filter(l => l.trim().length > 0)
  if (lines.length <= 1) return 'No additional text'
  return lines.slice(1).join(' ').trim().substring(0, 100)
}

function formatNoteDate(date: string | number | null): string {
  if (!date) return ''
  const d = new Date(date)
  const now = new Date()
  const days = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: now.getFullYear() !== d.getFullYear() ? 'numeric' : undefined })
}

interface FolderDetailViewProps { folderSlug: string }

export function FolderDetailView({ folderSlug }: FolderDetailViewProps) {
  const z = useZero()
  const router = useRouter()
  const { showError, showSuccess } = useToast()

  const [folderResult] = useQuery(z.query.folder.where('slug', folderSlug).limit(1))
  const folder = folderResult?.[0] as ZeroFolder | undefined

  const [pages] = useQuery(
    folder ? z.query.page.where('folderId', folder.id).where('parentPageId', 'IS', null).orderBy('order', 'asc').orderBy('createdAt', 'asc') : undefined
  )

  const [childFolders] = useQuery(
    folder ? z.query.folder.where('parentId', folder.id).orderBy('order', 'asc').orderBy('name', 'asc') : undefined
  )

  const breadcrumbs = useMemo(() => folder ? [folder as ZeroFolder] : [], [folder])

  const [isCreatingNote, setIsCreatingNote] = useState(false)
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [isRenaming, setIsRenaming] = useState(false)
  const [renamingValue, setRenamingValue] = useState('')

  const handleCreateNote = async () => {
    if (isCreatingNote || !folder) return
    setIsCreatingNote(true)
    try {
      const newId = generateId()
      await z.mutate.page.insert(newPageInsert(z.userID, { id: newId, content: '', folderId: folder.id, order: (pages?.length ?? 0) }))
      router.push(`/folders/${folder.slug}/note/${newId}`)
    } catch (error) {
      console.error('Failed to create note:', error)
      showError('Failed to create note')
      setIsCreatingNote(false)
    }
  }

  const handleCreateSubfolder = async () => {
    if (!newFolderName.trim() || !folder) return
    try {
      await z.mutate.folder.insert(newFolderInsert(z.userID, {
        id: generateId(), name: newFolderName.trim(), slug: slugify(newFolderName.trim()),
        parentId: folder.id, order: (childFolders?.length ?? 0),
      }))
      setNewFolderName(''); setIsCreatingFolder(false)
      showSuccess('Subfolder created')
    } catch (error) {
      console.error('Failed to create subfolder:', error)
      showError('Failed to create subfolder')
    }
  }

  const handleRename = async () => {
    if (!folder || !renamingValue.trim() || renamingValue.trim() === folder.name) {
      setIsRenaming(false); setRenamingValue(folder?.name ?? ''); return
    }
    try {
      await z.mutate.folder.update({ id: folder.id, name: renamingValue.trim(), slug: slugify(renamingValue.trim()) })
      showSuccess('Folder renamed')
    } catch (error) {
      console.error('Failed to rename:', error); showError('Failed to rename folder')
      setRenamingValue(folder.name)
    }
    setIsRenaming(false)
  }

  const handleDeleteFolder = async () => {
    if (!folder || !confirm(`Delete "${folder.name}"? Notes inside will be unlinked, not deleted.`)) return
    try {
      await z.mutate.folder.delete({ id: folder.id }); showSuccess('Folder deleted'); router.push('/folders')
    } catch (error) {
      console.error('Failed to delete folder:', error); showError('Failed to delete folder')
    }
  }

  const handleDeleteNote = useCallback(async (pageId: string) => {
    try { await z.mutate.page.delete({ id: pageId }) } catch (error) { console.error('Failed to delete note:', error); showError('Failed to delete note') }
  }, [z.mutate, showError])

  const handleRemoveFromFolder = useCallback(async (pageId: string) => {
    try { await z.mutate.page.update({ id: pageId, folderId: null }); showSuccess('Note removed from folder') }
    catch (error) { console.error('Failed to remove note:', error); showError('Failed to remove note from folder') }
  }, [z.mutate, showError, showSuccess])

  if (!folder) return <div style={{ padding: '40px', textAlign: 'center', color: '#8e8e93' }}>Loading folder...</div>

  const safePages = (pages ?? []) as ZeroPage[]
  const safeChildFolders = (childFolders ?? []) as ZeroFolder[]

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fafafa', width: '100%' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 20, backgroundColor: 'rgba(250, 250, 250, 0.88)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(0, 0, 0, 0.04)' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '12px 20px 16px' }}>
          <nav style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <Link href="/folders" style={{ fontSize: '13px', color: '#007aff', textDecoration: 'none' }}>Folders</Link>
            {breadcrumbs.map((crumb) => (
              <span key={crumb.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#c7c7cc" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                <span style={{ fontSize: '13px', color: '#8e8e93' }}>{crumb.name}</span>
              </span>
            ))}
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#007aff" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
            {isRenaming ? (
              <input value={renamingValue} onChange={(e) => setRenamingValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') { setIsRenaming(false); setRenamingValue(folder.name) } }}
                onBlur={handleRename} autoFocus
                style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.025em', border: 'none', outline: 'none', backgroundColor: 'transparent', padding: 0, width: '100%' }} />
            ) : (
              <h1 onClick={() => { setIsRenaming(true); setRenamingValue(folder.name) }}
                style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.025em', cursor: 'pointer', flex: 1 }}>{folder.name}</h1>
            )}
            <button onClick={handleDeleteFolder}
              style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#c7c7cc', borderRadius: '6px', flexShrink: 0 }} title="Delete folder">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '8px 20px 120px' }}>
        {(safeChildFolders.length > 0 || isCreatingFolder) && (
          <section style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 600, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', padding: '0 4px' }}>Subfolders</h2>
            <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid rgba(0, 0, 0, 0.04)', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)', overflow: 'hidden' }}>
              {safeChildFolders.map((child, index) => (
                <Link key={child.id} href={`/folders/${child.slug}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderBottom: index < safeChildFolders.length - 1 ? '1px solid rgba(0, 0, 0, 0.04)' : 'none', textDecoration: 'none', color: '#1a1a1a', fontSize: '15px', fontWeight: 500 }}>
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#007aff" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                  </svg>
                  {child.name}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c7c7cc" strokeWidth={2} style={{ marginLeft: 'auto' }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <button onClick={handleCreateNote} disabled={isCreatingNote}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid rgba(0, 0, 0, 0.06)', cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: '#007aff' }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            Add Note
          </button>
          {!isCreatingFolder ? (
            <button onClick={() => setIsCreatingFolder(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid rgba(0, 0, 0, 0.06)', cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: '#8e8e93' }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              Subfolder
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '6px', flex: 1 }}>
              <input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateSubfolder(); if (e.key === 'Escape') { setIsCreatingFolder(false); setNewFolderName('') } }}
                placeholder="Subfolder name..." autoFocus
                style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(0, 0, 0, 0.1)', fontSize: '13px', outline: 'none' }} />
              <button onClick={handleCreateSubfolder} disabled={!newFolderName.trim()}
                style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', backgroundColor: '#007aff', color: 'white', fontSize: '13px', fontWeight: 600, cursor: newFolderName.trim() ? 'pointer' : 'not-allowed', opacity: newFolderName.trim() ? 1 : 0.5 }}>Create</button>
            </div>
          )}
        </div>

        {safePages.length > 0 ? (
          <section>
            <h2 style={{ fontSize: '13px', fontWeight: 600, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', padding: '0 4px' }}>Notes ({safePages.length})</h2>
            <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid rgba(0, 0, 0, 0.04)', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)', overflow: 'hidden' }}>
              {safePages.map((page, index) => (
                <NoteListItem key={page.id} page={page} folderSlug={folder.slug} isLast={index === safePages.length - 1} onDelete={handleDeleteNote} onRemoveFromFolder={handleRemoveFromFolder} />
              ))}
            </div>
          </section>
        ) : (
          !isCreatingNote && safeChildFolders.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#f2f2f7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#c7c7cc" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <p style={{ fontSize: '14px', color: '#c7c7cc', textAlign: 'center' }}>This folder is empty</p>
            </div>
          )
        )}
      </div>
    </div>
  )
}

function NoteListItem({ page, folderSlug, isLast, onDelete, onRemoveFromFolder }: {
  page: ZeroPage; folderSlug: string; isLast: boolean; onDelete: (id: string) => void; onRemoveFromFolder: (id: string) => void
}) {
  const [showActions, setShowActions] = useState(false)
  const title = getNoteTitle(page.content)
  const preview = getNotePreview(page.content)
  const dateStr = formatNoteDate(page.updatedAt || page.createdAt)

  return (
    <div style={{ borderBottom: isLast ? 'none' : '1px solid rgba(0, 0, 0, 0.04)', position: 'relative' }}
      onMouseEnter={() => setShowActions(true)} onMouseLeave={() => setShowActions(false)}>
      <Link href={`/folders/${folderSlug}/note/${page.id}`} style={{ display: 'block', padding: '14px 16px', textDecoration: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ fontSize: '15px', fontWeight: 600, color: title === 'Untitled' ? '#c7c7cc' : '#1a1a1a', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: '22px' }}>{title}</span>
          <span style={{ fontSize: '12px', color: '#c7c7cc', flexShrink: 0 }}>{dateStr}</span>
        </div>
        <p style={{ fontSize: '13px', color: '#8e8e93', lineHeight: '18px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{preview}</p>
      </Link>
      {showActions && (
        <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '2px', backgroundColor: 'white', borderRadius: '6px', boxShadow: '0 1px 4px rgba(0, 0, 0, 0.1)', padding: '2px' }}>
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemoveFromFolder(page.id) }}
            style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#8e8e93', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Remove from folder">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </button>
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(page.id) }}
            style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#ff3b30', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Delete note">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
