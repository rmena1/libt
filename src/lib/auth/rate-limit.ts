/**
 * Simple in-memory rate limiter for auth endpoints.
 * Tracks failed attempts per IP/email and blocks after threshold.
 * 
 * For a single-server personal app this is sufficient.
 * For multi-instance, use Redis-backed rate limiting.
 */

interface RateLimitEntry {
  count: number
  firstAttempt: number
  blockedUntil: number | null
}

const store = new Map<string, RateLimitEntry>()

// Config
const MAX_ATTEMPTS = 5         // Max failed attempts before blocking
const WINDOW_MS = 15 * 60 * 1000  // 15 minute window
const BLOCK_DURATION_MS = 15 * 60 * 1000  // Block for 15 minutes

// Cleanup old entries every 30 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (now - entry.firstAttempt > WINDOW_MS * 2 && (!entry.blockedUntil || now > entry.blockedUntil)) {
      store.delete(key)
    }
  }
}, 30 * 60 * 1000)

/**
 * Check if a key (IP or email) is rate limited.
 * Returns { blocked: true, retryAfterMs } if blocked, or { blocked: false }.
 */
export function checkRateLimit(key: string): { blocked: boolean; retryAfterMs?: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry) return { blocked: false }

  // Currently blocked?
  if (entry.blockedUntil && now < entry.blockedUntil) {
    return { blocked: true, retryAfterMs: entry.blockedUntil - now }
  }

  // Block expired — reset
  if (entry.blockedUntil && now >= entry.blockedUntil) {
    store.delete(key)
    return { blocked: false }
  }

  // Window expired — reset
  if (now - entry.firstAttempt > WINDOW_MS) {
    store.delete(key)
    return { blocked: false }
  }

  return { blocked: false }
}

/**
 * Record a failed attempt. Returns true if now blocked.
 */
export function recordFailedAttempt(key: string): boolean {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now - entry.firstAttempt > WINDOW_MS) {
    store.set(key, { count: 1, firstAttempt: now, blockedUntil: null })
    return false
  }

  entry.count++
  if (entry.count >= MAX_ATTEMPTS) {
    entry.blockedUntil = now + BLOCK_DURATION_MS
    return true
  }

  return false
}

/**
 * Clear rate limit for a key (e.g., on successful login).
 */
export function clearRateLimit(key: string): void {
  store.delete(key)
}
