import { describe, expect, it } from 'vitest'
import { applySort, parseSort, sortToOrder } from '../../lib/sort'

const columns = ['date', 'weight'] as const
const fallback = { column: 'date' as const, desc: true }

describe('list sort', () => {
  it('reads ascending and descending columns and falls back for anything else', () => {
    expect(parseSort('weight', columns, fallback)).toEqual({
      column: 'weight',
      desc: false,
    })
    expect(parseSort('-weight', columns, fallback)).toEqual({
      column: 'weight',
      desc: true,
    })
    for (const raw of [null, '', 'comment', '-', '--date']) {
      expect(parseSort(raw, columns, fallback)).toEqual(fallback)
    }
  })

  it('writes the sort, leaves the default out and keeps other parameters', () => {
    const params = new URLSearchParams('from=2026-01-01&sort=weight')
    expect(applySort(params, { column: 'weight', desc: true }, fallback).toString()).toBe(
      'from=2026-01-01&sort=-weight',
    )
    expect(applySort(params, fallback, fallback).toString()).toBe('from=2026-01-01')
  })

  it('maps renamed fields and always ends with the id', () => {
    expect(
      sortToOrder({ column: 'heartRate', desc: false }, { heartRate: 'heartRateAverage' }),
    ).toEqual([{ heartRateAverage: 'ASC' }, { id: 'DESC' }])
    expect(sortToOrder(fallback)).toEqual([{ date: 'DESC' }, { id: 'DESC' }])
  })
})
