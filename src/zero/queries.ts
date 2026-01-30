import { defineQueries, defineQuery } from '@rocicorp/zero'
import { z } from 'zod'
import { zql } from './schema'

export const queries = defineQueries({
  pages: {
    // Pages for a specific daily date (top-level only)
    byDailyDate: defineQuery(
      z.object({ dailyDate: z.string() }),
      ({ args: { dailyDate }, ctx: { userID } }) =>
        zql.page
          .where('userId', userID)
          .where('dailyDate', dailyDate)
          .where('parentPageId', 'IS', null)
          .orderBy('order', 'asc')
          .orderBy('createdAt', 'asc')
    ),

    // Pages in a date range (for infinite scroll)
    byDateRange: defineQuery(
      z.object({ startDate: z.string(), endDate: z.string() }),
      ({ args: { startDate, endDate }, ctx: { userID } }) =>
        zql.page
          .where('userId', userID)
          .where('parentPageId', 'IS', null)
          .where('dailyDate', '>=', startDate)
          .where('dailyDate', '<=', endDate)
          .orderBy('dailyDate', 'asc')
          .orderBy('order', 'asc')
          .orderBy('createdAt', 'asc')
    ),

    // Child pages of a parent
    children: defineQuery(
      z.object({ parentPageId: z.string() }),
      ({ args: { parentPageId }, ctx: { userID } }) =>
        zql.page
          .where('userId', userID)
          .where('parentPageId', parentPageId)
          .orderBy('order', 'asc')
          .orderBy('createdAt', 'asc')
    ),

    // Tasks (all tasks for a user)
    tasks: defineQuery(
      ({ ctx: { userID } }) =>
        zql.page
          .where('userId', userID)
          .where('isTask', true)
          .orderBy('taskDate', 'asc')
          .orderBy('createdAt', 'desc')
    ),

    // Projected tasks for date range (tasks with taskDate != dailyDate)
    projectedTasks: defineQuery(
      z.object({ startDate: z.string(), endDate: z.string() }),
      ({ args: { startDate, endDate }, ctx: { userID } }) =>
        zql.page
          .where('userId', userID)
          .where('isTask', true)
          .where('taskDate', '>=', startDate)
          .where('taskDate', '<=', endDate)
          .orderBy('taskDate', 'asc')
          .orderBy('createdAt', 'asc')
    ),

    // Starred pages
    starred: defineQuery(
      ({ ctx: { userID } }) =>
        zql.page
          .where('userId', userID)
          .where('starred', true)
          .related('folder')
          .orderBy('updatedAt', 'asc')
    ),

    // Pages in a folder (top-level only)
    byFolder: defineQuery(
      z.object({ folderId: z.string() }),
      ({ args: { folderId }, ctx: { userID } }) =>
        zql.page
          .where('userId', userID)
          .where('folderId', folderId)
          .where('parentPageId', 'IS', null)
          .orderBy('order', 'asc')
          .orderBy('createdAt', 'asc')
    ),

    // Search pages by content (local-only, uses ILIKE)
    search: defineQuery(
      z.object({ query: z.string() }),
      ({ args: { query: q }, ctx: { userID } }) =>
        zql.page
          .where('userId', userID)
          .where('content', 'ILIKE', `%${q}%`)
          .orderBy('dailyDate', 'desc')
          .limit(15)
    ),
  },

  folders: {
    // All folders for user
    all: defineQuery(
      ({ ctx: { userID } }) =>
        zql.folder
          .where('userId', userID)
          .orderBy('order', 'asc')
          .orderBy('name', 'asc')
    ),

    // Folder by slug
    bySlug: defineQuery(
      z.object({ slug: z.string() }),
      ({ args: { slug }, ctx: { userID } }) =>
        zql.folder
          .where('userId', userID)
          .where('slug', slug)
          .one()
    ),

    // Root folders
    roots: defineQuery(
      ({ ctx: { userID } }) =>
        zql.folder
          .where('userId', userID)
          .where('parentId', 'IS', null)
          .orderBy('order', 'asc')
          .orderBy('name', 'asc')
    ),

    // Child folders
    children: defineQuery(
      z.object({ parentId: z.string() }),
      ({ args: { parentId }, ctx: { userID } }) =>
        zql.folder
          .where('userId', userID)
          .where('parentId', parentId)
          .orderBy('order', 'asc')
          .orderBy('name', 'asc')
    ),
  },
})
