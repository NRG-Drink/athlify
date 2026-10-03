import { describe, expect, it } from 'vitest'
import { parsePeriod, periodStart } from '../../lib/period'

describe('parsePeriod', () => {
  it('accepts the known periods', () => {
    expect(parsePeriod('30d', '90d')).toBe('30d')
    expect(parsePeriod('all', '90d')).toBe('all')
  })

  it('falls back for unknown or missing values', () => {
    expect(parsePeriod('bogus', '90d')).toBe('90d')
    expect(parsePeriod(null, '1y')).toBe('1y')
  })
})

describe('periodStart', () => {
  it('is local midnight N days before now, and unbounded for the whole period', () => {
    expect(periodStart('30d', new Date(2026, 9, 3, 15, 30))).toEqual(new Date(2026, 8, 3))
    expect(periodStart('all', new Date())).toBeUndefined()
  })
})
