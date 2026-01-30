'use client'

import { type ReactNode } from 'react'
import { ZeroProvider } from '@rocicorp/zero/react'
import { schema } from './schema'
import { mutators } from './mutators'
import type { ZeroContext } from './context'

interface ZeroAppProviderProps {
  userID: string
  children: ReactNode
}

/**
 * Visibility manager — intentionally does NOT call z.close().
 *
 * z.close() tears down the WebSocket but does NOT clear Zero's in-memory
 * cache. On reconnect, Zero re-syncs all subscribed data on top of the
 * existing cache, effectively duplicating it. Each hide/show cycle made
 * the memory leak worse.
 *
 * Zero already handles its own WebSocket lifecycle (pausing when idle,
 * reconnecting on demand). We don't need to intervene.
 */
function ZeroVisibilityManager() {
  // No-op — removed z.close() on visibility change to prevent cache duplication.
  // Zero manages its own connection lifecycle.
  return null
}

export function ZeroAppProvider({ userID, children }: ZeroAppProviderProps) {
  const context: ZeroContext = { userID }

  // Use origin-relative URL so it works behind tunnels/proxies
  // Next.js rewrites /zero-cache/* → localhost:4848/*
  const cacheURL = typeof window !== 'undefined' 
    ? `${window.location.origin}/zero-cache` 
    : 'http://localhost:4848'

  return (
    <ZeroProvider
      userID={userID}
      context={context}
      cacheURL={cacheURL}
      schema={schema}
      mutators={mutators}
      kvStore="mem"
      pingTimeoutMs={30_000}
      queryChangeThrottleMs={100}
      onUpdateNeeded={(reason) => {
        console.warn('[Zero] Update needed:', reason)
        // Don't auto-reload — just log it
      }}
      onClientStateNotFound={() => {
        console.warn('[Zero] Client state not found, will resync')
        // Don't auto-reload
      }}
    >
      <ZeroVisibilityManager />
      {children}
    </ZeroProvider>
  )
}
