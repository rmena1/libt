import { zeroDrizzle } from '@rocicorp/zero/server/adapters/drizzle'
import { schema } from './schema'
import { db } from '@/lib/db'

export const dbProvider = zeroDrizzle(schema, db)
