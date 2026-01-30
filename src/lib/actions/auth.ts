'use server'

import { redirect } from 'next/navigation'
import { db, users } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { hashPassword, verifyPassword, createSession, destroySession } from '@/lib/auth'
import { checkRateLimit, recordFailedAttempt, clearRateLimit } from '@/lib/auth/rate-limit'
import { registerSchema, loginSchema } from '@/lib/validations'
import { generateId } from '@/lib/utils'

export type AuthActionResult = {
  success: boolean
  error?: string
}

/**
 * Register a new user
 */
export async function register(formData: FormData): Promise<AuthActionResult> {
  const rawData = {
    email: formData.get('email'),
    password: formData.get('password'),
  }
  
  // Validate input
  const parsed = registerSchema.safeParse(rawData)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return {
      success: false,
      error: firstError?.message || 'Invalid input',
    }
  }
  
  const { email, password } = parsed.data
  
  // Check if user already exists
  const existingUser = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1)
  
  if (existingUser.length > 0) {
    return {
      success: false,
      error: 'An account with this email already exists',
    }
  }
  
  // Create user
  const userId = generateId()
  const passwordHash = await hashPassword(password)
  
  await db.insert(users).values({
    id: userId,
    email: email.toLowerCase(),
    passwordHash,
  })
  
  // Create session and redirect
  await createSession(userId)
  redirect('/')
}

/**
 * Log in an existing user
 */
export async function login(formData: FormData): Promise<AuthActionResult> {
  const rawData = {
    email: formData.get('email'),
    password: formData.get('password'),
  }
  
  // Validate input
  const parsed = loginSchema.safeParse(rawData)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return {
      success: false,
      error: firstError?.message || 'Invalid input',
    }
  }
  
  const { email, password } = parsed.data
  
  // Rate limit check (by email to prevent brute-force per account)
  const rateLimitKey = `login:${email.toLowerCase()}`
  const rateCheck = checkRateLimit(rateLimitKey)
  if (rateCheck.blocked) {
    const retryMin = Math.ceil((rateCheck.retryAfterMs || 0) / 60000)
    return {
      success: false,
      error: `Too many failed attempts. Try again in ${retryMin} minute${retryMin !== 1 ? 's' : ''}.`,
    }
  }
  
  // Find user
  const user = await db
    .select({
      id: users.id,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1)
  
  if (user.length === 0) {
    recordFailedAttempt(rateLimitKey)
    return {
      success: false,
      error: 'Invalid email or password',
    }
  }
  
  // Verify password
  const isValid = await verifyPassword(password, user[0].passwordHash)
  if (!isValid) {
    recordFailedAttempt(rateLimitKey)
    return {
      success: false,
      error: 'Invalid email or password',
    }
  }
  
  // Successful login — clear rate limit
  clearRateLimit(rateLimitKey)
  
  // Create session and redirect
  await createSession(user[0].id)
  redirect('/')
}

/**
 * Log out the current user
 */
export async function logout(): Promise<void> {
  await destroySession()
  redirect('/login')
}
