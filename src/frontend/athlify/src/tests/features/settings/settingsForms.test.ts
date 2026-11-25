import type { TFunction } from 'i18next'
import i18n from 'i18next'
import { describe, expect, it } from 'vitest'
import {
  confirmationMismatch,
  toPasswordChangeInput,
  validatePassword,
} from '../../../features/settings/passwordValues'
import {
  isProfileDirty,
  toProfileInput,
  validateProfile,
} from '../../../features/settings/profileValues'
import { mapUpdateMeErrors } from '../../../features/settings/settingsErrors'

const t = i18n.t.bind(i18n) as TFunction

describe('validateProfile', () => {
  const valid = { firstName: 'Luca', lastName: 'Muster', language: 'DE' as const }

  it('accepts a complete profile', () => {
    expect(validateProfile(valid, t)).toEqual({})
  })

  it('requires both names', () => {
    expect(validateProfile({ ...valid, firstName: '  ', lastName: '' }, t)).toEqual({
      firstName: 'Pflichtfeld.',
      lastName: 'Pflichtfeld.',
    })
  })

  it('rejects names over 100 characters', () => {
    const errors = validateProfile({ ...valid, lastName: 'x'.repeat(101) }, t)
    expect(errors.lastName).toBe('Maximal 100 Zeichen.')
  })

  it('detects changes against the saved profile, ignoring surrounding spaces', () => {
    expect(isProfileDirty({ ...valid, firstName: ' Luca ' }, valid)).toBe(false)
    expect(isProfileDirty({ ...valid, language: 'EN' }, valid)).toBe(true)
  })

  it('builds a trimmed input', () => {
    expect(toProfileInput({ ...valid, firstName: ' Luca ' })).toEqual(valid)
  })
})

describe('validatePassword', () => {
  it('requires all three fields', () => {
    expect(validatePassword({ currentPassword: '', newPassword: '', confirmation: '' }, t)).toEqual(
      {
        currentPassword: 'Pflichtfeld.',
        newPassword: 'Pflichtfeld.',
        confirmation: 'Pflichtfeld.',
      },
    )
  })

  it('reports a mismatching confirmation', () => {
    const errors = validatePassword({ currentPassword: 'a', newPassword: 'b', confirmation: 'c' }, t)
    expect(errors).toEqual({ confirmation: 'Die Passwörter stimmen nicht überein.' })
  })

  it('never sends the confirmation', () => {
    expect(
      toPasswordChangeInput({ currentPassword: 'a', newPassword: 'b', confirmation: 'b' }),
    ).toEqual({ currentPassword: 'a', newPassword: 'b' })
  })
})

describe('mapUpdateMeErrors', () => {
  it('maps a wrong current password', () => {
    expect(
      mapUpdateMeErrors([
        {
          message: 'The current password is incorrect.',
          extensions: { code: 'CURRENT_PASSWORD_INCORRECT', field: 'currentPassword' },
        },
      ]),
    ).toEqual({
      fieldErrors: { currentPassword: 'settings.errors.currentPasswordIncorrect' },
      general: false,
    })
  })

  it('maps validation errors by field', () => {
    const result = mapUpdateMeErrors([
      {
        message: 'firstName is required.',
        extensions: { code: 'VALIDATION_ERROR', field: 'firstName' },
      },
      {
        message: 'newPassword is required.',
        extensions: { code: 'VALIDATION_ERROR', field: 'newPassword' },
      },
    ])
    expect(result.fieldErrors).toEqual({
      firstName: 'form.errors.required',
      newPassword: 'form.errors.required',
    })
    expect(result.general).toBe(false)
  })

  it('flags unknown errors as general', () => {
    expect(mapUpdateMeErrors([{ message: 'boom' }]).general).toBe(true)
  })
})

describe('confirmationMismatch', () => {
  it('is false while the confirmation is empty or equal', () => {
    expect(confirmationMismatch({ currentPassword: '', newPassword: 'abc', confirmation: '' })).toBe(false)
    expect(confirmationMismatch({ currentPassword: '', newPassword: 'abc', confirmation: 'abc' })).toBe(false)
  })

  it('is true as soon as the confirmation differs, also from a partial entry', () => {
    expect(confirmationMismatch({ currentPassword: '', newPassword: 'abc', confirmation: 'ab' })).toBe(true)
  })
})
