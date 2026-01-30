import { definePermissions } from '@rocicorp/zero'
import { schema, type Schema } from './schema'

export { schema }

type AuthData = { userID: string }

export const permissions = definePermissions<AuthData, Schema>(schema, () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isOwner = (authData: AuthData, eb: any) =>
    eb.cmp('userId', '=', authData.userID)

  return {
    page: {
      row: {
        select: [isOwner],
        insert: [isOwner],
        update: {
          preMutation: [isOwner],
        },
        delete: [isOwner],
      },
    },
    folder: {
      row: {
        select: [isOwner],
        insert: [isOwner],
        update: {
          preMutation: [isOwner],
        },
        delete: [isOwner],
      },
    },
  }
})
