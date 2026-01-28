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

  useEffect(() => {
    if (isOpen) {
      isGoogleConnected().then(setConnected)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleConnect = async () => {
    const url = await getGoogleAuthUrl()
    window.location.href = url
  }

  const handleDisconnect = async () => {
    setDisconnecting(true)
    try {
      await disconnectGoogle()
      setConnected(false)
      setTimeout(() => onClose(), 500)
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl p-6 w-[400px] max-w-[90vw]"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Calendar Settings</h2>
        <p className="text-xs text-gray-400 mb-4">
          Connect your Google Calendar to see events in the sidebar.
        </p>

        {connected === null ? (
          <div className="text-xs text-gray-400 py-4 text-center">Loading...</div>
        ) : connected ? (
          <div>
            <div className="flex items-center gap-2 mb-4 p-3 bg-green-50 rounded-lg">
              <span className="text-green-600 text-sm">✓</span>
              <span className="text-sm text-green-700 font-medium">Google Calendar connected</span>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-md hover:bg-red-50 disabled:opacity-50"
              >
                {disconnecting ? 'Disconnecting...' : 'Disconnect'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <button
              onClick={handleConnect}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm mb-4"
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
                onClick={onClose}
                className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-50"
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
