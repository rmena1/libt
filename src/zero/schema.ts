import {
  table,
  string,
  number,
  boolean,
  createSchema,
  createBuilder,
  relationships,
} from '@rocicorp/zero'

// ============================================================================
// ZERO SCHEMA
// Only sync pages and folders. Users/sessions stay server-side.
// ============================================================================

const page = table('page')
  .from('pages')
  .columns({
    id: string(),
    userId: string().from('user_id'),
    content: string(),
    indent: number(),
    dailyDate: string().optional().from('daily_date'),
    folderId: string().optional().from('folder_id'),
    parentPageId: string().optional().from('parent_page_id'),
    order: number(),
    isTask: boolean().from('is_task'),
    taskCompleted: boolean().from('task_completed'),
    taskCompletedAt: number().optional().from('task_completed_at'),
    taskDate: string().optional().from('task_date'),
    taskPriority: string().optional().from('task_priority'),
    starred: boolean(),
    createdAt: number().from('created_at'),
    updatedAt: number().from('updated_at'),
  })
  .primaryKey('id')

const folder = table('folder')
  .from('folders')
  .columns({
    id: string(),
    userId: string().from('user_id'),
    name: string(),
    slug: string(),
    parentId: string().optional().from('parent_id'),
    order: number(),
    createdAt: number().from('created_at'),
    updatedAt: number().from('updated_at'),
  })
  .primaryKey('id')

const pageRelationships = relationships(page, ({ one, many }) => ({
  folder: one({
    sourceField: ['folderId'],
    destField: ['id'],
    destSchema: folder,
  }),
  parentPage: one({
    sourceField: ['parentPageId'],
    destField: ['id'],
    destSchema: page,
  }),
  childPages: many({
    sourceField: ['id'],
    destSchema: page,
    destField: ['parentPageId'],
  }),
}))

const folderRelationships = relationships(folder, ({ one, many }) => ({
  parentFolder: one({
    sourceField: ['parentId'],
    destField: ['id'],
    destSchema: folder,
  }),
  childFolders: many({
    sourceField: ['id'],
    destSchema: folder,
    destField: ['parentId'],
  }),
  pages: many({
    sourceField: ['id'],
    destSchema: page,
    destField: ['folderId'],
  }),
}))

export const schema = createSchema({
  tables: [page, folder],
  relationships: [pageRelationships, folderRelationships],
  enableLegacyQueries: true,
  enableLegacyMutators: true,
})

export const zql = createBuilder(schema)

export type Schema = typeof schema

// Register default types
declare module '@rocicorp/zero' {
  interface DefaultTypes {
    schema: Schema
  }
}
