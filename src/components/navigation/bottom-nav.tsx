'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

interface NavItem {
  name: string
  href: string
  icon: React.ReactNode
  placeholder?: boolean
  searchButton?: boolean
}

export function BottomNav() {
  const pathname = usePathname()

  const navItems: NavItem[] = [
    {
      name: 'Home',
      href: '/daily',
      icon: (
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      ),
    },
    {
      name: 'Search',
      href: '/search',
      searchButton: true,
      icon: (
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      ),
    },
    {
      name: 'Tasks',
      href: '/tasks',
      icon: (
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      name: 'New',
      href: '/new',
      placeholder: true,
      icon: (
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      ),
    },
  ]

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <>
      <style>{`
        @media (min-width: 768px) {
          .mobile-bottom-nav {
            display: none !important;
          }
        }
      `}</style>
      <nav
        className="mobile-bottom-nav"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          height: '60px',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          backgroundColor: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(0, 0, 0, 0.06)',
        }}
      >
      {navItems.map((item) => {
        const active = isActive(item.href)
        
        if (item.searchButton) {
          return (
            <button
              key={item.href}
              data-testid="mobile-search-button"
              onClick={() => (window as any).__openSearch?.()}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1,
                height: '100%',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: '#6b7280',
                transition: 'color 150ms ease',
              }}
            >
              <span>{item.icon}</span>
              <span style={{ fontSize: '10px', marginTop: '4px', fontWeight: 500, letterSpacing: '0.01em' }}>
                {item.name}
              </span>
            </button>
          )
        }

        if (item.placeholder) {
          return (
            <button
              key={item.href}
              onClick={() => alert(`${item.name}: Coming soon!`)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1,
                height: '100%',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: '#9ca3af',
                transition: 'color 150ms ease',
              }}
            >
              <span style={{ opacity: 0.7 }}>{item.icon}</span>
              <span
                style={{
                  fontSize: '10px',
                  marginTop: '4px',
                  fontWeight: 500,
                  letterSpacing: '0.01em',
                }}
              >
                {item.name}
              </span>
            </button>
          )
        }
        
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              height: '100%',
              textDecoration: 'none',
              color: active ? '#111827' : '#6b7280',
              transition: 'color 150ms ease',
            }}
          >
            <span style={{ position: 'relative' }}>
              {item.icon}
              {active && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: '-6px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    backgroundColor: '#111827',
                  }}
                />
              )}
            </span>
            <span
              style={{
                fontSize: '10px',
                marginTop: '4px',
                fontWeight: active ? 600 : 500,
                letterSpacing: '0.01em',
              }}
            >
              {item.name}
            </span>
          </Link>
        )
      })}
    </nav>
    </>
  )
}
