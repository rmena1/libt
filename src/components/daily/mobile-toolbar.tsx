'use client'

import { useMobileToolbar } from '@/components/providers/mobile-toolbar-provider'
import { useEffect, useState, useRef } from 'react'

export function MobileToolbar() {
  const { isVisible, actions, elementRect, isTask } = useMobileToolbar()
  const [isMobile, setIsMobile] = useState(false)
  const toolbarRef = useRef<HTMLDivElement>(null)
  
  // Detect mobile via touch capability
  useEffect(() => {
    const checkMobile = () => {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const isSmallScreen = window.innerWidth < 768
      setIsMobile(hasTouch && isSmallScreen)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  // Don't render on desktop or when not visible
  if (!isMobile || !isVisible || !actions || !elementRect) {
    return null
  }
  
  const handleIndent = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    actions.indent()
  }
  
  const handleOutdent = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    actions.outdent()
  }
  
  const handleToggleTask = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    actions.toggleTask?.()
  }
  
  const handleDone = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    actions.blur()
  }
  
  // Calculate position - below the input, centered
  const toolbarWidth = 140
  const gap = 8
  
  // Get viewport info for positioning
  const viewport = window.visualViewport
  const viewportTop = viewport?.offsetTop || 0
  
  // Calculate top position (below the element)
  let topPosition = elementRect.bottom + gap + viewportTop
  
  // Calculate left position (centered under the element, but within screen bounds)
  let leftPosition = elementRect.left + (elementRect.width / 2) - (toolbarWidth / 2)
  
  // Ensure toolbar stays within screen bounds
  const screenPadding = 16
  const screenWidth = window.innerWidth
  
  if (leftPosition < screenPadding) {
    leftPosition = screenPadding
  } else if (leftPosition + toolbarWidth > screenWidth - screenPadding) {
    leftPosition = screenWidth - screenPadding - toolbarWidth
  }
  
  // Check if toolbar would go below visible viewport, show above instead
  const viewportHeight = viewport?.height || window.innerHeight
  const toolbarHeight = 44
  const maxTop = viewportTop + viewportHeight - toolbarHeight - gap
  
  if (topPosition > maxTop) {
    // Position above the element instead
    topPosition = elementRect.top - toolbarHeight - gap + viewportTop
  }
  
  // Toolbar container styles - WHITE background with subtle gray border
  const toolbarStyle: React.CSSProperties = {
    position: 'fixed',
    top: topPosition,
    left: leftPosition,
    width: toolbarWidth,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    padding: '6px 8px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '999px',
    zIndex: 9999,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.05)',
    transition: 'opacity 0.15s ease-out',
    WebkitTapHighlightColor: 'transparent',
  }
  
  // Button style - dark gray icons
  const buttonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '32px',
    borderRadius: '8px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#374151',
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation',
    transition: 'background-color 0.1s ease',
  }
  
  const activeButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#f3f4f6',
  }
  
  const dividerStyle: React.CSSProperties = {
    width: '1px',
    height: '20px',
    backgroundColor: '#e5e7eb',
    margin: '0 2px',
  }
  
  // Icons
  const OutdentIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="7 8 3 12 7 16" />
      <line x1="21" y1="12" x2="3" y2="12" />
    </svg>
  )
  
  const IndentIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 8 21 12 17 16" />
      <line x1="3" y1="12" x2="21" y2="12" />
    </svg>
  )
  
  const DoneIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
  
  // Checkbox icon (unchecked square) - to convert to task
  const CheckboxIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    </svg>
  )
  
  // Checkbox with strikethrough - to convert back to text
  const CheckboxStrikeIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="3" y1="21" x2="21" y2="3" />
    </svg>
  )
  
  return (
    <div 
      ref={toolbarRef}
      style={toolbarStyle} 
      data-testid="mobile-toolbar"
      onTouchStart={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
      onMouseDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
    >
      {/* Outdent */}
      <button 
        type="button"
        style={buttonStyle}
        onTouchEnd={handleOutdent}
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleOutdent}
        aria-label="Decrease indent"
        data-testid="outdent-button"
      >
        <OutdentIcon />
      </button>
      
      {/* Indent */}
      <button 
        type="button"
        style={buttonStyle}
        onTouchEnd={handleIndent}
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleIndent}
        aria-label="Increase indent"
        data-testid="indent-button"
      >
        <IndentIcon />
      </button>
      
      {/* Toggle Task */}
      <button 
        type="button"
        style={buttonStyle}
        onTouchEnd={handleToggleTask}
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleToggleTask}
        aria-label={isTask ? "Remove checkbox" : "Add checkbox"}
        data-testid="toggle-task-button"
      >
        {isTask ? <CheckboxStrikeIcon /> : <CheckboxIcon />}
      </button>
    </div>
  )
}
