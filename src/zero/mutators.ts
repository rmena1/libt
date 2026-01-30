import { defineMutators, defineMutator } from '@rocicorp/zero'
import { z } from 'zod'

export const mutators = defineMutators({
  pages: {
    create: defineMutator(
      z.object({
        id: z.string(),
        content: z.string().optional(),
        indent: z.number().optional(),
        dailyDate: z.string().optional(),
        folderId: z.string().optional(),
        parentPageId: z.string().optional(),
        order: z.number().optional(),
      }),
      async ({ tx, ctx: { userID }, args }) => {
        await tx.mutate.page.insert({
          id: args.id,
          userId: userID,
          content: args.content ?? '',
          indent: args.indent ?? 0,
          dailyDate: args.dailyDate ?? null,
          folderId: args.folderId ?? null,
          parentPageId: args.parentPageId ?? null,
          order: args.order ?? 0,
          isTask: false,
          taskCompleted: false,
          taskCompletedAt: null,
          taskDate: null,
          taskPriority: null,
          starred: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      }
    ),

    update: defineMutator(
      z.object({
        id: z.string(),
        content: z.string().optional(),
        indent: z.number().optional(),
        dailyDate: z.string().optional().nullable(),
        folderId: z.string().optional().nullable(),
        parentPageId: z.string().optional().nullable(),
        order: z.number().optional(),
        isTask: z.boolean().optional(),
        taskCompleted: z.boolean().optional(),
        taskCompletedAt: z.number().optional().nullable(),
        taskDate: z.string().optional().nullable(),
        taskPriority: z.string().optional().nullable(),
        starred: z.boolean().optional(),
      }),
      async ({ tx, args: { id, ...updates } }) => {
        await tx.mutate.page.update({
          id,
          ...updates,
          updatedAt: Date.now(),
        })
      }
    ),

    delete: defineMutator(
      z.object({ id: z.string() }),
      async ({ tx, args: { id } }) => {
        await tx.mutate.page.delete({ id })
      }
    ),
  },

  folders: {
    create: defineMutator(
      z.object({
        id: z.string(),
        name: z.string(),
        slug: z.string(),
        parentId: z.string().optional(),
        order: z.number().optional(),
      }),
      async ({ tx, ctx: { userID }, args }) => {
        await tx.mutate.folder.insert({
          id: args.id,
          userId: userID,
          name: args.name,
          slug: args.slug,
          parentId: args.parentId ?? null,
          order: args.order ?? 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      }
    ),

    update: defineMutator(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        slug: z.string().optional(),
        order: z.number().optional(),
      }),
      async ({ tx, args: { id, ...updates } }) => {
        await tx.mutate.folder.update({
          id,
          ...updates,
          updatedAt: Date.now(),
        })
      }
    ),

    delete: defineMutator(
      z.object({ id: z.string() }),
      async ({ tx, args: { id } }) => {
        await tx.mutate.folder.delete({ id })
      }
    ),
  },
})
