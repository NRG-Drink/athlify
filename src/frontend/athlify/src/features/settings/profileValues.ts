import type { TFunction } from 'i18next'
import type { ApiLanguage } from '../../i18n/languages'

export const MAX_NAME_LENGTH = 100

export interface ProfileValues {
  firstName: string
  lastName: string
  language: ApiLanguage
}

export type ProfileErrors = Partial<Record<'firstName' | 'lastName', string>>

/** The error text of a first or last name, or undefined when it is acceptable. Shared with the admin user form. */
export function validateName(value: string, t: TFunction): string | undefined {
  const trimmed = value.trim()
  if (trimmed === '') return t('form.errors.required')
  if (trimmed.length > MAX_NAME_LENGTH)
    return t('settings.errors.tooLong', { max: MAX_NAME_LENGTH })
  return undefined
}

export function validateProfile(values: ProfileValues, t: TFunction): ProfileErrors {
  const errors: ProfileErrors = {}
  for (const field of ['firstName', 'lastName'] as const) {
    const error = validateName(values[field], t)
    if (error) errors[field] = error
  }
  return errors
}

/** True when the draft differs from the saved profile (names compared trimmed, as the server stores them). */
export function isProfileDirty(draft: ProfileValues, saved: ProfileValues): boolean {
  return (
    draft.firstName.trim() !== saved.firstName ||
    draft.lastName.trim() !== saved.lastName ||
    draft.language !== saved.language
  )
}

export function toProfileInput(values: ProfileValues) {
  return {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    language: values.language,
  }
}
