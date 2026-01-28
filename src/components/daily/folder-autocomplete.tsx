'use client'

import { useEffect, useRef } from 'react'
import { type Folder } from '@/lib/db'

interface FolderAutocompleteProps {
  query: string
  folders: Folder[]
  selectedIndex: number
  onSelect: (folder: Folder) => void
}

export function FolderAutocomplete({ query, folders, selectedIndex, onSelect }: FolderAutocompleteProps) {
  const listRef = useRef<HTMLDivElement>(null)

  const filtered = folders.filter(f =>
    f.name.toLowerCase().includes(query.toLowerCase()) ||
    f.slug.includes(query.toLowerCase())
  ).slice(0, 8)

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.children[selectedIndex] as HTMLElement | undefined
      selected?.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  if (filtered.length === 0) return null

  return (
    <div
      ref={listRef}
      style={{
        position: 'absolute',
        top: '100%',
        left: '0',
        zIndex: 50,
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        maxHeight: '200px',
        overflowY: 'auto',
        minWidth: '200px',
        marginTop: '4px',
      }}
      onMouseDown={(e) => e.preventDefault()} // Prevent blur on click
    >
      {filtered.map((folder, index) => (
        <button
          key={folder.id}
          onClick={() => onSelect(folder)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            width: '100%',
            padding: '8px 12px',
            border: 'none',
            background: index === selectedIndex ? '#f3f4f6' : 'transparent',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#1f2937',
            textAlign: 'left',
            borderBottom: index < filtered.length - 1 ? '1px solid #f3f4f6' : 'none',
          }}
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#007aff" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
          </svg>
          <span style={{ flex: 1 }}>{folder.name}</span>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>#{folder.slug}</span>
        </button>
      ))}
    </div>
  )
}

/** Get filtered folders for a query */
export function getFilteredFolders(folders: Folder[], query: string): Folder[] {
  return folders.filter(f =>
    f.name.toLowerCase().includes(query.toLowerCase()) ||
    f.slug.includes(query.toLowerCase())
  ).slice(0, 8)
}
