import { pgTable, text, integer, bigint, boolean, index, uniqueIndex } from 'drizzle-orm/pg-core'

// ============================================================================
// USERS
// ============================================================================
export const users = pgTable('users', {
  id: text('id').primaryKey(), // nanoid
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  googleRefreshToken: text('google_refresh_token'),
  googleAccessToken: text('google_access_token'),
  googleTokenExpiry: integer('google_token_expiry'), // unix timestamp in seconds
  createdAt: bigint('created_at', { mode: 'number' }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull().$defaultFn(() => Date.now()),
})

// ============================================================================
// SESSIONS (for auth)
// ============================================================================
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(), // session token
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: bigint('expires_at', { mode: 'number' }).notNull(),
  createdAt: bigint('created_at', { mode: 'number' }).notNull().$defaultFn(() => Date.now()),
}, (table) => [
  index('idx_sessions_user').on(table.userId),
  index('idx_sessions_expires').on(table.expiresAt),
])

// ============================================================================
// FOLDERS
// ============================================================================
export const folders = pgTable('folders', {
  id: text('id').primaryKey(), // nanoid
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull(), // URL-safe version
  parentId: text('parent_id').references((): any => folders.id, { onDelete: 'cascade' }),
  order: integer('order').notNull().default(0),
  createdAt: bigint('created_at', { mode: 'number' }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull().$defaultFn(() => Date.now()),
}, (table) => [
  index('idx_folders_user').on(table.userId),
  index('idx_folders_parent').on(table.parentId),
  uniqueIndex('idx_folders_user_slug').on(table.userId, table.slug),
])

// ============================================================================
// PAGES
// ============================================================================
export const pages = pgTable('pages', {
  id: text('id').primaryKey(), // nanoid
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Content
  content: text('content').notNull().default(''),
  indent: integer('indent').notNull().default(0), // Indentation level (0-4)
  
  // Hierarchy
  dailyDate: text('daily_date'), // YYYY-MM-DD if part of daily note
  folderId: text('folder_id').references(() => folders.id, { onDelete: 'set null' }),
  parentPageId: text('parent_page_id').references((): any => pages.id, { onDelete: 'cascade' }),
  order: integer('order').notNull().default(0),
  
  // Task fields
  isTask: boolean('is_task').notNull().default(false),
  taskCompleted: boolean('task_completed').notNull().default(false),
  taskCompletedAt: bigint('task_completed_at', { mode: 'number' }),
  taskDate: text('task_date'), // YYYY-MM-DD for task due date
  taskPriority: text('task_priority'), // 'low' | 'medium' | 'high'
  
  // Starred (favorites)
  starred: boolean('starred').notNull().default(false),
  
  // Timestamps
  createdAt: bigint('created_at', { mode: 'number' }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull().$defaultFn(() => Date.now()),
}, (table) => [
  index('idx_pages_user_daily').on(table.userId, table.dailyDate),
  index('idx_pages_user_folder').on(table.userId, table.folderId),
  index('idx_pages_parent').on(table.parentPageId),
  index('idx_pages_tasks').on(table.userId, table.isTask, table.taskDate),
  index('idx_pages_starred').on(table.userId, table.starred),
])

// ============================================================================
// TYPES
// ============================================================================
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert

export type Folder = typeof folders.$inferSelect
export type NewFolder = typeof folders.$inferInsert

export type Page = typeof pages.$inferSelect
export type NewPage = typeof pages.$inferInsert
