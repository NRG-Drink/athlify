import type { TFunction } from 'i18next'
import type { ApiLanguage } from '../../i18n/languages'

export const MAX_NAME_LENGTH = 100

export interface ProfileValues {
  firstName: string
  lastName: string
  language: ApiLanguage
}

export type ProfileErrors = Partial<Record<'firstName' | 'lastName', string>>

export function validateProfile(values: ProfileValues, t: TFunction): ProfileErrors {
  const errors: ProfileErrors = {}
  for (const field of ['firstName', 'lastName'] as const) {
    const value = values[field].trim()
    if (value === '') errors[field] = t('form.errors.required')
    else if (value.length > MAX_NAME_LENGTH)
      errors[field] = t('settings.errors.tooLong', { max: MAX_NAME_LENGTH })
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
