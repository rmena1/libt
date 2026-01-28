'use server'

import { db, pages, type Page } from '@/lib/db'
import { eq, and, desc, asc, isNotNull, sql } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import { today, addDays } from '@/lib/utils'

export interface TaskGroup {
  pending: Page[]
  completed: Page[]
  overdue: Page[]
}

export interface TaskStats {
  total: number
  pending: number
  completed: number
  overdue: number
  dueToday: number
}

/**
 * Get all tasks for the current user
 * Ordered by: priority (high first), date (closest first), creation date
 */
export async function getTasks(): Promise<TaskGroup> {
  const session = await requireAuth()
  const todayStr = today()
  
  const allTasks = await db
    .select()
    .from(pages)
    .where(
      and(
        eq(pages.userId, session.id),
        eq(pages.isTask, true)
      )
    )
    .orderBy(
      // Priority order: high > medium > low > null
      sql`CASE 
        WHEN ${pages.taskPriority} = 'high' THEN 0 
        WHEN ${pages.taskPriority} = 'medium' THEN 1 
        WHEN ${pages.taskPriority} = 'low' THEN 2 
        ELSE 3 
      END`,
      // Date order: earlier dates first, nulls last
      sql`CASE WHEN ${pages.taskDate} IS NULL THEN 1 ELSE 0 END`,
      asc(pages.taskDate),
      // Creation date (newest first for same priority/date)
      desc(pages.createdAt)
    )
  
  // Separate into groups
  const pending: Page[] = []
  const completed: Page[] = []
  const overdue: Page[] = []
  
  for (const task of allTasks) {
    if (task.taskCompleted) {
      completed.push(task)
    } else if (task.taskDate && task.taskDate < todayStr) {
      overdue.push(task)
    } else {
      pending.push(task)
    }
  }
  
  return { pending, completed, overdue }
}

/**
 * Get tasks due today
 */
export async function getTodayTasks(): Promise<Page[]> {
  const session = await requireAuth()
  const todayStr = today()
  
  return db
    .select()
    .from(pages)
    .where(
      and(
        eq(pages.userId, session.id),
        eq(pages.isTask, true),
        eq(pages.taskCompleted, false),
        eq(pages.taskDate, todayStr)
      )
    )
    .orderBy(
      sql`CASE 
        WHEN ${pages.taskPriority} = 'high' THEN 0 
        WHEN ${pages.taskPriority} = 'medium' THEN 1 
        WHEN ${pages.taskPriority} = 'low' THEN 2 
        ELSE 3 
      END`,
      desc(pages.createdAt)
    )
}

/**
 * Get overdue tasks (date in the past, not completed)
 */
export async function getOverdueTasks(): Promise<Page[]> {
  const session = await requireAuth()
  const todayStr = today()
  
  return db
    .select()
    .from(pages)
    .where(
      and(
        eq(pages.userId, session.id),
        eq(pages.isTask, true),
        eq(pages.taskCompleted, false),
        isNotNull(pages.taskDate),
        sql`${pages.taskDate} < ${todayStr}`
      )
    )
    .orderBy(
      asc(pages.taskDate),
      desc(pages.createdAt)
    )
}

/**
 * Get tasks for this week
 */
export async function getWeekTasks(): Promise<Page[]> {
  const session = await requireAuth()
  const todayStr = today()
  const weekEndStr = addDays(todayStr, 7)
  
  return db
    .select()
    .from(pages)
    .where(
      and(
        eq(pages.userId, session.id),
        eq(pages.isTask, true),
        eq(pages.taskCompleted, false),
        isNotNull(pages.taskDate),
        sql`${pages.taskDate} >= ${todayStr}`,
        sql`${pages.taskDate} <= ${weekEndStr}`
      )
    )
    .orderBy(
      asc(pages.taskDate),
      sql`CASE 
        WHEN ${pages.taskPriority} = 'high' THEN 0 
        WHEN ${pages.taskPriority} = 'medium' THEN 1 
        WHEN ${pages.taskPriority} = 'low' THEN 2 
        ELSE 3 
      END`,
      desc(pages.createdAt)
    )
}

/**
 * Get task statistics
 */
export async function getTaskStats(): Promise<TaskStats> {
  const session = await requireAuth()
  const todayStr = today()
  
  const allTasks = await db
    .select()
    .from(pages)
    .where(
      and(
        eq(pages.userId, session.id),
        eq(pages.isTask, true)
      )
    )
  
  let pending = 0
  let completed = 0
  let overdue = 0
  let dueToday = 0
  
  for (const task of allTasks) {
    if (task.taskCompleted) {
      completed++
    } else {
      pending++
      if (task.taskDate) {
        if (task.taskDate < todayStr) {
          overdue++
        } else if (task.taskDate === todayStr) {
          dueToday++
        }
      }
    }
  }
  
  return {
    total: allTasks.length,
    pending,
    completed,
    overdue,
    dueToday,
  }
}
