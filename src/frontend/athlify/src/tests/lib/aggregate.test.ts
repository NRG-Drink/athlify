import { describe, expect, test } from 'vitest'
import {
  aggregateActivities,
  aggregateBodyStats,
  bucketKey,
  bucketRange,
  parseGrouping,
  type ActivityRow,
  type BodyRow,
} from '../../lib/aggregate'

const activity = (date: string, overrides: Partial<ActivityRow> = {}): ActivityRow => ({
  date: new Date(date),
  time: 3600,
  distance: 30,
  elevationGain: 100,
  tss: 50,
  ...overrides,
})

describe('bucketKey', () => {
  test('starts weeks on Monday', () => {
    expect(bucketKey(new Date(2026, 10, 26), 'week')).toBe('2026-11-23')
    expect(bucketKey(new Date(2026, 10, 29), 'week')).toBe('2026-11-23')
    expect(bucketKey(new Date(2026, 10, 30), 'week')).toBe('2026-11-30')
  })

  test('uses the first day of month and year', () => {
    expect(bucketKey(new Date(2026, 10, 26), 'month')).toBe('2026-11-01')
    expect(bucketKey(new Date(2026, 10, 26), 'year')).toBe('2026-01-01')
    expect(bucketKey(new Date(2026, 10, 26), 'day')).toBe('2026-11-26')
  })
})

describe('aggregateActivities', () => {
  test('sums per bucket and derives speed from the totals', () => {
    const buckets = aggregateActivities(
      [
        activity('2026-11-24T10:00:00', { distance: 40, time: 7200, tss: 80 }),
        activity('2026-11-25T10:00:00', { distance: 20, time: 3600, tss: null }),
        activity('2026-12-02T10:00:00'),
      ],
      'week',
    )
    expect(buckets).toHaveLength(2)
    expect(buckets[0]).toMatchObject({
      key: '2026-11-23',
      count: 2,
      distance: 60,
      hours: 3,
      elevationGain: 200,
      tss: 80,
      speed: 20,
    })
    expect(buckets[1].key).toBe('2026-11-30')
  })

  test('leaves TSS undefined when no activity has one', () => {
    const [bucket] = aggregateActivities([activity('2026-11-24T10:00:00', { tss: null })], 'day')
    expect(bucket.tss).toBeUndefined()
  })

  test('is empty without activities', () => {
    expect(aggregateActivities([], 'month')).toEqual([])
  })
})

describe('aggregateBodyStats', () => {
  const row = (date: string, weight: number): BodyRow => ({
    date: new Date(date),
    weight,
    bodyFatPercentage: 20,
    musclePercentage: 40,
    waterPercentage: 55,
    boneMass: 3,
  })

  test('averages every metric per bucket, oldest first', () => {
    const buckets = aggregateBodyStats(
      [row('2026-11-12T08:00:00', 72), row('2026-10-05T08:00:00', 80), row('2026-11-02T08:00:00', 70)],
      'month',
    )
    expect(buckets.map((bucket) => bucket.key)).toEqual(['2026-10-01', '2026-11-01'])
    expect(buckets[1].weight).toBe(71)
    expect(buckets[1].count).toBe(2)
    expect(buckets[1].boneMass).toBe(3)
  })
})

describe('parseGrouping', () => {
  test('falls back to week for unknown input', () => {
    expect(parseGrouping('month')).toBe('month')
    expect(parseGrouping('hour')).toBe('week')
    expect(parseGrouping(null)).toBe('week')
  })
})

describe('bucketRange', () => {
  test('lists every bucket including empty ones', () => {
    const months = bucketRange(new Date(2026, 8, 15), new Date(2026, 10, 2), 'month')
    expect(months.map((date) => date.getMonth())).toEqual([8, 9, 10])
    expect(bucketRange(new Date(2026, 10, 25), new Date(2026, 11, 2), 'week')).toHaveLength(2)
  })
})
