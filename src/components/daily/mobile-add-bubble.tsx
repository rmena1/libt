'use client'

import { useState, useRef, useEffect } from 'react'
import { createPage } from '@/lib/actions/pages'
import { today } from '@/lib/utils'

interface MobileAddBubbleProps {
  isOpen: boolean
  onClose: () => void
  onPageCreated?: () => void
}

export function MobileAddBubble({ isOpen, onClose, onPageCreated }: MobileAddBubbleProps) {
  const [content, setContent] = useState('')
  const [isTask, setIsTask] = useState(false)
  const [taskDate, setTaskDate] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  
  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])
  
  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setContent('')
      setIsTask(false)
      setTaskDate('')
      setPriority(null)
    }
  }, [isOpen])
  
  // Handle click outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }
  
  // Handle submit
  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return
    
    setIsSubmitting(true)
    
    try {
      const todayDate = today()
      // Determine which date to use for the daily note
      const dailyDate = isTask && taskDate ? taskDate : todayDate
      
      // Build content string
      let pageContent = content.trim()
      if (isTask) {
        pageContent = '[] ' + pageContent
        
        // Add priority if set
        if (priority) {
          pageContent += ` !${priority}`
        }
        
        // Add date if set and different from daily note date
        if (taskDate && taskDate !== dailyDate) {
          pageContent += ` @${taskDate}`
        }
      }
      
      await createPage({
        dailyDate,
        order: 999, // Will be appended at the end
        content: pageContent,
        indent: 0,
      })
      
      onPageCreated?.()
      onClose()
    } catch (error) {
      console.error('Failed to create page:', error)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape') {
      onClose()
    }
  }
  
  if (!isOpen) return null
  
  // Styles
  const backdropStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 9998,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    padding: '16px',
  }
  
  const bubbleStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '20px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
    marginBottom: '60px',
  }
  
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    outline: 'none',
    resize: 'none',
    fontFamily: 'inherit',
    minHeight: '80px',
  }
  
  const toggleContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #f3f4f6',
  }
  
  const checkboxLabelStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#374151',
  }
  
  const checkboxStyle: React.CSSProperties = {
    width: '20px',
    height: '20px',
    borderRadius: '4px',
    border: isTask ? '2px solid #3b82f6' : '2px solid #d1d5db',
    backgroundColor: isTask ? '#3b82f6' : 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  }
  
  const dateInputStyle: React.CSSProperties = {
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    outline: 'none',
    width: '100%',
    marginTop: '12px',
  }
  
  const priorityContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
  }
  
  const getPriorityPillStyle = (p: 'low' | 'medium' | 'high'): React.CSSProperties => {
    const isSelected = priority === p
    const colors = {
      low: { bg: isSelected ? '#dcfce7' : '#f3f4f6', color: isSelected ? '#166534' : '#6b7280', border: isSelected ? '#86efac' : '#e5e7eb' },
      medium: { bg: isSelected ? '#fef3c7' : '#f3f4f6', color: isSelected ? '#92400e' : '#6b7280', border: isSelected ? '#fcd34d' : '#e5e7eb' },
      high: { bg: isSelected ? '#fee2e2' : '#f3f4f6', color: isSelected ? '#991b1b' : '#6b7280', border: isSelected ? '#fca5a5' : '#e5e7eb' },
    }
    return {
      padding: '6px 14px',
      fontSize: '13px',
      fontWeight: 500,
      borderRadius: '999px',
      border: `1px solid ${colors[p].border}`,
      backgroundColor: colors[p].bg,
      color: colors[p].color,
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    }
  }
  
  const submitButtonStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px',
    marginTop: '20px',
    fontSize: '16px',
    fontWeight: 600,
    color: '#ffffff',
    backgroundColor: content.trim() ? '#111827' : '#9ca3af',
    border: 'none',
    borderRadius: '10px',
    cursor: content.trim() ? 'pointer' : 'not-allowed',
    transition: 'background-color 0.15s ease',
  }
  
  const closeButtonStyle: React.CSSProperties = {
    position: 'absolute',
    top: '12px',
    right: '12px',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
  }
  
  return (
    <div style={backdropStyle} onClick={handleBackdropClick}>
      <div style={{ ...bubbleStyle, position: 'relative' }}>
        {/* Close button */}
        <button style={closeButtonStyle} onClick={onClose} aria-label="Close">
          ×
        </button>
        
        {/* Text input */}
        <textarea
          ref={inputRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What's on your mind?"
          style={inputStyle}
        />
        
        {/* Task toggle */}
        <div style={toggleContainerStyle}>
          <label style={checkboxLabelStyle}>
            <div 
              style={checkboxStyle}
              onClick={() => setIsTask(!isTask)}
            >
              {isTask && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2.5 6L5 8.5L9.5 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            <span onClick={() => setIsTask(!isTask)}>Make it a task</span>
          </label>
        </div>
        
        {/* Task options (visible when isTask) */}
        {isTask && (
          <>
            {/* Date picker */}
            <input
              type="date"
              value={taskDate}
              onChange={(e) => setTaskDate(e.target.value)}
              min={today()}
              style={dateInputStyle}
              placeholder="Due date (optional)"
            />
            
            {/* Priority pills */}
            <div style={priorityContainerStyle}>
              <button
                type="button"
                style={getPriorityPillStyle('low')}
                onClick={() => setPriority(priority === 'low' ? null : 'low')}
              >
                Low
              </button>
              <button
                type="button"
                style={getPriorityPillStyle('medium')}
                onClick={() => setPriority(priority === 'medium' ? null : 'medium')}
              >
                Medium
              </button>
              <button
                type="button"
                style={getPriorityPillStyle('high')}
                onClick={() => setPriority(priority === 'high' ? null : 'high')}
              >
                High
              </button>
            </div>
          </>
        )}
        
        {/* Submit button */}
        <button
          type="button"
          style={submitButtonStyle}
          onClick={handleSubmit}
          disabled={!content.trim() || isSubmitting}
        >
          {isSubmitting ? 'Adding...' : isTask ? 'Add Task' : 'Add Note'}
        </button>
      </div>
    </div>
  )
}

// FAB Button component
interface MobileFABProps {
  onClick: () => void
}

export function MobileFAB({ onClick }: MobileFABProps) {
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  if (!isMobile) return null
  
  const fabStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: '#111827',
    color: '#ffffff',
    border: 'none',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  }
  
  return (
    <button
      style={fabStyle}
      onClick={onClick}
      aria-label="Add new note or task"
      onTouchStart={(e) => {
        const target = e.currentTarget
        target.style.transform = 'scale(0.95)'
      }}
      onTouchEnd={(e) => {
        const target = e.currentTarget
        target.style.transform = 'scale(1)'
      }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </button>
  )
}
