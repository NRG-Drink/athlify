import { describe, expect, it } from 'vitest'
import de from '../../i18n/locales/de.json'
import en from '../../i18n/locales/en.json'

function keys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix]
  return Object.entries(value).flatMap(([key, child]) =>
    keys(child, prefix ? `${prefix}.${key}` : key),
  )
}

describe('locales', () => {
  it('have identical key sets in German and English', () => {
    expect(keys(en).sort()).toEqual(keys(de).sort())
  })

  it('have no empty strings', () => {
    const empty = (value: unknown): boolean =>
      typeof value === 'string' ? value.trim() === '' : Object.values(value as object).some(empty)
    expect(empty(de)).toBe(false)
    expect(empty(en)).toBe(false)
  })
})
