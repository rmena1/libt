'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useZero, useQuery } from '@rocicorp/zero/react'

interface SearchResult {
  id: string
  content: string
  dailyDate: string | null
}

export function SearchModal() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const z = useZero()

  // Reactive search via Zero (local query, instant results)
  const [rawResults] = useQuery(
    query.trim()
      ? z.query.page
          .where('content', 'ILIKE', `%${query.trim()}%`)
          .orderBy('dailyDate', 'desc')
          .limit(15)
      : undefined
  )

  const results: SearchResult[] = (rawResults ?? []).map(p => ({
    id: p.id, content: p.content, dailyDate: p.dailyDate ?? null,
  }))

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setOpen(prev => !prev) }
      if (e.key === 'Escape' && open) { e.preventDefault(); setOpen(false) }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
    else { setQuery(''); setSelectedIndex(0) }
  }, [open])

  const navigate = useCallback((result: SearchResult) => {
    setOpen(false)
    if (result.dailyDate) {
      const url = `/daily?date=${result.dailyDate}`
      if (window.location.pathname === '/daily') window.location.href = url
      else router.push(url)
    } else router.push('/daily')
  }, [router])

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false) }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && results.length > 0) { e.preventDefault(); navigate(results[selectedIndex]) }
  }, [results, selectedIndex, navigate])

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return ''
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const highlightMatch = (text: string, q: string) => {
    if (!q.trim()) return text
    const idx = text.toLowerCase().indexOf(q.toLowerCase())
    if (idx === -1) return text.length > 120 ? text.slice(0, 120) + '...' : text
    const start = Math.max(0, idx - 40)
    const end = Math.min(text.length, idx + q.length + 80)
    const snippet = (start > 0 ? '...' : '') + text.slice(start, end) + (end < text.length ? '...' : '')
    const matchStart = idx - start + (start > 0 ? 3 : 0)
    return (<>{snippet.slice(0, matchStart)}<strong style={{ color: '#2563eb', fontWeight: 600 }}>{snippet.slice(matchStart, matchStart + q.length)}</strong>{snippet.slice(matchStart + q.length)}</>)
  }

  useEffect(() => {
    (window as any).__openSearch = () => setOpen(true)
    return () => { delete (window as any).__openSearch }
  }, [])

  if (!open) return null

  return (
    <div data-testid="search-modal" onClick={() => setOpen(false)}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '15vh', backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: '560px', margin: '0 16px', backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden', animation: 'searchModalIn 0.15s ease-out' }}>
        <style>{`@keyframes searchModalIn { from { opacity: 0; transform: scale(0.97) translateY(-8px); } to { opacity: 1; transform: scale(1) translateY(0); } }`}</style>

        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #f0f0f0' }}>
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth={2} style={{ flexShrink: 0 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input ref={inputRef} data-testid="search-input" type="text" placeholder="Search notes..."
            value={query} onChange={e => setQuery(e.target.value)} onKeyDown={onKeyDown}
            style={{ flex: 1, marginLeft: '12px', border: 'none', outline: 'none', fontSize: '16px', backgroundColor: 'transparent', color: '#111827' }} />
          <kbd style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb' }}>ESC</kbd>
        </div>

        {results.length > 0 && (
          <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '8px 0' }}>
            {results.map((r, i) => (
              <button key={r.id} data-testid="search-result" onClick={() => navigate(r)}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 20px', border: 'none', cursor: 'pointer', backgroundColor: i === selectedIndex ? '#f3f4f6' : 'transparent' }}
                onMouseEnter={() => setSelectedIndex(i)}>
                <div style={{ fontSize: '14px', color: '#111827', lineHeight: 1.5 }}>{highlightMatch(r.content, query)}</div>
                {r.dailyDate && <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{formatDate(r.dailyDate)}</div>}
              </button>
            ))}
          </div>
        )}

        {query.trim() && results.length === 0 && (
          <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>No results found</div>
        )}
      </div>
    </div>
  )
}
