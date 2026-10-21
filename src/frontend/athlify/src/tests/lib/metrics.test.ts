import { describe, expect, it } from 'vitest'
import {
  aggregateByResolution,
  filterByRange,
  latest,
  rangeDelta,
  sortByDate,
  type MetricPoint,
} from '../../lib/metrics'

const point = (date: string, value: number): MetricPoint => ({ date: new Date(date), value })

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

describe('aggregateByResolution', () => {
  const points = [
    point('2026-01-02T08:00', 72),
    point('2026-01-01T08:00', 73),
    point('2026-01-15T08:00', 71),
    point('2026-02-01T08:00', 70),
  ]

  it('keeps the latest real point per day and does not mutate input', () => {
    const input = [
      points[0],
      { date: new Date('2026-01-02T20:00'), value: 71.5 },
      ...points.slice(1),
    ]
    const result = aggregateByResolution(input, 'day')

    expect(result.map((item) => [item.date.toISOString(), item.value])).toEqual([
      ['2026-01-01T08:00:00.000Z', 73],
      ['2026-01-02T20:00:00.000Z', 71.5],
      ['2026-01-15T08:00:00.000Z', 71],
      ['2026-02-01T08:00:00.000Z', 70],
    ])
    expect(input[0]).toBe(points[0])
  })

  it('returns every filtered point when aggregation is disabled', () => {
    const input = [points[0], { date: new Date('2026-01-02T20:00'), value: 71.5 }, points[1]]

    expect(aggregateByResolution(input, 'none')).toEqual([points[1], points[0], input[1]])
  })

  it('uses ISO Monday-Sunday weeks and omits empty buckets', () => {
    const result = aggregateByResolution(
      [
        point('2026-01-04T08:00', 73),
        point('2026-01-05T08:00', 72),
        point('2026-01-11T08:00', 71),
        point('2026-01-12T08:00', 70),
      ],
      'week',
    )

    expect(result.map((item) => item.value)).toEqual([73, 71, 70])
  })

  it('keeps month and year boundaries separate', () => {
    expect(aggregateByResolution(points, 'month').map((item) => item.value)).toEqual([71, 70])
    expect(aggregateByResolution(points, 'year').map((item) => item.value)).toEqual([70])
  })
})

describe('filterByRange', () => {
  const points = [
    point('2026-09-02T23:59', 1),
    point('2026-09-03T00:00', 2),
    point('2026-10-03T23:59', 3),
    point('2026-10-04T00:00', 4),
  ]

  it('includes both local calendar boundaries', () => {
    expect(filterByRange(points, { from: '2026-09-03', to: '2026-10-03' }).map((p) => p.value)).toEqual(
      [2, 3],
    )
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

describe('rangeDelta', () => {
  const points = [
    point('2026-09-01T08:00', 72),
    point('2026-09-10T08:00', 71),
    point('2026-10-01T08:00', 70.5),
  ]

  it('calculates the change inside the inclusive range', () => {
    expect(rangeDelta(points, { from: '2026-09-10', to: '2026-10-01' })).toBeCloseTo(-0.5)
  })

  it('is undefined with fewer than two points in the range', () => {
    expect(rangeDelta(points, { from: '2026-10-01', to: '2026-10-01' })).toBeUndefined()
  })
})
