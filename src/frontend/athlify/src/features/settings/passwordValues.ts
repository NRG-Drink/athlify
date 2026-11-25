import type { TFunction } from 'i18next'

export interface PasswordValues {
  currentPassword: string
  newPassword: string
  confirmation: string
}

export type PasswordErrors = Partial<Record<keyof PasswordValues, string>>

export const emptyPasswordValues: PasswordValues = {
  currentPassword: '',
  newPassword: '',
  confirmation: '',
}

/** True while something is typed in the confirmation and it differs from the new password. */
export function confirmationMismatch(values: PasswordValues): boolean {
  return values.confirmation !== '' && values.confirmation !== values.newPassword
}

/** The `extensions.rule` values of the server's password policy and the message each one shows. */
export const PASSWORD_RULE_KEYS = {
  PASSWORD_TOO_SHORT: 'form.errors.passwordTooShort',
  PASSWORD_TOO_LONG: 'form.errors.passwordTooLong',
} as const

/** The error text of a new password that is empty, or undefined. The length rule is the server's (its limits are configured there). */
export function newPasswordError(password: string, t: TFunction): string | undefined {
  if (password.trim() === '') return t('form.errors.required')
  return undefined
}

/** The confirmation is checked on the client only; the new password is checked by the server's policy. */
export function validatePassword(values: PasswordValues, t: TFunction): PasswordErrors {
  const errors: PasswordErrors = {}
  if (values.currentPassword === '') errors.currentPassword = t('form.errors.required')
  const newPassword = newPasswordError(values.newPassword, t)
  if (newPassword) errors.newPassword = newPassword
  if (values.confirmation === '') errors.confirmation = t('form.errors.required')
  else if (confirmationMismatch(values))
    errors.confirmation = t('settings.errors.confirmationMismatch')
  return errors
}

/** The confirmation is never sent to the server. */
export function toPasswordChangeInput(values: PasswordValues) {
  return { currentPassword: values.currentPassword, newPassword: values.newPassword }
}
