import { describe, expect, it } from 'vitest'
import { normalizeDecimal, parseDecimal } from '../../lib/formValues'

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

describe('normalizeDecimal', () => {
  it('writes a number in its canonical form and leaves other text as typed', () => {
    expect(normalizeDecimal('42,50')).toBe('42.5')
    expect(normalizeDecimal(' 7 ')).toBe('7')
    expect(normalizeDecimal('abc')).toBe('abc')
  })
})
