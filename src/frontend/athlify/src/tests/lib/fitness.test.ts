import { describe, expect, test } from 'vitest'
import type { ActivityRow } from '../../lib/aggregate'
import { ATL_DAYS, CTL_DAYS, computeFitness, fitnessPerBucket } from '../../lib/fitness'

const row = (date: Date, tss: number | null): ActivityRow => ({
  date,
  time: 3600,
  distance: 30,
  elevationGain: null,
  tss,
})

describe('computeFitness', () => {
  test('is empty when no activity has a TSS', () => {
    expect(computeFitness([row(new Date(2026, 10, 1), null)], new Date(2026, 10, 5))).toEqual([])
  })

  test('applies the exponential averages and lets rest days decay', () => {
    const days = computeFitness([row(new Date(2026, 10, 1, 9), 100)], new Date(2026, 10, 3))
    expect(days.map((day) => day.key)).toEqual(['2026-11-01', '2026-11-02', '2026-11-03'])
    expect(days[0].ctl).toBeCloseTo(100 / CTL_DAYS)
    expect(days[0].atl).toBeCloseTo(100 / ATL_DAYS)
    expect(days[0].tsb).toBeCloseTo(days[0].ctl - days[0].atl)
    expect(days[1].atl).toBeLessThan(days[0].atl)
  })
})

describe('fitnessPerBucket', () => {
  test('keeps the last day of every bucket', () => {
    const days = computeFitness([row(new Date(2026, 10, 2), 100)], new Date(2026, 11, 3))
    const months = fitnessPerBucket(days, 'month')
    expect(months.map((day) => day.key)).toEqual(['2026-11-30', '2026-12-03'])
  })
})
