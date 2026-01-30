'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Cross-cutting hook: exposes whether the page is visible.
 * Used to pause timers, rAF loops, sync engines, etc. when backgrounded.
 */
export function usePageVisibility(): boolean {
  const [isVisible, setIsVisible] = useState(() =>
    typeof document !== 'undefined' ? !document.hidden : true
  )

  useEffect(() => {
    const handler = () => setIsVisible(!document.hidden)
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [])

  return isVisible
}

/**
 * Runs a setInterval only when the page is visible.
 * Automatically clears on hide and restarts on show.
 */
export function useVisibleInterval(callback: () => void, delayMs: number) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback
  const isVisible = usePageVisibility()

  useEffect(() => {
    if (!isVisible) return
    const id = setInterval(() => callbackRef.current(), delayMs)
    return () => clearInterval(id)
  }, [isVisible, delayMs])
}
