import { describe, expect, it } from 'vitest'
import {
  dayEndIso,
  dayStartIso,
  defaultOrder,
  getGridQuery,
} from '../../../features/body-stats/BodyStatsGridQuery'

describe('getGridQuery', () => {
  it('sorts newest first by default', () => {
    expect(getGridQuery([], {}, null)).toEqual({ where: null, order: defaultOrder })
  })

  it('maps the grid sort and appends the id as tie-break', () => {
    expect(
      getGridQuery(
        [
          { colId: 'weight', sort: 'asc' },
          { colId: 'actions', sort: 'desc' },
        ],
        {},
        null,
      ).order,
    ).toEqual([{ weight: 'ASC' }, { id: 'DESC' }])
  })

  it('maps number filters', () => {
    expect(
      getGridQuery(
        [],
        {
          weight: { filter: 70, type: 'greaterThan' },
          boneMass: { filter: 3, filterTo: 4, type: 'inRange' },
        },
        null,
      ).where,
    ).toEqual({
      and: [{ weight: { gt: 70 } }, { boneMass: { gte: 3, lte: 4 } }],
    })
  })

  it('maps text filters of the note, including blank', () => {
    expect(getGridQuery([], { comment: { filter: 'easy', type: 'contains' } }, null).where).toEqual(
      { comment: { contains: 'easy' } },
    )
    expect(getGridQuery([], { comment: { type: 'blank' } }, null).where).toEqual({
      or: [{ comment: { eq: null } }, { comment: { eq: '' } }],
    })
  })

  it('maps date filters to local day bounds', () => {
    const start = dayStartIso('2026-10-02')!
    const end = dayEndIso('2026-10-02')!
    expect(
      getGridQuery([], { date: { dateFrom: '2026-10-02 00:00:00', type: 'equals' } }, null).where,
    ).toEqual({ date: { gte: start, lte: end } })
    expect(
      getGridQuery([], { date: { dateFrom: '2026-10-02 00:00:00', type: 'lessThan' } }, null).where,
    ).toEqual({ date: { lt: start } })
    expect(
      getGridQuery(
        [],
        { date: { dateFrom: '2026-10-02 00:00:00', dateTo: '2026-10-05 00:00:00', type: 'inRange' } },
        null,
      ).where,
    ).toEqual({ date: { gte: start, lte: dayEndIso('2026-10-05') } })
  })

  it('ignores no-op filters and combines them with the page filter', () => {
    const base = { comment: { contains: 'x' } }
    expect(getGridQuery([], { weight: { type: 'none' } }, base).where).toEqual(base)
    expect(getGridQuery([], { weight: { filter: 70, type: 'equals' } }, base).where).toEqual({
      and: [base, { weight: { eq: 70 } }],
    })
  })
})
