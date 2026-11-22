import type { TFunction } from 'i18next'
import type { ApiLanguage } from '../../i18n/languages'
import { validateName } from '../settings/profileValues'
import { newPasswordError } from '../settings/passwordValues'

export const MAX_USERNAME_LENGTH = 100

/** The `UserRole` enum of the API. */
export type ApiRole = 'USER' | 'ADMIN'
export const API_ROLES: readonly ApiRole[] = ['USER', 'ADMIN']

export interface UserFormValues {
  username: string
  firstName: string
  lastName: string
  language: ApiLanguage
  role: ApiRole
  password: string
}

export type UserFormErrors = Partial<Record<keyof UserFormValues, string>>

export const emptyUserValues: UserFormValues = {
  username: '',
  firstName: '',
  lastName: '',
  language: 'DE',
  role: 'USER',
  password: '',
}

/** Validates the create form (`withAccount`) or the edit form; the username and password only exist on create. */
export function validateUser(
  values: UserFormValues,
  withAccount: boolean,
  t: TFunction,
): UserFormErrors {
  const errors: UserFormErrors = {}
  for (const field of ['firstName', 'lastName'] as const) {
    const error = validateName(values[field], t)
    if (error) errors[field] = error
  }
  if (withAccount) {
    const username = values.username.trim()
    if (username === '') errors.username = t('form.errors.required')
    else if (username.length > MAX_USERNAME_LENGTH)
      errors.username = t('settings.errors.tooLong', { max: MAX_USERNAME_LENGTH })
    else if (/\s/.test(username)) errors.username = t('adminUsers.errors.usernameSpaces')
    const password = newPasswordError(values.password, t)
    if (password) errors.password = password
  }
  return errors
}

export function toCreateInput(values: UserFormValues) {
  return {
    username: values.username.trim(),
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    language: values.language,
    role: values.role,
    password: values.password,
  }
}

export function toUpdateInput(values: UserFormValues) {
  return {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    language: values.language,
    role: values.role,
  }
}
