'use client'

import { useRecording } from './recording-context'

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export function RecordingIndicator() {
  const { isRecording, isTranscribing, duration, recordingMode, chunkNumber, stopRecording } = useRecording()

  if (!isRecording && !isTranscribing) return null

  return (
    <>
      <style>{`
        @keyframes pulse-recording {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
        padding: '10px 16px', backgroundColor: isTranscribing ? '#f3f4f6' : '#fef2f2',
        borderBottom: '1px solid', borderColor: isTranscribing ? '#e5e7eb' : '#fecaca',
        zIndex: 100, position: 'sticky', top: 0,
      }}>
        {isTranscribing ? (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
              <path d="M21 12a9 9 0 11-6.219-8.56" />
            </svg>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>Transcribing...</span>
          </>
        ) : (
          <>
            <div style={{
              width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ef4444',
              animation: 'pulse-recording 1.2s ease-in-out infinite',
            }} />
            {recordingMode === 'meeting' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#991b1b" strokeWidth="2" style={{ flexShrink: 0 }}>
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><path d="M1 10h22" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#991b1b" strokeWidth="2" style={{ flexShrink: 0 }}>
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              </svg>
            )}
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#991b1b', fontVariantNumeric: 'tabular-nums' }}>
              {recordingMode === 'meeting' ? 'Meeting · ' : ''}{formatTime(duration)}{chunkNumber > 1 ? ` · chunk ${chunkNumber}` : ''}
            </span>
            <button onClick={stopRecording} style={{
              padding: '4px 14px', fontSize: '13px', fontWeight: 600, color: '#fff',
              backgroundColor: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer',
            }}>
              Stop
            </button>
          </>
        )}
      </div>
    </>
  )
}
