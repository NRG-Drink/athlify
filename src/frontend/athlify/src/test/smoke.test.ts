import { expect, test } from 'vitest'
import i18n from 'i18next'
import '../i18n'

test('test runner loads i18n with German as default language', () => {
  expect(i18n.resolvedLanguage).toBe('de')
})
