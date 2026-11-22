import { describe, expect, it } from 'vitest'
import { API_LANGUAGES, languageLabel, toI18nLanguage } from '../../i18n/languages'

describe('languages', () => {
  it('maps API enum values to i18next codes', () => {
    expect(toI18nLanguage('DE')).toBe('de')
    expect(toI18nLanguage('EN')).toBe('en')
  })

  it('lists the API enum values', () => {
    expect(API_LANGUAGES).toEqual(['DE', 'EN'])
  })

  it('names a language in that language', () => {
    expect(languageLabel('de')).toBe('Deutsch')
    expect(languageLabel('en')).toBe('English')
  })
})
