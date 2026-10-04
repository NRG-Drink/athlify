import { describe, expect, it } from 'vitest'
import {
  filterByPeriod,
  latest,
  periodDelta,
  sortByDate,
  type MetricPoint,
} from '../../lib/metrics'

const point = (date: string, value: number): MetricPoint => ({ date: new Date(date), value })
// Local time on purpose: periods start at local midnight.
const now = new Date(2026, 9, 3, 15, 0)

describe('sortByDate', () => {
  it('orders oldest first without changing the input', () => {
    const input = [
      point('2026-10-02T10:00', 2),
      point('2026-09-30T10:00', 1),
      point('2026-10-01T10:00', 3),
    ]

    expect(sortByDate(input).map((p) => p.value)).toEqual([1, 3, 2])
    expect(input.map((p) => p.value)).toEqual([2, 1, 3])
  })
})

describe('filterByPeriod', () => {
  const points = [
    point('2026-09-02T23:59', 1),
    point('2026-09-03T00:00', 2),
    point('2026-10-02T08:00', 3),
  ]

  it('starts at local midnight N days before now', () => {
    expect(filterByPeriod(points, '30d', now).map((p) => p.value)).toEqual([2, 3])
  })

  it('keeps everything for the whole period, oldest first', () => {
    expect(filterByPeriod([...points].reverse(), 'all', now).map((p) => p.value)).toEqual([1, 2, 3])
  })

  it('returns an empty list when nothing falls inside', () => {
    expect(filterByPeriod([point('2020-01-01T00:00', 1)], '1y', now)).toEqual([])
  })
})

describe('latest', () => {
  it('picks the newest date regardless of the order', () => {
    expect(
      latest([
        point('2026-10-01T00:00', 1),
        point('2026-10-02T00:00', 2),
        point('2026-09-01T00:00', 3),
      ])?.value,
    ).toBe(2)
  })

  it('is undefined without points', () => {
    expect(latest([])).toBeUndefined()
  })
})

describe('periodDelta', () => {
  const points = [
    point('2026-09-01T08:00', 72),
    point('2026-09-10T08:00', 71),
    point('2026-10-01T08:00', 70.5),
  ]

  it('is the latest value minus the first value inside the period', () => {
    expect(periodDelta(points, '30d', now)).toBeCloseTo(-0.5)
    expect(periodDelta(points, 'all', now)).toBeCloseTo(-1.5)
  })

  it('is undefined with fewer than two points in the period', () => {
    expect(periodDelta([point('2026-10-01T08:00', 70)], 'all', now)).toBeUndefined()
    expect(periodDelta(points, '30d', new Date(2027, 5, 1))).toBeUndefined()
  })
})
