'use client'

import { useState, useEffect } from 'react'
import { getIcalUrl, saveIcalUrl } from '@/lib/actions/calendar'

interface CalendarSettingsProps {
  isOpen: boolean
  onClose: () => void
}

export function CalendarSettings({ isOpen, onClose }: CalendarSettingsProps) {
  const [url, setUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (isOpen) {
      getIcalUrl().then(u => setUrl(u || ''))
      setSaved(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveIcalUrl(url)
      setSaved(true)
      setTimeout(() => onClose(), 800)
    } catch (e) {
      console.error('Failed to save:', e)
    } finally {
      setSaving(false)
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
          Paste your Google Calendar iCal URL to see events in the sidebar.
        </p>

        <label className="block text-xs font-medium text-gray-600 mb-1">iCal URL</label>
        <input
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://calendar.google.com/calendar/ical/..."
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 mb-1"
        />
        <p className="text-[10px] text-gray-300 mb-4">
          Google Calendar → Settings → Your calendar → Secret address in iCal format
        </p>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 disabled:opacity-50"
          >
            {saved ? '✓ Saved' : saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
