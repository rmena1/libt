'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { ToastContainer, type Toast, type ToastType } from '@/components/ui/toast'

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void
  showError: (message: string) => void
  showSuccess: (message: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

let toastId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  
  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `toast-${++toastId}`
    setToasts((prev) => [...prev, { id, message, type }])
  }, [])
  
  const showError = useCallback((message: string) => {
    showToast(message, 'error')
  }, [showToast])
  
  const showSuccess = useCallback((message: string) => {
    showToast(message, 'success')
  }, [showToast])
  
  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])
  
  return (
    <ToastContext.Provider value={{ showToast, showError, showSuccess }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
