import type { TFunction } from 'i18next'
import { describe, expect, it } from 'vitest'
import {
  enumLabel,
  formatHeartRate,
  moodRank,
  vehicleLabel,
  windRank,
} from '../../../features/activities/activityFormatting'

const t = ((_key: string, options?: { defaultValue?: string }) =>
  options?.defaultValue ?? _key) as TFunction

describe('formatHeartRate', () => {
  it('shows the average with min–max as title', () => {
    expect(formatHeartRate(142, 120, 170)).toEqual({ text: '142', title: '120–170' })
  })

  it('shows no title without both bounds', () => {
    expect(formatHeartRate(142, null, 170)).toEqual({ text: '142' })
  })

  it('shows a dash for a missing average but keeps 0 as a value', () => {
    expect(formatHeartRate(null, 120, 170)).toEqual({ text: '—' })
    expect(formatHeartRate(0, null, null)).toEqual({ text: '0' })
  })
})

describe('formatting helpers', () => {
  it('prefers the nickname', () => {
    expect(vehicleLabel({ brand: 'Canyon', model: 'Grail', nickname: 'Gravi' })).toBe('Gravi')
    expect(vehicleLabel({ brand: 'Canyon', model: 'Grail', nickname: null })).toBe('Canyon Grail')
  })

  it('ranks moods and winds naturally, unknown and missing values last', () => {
    expect(moodRank('VERY_BAD')).toBeLessThan(moodRank('VERY_GOOD'))
    expect(windRank('CALM')).toBeLessThan(windRank('STORMY'))
    expect(moodRank(null)).toBe(-1)
    expect(windRank('HURRICANE')).toBe(-1)
  })

  it('falls back to the raw enum value and a dash', () => {
    expect(enumLabel(t, 'moods', 'EUPHORIC')).toBe('EUPHORIC')
    expect(enumLabel(t, 'winds', null)).toBe('—')
  })
})
