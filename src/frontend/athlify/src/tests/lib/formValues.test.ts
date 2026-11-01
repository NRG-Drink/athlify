import { describe, expect, it } from 'vitest'
import { parseDateTime } from '../../lib/dates'
import { nowInputValue, parseDecimal, toInputValue } from '../../lib/formValues'

describe('parseDecimal', () => {
  it('accepts a decimal point or comma and surrounding spaces', () => {
    expect(parseDecimal('70.5')).toBe(70.5)
    expect(parseDecimal(' 70,5 ')).toBe(70.5)
    expect(parseDecimal('0')).toBe(0)
  })

  it('returns NaN for empty or non-numeric input', () => {
    expect(parseDecimal('')).toBeNaN()
    expect(parseDecimal('   ')).toBeNaN()
    expect(parseDecimal('abc')).toBeNaN()
  })
})

describe('date and time as form text', () => {
  it('formats a date in local time without seconds', () => {
    const now = new Date(2026, 9, 12, 7, 30, 45)
    expect(nowInputValue(now)).toBe('12.10.2026, 07:30')
  })

  it('round-trips an ISO timestamp through the form text', () => {
    const local = new Date(2026, 9, 12, 7, 30)
    expect(parseDateTime(toInputValue(local.toISOString()))?.getTime()).toBe(local.getTime())
  })
})
