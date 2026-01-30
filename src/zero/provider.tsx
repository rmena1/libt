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
      onUpdateNeeded={(reason) => {
        console.warn('[Zero] Update needed:', reason)
        // Don't auto-reload — just log it
      }}
      onClientStateNotFound={() => {
        console.warn('[Zero] Client state not found, will resync')
        // Don't auto-reload
      }}
    >
      {children}
    </ZeroProvider>
  )
}
