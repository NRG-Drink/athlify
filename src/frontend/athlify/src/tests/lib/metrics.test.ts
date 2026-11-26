import { describe, expect, it } from 'vitest'
import { sortByDate, type MetricPoint } from '../../lib/metrics'

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
