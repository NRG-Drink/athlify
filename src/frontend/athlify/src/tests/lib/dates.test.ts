import { describe, expect, it } from 'vitest'
import {
  formatDate,
  formatDateTime,
  formatTime,
  joinDateTime,
  parseDate,
  parseDateTime,
  parseTime,
  splitDateTime,
} from '../../lib/dates'

describe('dates', () => {
  it('formats DD.MM.YYYY and DD.MM.YYYY, HH:MM in 24 hours', () => {
    const date = new Date(2026, 10, 1, 23, 31, 45)
    expect(formatDate(date)).toBe('01.11.2026')
    expect(formatDateTime(date)).toBe('01.11.2026, 23:31')
    expect(formatDateTime(new Date(2026, 0, 5, 7, 3))).toBe('05.01.2026, 07:03')
  })

  it('reads dates with or without leading zeros', () => {
    expect(parseDate('1.11.2026')).toEqual(new Date(2026, 10, 1))
    expect(parseDate(' 01.11.2026 ')).toEqual(new Date(2026, 10, 1))
  })

  it('reads date and time with or without comma, ":" or "." as time separator', () => {
    const expected = new Date(2026, 10, 1, 23, 31)
    expect(parseDateTime('01.11.2026, 23:31')).toEqual(expected)
    expect(parseDateTime('1.11.2026 23.31')).toEqual(expected)
    expect(parseDateTime(formatDateTime(expected))).toEqual(expected)
  })

  it('rejects anything that is not a real date or time', () => {
    expect(parseDate('31.02.2026')).toBeNull()
    expect(parseDate('2026-11-01')).toBeNull()
    expect(parseDate('11/01/2026')).toBeNull()
    expect(parseDateTime('01.11.2026')).toBeNull()
    expect(parseDateTime('01.11.2026, 24:00')).toBeNull()
    expect(parseDateTime('01.11.2026, 11:31 PM')).toBeNull()
  })
})

describe('date and time parts', () => {
  it('reads two-digit years as this century', () => {
    expect(parseDate('01.02.25')).toEqual(new Date(2025, 1, 1))
  })

  it('reads times in several short forms', () => {
    expect(parseTime('19:30')).toEqual({ hours: 19, minutes: 30 })
    expect(parseTime('1930')).toEqual({ hours: 19, minutes: 30 })
    expect(parseTime('7.5')).toEqual({ hours: 7, minutes: 5 })
    expect(parseTime('7')).toEqual({ hours: 7, minutes: 0 })
    expect(parseTime('24:00')).toBeNull()
    expect(parseTime('7:60')).toBeNull()
    expect(formatTime({ hours: 7, minutes: 5 })).toBe('07:05')
  })

  it('splits and joins date and time text', () => {
    expect(splitDateTime('01.11.2026, 23:31')).toEqual(['01.11.2026', '23:31'])
    expect(splitDateTime('01.11.2026')).toEqual(['01.11.2026', ''])
    expect(splitDateTime('')).toEqual(['', ''])
    expect(joinDateTime('01.11.2026', '23:31')).toBe('01.11.2026, 23:31')
    expect(joinDateTime('01.11.2026', '')).toBe('01.11.2026')
  })
})
