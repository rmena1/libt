'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/lib/actions/auth'
import { useZero, useQuery } from '@rocicorp/zero/react'
import type { ZeroFolder, ZeroPage } from '@/zero/hooks'
import { useRecording, type RecordingMode } from '@/components/recording/recording-context'

interface SidebarProps {
  email: string
}

export function Sidebar({ email }: SidebarProps) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const z = useZero()
  const { isRecording, isTranscribing, duration, recordingMode, startRecording, stopRecording } = useRecording()
  const [showRecordMenu, setShowRecordMenu] = useState(false)
  
  // Reactive queries from Zero
  const [allFolders] = useQuery(z.query.folder.orderBy('order', 'asc').orderBy('name', 'asc'))
  const [starredPagesRaw] = useQuery(z.query.page.where('starred', true).orderBy('updatedAt', 'asc'))
  
  // Build folder tree
  const folderTree = useMemo(() => {
    const folders = allFolders as ZeroFolder[]
    const childrenMap = new Map<string | null, ZeroFolder[]>()
    for (const f of folders) {
      const key = f.parentId ?? null
      if (!childrenMap.has(key)) childrenMap.set(key, [])
      childrenMap.get(key)!.push(f)
    }
    function buildNode(folder: ZeroFolder): { folder: ZeroFolder; children: any[] } {
      return { folder, children: (childrenMap.get(folder.id) || []).map(buildNode) }
    }
    return (childrenMap.get(null) || []).map(buildNode)
  }, [allFolders])
  
  // Enrich starred pages with folder slug
  const starredPages = useMemo(() => {
    const folderMap = new Map<string, ZeroFolder>()
    for (const f of allFolders as ZeroFolder[]) folderMap.set(f.id, f)
    return (starredPagesRaw as ZeroPage[]).map(p => ({
      ...p,
      folderSlug: p.folderId ? folderMap.get(p.folderId)?.slug ?? null : null,
    }))
  }, [starredPagesRaw, allFolders])
  
  const navItems = [
    { name: 'Daily Notes', href: '/daily', icon: <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg> },
    { name: 'Tasks', href: '/tasks', icon: <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    { name: 'Folders', href: '/folders', icon: <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg> },
  ]
  
  return (
    <>
      <style>{`
        .desktop-sidebar { display: none; }
        @media (min-width: 768px) { .desktop-sidebar { display: flex !important; } }
      `}</style>
      <aside className="desktop-sidebar"
        style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: isCollapsed ? '64px' : '256px', zIndex: 50, flexDirection: 'column', backgroundColor: 'white', borderRight: '1px solid rgba(0, 0, 0, 0.06)', transition: 'width 200ms ease-in-out', overflowY: 'auto', overflowX: 'hidden' }}>
        <div style={{ display: 'flex', height: '56px', alignItems: 'center', justifyContent: 'space-between', padding: isCollapsed ? '0 12px' : '0 16px 0 24px', borderBottom: '1px solid rgba(0, 0, 0, 0.06)', flexShrink: 0 }}>
          {!isCollapsed && <Link href="/daily" style={{ fontSize: '18px', fontWeight: 300, letterSpacing: '-0.01em', color: '#111827', textDecoration: 'none' }}>libt</Link>}
          <button onClick={() => setIsCollapsed(!isCollapsed)}
            style={{ padding: '6px', borderRadius: '6px', border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            <svg style={{ width: '18px', height: '18px', transform: isCollapsed ? 'rotate(180deg)' : 'none', transition: 'transform 200ms ease' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
        </div>
        
        <nav style={{ flex: 1, padding: isCollapsed ? '16px 8px' : '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <a key={item.href} href={item.href}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: isCollapsed ? '10px' : '10px 12px', borderRadius: '8px', fontSize: '14px', fontWeight: 500, textDecoration: 'none', justifyContent: isCollapsed ? 'center' : 'flex-start', backgroundColor: isActive ? '#f3f4f6' : 'transparent', color: isActive ? '#111827' : '#6b7280' }}
                title={isCollapsed ? item.name : undefined}>
                {item.icon}
                {!isCollapsed && item.name}
              </a>
            )
          })}

          {/* Record button with mode picker */}
          {!isCollapsed && (
            isRecording ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
                borderRadius: '8px', backgroundColor: '#fef2f2', marginTop: '4px',
              }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444', animation: 'pulse-rec 1.2s ease-in-out infinite', flexShrink: 0 }} />
                <style>{`@keyframes pulse-rec { 0%,100% { opacity:1 } 50% { opacity:0.3 } }`}</style>
                {recordingMode === 'meeting' && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#991b1b" strokeWidth="2" style={{ flexShrink: 0 }}>
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><path d="M1 10h22" />
                  </svg>
                )}
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#991b1b', fontVariantNumeric: 'tabular-nums' }}>
                  {String(Math.floor(duration / 60)).padStart(2, '0')}:{String(duration % 60).padStart(2, '0')}
                </span>
                <button onClick={stopRecording} style={{
                  marginLeft: 'auto', padding: '3px 10px', fontSize: '12px', fontWeight: 600,
                  color: '#fff', backgroundColor: '#ef4444', border: 'none', borderRadius: '5px', cursor: 'pointer',
                }}>Stop</button>
              </div>
            ) : isTranscribing ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
                borderRadius: '8px', backgroundColor: '#f3f4f6', marginTop: '4px',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" style={{ animation: 'spin-s 1s linear infinite' }}>
                  <path d="M21 12a9 9 0 11-6.219-8.56" />
                </svg>
                <style>{`@keyframes spin-s { to { transform:rotate(360deg) } }`}</style>
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#6b7280' }}>Transcribing...</span>
              </div>
            ) : (
              <div style={{ position: 'relative', marginTop: '4px' }}>
                <button onClick={() => setShowRecordMenu(!showRecordMenu)} style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px',
                  borderRadius: '8px', fontSize: '14px', fontWeight: 500, color: '#6b7280',
                  backgroundColor: showRecordMenu ? '#f3f4f6' : 'transparent', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
                }}>
                  <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" strokeLinecap="round" />
                    <line x1="8" y1="23" x2="16" y2="23" strokeLinecap="round" />
                  </svg>
                  Record
                </button>
                {showRecordMenu && (
                  <div style={{
                    position: 'absolute', left: '0', top: '100%', marginTop: '4px',
                    backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.12)', width: '220px', zIndex: 200,
                    overflow: 'hidden',
                  }}>
                    <button onClick={async () => { setShowRecordMenu(false); await startRecording('mic') }} style={{
                      display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px',
                      width: '100%', border: 'none', background: 'none', cursor: 'pointer',
                      fontSize: '13px', fontWeight: 500, color: '#374151', textAlign: 'left',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      </svg>
                      Micrófono
                    </button>
                    <div style={{ height: '1px', backgroundColor: '#f3f4f6' }} />
                    <button onClick={async () => { setShowRecordMenu(false); await startRecording('meeting') }} style={{
                      display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px',
                      width: '100%', border: 'none', background: 'none', cursor: 'pointer',
                      fontSize: '13px', fontWeight: 500, color: '#374151', textAlign: 'left',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><path d="M1 10h22" />
                      </svg>
                      Reunión (audio del sistema)
                    </button>
                  </div>
                )}
              </div>
            )
          )}

          {!isCollapsed && starredPages.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <div style={{ padding: '8px 12px 4px', fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Starred</div>
              {starredPages.map((page) => {
                const displayContent = page.content.length > 40 ? page.content.substring(0, 40) + '...' : page.content || 'Untitled'
                const href = page.folderId && page.folderSlug ? `/folders/${page.folderSlug}/note/${page.id}` : page.dailyDate ? `/daily?date=${page.dailyDate}#page-${page.id}` : '/daily'
                return (
                  <a key={page.id} href={href}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', color: '#6b7280', textDecoration: 'none' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#eab308" stroke="#eab308" strokeWidth="2" style={{ flexShrink: 0 }}>
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayContent}</span>
                  </a>
                )
              })}
            </div>
          )}

          {!isCollapsed && folderTree.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <div style={{ padding: '8px 12px 4px', fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Folders</div>
              {folderTree.map((node: any) => (
                <SidebarFolderNode key={node.folder.id} node={node} depth={0} pathname={pathname} />
              ))}
            </div>
          )}
        </nav>
        
        <div style={{ borderTop: '1px solid rgba(0, 0, 0, 0.06)', padding: isCollapsed ? '12px 8px' : '16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'space-between' }}>
            {!isCollapsed && <span style={{ fontSize: '14px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>{email}</span>}
            <form action={logout}>
              <button type="submit"
                style={{ padding: '6px', borderRadius: '6px', border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Sign out">
                <svg style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </aside>
    </>
  )
}

function SidebarFolderNode({ node, depth, pathname }: { node: { folder: ZeroFolder; children: any[] }; depth: number; pathname: string }) {
  const [isExpanded, setIsExpanded] = useState(true)
  const isActive = pathname === `/folders/${node.folder.slug}`
  const hasChildren = node.children.length > 0

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: `${12 + depth * 16}px`, paddingRight: '12px', paddingTop: '6px', paddingBottom: '6px', borderRadius: '6px', backgroundColor: isActive ? '#f3f4f6' : 'transparent' }}>
        {hasChildren ? (
          <button onClick={(e) => { e.preventDefault(); setIsExpanded(!isExpanded) }}
            style={{ width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: '#c7c7cc', padding: 0, flexShrink: 0 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
              style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 150ms ease' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : <div style={{ width: '16px', flexShrink: 0 }} />}
        <a href={`/folders/${node.folder.slug}`}
          style={{ flex: 1, fontSize: '13px', fontWeight: isActive ? 600 : 400, color: isActive ? '#111827' : '#6b7280', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {node.folder.name}
        </a>
      </div>
      {hasChildren && isExpanded && node.children.map((child: any) => (
        <SidebarFolderNode key={child.folder.id} node={child} depth={depth + 1} pathname={pathname} />
      ))}
    </>
  )
}
