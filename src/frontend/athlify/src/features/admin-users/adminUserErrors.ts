import { PASSWORD_RULE_KEYS } from '../settings/passwordValues'
import {
  mapFieldErrors,
  type GraphQLErrorLike,
  type MappedFieldErrors,
} from '../settings/settingsErrors'

const FIELDS = ['username', 'firstName', 'lastName', 'role', 'password', 'newPassword'] as const

export type AdminUserField = (typeof FIELDS)[number]

export type MappedAdminErrors = MappedFieldErrors<AdminUserField>

/** Maps the user-management errors to i18n keys (see `mapFieldErrors`). */
export function mapAdminUserErrors(errors: readonly GraphQLErrorLike[]): MappedAdminErrors {
  return mapFieldErrors(
    errors,
    FIELDS,
    {
      USERNAME_TAKEN: { field: 'username', key: 'adminUsers.errors.usernameTaken' },
      LAST_ADMIN: { field: 'role', key: 'adminUsers.errors.lastAdmin' },
      CANNOT_CHANGE_OWN_ROLE: { field: 'role', key: 'adminUsers.errors.ownRole' },
    },
    PASSWORD_RULE_KEYS,
  )
}
