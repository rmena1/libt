'use client'

import { createContext, useContext, useState, useRef, useCallback, type ReactNode } from 'react'

export type RecordingMode = 'mic' | 'meeting'

const CHUNK_INTERVAL_MS = 10 * 60 * 1000 // 10 minutes

interface RecordingState {
  isRecording: boolean
  isTranscribing: boolean
  duration: number // seconds
  recordingMode: RecordingMode | null
  chunkNumber: number
  startRecording: (mode?: RecordingMode) => Promise<void>
  stopRecording: () => void
}

const RecordingContext = createContext<RecordingState | null>(null)

export function useRecording() {
  const ctx = useContext(RecordingContext)
  if (!ctx) throw new Error('useRecording must be inside RecordingProvider')
  return ctx
}

export function RecordingProvider({ children }: { children: ReactNode }) {
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [duration, setDuration] = useState(0)
  const [recordingMode, setRecordingMode] = useState<RecordingMode | null>(null)
  const [chunkNumber, setChunkNumber] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const chunkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const meetingStartTimeRef = useRef<string | null>(null)
  const chunkNumberRef = useRef(0)
  const isChunkingRef = useRef(false) // true when doing an automatic chunk rotation
  const stoppingRef = useRef(false) // true when user manually stops

  const getMimeType = () =>
    MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm'

  const sendChunk = async (blob: Blob, isChunk: boolean, meetingStartTime: string | null, isFinal: boolean = false) => {
    const formData = new FormData()
    formData.append('audio', blob, 'recording.webm')
    if (isChunk && meetingStartTime) {
      formData.append('isChunk', 'true')
      formData.append('meetingStartTime', meetingStartTime)
    }
    if (isFinal) {
      formData.append('isFinal', 'true')
    }
    const res = await fetch('/api/transcribe', { method: 'POST', body: formData })
    const data = await res.json()
    if (!data.success) {
      console.error('Transcription failed:', data.error)
    }
    return data
  }

  const cleanupFull = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    // Clean up visibility handler from FIX #9
    if ((timerRef as any)._visHandler) {
      document.removeEventListener('visibilitychange', (timerRef as any)._visHandler)
      ;(timerRef as any)._visHandler = null
    }
    if (chunkTimerRef.current) {
      clearTimeout(chunkTimerRef.current)
      chunkTimerRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    mediaRecorderRef.current = null
    chunksRef.current = []
    meetingStartTimeRef.current = null
    chunkNumberRef.current = 0
    isChunkingRef.current = false
    stoppingRef.current = false
  }, [])

  const startNewMediaRecorder = useCallback((stream: MediaStream) => {
    const mediaRecorder = new MediaRecorder(stream, { mimeType: getMimeType() })
    mediaRecorderRef.current = mediaRecorder
    chunksRef.current = []

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      chunksRef.current = []

      if (isChunkingRef.current) {
        // Automatic chunk rotation — send in background and restart
        isChunkingRef.current = false
        const chunkNum = chunkNumberRef.current
        const startTime = meetingStartTimeRef.current

        // Send chunk in background (don't await — keep recording)
        sendChunk(blob, chunkNum > 1, startTime).catch(err => {
          console.error(`Chunk ${chunkNum} upload failed:`, err)
        })

        // Start new recorder on same stream
        if (streamRef.current && !stoppingRef.current) {
          startNewMediaRecorder(streamRef.current)
          mediaRecorderRef.current?.start(1000)
          scheduleNextChunk()
        }
      } else {
        // User stopped — final chunk
        const chunkNum = chunkNumberRef.current
        const startTime = meetingStartTimeRef.current
        setIsRecording(false)
        setIsTranscribing(true)
        cleanupFull()

        try {
          const data = await sendChunk(blob, chunkNum > 1, startTime, true)
          if (!data.success) {
            alert('Transcription failed: ' + (data.error || 'Unknown error'))
          }
        } catch (err) {
          console.error('Upload failed:', err)
          alert('Failed to upload audio')
        } finally {
          setIsTranscribing(false)
          setDuration(0)
          setRecordingMode(null)
          setChunkNumber(0)
        }
      }
    }

    return mediaRecorder
  }, [cleanupFull])

  const scheduleNextChunk = useCallback(() => {
    if (chunkTimerRef.current) clearTimeout(chunkTimerRef.current)
    chunkTimerRef.current = setTimeout(() => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        chunkNumberRef.current += 1
        setChunkNumber(chunkNumberRef.current)
        isChunkingRef.current = true
        mediaRecorderRef.current.stop() // triggers onstop which rotates
      }
    }, CHUNK_INTERVAL_MS)
  }, [])

  const startRecording = useCallback(async (mode: RecordingMode = 'mic') => {
    try {
      if (!navigator.mediaDevices) {
        alert('Recording requires a secure connection (HTTPS). Please access the site via HTTPS.')
        return
      }

      let stream: MediaStream
      if (mode === 'meeting') {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true })
        displayStream.getVideoTracks().forEach(t => t.stop())
        const audioTracks = displayStream.getAudioTracks()
        if (audioTracks.length === 0) {
          alert('No audio was shared. Make sure you select a tab/screen with audio enabled.')
          displayStream.getTracks().forEach(t => t.stop())
          return
        }
        stream = new MediaStream(audioTracks)
      } else {
        if (!navigator.mediaDevices.getUserMedia) {
          alert('Recording requires a secure connection (HTTPS). Please access the site via HTTPS.')
          return
        }
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      }
      streamRef.current = stream
      stoppingRef.current = false
      setRecordingMode(mode)

      // Record the meeting start time (Santiago TZ)
      const startTime = new Date().toLocaleTimeString('en-GB', {
        timeZone: 'America/Santiago',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
      meetingStartTimeRef.current = startTime
      chunkNumberRef.current = 1
      setChunkNumber(1)

      const mediaRecorder = startNewMediaRecorder(stream)
      mediaRecorder.start(1000)
      setIsRecording(true)
      setDuration(0)
      // FIX #9: Visual timer uses visibility-aware interval
      const startVisibleTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current)
        timerRef.current = setInterval(() => setDuration(d => d + 1), 1000)
      }
      const stopVisibleTimer = () => {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      }
      const visHandler = () => document.hidden ? stopVisibleTimer() : startVisibleTimer()
      document.addEventListener('visibilitychange', visHandler)
      // Store handler for cleanup
      ;(timerRef as any)._visHandler = visHandler
      startVisibleTimer()

      // Schedule first chunk rotation
      scheduleNextChunk()
    } catch (err) {
      console.error('Recording access error:', err)
      const name = (err as Error)?.name
      if (name === 'NotAllowedError') {
        if (mode === 'meeting') return
        alert('Microphone permission denied. Please allow microphone access in your browser settings and try again.')
      } else if (name === 'NotFoundError') {
        alert('No microphone found. Please connect a microphone and try again.')
      } else {
        alert('Could not access ' + (mode === 'meeting' ? 'system audio' : 'microphone') + ': ' + ((err as Error)?.message || 'Unknown error'))
      }
    }
  }, [cleanupFull, startNewMediaRecorder, scheduleNextChunk])

  const stopRecording = useCallback(() => {
    stoppingRef.current = true
    if (chunkTimerRef.current) {
      clearTimeout(chunkTimerRef.current)
      chunkTimerRef.current = null
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
  }, [])

  return (
    <RecordingContext.Provider value={{ isRecording, isTranscribing, duration, recordingMode, chunkNumber, startRecording, stopRecording }}>
      {children}
    </RecordingContext.Provider>
  )
}
