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

// Timezone for all date operations (personal app, hardcoded)
const TIMEZONE = 'America/Santiago'

/**
 * Format date as YYYY-MM-DD in configured timezone
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: TIMEZONE })
}

/**
 * Parse YYYY-MM-DD string to Date (in configured timezone)
 */
export function parseDate(dateStr: string): Date {
  // Parse as local date in the configured timezone
  const [year, month, day] = dateStr.split('-').map(Number)
  // Create date at noon to avoid DST edge cases
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  return date
}

/**
 * Get today's date as YYYY-MM-DD in configured timezone
 */
export function today(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: TIMEZONE })
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
    timeZone: TIMEZONE,
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
) {
  let timeoutId: ReturnType<typeof setTimeout>
  
  const debounced = (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
  
  debounced.cancel = () => {
    clearTimeout(timeoutId)
  }
  
  return debounced
}

// ============================================================================
// TASK DATE PARSING (@date syntax)
// ============================================================================

interface ParsedTaskDate {
  date: string | null // YYYY-MM-DD format
  displayText: string | null // Human readable ("Tomorrow", "Mon 30")
  cleanedContent: string // Content with @date removed
}

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
const SHORT_DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
// const MONTH_NAMES = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
const SHORT_MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

function getNowInTimezone(): Date {
  // Get current time in the configured timezone
  const now = new Date()
  const tzString = now.toLocaleString('en-US', { timeZone: TIMEZONE })
  return new Date(tzString)
}

function getNextDayOfWeek(dayIndex: number): Date {
  const now = getNowInTimezone()
  const currentDay = now.getDay()
  let daysUntil = dayIndex - currentDay
  if (daysUntil <= 0) daysUntil += 7 // Next week
  now.setDate(now.getDate() + daysUntil)
  return now
}

function formatDateForDisplay(dateStr: string): string {
  const todayStr = today()
  const yesterdayStr = addDays(todayStr, -1)
  const tomorrowStr = addDays(todayStr, 1)
  
  if (dateStr === todayStr) return 'Today'
  if (dateStr === tomorrowStr) return 'Tomorrow'
  if (dateStr === yesterdayStr) return 'Yesterday'
  
  const targetDate = parseDate(dateStr)
  const todayDate = parseDate(todayStr)
  const daysDiff = Math.round((targetDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24))
  
  // Future within the next week (2-7 days), show day name
  if (daysDiff > 0 && daysDiff <= 7) {
    return targetDate.toLocaleDateString('en-US', { weekday: 'short', timeZone: TIMEZONE })
  }
  
  // Past or more than a week away, show "Jan 30" format
  const month = targetDate.toLocaleDateString('en-US', { month: 'short', timeZone: TIMEZONE })
  const day = targetDate.getDate()
  return `${month} ${day}`
}

/**
 * Parse @date syntax from text content
 * Supports: @today, @tomorrow, @monday-@sunday, @2026-01-30, @jan 30, @30 jan
 */
export function parseTaskDate(content: string): ParsedTaskDate {
  // Regex patterns for different date formats
  const patterns = [
    // @today, @tomorrow
    /@(today|tomorrow)\b/i,
    // @monday, @tuesday, etc.
    /@(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|wed|thu|fri|sat)\b/i,
    // @2026-01-30
    /@(\d{4}-\d{2}-\d{2})\b/,
    // @jan 30 or @january 30
    /@(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})\b/i,
    // @30 jan or @30 january
    /@(\d{1,2})\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i,
  ]
  
  let date: string | null = null
  let matchedText: string | null = null
  
  // Try @today/@tomorrow
  let match = content.match(patterns[0])
  if (match) {
    matchedText = match[0]
    const keyword = match[1].toLowerCase()
    const now = getNowInTimezone()
    if (keyword === 'today') {
      date = formatDate(now)
    } else if (keyword === 'tomorrow') {
      now.setDate(now.getDate() + 1)
      date = formatDate(now)
    }
  }
  
  // Try day of week
  if (!date) {
    match = content.match(patterns[1])
    if (match) {
      matchedText = match[0]
      const dayName = match[1].toLowerCase()
      let dayIndex = DAY_NAMES.indexOf(dayName)
      if (dayIndex === -1) {
        dayIndex = SHORT_DAY_NAMES.indexOf(dayName.slice(0, 3))
      }
      if (dayIndex !== -1) {
        const targetDate = getNextDayOfWeek(dayIndex)
        date = formatDate(targetDate)
      }
    }
  }
  
  // Try ISO date @2026-01-30
  if (!date) {
    match = content.match(patterns[2])
    if (match) {
      matchedText = match[0]
      date = match[1]
    }
  }
  
  // Try @jan 30 format
  if (!date) {
    match = content.match(patterns[3])
    if (match) {
      matchedText = match[0]
      const monthStr = match[1].toLowerCase().slice(0, 3)
      const day = parseInt(match[2], 10)
      const monthIndex = SHORT_MONTH_NAMES.indexOf(monthStr)
      if (monthIndex !== -1) {
        const now = getNowInTimezone()
        let year = now.getFullYear()
        // If the month/day is in the past, use next year
        const testDate = new Date(year, monthIndex, day)
        if (testDate < now) year++
        date = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      }
    }
  }
  
  // Try @30 jan format
  if (!date) {
    match = content.match(patterns[4])
    if (match) {
      matchedText = match[0]
      const day = parseInt(match[1], 10)
      const monthStr = match[2].toLowerCase().slice(0, 3)
      const monthIndex = SHORT_MONTH_NAMES.indexOf(monthStr)
      if (monthIndex !== -1) {
        const now = getNowInTimezone()
        let year = now.getFullYear()
        const testDate = new Date(year, monthIndex, day)
        if (testDate < now) year++
        date = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      }
    }
  }
  
  if (date && matchedText) {
    return {
      date,
      displayText: formatDateForDisplay(date),
      cleanedContent: content.replace(matchedText, '').replace(/\s+/g, ' ').trim(),
    }
  }
  
  return {
    date: null,
    displayText: null,
    cleanedContent: content,
  }
}

// ============================================================================
// TASK PRIORITY PARSING (!priority syntax)
// ============================================================================

type TaskPriority = 'low' | 'medium' | 'high' | null

interface ParsedPriority {
  priority: TaskPriority
  cleanedContent: string
}

/**
 * Parse !priority syntax from text content
 * ! = low (or no indicator), !! = medium, !!! = high
 */
export function parseTaskPriority(content: string): ParsedPriority {
  // Look for !!! first (high), then !! (medium), then ! (low)
  // Can be at start or end of content
  
  // Pattern for multiple ! (2 or 3, since single ! is too common)
  const tripleMatch = content.match(/\s*!!!\s*/)
  if (tripleMatch) {
    return {
      priority: 'high',
      cleanedContent: content.replace(tripleMatch[0], ' ').trim(),
    }
  }
  
  const doubleMatch = content.match(/\s*!!\s*/)
  if (doubleMatch) {
    return {
      priority: 'medium',
      cleanedContent: content.replace(doubleMatch[0], ' ').trim(),
    }
  }
  
  // Single ! at the end or standalone (not part of a word)
  const singleMatch = content.match(/\s+!\s*$|^\s*!\s+/)
  if (singleMatch) {
    return {
      priority: 'low',
      cleanedContent: content.replace(singleMatch[0], ' ').trim(),
    }
  }
  
  return {
    priority: null,
    cleanedContent: content,
  }
}

/**
 * Get priority display info (color, label)
 */
export function getPriorityInfo(priority: TaskPriority): { color: string; bgColor: string; label: string } | null {
  switch (priority) {
    case 'high':
      return { color: '#dc2626', bgColor: '#fef2f2', label: '!!!' }
    case 'medium':
      return { color: '#d97706', bgColor: '#fffbeb', label: '!!' }
    case 'low':
      return { color: '#6b7280', bgColor: '#f3f4f6', label: '!' }
    default:
      return null
  }
}

/**
 * Check if a task date is overdue
 */
export function isOverdue(taskDate: string | null): boolean {
  if (!taskDate) return false
  return taskDate < today()
}

/**
 * Check if a task date is today
 */
export function isTaskToday(taskDate: string | null): boolean {
  if (!taskDate) return false
  return taskDate === today()
}
