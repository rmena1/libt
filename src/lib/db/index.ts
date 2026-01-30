import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from './schema'

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/libt'

// Create database connection (singleton pattern)
let _db: ReturnType<typeof createDb> | null = null

function createDb() {
  const pool = new pg.Pool({
    connectionString: DATABASE_URL,
  })

  return drizzle(pool, { schema })
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
