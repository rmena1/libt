'use client'

import { useState, useEffect } from 'react'
import { isGoogleConnected, getGoogleAuthUrl, disconnectGoogle } from '@/lib/actions/calendar'

interface CalendarSettingsProps {
  isOpen: boolean
  onClose: () => void
}

export function CalendarSettings({ isOpen, onClose }: CalendarSettingsProps) {
  const [connected, setConnected] = useState<boolean | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      isGoogleConnected().then(setConnected)
      requestAnimationFrame(() => setVisible(true))
    } else {
      setVisible(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 200)
  }

  const handleConnect = async () => {
    const url = await getGoogleAuthUrl()
    window.location.href = url
  }

  const handleDisconnect = async () => {
    setDisconnecting(true)
    try {
      await disconnectGoogle()
      setConnected(false)
      setTimeout(handleClose, 400)
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-200 ${visible ? 'bg-black/15 backdrop-blur-sm' : 'bg-transparent'}`}
      onClick={handleClose}
    >
      <div
        className={`bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/10 p-7 w-[400px] max-w-[90vw] border border-gray-200/50 transition-all duration-200 ${visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'}`}
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-[15px] font-semibold text-gray-900 tracking-[-0.01em] mb-1">Calendar Settings</h2>
        <p className="text-[13px] text-gray-400 mb-5 leading-relaxed">
          Connect your Google Calendar to see events in the sidebar.
        </p>

        {connected === null ? (
          <div className="text-[13px] text-gray-400 py-6 text-center animate-pulse">Loading...</div>
        ) : connected ? (
          <div>
            <div className="flex items-center gap-2.5 mb-5 p-3.5 bg-green-50/80 rounded-xl border border-green-100/60">
              <span className="text-green-500 text-sm">✓</span>
              <span className="text-[13px] text-green-700 font-medium">Google Calendar connected</span>
            </div>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-[13px] text-gray-500 hover:text-gray-700 rounded-xl hover:bg-gray-100/60 transition-all duration-150 font-medium"
              >
                Close
              </button>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="px-4 py-2 text-[13px] font-medium text-red-600 border border-red-200/60 rounded-xl hover:bg-red-50/60 disabled:opacity-50 transition-all duration-150"
              >
                {disconnecting ? 'Disconnecting...' : 'Disconnect'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <button
              onClick={handleConnect}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-3 text-[13px] font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50/80 hover:border-gray-300/80 shadow-sm shadow-gray-100/50 mb-5 transition-all duration-200 active:scale-[0.98]"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Connect with Google
            </button>
            <div className="flex justify-end">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-[13px] text-gray-500 hover:text-gray-700 rounded-xl hover:bg-gray-100/60 transition-all duration-150 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
