'use client'

import { useState, useMemo } from 'react'
import { useZero, useQuery } from '@rocicorp/zero/react'
import { type ZeroFolder, newFolderInsert } from '@/zero/hooks'
import { useToast } from '@/components/providers/toast-provider'
import Link from 'next/link'
import { generateId } from '@/lib/utils'

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function FolderListView() {
  const z = useZero()
  const [isCreating, setIsCreating] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const { showError, showSuccess } = useToast()

  const [allFolders] = useQuery(
    z.query.folder.orderBy('order', 'asc').orderBy('name', 'asc')
  )
  
  // Build tree from flat list
  const tree = useMemo(() => {
    const folders = allFolders as ZeroFolder[]
    const childrenMap = new Map<string | null, ZeroFolder[]>()
    
    for (const f of folders) {
      const key = f.parentId ?? null
      if (!childrenMap.has(key)) childrenMap.set(key, [])
      childrenMap.get(key)!.push(f)
    }
    
    function buildNode(folder: ZeroFolder): any {
      const children = (childrenMap.get(folder.id) || []).map(buildNode)
      return { folder, children }
    }
    
    return (childrenMap.get(null) || []).map(buildNode)
  }, [allFolders])

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    try {
      await z.mutate.folder.insert(newFolderInsert(z.userID, {
        id: generateId(),
        name: newFolderName.trim(),
        slug: slugify(newFolderName.trim()),
        order: allFolders.length,
      }))
      setNewFolderName('')
      setIsCreating(false)
      showSuccess('Folder created')
    } catch (error) {
      console.error('Failed to create folder:', error)
      showError('Failed to create folder')
    }
  }

  const handleRename = async (folderId: string) => {
    if (!editName.trim()) { setEditingId(null); return }
    try {
      await z.mutate.folder.update({ id: folderId, name: editName.trim(), slug: slugify(editName.trim()) })
      setEditingId(null)
      showSuccess('Folder renamed')
    } catch (error) {
      console.error('Failed to rename folder:', error)
      showError('Failed to rename folder')
    }
  }

  const handleDelete = async (folderId: string, name: string) => {
    if (!confirm(`Delete "${name}"? Notes inside will be unlinked, not deleted.`)) return
    try {
      await z.mutate.folder.delete({ id: folderId })
      showSuccess('Folder deleted')
    } catch (error) {
      console.error('Failed to delete folder:', error)
      showError('Failed to delete folder')
    }
  }

  const isEmpty = tree.length === 0 && !isCreating

  return (
    <div>
      {!isCreating ? (
        <button onClick={() => setIsCreating(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', marginBottom: '16px', backgroundColor: 'white', borderRadius: '10px', border: '1px solid rgba(0, 0, 0, 0.06)', cursor: 'pointer', fontSize: '14px', fontWeight: 500, color: '#007aff', width: '100%' }}>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Folder
        </button>
      ) : (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') { setIsCreating(false); setNewFolderName('') } }}
            placeholder="Folder name..." autoFocus
            style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(0, 0, 0, 0.1)', fontSize: '14px', outline: 'none', backgroundColor: 'white' }} />
          <button onClick={handleCreateFolder} disabled={!newFolderName.trim()}
            style={{ padding: '10px 16px', borderRadius: '10px', border: 'none', backgroundColor: '#007aff', color: 'white', fontSize: '14px', fontWeight: 600, cursor: newFolderName.trim() ? 'pointer' : 'not-allowed', opacity: newFolderName.trim() ? 1 : 0.5 }}>Create</button>
          <button onClick={() => { setIsCreating(false); setNewFolderName('') }}
            style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(0, 0, 0, 0.06)', backgroundColor: 'white', fontSize: '14px', cursor: 'pointer', color: '#8e8e93' }}>Cancel</button>
        </div>
      )}

      {isEmpty ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '16px', backgroundColor: '#f2f2f7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#8e8e93" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
          </div>
          <h2 style={{ fontSize: '17px', fontWeight: 600, color: '#1a1a1a', marginBottom: '6px' }}>No folders yet</h2>
          <p style={{ fontSize: '14px', color: '#8e8e93', textAlign: 'center', lineHeight: 1.5 }}>Create folders to organize your notes</p>
        </div>
      ) : (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid rgba(0, 0, 0, 0.04)', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)', overflow: 'hidden' }}>
          {tree.map((node: any, index: number) => (
            <FolderTreeItem key={node.folder.id} node={node} depth={0} isLast={index === tree.length - 1}
              editingId={editingId} editName={editName}
              onStartEdit={(id: string, name: string) => { setEditingId(id); setEditName(name) }}
              onRename={handleRename} onCancelEdit={() => setEditingId(null)}
              onEditNameChange={setEditName} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  )
}

interface FolderTreeItemProps {
  node: { folder: ZeroFolder; children: any[] }; depth: number; isLast: boolean
  editingId: string | null; editName: string
  onStartEdit: (id: string, name: string) => void; onRename: (id: string) => void
  onCancelEdit: () => void; onEditNameChange: (name: string) => void
  onDelete: (id: string, name: string) => void
}

function FolderTreeItem({ node, depth, isLast, editingId, editName, onStartEdit, onRename, onCancelEdit, onEditNameChange, onDelete }: FolderTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const isEditing = editingId === node.folder.id
  const hasChildren = node.children.length > 0

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', paddingLeft: `${16 + depth * 24}px`, borderBottom: isLast && !hasChildren ? 'none' : '1px solid rgba(0, 0, 0, 0.04)', gap: '10px' }}>
        {hasChildren ? (
          <button onClick={() => setIsExpanded(!isExpanded)}
            style={{ width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: '#c7c7cc', padding: 0, flexShrink: 0 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
              style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : <div style={{ width: '20px', flexShrink: 0 }} />}

        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#007aff" strokeWidth={1.5} style={{ flexShrink: 0 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
        </svg>

        {isEditing ? (
          <input value={editName} onChange={(e) => onEditNameChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onRename(node.folder.id); if (e.key === 'Escape') onCancelEdit() }}
            onBlur={() => onRename(node.folder.id)} autoFocus
            style={{ flex: 1, padding: '4px 8px', borderRadius: '6px', border: '1px solid #007aff', fontSize: '15px', outline: 'none', backgroundColor: '#f0f7ff' }} />
        ) : (
          <Link href={`/folders/${node.folder.slug}`}
            style={{ flex: 1, fontSize: '15px', fontWeight: 500, color: '#1a1a1a', textDecoration: 'none', lineHeight: '22px' }}>
            {node.folder.name}
          </Link>
        )}

        {!isEditing && (
          <div style={{ display: 'flex', gap: '4px', opacity: 0.55 }}>
            <button onClick={() => onStartEdit(node.folder.id, node.folder.name)}
              style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#8e8e93', borderRadius: '4px' }} title="Rename">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
              </svg>
            </button>
            <button onClick={() => onDelete(node.folder.id, node.folder.name)}
              style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#8e8e93', borderRadius: '4px' }} title="Delete">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          </div>
        )}

        {hasChildren && !isEditing && <span style={{ fontSize: '12px', color: '#c7c7cc', fontWeight: 500 }}>{node.children.length}</span>}
      </div>

      {hasChildren && isExpanded && node.children.map((child: any, index: number) => (
        <FolderTreeItem key={child.folder.id} node={child} depth={depth + 1}
          isLast={index === node.children.length - 1 && isLast}
          editingId={editingId} editName={editName} onStartEdit={onStartEdit}
          onRename={onRename} onCancelEdit={onCancelEdit} onEditNameChange={onEditNameChange} onDelete={onDelete} />
      ))}
    </>
  )
}
