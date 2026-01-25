import { customAlphabet } from 'nanoid'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// ============================================================================
// ID GENERATION
// ============================================================================
// Using nanoid with custom alphabet (no confusing characters)
const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz'
const nanoid = customAlphabet(alphabet, 21)

export function generateId(): string {
  return nanoid()
}

// ============================================================================
// CLASS NAMES
// ============================================================================
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============================================================================
// DATE UTILITIES
// ============================================================================
/**
 * Format date as YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Parse YYYY-MM-DD string to Date
 */
export function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00')
}

/**
 * Get today's date as YYYY-MM-DD
 */
export function today(): string {
  return formatDate(new Date())
}

/**
 * Add days to a date string
 */
export function addDays(dateStr: string, days: number): string {
  const date = parseDate(dateStr)
  date.setDate(date.getDate() + days)
  return formatDate(date)
}

/**
 * Format date for display (e.g., "Monday, January 25")
 */
export function formatDateDisplay(dateStr: string): string {
  const date = parseDate(dateStr)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Check if date is today
 */
export function isToday(dateStr: string): boolean {
  return dateStr === today()
}

/**
 * Check if date is in the past
 */
export function isPast(dateStr: string): boolean {
  return dateStr < today()
}

/**
 * Check if date is in the future
 */
export function isFuture(dateStr: string): boolean {
  return dateStr > today()
}

// ============================================================================
// SLUG UTILITIES
// ============================================================================
/**
 * Convert string to URL-safe slug
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// ============================================================================
// DEBOUNCE
// ============================================================================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}
