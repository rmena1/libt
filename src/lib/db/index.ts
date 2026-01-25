import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'
import path from 'path'

// Database file location
const DB_PATH = process.env.DATABASE_URL || path.join(process.cwd(), 'data', 'libt.db')

// Create database connection (singleton pattern for serverless)
let _db: ReturnType<typeof createDb> | null = null

function createDb() {
  const sqlite = new Database(DB_PATH)
  
  // Enable WAL mode for better concurrent access
  sqlite.pragma('journal_mode = WAL')
  
  // Enable foreign keys
  sqlite.pragma('foreign_keys = ON')
  
  return drizzle(sqlite, { schema })
}

export function getDb() {
  if (!_db) {
    _db = createDb()
  }
  return _db
}

// Export for direct access (use getDb() in most cases)
export const db = getDb()

// Re-export schema
export * from './schema'
