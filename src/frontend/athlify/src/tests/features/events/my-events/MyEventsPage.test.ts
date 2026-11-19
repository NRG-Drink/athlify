import { describe, expect, it } from 'vitest'
import { formatEventTags } from '../../../../features/events/my-events/MyEventsGridColumns'
import { getGridQuery } from '../../../../features/events/my-events/MyEventsGridQuery'
import {
  applyMyEventsGridState,
  MY_EVENTS_FILTERS_PARAM,
  MY_EVENTS_SORT_PARAM,
  parseMyEventsColumnState,
  parseMyEventsFilterModel,
  parseMyEventsSavedViews,
  parseMyEventsSortModel,
  serializeMyEventsSavedViews,
  serializeMyEventsColumnState,
} from '../../../../features/events/my-events/myEventsGridState'

describe('MyEventsPage grid type filter', () => {
  it('formats event tags for the grid and uses the empty value when none are assigned', () => {
    expect(formatEventTags([{ name: 'Spring rides' }, { name: 'Training' }], '—')).toBe(
      'Spring rides, Training',
    )
    expect(formatEventTags([], '—')).toBe('—')
  })

  it('sends selected event types to the server while retaining other filters', () => {
    const baseWhere = { name: { contains: 'service' } }
    const query = getGridQuery([], { type: { values: ['REPAIR', 'GOAL'] } }, baseWhere)

    expect(query.where).toEqual({
      and: [baseWhere, { type: { in: ['REPAIR', 'GOAL'] } }],
    })
  })

  it('keeps an empty selection as a filter that matches no types', () => {
    const query = getGridQuery([], { type: { values: [] } }, null)

    expect(query.where).toEqual({ type: { in: [] } })
  })

  it('round-trips grid filters and sorting in URL parameters without dropping other arguments', () => {
    const filterModel = { type: { values: ['REPAIR'] }, name: { filter: 'service' } }
    const sortModel = [{ colId: 'name', sort: 'desc' as const }]
    const params = applyMyEventsGridState(new URLSearchParams('view=table'), filterModel, sortModel)

    expect(params.get('view')).toBe('table')
    expect(params.get(MY_EVENTS_FILTERS_PARAM)).toBe(JSON.stringify(filterModel))
    expect(params.get(MY_EVENTS_SORT_PARAM)).toBe(JSON.stringify(sortModel))
    expect(parseMyEventsFilterModel(params)).toEqual(filterModel)
    expect(parseMyEventsSortModel(params)).toEqual(sortModel)
  })

  it('ignores malformed and unsupported grid URL state', () => {
    const params = new URLSearchParams(
      `${MY_EVENTS_FILTERS_PARAM}=%7Bbad&${MY_EVENTS_SORT_PARAM}=%5B%7B%22colId%22%3A%22unknown%22%2C%22sort%22%3A%22asc%22%7D%5D`,
    )

    expect(parseMyEventsFilterModel(params)).toEqual({})
    expect(parseMyEventsSortModel(params)).toEqual([])
  })

  it('round-trips column order, widths, pinning and visibility without persisting sorting', () => {
    const serialized = serializeMyEventsColumnState([
      { colId: 'description', width: 420, hide: true, pinned: null },
      { colId: 'name', width: 300, hide: false, pinned: 'left' },
    ])

    expect(parseMyEventsColumnState(serialized)).toEqual([
      { colId: 'description', width: 420, hide: true, pinned: null },
      { colId: 'name', width: 300, hide: false, pinned: 'left' },
    ])
    expect(
      parseMyEventsColumnState(
        JSON.stringify([
          { colId: 'unknown', width: 400 },
          { colId: 'id', width: -1 },
        ]),
      ),
    ).toEqual([{ colId: 'id', width: 100 }])
  })

  it('uses server-supported description and tag filters and sorts', () => {
    expect(
      getGridQuery(
        [{ colId: 'description', sort: 'desc' }],
        {
          description: { filter: 'race', type: 'contains' },
          tags: { filter: 'spring', type: 'contains' },
        },
        null,
      ),
    ).toEqual({
      where: {
        and: [
          { description: { contains: 'race' } },
          { tags: { some: { name: { contains: 'spring' } } } },
        ],
      },
      order: [{ description: 'DESC' }, { id: 'ASC' }],
    })
  })

  it('round-trips saved views containing filters, sorting and a column preset', () => {
    const views = [
      {
        id: 'view-1',
        name: 'Events by type',
        filters: {
          quick: 'ride',
          from: '2026-01-01',
          to: '',
          grid: { type: { values: ['REPAIR'] } },
        },
        sort: [{ colId: 'startDate', sort: 'desc' as const }],
        columns: [{ colId: 'name', width: 320, hide: false, pinned: null }],
      },
    ]

    expect(parseMyEventsSavedViews(serializeMyEventsSavedViews(views))).toEqual(views)
  })

  it('ignores malformed and duplicate saved views', () => {
    const views = [
      { id: 'one', name: 'Same', filters: { quick: '', from: '', to: '', grid: {} } },
      { id: 'two', name: 'same', filters: { quick: '', from: '', to: '', grid: {} } },
      { id: 'three', name: '', filters: { quick: '', from: '', to: '', grid: {} } },
    ]

    expect(parseMyEventsSavedViews(JSON.stringify(views))).toEqual([
      {
        id: 'one',
        name: 'Same',
        filters: { quick: '', from: '', to: '', grid: {} },
        sort: [],
        columns: [],
      },
    ])
  })
})
