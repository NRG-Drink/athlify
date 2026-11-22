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

export const MIN_PASSWORD_LENGTH = 8
export const MAX_PASSWORD_LENGTH = 200

/** Interpolation values of the length messages, so a server-side rejection reads like the client's own check. */
export const passwordLimits = { min: MIN_PASSWORD_LENGTH, max: MAX_PASSWORD_LENGTH }

/** The `extensions.rule` values of the server's password policy and the message each one shows. */
export const PASSWORD_RULE_KEYS = {
  PASSWORD_TOO_SHORT: 'form.errors.passwordTooShort',
  PASSWORD_TOO_LONG: 'form.errors.passwordTooLong',
} as const

/** The error text of a new password, or undefined when it is acceptable. Same rule as the server's `PasswordPolicy`. */
export function newPasswordError(password: string, t: TFunction): string | undefined {
  if (password.trim() === '') return t('form.errors.required')
  if (password.length < MIN_PASSWORD_LENGTH)
    return t(PASSWORD_RULE_KEYS.PASSWORD_TOO_SHORT, passwordLimits)
  if (password.length > MAX_PASSWORD_LENGTH)
    return t(PASSWORD_RULE_KEYS.PASSWORD_TOO_LONG, passwordLimits)
  return undefined
}

/** The confirmation is checked on the client only; the new password follows the rule of `newPasswordError`. */
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
