'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/lib/actions/auth'
import { clearLocalSyncData } from '@/lib/local-sync/local-store'
import { type FolderTreeNode } from '@/lib/actions/folders'
import { type Page } from '@/lib/db'
import { type StarredPageWithFolder } from '@/lib/actions/pages'

interface SidebarProps {
  email: string
  folderTree?: FolderTreeNode[]
  starredPages?: StarredPageWithFolder[]
}

export function Sidebar({ email, folderTree = [], starredPages = [] }: SidebarProps) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  
  const navItems = [
    {
      name: 'Daily Notes',
      href: '/daily',
      icon: (
        <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      ),
    },
    {
      name: 'Tasks',
      href: '/tasks',
      icon: (
        <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      name: 'Folders',
      href: '/folders',
      icon: (
        <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
        </svg>
      ),
    },
  ]
  
  return (
    <>
      <style>{`
        .desktop-sidebar {
          display: none;
        }
        @media (min-width: 768px) {
          .desktop-sidebar {
            display: flex !important;
          }
        }
      `}</style>
      <aside
        className="desktop-sidebar"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: isCollapsed ? '64px' : '256px',
          zIndex: 50,
          flexDirection: 'column',
          backgroundColor: 'white',
          borderRight: '1px solid rgba(0, 0, 0, 0.06)',
          transition: 'width 200ms ease-in-out',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {/* Logo and collapse button */}
        <div
          style={{
            display: 'flex',
            height: '56px',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: isCollapsed ? '0 12px' : '0 16px 0 24px',
            borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
            flexShrink: 0,
          }}
        >
          {!isCollapsed && (
            <Link
              href="/daily"
              style={{
                fontSize: '18px',
                fontWeight: 300,
                letterSpacing: '-0.01em',
                color: '#111827',
                textDecoration: 'none',
              }}
            >
              libt
            </Link>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{
              padding: '6px',
              borderRadius: '6px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: '#9ca3af',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg
              style={{
                width: '18px',
                height: '18px',
                transform: isCollapsed ? 'rotate(180deg)' : 'none',
                transition: 'transform 200ms ease',
              }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
        </div>
        
        {/* Navigation */}
        <nav
          style={{
            flex: 1,
            padding: isCollapsed ? '16px 8px' : '16px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: isCollapsed ? '10px' : '10px 12px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  textDecoration: 'none',
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  backgroundColor: isActive ? '#f3f4f6' : 'transparent',
                  color: isActive ? '#111827' : '#6b7280',
                  transition: 'background-color 150ms ease, color 150ms ease',
                }}
                title={isCollapsed ? item.name : undefined}
              >
                {item.icon}
                {!isCollapsed && item.name}
              </Link>
            )
          })}

          {/* Starred pages section (only when expanded) */}
          {!isCollapsed && starredPages.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <div style={{
                padding: '8px 12px 4px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#9ca3af',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}>
                Starred
              </div>
              {starredPages.map((page) => (
                <StarredPageItem key={page.id} page={page} />
              ))}
            </div>
          )}

          {/* Folder tree in sidebar (only when expanded) */}
          {!isCollapsed && folderTree.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <div style={{
                padding: '8px 12px 4px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#9ca3af',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}>
                Folders
              </div>
              {folderTree.map((node) => (
                <SidebarFolderNode
                  key={node.folder.id}
                  node={node}
                  depth={0}
                  pathname={pathname}
                />
              ))}
            </div>
          )}
        </nav>
        
        {/* User section */}
        <div
          style={{
            borderTop: '1px solid rgba(0, 0, 0, 0.06)',
            padding: isCollapsed ? '12px 8px' : '16px',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'space-between',
            }}
          >
            {!isCollapsed && (
              <span
                style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '160px',
                }}
              >
                {email}
              </span>
            )}
            <form action={logout}>
              <button
                type="submit"
                onClick={() => {
                  // Clear local-first sync data before logout
                  clearLocalSyncData()
                }}
                style={{
                  padding: '6px',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  color: '#9ca3af',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 150ms ease, color 150ms ease',
                }}
                title="Sign out"
              >
                <svg
                  style={{ width: '20px', height: '20px' }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
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

function StarredPageItem({ page }: { page: StarredPageWithFolder }) {
  // Truncate content for display
  const displayContent = page.content.length > 40 
    ? page.content.substring(0, 40) + '...' 
    : page.content || 'Untitled'
  
  // Link to the appropriate place:
  // - If has folderId and folderSlug, link to folder note view
  // - Otherwise, link to daily note with anchor
  const href = page.folderId && page.folderSlug
    ? `/folders/${page.folderSlug}/note/${page.id}`
    : page.dailyDate 
      ? `/daily?date=${page.dailyDate}#page-${page.id}`
      : '/daily'
  
  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 12px',
        borderRadius: '6px',
        fontSize: '13px',
        color: '#6b7280',
        textDecoration: 'none',
        transition: 'background-color 150ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#f3f4f6'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent'
      }}
    >
      <svg 
        width="14" 
        height="14" 
        viewBox="0 0 24 24" 
        fill="#eab308"
        stroke="#eab308" 
        strokeWidth="2"
        style={{ flexShrink: 0 }}
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
      <span style={{
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {displayContent}
      </span>
    </Link>
  )
}

function SidebarFolderNode({ node, depth, pathname }: { node: FolderTreeNode; depth: number; pathname: string }) {
  const [isExpanded, setIsExpanded] = useState(true)
  const isActive = pathname === `/folders/${node.folder.slug}`
  const hasChildren = node.children.length > 0

  return (
    <>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        paddingLeft: `${12 + depth * 16}px`,
        paddingRight: '12px',
        paddingTop: '6px',
        paddingBottom: '6px',
        borderRadius: '6px',
        backgroundColor: isActive ? '#f3f4f6' : 'transparent',
        transition: 'background-color 150ms ease',
      }}>
        {hasChildren ? (
          <button
            onClick={(e) => { e.preventDefault(); setIsExpanded(!isExpanded) }}
            style={{
              width: '16px',
              height: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#c7c7cc',
              padding: 0,
              flexShrink: 0,
            }}
          >
            <svg
              width="10" height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              style={{
                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 150ms ease',
              }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <div style={{ width: '16px', flexShrink: 0 }} />
        )}

        <Link
          href={`/folders/${node.folder.slug}`}
          style={{
            flex: 1,
            fontSize: '13px',
            fontWeight: isActive ? 600 : 400,
            color: isActive ? '#111827' : '#6b7280',
            textDecoration: 'none',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {node.folder.name}
        </Link>
      </div>

      {hasChildren && isExpanded && (
        <>
          {node.children.map((child) => (
            <SidebarFolderNode
              key={child.folder.id}
              node={child}
              depth={depth + 1}
              pathname={pathname}
            />
          ))}
        </>
      )}
    </>
  )
}
