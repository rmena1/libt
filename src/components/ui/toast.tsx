'use client'

import { useEffect, useState } from 'react'

export type ToastType = 'error' | 'success' | 'info'

export interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastItemProps {
  toast: Toast
  onDismiss: (id: string) => void
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  
  // Animate in
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(timer)
  }, [])
  
  // Auto-dismiss after 3.5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLeaving(true)
      setTimeout(() => onDismiss(toast.id), 200)
    }, 3500)
    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])
  
  // Get styles based on type
  const getTypeStyles = () => {
    switch (toast.type) {
      case 'error':
        return {
          backgroundColor: '#fef2f2',
          borderColor: '#fecaca',
          color: '#991b1b',
        }
      case 'success':
        return {
          backgroundColor: '#f0fdf4',
          borderColor: '#bbf7d0',
          color: '#166534',
        }
      case 'info':
      default:
        return {
          backgroundColor: '#f8fafc',
          borderColor: '#e2e8f0',
          color: '#475569',
        }
    }
  }
  
  const typeStyles = getTypeStyles()
  
  return (
    <div
      style={{
        padding: '12px 16px',
        borderRadius: '8px',
        border: '1px solid',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        fontSize: '14px',
        fontWeight: 500,
        maxWidth: '360px',
        transition: 'all 200ms ease-out',
        opacity: isVisible && !isLeaving ? 1 : 0,
        transform: isVisible && !isLeaving ? 'translateY(0)' : 'translateY(8px)',
        ...typeStyles,
      }}
      role="alert"
    >
      {toast.message}
    </div>
  )
}

interface ToastContainerProps {
  toasts: Toast[]
  onDismiss: (id: string) => void
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null
  
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        alignItems: 'center',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => (
        <div key={toast.id} style={{ pointerEvents: 'auto' }}>
          <ToastItem toast={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  )
}
