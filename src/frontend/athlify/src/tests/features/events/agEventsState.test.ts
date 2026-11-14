import { describe, expect, it } from 'vitest'
import { readAgEventsUrlState, writeAgEventsUrlState } from '../../../features/events/agEventsState'

describe('AG-Events URL state', () => {
  it('round-trips quick search, native filters, and multi-column sorting', () => {
    const params = new URLSearchParams('keep=1')
    const next = writeAgEventsUrlState(params, {
      search: '  gran fondo ',
      filterModel: {
        type: { filterType: 'text', type: 'equals', filter: 'RACE' },
        startDate: {
          filterType: 'date',
          type: 'inRange',
          dateFrom: '2026-01-01 00:00:00',
          dateTo: '2026-01-31 00:00:00',
        },
      },
      sortModel: [
        { colId: 'startDate', sort: 'desc' },
        { colId: 'name', sort: 'asc' },
      ],
    })

    expect(next.get('keep')).toBe('1')
    expect(readAgEventsUrlState(next)).toEqual({
      search: 'gran fondo',
      filterModel: {
        type: { filterType: 'text', type: 'equals', filter: 'RACE' },
        startDate: {
          filterType: 'date',
          type: 'inRange',
          dateFrom: '2026-01-01 00:00:00',
          dateTo: '2026-01-31 00:00:00',
        },
      },
      sortModel: [
        { colId: 'startDate', sort: 'desc' },
        { colId: 'name', sort: 'asc' },
      ],
    })
  })

  it('ignores malformed filter models and unknown sort columns', () => {
    const params = new URLSearchParams({
      agEventsFilters: JSON.stringify({ unknown: { filterType: 'text', type: 'contains', filter: 'x' } }),
      agEventsSort: 'unknown:asc,name:desc',
    })

    expect(readAgEventsUrlState(params)).toMatchObject({
      filterModel: {},
      sortModel: [{ colId: 'name', sort: 'desc' }],
    })
  })
})
