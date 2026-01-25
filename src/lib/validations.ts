import { z } from 'zod'

// ============================================================================
// AUTH SCHEMAS
// ============================================================================
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters'),
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

// ============================================================================
// PAGE SCHEMAS
// ============================================================================
export const createPageSchema = z.object({
  content: z.string().default(''),
  dailyDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  folderId: z.string().optional(),
  parentPageId: z.string().optional(),
  order: z.number().int().default(0),
})

export const updatePageSchema = z.object({
  content: z.string().optional(),
  folderId: z.string().nullable().optional(),
  parentPageId: z.string().nullable().optional(),
  order: z.number().int().optional(),
  isTask: z.boolean().optional(),
  taskCompleted: z.boolean().optional(),
  taskDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  taskPriority: z.enum(['low', 'medium', 'high']).nullable().optional(),
})

// ============================================================================
// FOLDER SCHEMAS
// ============================================================================
export const createFolderSchema = z.object({
  name: z.string().min(1, 'Folder name is required').max(100),
  parentId: z.string().optional(),
})

export const updateFolderSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  parentId: z.string().nullable().optional(),
  order: z.number().int().optional(),
})

// ============================================================================
// TYPES
// ============================================================================
export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type CreatePageInput = z.infer<typeof createPageSchema>
export type UpdatePageInput = z.infer<typeof updatePageSchema>
export type CreateFolderInput = z.infer<typeof createFolderSchema>
export type UpdateFolderInput = z.infer<typeof updateFolderSchema>
