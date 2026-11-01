import { describe, expect, it } from 'vitest'
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

describe('datetime-local values', () => {
  it('formats a date in local time without seconds', () => {
    const now = new Date(2026, 9, 12, 7, 30, 45)
    expect(nowInputValue(now)).toBe('2026-10-12T07:30')
  })

  it('round-trips an ISO timestamp through the input value', () => {
    const local = new Date(2026, 9, 12, 7, 30)
    expect(new Date(toInputValue(local.toISOString())).getTime()).toBe(local.getTime())
  })
})
