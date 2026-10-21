import { describe, expect, it } from 'vitest'
import {
  defaultDateRange,
  parseDateRange,
  parsePeriod,
  periodStart,
  validateDateRange,
} from '../../lib/period'

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

  describe('date ranges', () => {
    const today = new Date(2026, 9, 3, 15, 30)

    it('defaults to the last 90 local calendar days', () => {
      expect(defaultDateRange(today)).toEqual({ from: '2026-07-05', to: '2026-10-03' })
    })

    it('accepts valid inclusive ISO dates', () => {
      expect(validateDateRange('2026-10-03', '2026-10-03')).toEqual({
        valid: true,
        range: { from: '2026-10-03', to: '2026-10-03' },
      })
    })

    it('rejects malformed, impossible and reversed dates', () => {
      expect(validateDateRange('2026-02-30', '2026-03-01')).toEqual({
        valid: false,
        error: 'invalidDate',
      })
      expect(validateDateRange('2026-10-04', '2026-10-03')).toEqual({
        valid: false,
        error: 'fromAfterTo',
      })
    })

    it('parses explicit dates and maps legacy periods', () => {
      const fallback = defaultDateRange(today)
      expect(parseDateRange('2026-01-01', '2026-02-01', fallback, today)).toEqual({
        from: '2026-01-01',
        to: '2026-02-01',
      })
      expect(parseDateRange(null, null, fallback, today, '30d')).toEqual({
        from: '2026-09-03',
        to: '2026-10-03',
      })
    })
  })
})
