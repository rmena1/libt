'use client'

import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react'

interface MobileToolbarActions {
  indent: () => void
  outdent: () => void
  blur: () => void
  toggleTask?: () => void
}

interface ElementRect {
  top: number
  left: number
  width: number
  height: number
  bottom: number
}

interface MobileToolbarContextType {
  isVisible: boolean
  actions: MobileToolbarActions | null
  elementRect: ElementRect | null
  isTask: boolean
  registerActions: (actions: MobileToolbarActions, element?: HTMLElement, isTask?: boolean) => void
  unregisterActions: () => void
  updateElementRect: () => void
}

const MobileToolbarContext = createContext<MobileToolbarContextType | null>(null)

export function MobileToolbarProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<MobileToolbarActions | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [elementRect, setElementRect] = useState<ElementRect | null>(null)
  const [isTask, setIsTask] = useState(false)
  
  const registeredElementRef = useRef<HTMLElement | null>(null)
  const actionsRef = useRef<MobileToolbarActions | null>(null)
  const unregisterTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const maxViewportHeightRef = useRef<number>(0)
  const lastUserInteractionRef = useRef<number>(0)
  const isIOSSafariRef = useRef<boolean>(false)
  const rafIdRef = useRef<number | null>(null)
  
  // Update element rect
  const updateElementRect = useCallback(() => {
    const element = registeredElementRef.current
    if (!element) {
      setElementRect(null)
      return
    }
    
    const rect = element.getBoundingClientRect()
    setElementRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      bottom: rect.bottom,
    })
  }, [])
  
  // Detect iOS Safari
  useEffect(() => {
    const ua = navigator.userAgent
    isIOSSafariRef.current = /iPad|iPhone|iPod/.test(ua) && !('MSStream' in window)
  }, [])
  
  // Track user interactions
  useEffect(() => {
    const handleUserInteraction = () => {
      lastUserInteractionRef.current = Date.now()
    }
    
    window.addEventListener('touchstart', handleUserInteraction, { passive: true })
    window.addEventListener('touchend', handleUserInteraction, { passive: true })
    
    return () => {
      window.removeEventListener('touchstart', handleUserInteraction)
      window.removeEventListener('touchend', handleUserInteraction)
    }
  }, [])
  
  // Sync actions ref with state
  useEffect(() => {
    actionsRef.current = actions
  }, [actions])
  
  // Initialize max viewport height
  useEffect(() => {
    const viewport = window.visualViewport
    const initialHeight = viewport?.height || window.innerHeight
    maxViewportHeightRef.current = initialHeight
    
    const timer = setTimeout(() => {
      const currentHeight = viewport?.height || window.innerHeight
      if (currentHeight > maxViewportHeightRef.current) {
        maxViewportHeightRef.current = currentHeight
      }
    }, 500)
    
    return () => clearTimeout(timer)
  }, [])
  
  // Check visibility based on focus and keyboard state
  const checkVisibility = useCallback(() => {
    const element = registeredElementRef.current
    const hasActions = actionsRef.current !== null
    
    const hasFocus = element ? document.activeElement === element : false
    
    const viewport = window.visualViewport
    const currentViewportHeight = viewport?.height || window.innerHeight
    
    if (currentViewportHeight > maxViewportHeightRef.current) {
      maxViewportHeightRef.current = currentViewportHeight
    }
    
    const maxHeight = maxViewportHeightRef.current
    const heightDiff = maxHeight - currentViewportHeight
    const percentReduction = maxHeight > 0 ? (heightDiff / maxHeight) * 100 : 0
    
    const keyboardByViewport = percentReduction > 15
    
    const timeSinceInteraction = Date.now() - lastUserInteractionRef.current
    const recentInteraction = timeSinceInteraction < 300 && timeSinceInteraction > 50
    const keyboardByInteraction = hasFocus && recentInteraction && isIOSSafariRef.current && !keyboardByViewport
    
    const keyboardOpen = keyboardByViewport || keyboardByInteraction
    
    if (!hasActions || !element) {
      setIsVisible(false)
      return
    }
    
    if (!hasFocus) {
      setIsVisible(false)
      return
    }
    
    setIsVisible(keyboardOpen)
    
    // Update element rect when visible
    if (keyboardOpen) {
      updateElementRect()
    }
  }, [updateElementRect])
  
  // Continuous rect updates while visible (for scroll tracking)
  useEffect(() => {
    if (!isVisible) {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
      return
    }
    
    const updateLoop = () => {
      updateElementRect()
      rafIdRef.current = requestAnimationFrame(updateLoop)
    }
    
    rafIdRef.current = requestAnimationFrame(updateLoop)
    
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
    }
  }, [isVisible, updateElementRect])
  
  // Listen to viewport changes
  useEffect(() => {
    let animationFrameId: number | null = null
    
    const handleViewportChange = () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId)
      }
      animationFrameId = requestAnimationFrame(checkVisibility)
    }
    
    const viewport = window.visualViewport
    if (viewport) {
      viewport.addEventListener('resize', handleViewportChange)
      viewport.addEventListener('scroll', handleViewportChange)
    }
    window.addEventListener('resize', handleViewportChange)
    window.addEventListener('focusin', handleViewportChange)
    window.addEventListener('focusout', handleViewportChange)
    window.addEventListener('scroll', handleViewportChange, { passive: true })
    
    checkVisibility()
    
    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId)
      }
      if (viewport) {
        viewport.removeEventListener('resize', handleViewportChange)
        viewport.removeEventListener('scroll', handleViewportChange)
      }
      window.removeEventListener('resize', handleViewportChange)
      window.removeEventListener('focusin', handleViewportChange)
      window.removeEventListener('focusout', handleViewportChange)
      window.removeEventListener('scroll', handleViewportChange)
    }
  }, [checkVisibility])
  
  const registerActions = useCallback((newActions: MobileToolbarActions, element?: HTMLElement, taskState?: boolean) => {
    if (unregisterTimeoutRef.current) {
      clearTimeout(unregisterTimeoutRef.current)
      unregisterTimeoutRef.current = null
    }
    
    setActions(newActions)
    actionsRef.current = newActions
    registeredElementRef.current = element || null
    setIsTask(taskState ?? false)
    
    setTimeout(checkVisibility, 200)
    setTimeout(checkVisibility, 400)
  }, [checkVisibility])
  
  const unregisterActions = useCallback(() => {
    unregisterTimeoutRef.current = setTimeout(() => {
      setActions(null)
      actionsRef.current = null
      registeredElementRef.current = null
      setIsVisible(false)
      setElementRect(null)
      unregisterTimeoutRef.current = null
    }, 150)
  }, [])
  
  return (
    <MobileToolbarContext.Provider value={{ isVisible, actions, elementRect, isTask, registerActions, unregisterActions, updateElementRect }}>
      {children}
    </MobileToolbarContext.Provider>
  )
}

export function useMobileToolbar() {
  const context = useContext(MobileToolbarContext)
  if (!context) {
    throw new Error('useMobileToolbar must be used within a MobileToolbarProvider')
  }
  return context
}
