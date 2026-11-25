import { describe, expect, it } from 'vitest'
import {
  activityFilterModel,
  activityQueryVariables,
  applyActivityQuery,
  defaultActivitySort,
  parseActivityQuery,
  splitActivityFilterModel,
} from '../../../features/activities/activityQuery'

describe('activity query', () => {
  it('reads legacy and multi-column sorts and ignores unsupported columns', () => {
    expect(parseActivityQuery(new URLSearchParams('sort=-tss')).sort).toEqual([
      { colId: 'tss', sort: 'desc' },
    ])
    expect(parseActivityQuery(new URLSearchParams('sort=distance&sort=-time')).sort).toEqual([
      { colId: 'distance', sort: 'asc' },
      { colId: 'time', sort: 'desc' },
    ])
    expect(parseActivityQuery(new URLSearchParams('sort=mood')).sort).toEqual(defaultActivitySort)
  })

  it('round-trips external filters, column filters, sorting and keeps unrelated parameters', () => {
    const query = {
      filters: { types: ['ROAD' as const] },
      gridFilters: { description: { type: 'contains', filter: 'evening' } },
      quickFilter: 'ride',
      fromFilter: '2026-01-01',
      toFilter: '2026-01-31',
      sort: [
        { colId: 'effort', sort: 'desc' as const },
        { colId: 'distance', sort: 'asc' as const },
      ],
    }
    const params = applyActivityQuery(new URLSearchParams('view=table'), query)
    expect(parseActivityQuery(params)).toEqual(query)
    expect(params.get('view')).toBe('table')

    const reset = applyActivityQuery(params, {
      filters: {},
      gridFilters: {},
      quickFilter: '',
      fromFilter: '',
      toFilter: '',
      sort: defaultActivitySort,
    })
    expect(reset.toString()).toBe('view=table')
  })

  it('maps every filter and sort into server query inputs with stable tie-breaking', () => {
    const query = {
      filters: { types: ['ROAD' as const], vehicleIds: ['bike-1'] },
      gridFilters: {
        description: { type: 'contains', filter: 'morning' },
        distance: { type: 'greaterThan', filter: 20 },
      },
      quickFilter: 'ride',
      fromFilter: '',
      toFilter: '',
      sort: [
        { colId: 'heartRate', sort: 'asc' as const },
        { colId: 'distance', sort: 'desc' as const },
      ],
    }
    const variables = activityQueryVariables(query)
    expect(variables.where).toMatchObject({
      and: expect.arrayContaining([
        { type: { in: ['ROAD'] }, vehicle: { id: { in: ['bike-1'] } } },
        { description: { contains: 'ride' } },
        { description: { contains: 'morning' } },
        { distance: { gt: 20 } },
      ]),
    })
    expect(variables.order).toEqual([
      { heartRateAverage: 'ASC' },
      { distance: 'DESC' },
      { id: 'DESC' },
    ])
  })

  it('converts an inclusive local date range to server-side DateTime bounds', () => {
    const variables = activityQueryVariables({
      filters: {},
      gridFilters: {},
      quickFilter: '',
      fromFilter: '2026-02-01',
      toFilter: '2026-02-28',
      sort: defaultActivitySort,
    })
    expect(variables.where).toEqual({
      and: [
        { date: { gte: new Date(2026, 1, 1).toISOString() } },
        {
          date: {
            lte: new Date(new Date(2026, 2, 1).getTime() - 1).toISOString(),
          },
        },
      ],
    })
  })

  it('maps date-column and numeric filters, ignoring incomplete numeric input', () => {
    const dateQuery = activityQueryVariables({
      filters: {},
      gridFilters: {
        date: { type: 'equals', dateFrom: '2026-02-01 00:00:00' },
        time: { type: 'inRange', filter: 1800, filterTo: 7200 },
      },
      quickFilter: '',
      fromFilter: '',
      toFilter: '',
      sort: defaultActivitySort,
    })
    expect(dateQuery.where).toEqual({
      and: [
        {
          date: {
            gte: new Date(2026, 1, 1).toISOString(),
            lte: new Date(new Date(2026, 1, 2).getTime() - 1).toISOString(),
          },
        },
        { time: { gte: 1800, lte: 7200 } },
      ],
    })

    expect(
      activityQueryVariables({
        filters: {},
        gridFilters: { distance: { type: 'equals', filter: '' } },
        quickFilter: '',
        fromFilter: '',
        toFilter: '',
        sort: defaultActivitySort,
      }).where,
    ).toBeUndefined()
  })

  it('splits AG Grid categorical filters into the compatible URL filters', () => {
    const split = splitActivityFilterModel({
      type: { values: ['ROAD', 'INDOOR'] },
      vehicle: { values: ['bike-1'] },
      tags: { values: ['tag-1'] },
      wind: { values: ['CALM'] },
      description: { type: 'contains', filter: 'ride' },
    })
    expect(split.filters).toEqual({
      types: ['ROAD', 'INDOOR'],
      vehicleIds: ['bike-1'],
      tagIds: ['tag-1'],
      winds: ['CALM'],
    })
    expect(split.gridFilters).toEqual({ description: { type: 'contains', filter: 'ride' } })
    expect(activityFilterModel({ ...split })).toEqual({
      type: { values: ['ROAD', 'INDOOR'] },
      vehicle: { values: ['bike-1'] },
      tags: { values: ['tag-1'] },
      wind: { values: ['CALM'] },
      description: { type: 'contains', filter: 'ride' },
    })
  })
})
