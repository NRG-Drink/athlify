import { describe, expect, it } from 'vitest'
import {
  activityQueryVariables,
  applyActivityQuery,
  defaultActivitySort,
  parseActivityQuery,
} from '../../../features/activities/activityQuery'

describe('activity query', () => {
  it('reads the sort from the URL and falls back to newest first for unsortable columns', () => {
    expect(parseActivityQuery(new URLSearchParams('sort=-tss')).sort).toEqual({
      column: 'tss',
      desc: true,
    })
    // Mood is stored as a string, so the server cannot sort it naturally.
    expect(parseActivityQuery(new URLSearchParams('sort=mood')).sort).toEqual(defaultActivitySort)
  })

  it('round-trips through the URL, leaves the default order out and keeps other parameters', () => {
    const query = {
      filters: { types: ['ROAD' as const] },
      sort: { column: 'effort' as const, desc: true },
    }
    const params = applyActivityQuery(new URLSearchParams('view=table'), query)
    expect(params.toString()).toBe('view=table&type=ROAD&sort=-effort')
    expect(parseActivityQuery(params)).toEqual(query)

    const reset = applyActivityQuery(params, { filters: {}, sort: defaultActivitySort })
    expect(reset.toString()).toBe('view=table')
  })

  it('sends the heart rate column as its API field and always ends with the id', () => {
    expect(
      activityQueryVariables({ filters: {}, sort: { column: 'heartRate', desc: false } }),
    ).toEqual({ where: undefined, order: [{ heartRateAverage: 'ASC' }, { id: 'DESC' }] })
    expect(activityQueryVariables({ filters: {}, sort: defaultActivitySort }).order).toEqual([
      { date: 'DESC' },
      { id: 'DESC' },
    ])
  })
})
