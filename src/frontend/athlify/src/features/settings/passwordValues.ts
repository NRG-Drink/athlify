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

/** The server only requires a non-empty new password; the confirmation is checked on the client only. */
export function validatePassword(values: PasswordValues, t: TFunction): PasswordErrors {
  const errors: PasswordErrors = {}
  if (values.currentPassword === '') errors.currentPassword = t('form.errors.required')
  if (values.newPassword.trim() === '') errors.newPassword = t('form.errors.required')
  if (values.confirmation === '') errors.confirmation = t('form.errors.required')
  else if (confirmationMismatch(values)) errors.confirmation = t('settings.errors.confirmationMismatch')
  return errors
}

/** The confirmation is never sent to the server. */
export function toPasswordChangeInput(values: PasswordValues) {
  return { currentPassword: values.currentPassword, newPassword: values.newPassword }
}
