'use client'

import { useEffect } from 'react'

const SWIPE_THRESHOLD = 70
const MAX_VERTICAL = 50

export function SwipeToSearch() {
  useEffect(() => {
    // Only on mobile
    if (window.matchMedia('(min-width: 768px)').matches) return

    let startX = 0
    let startY = 0
    let tracking = false

    function onTouchStart(e: TouchEvent) {
      const touch = e.touches[0]
      // Only start from left edge (first 30px)
      if (touch.clientX > 30) return
      startX = touch.clientX
      startY = touch.clientY
      tracking = true
    }

    function onTouchEnd(e: TouchEvent) {
      if (!tracking) return
      tracking = false
      const touch = e.changedTouches[0]
      const dx = touch.clientX - startX
      const dy = Math.abs(touch.clientY - startY)
      if (dx >= SWIPE_THRESHOLD && dy < MAX_VERTICAL) {
        ;(window as any).__openSearch?.()
      }
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  return null
}
