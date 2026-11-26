import { describe, expect, it, vi } from 'vitest'
import i18next from 'i18next'
import { createEventsColumnDefs, formatEventTags } from '../../../features/events/EventsGridColumns'
import { clearNoOpGridFilters } from '../../../components/ag-grid/GridFilterParams'
import { getGridQuery } from '../../../features/events/EventsGridQuery'
import {
  applyEventsGridState,
  EVENTS_FILTER_PREFIX,
  EVENTS_FILTERS_PARAM,
  EVENTS_SORT_PARAM,
  parseEventsColumnState,
  parseEventsFilterModel,
  parseEventsSavedViews,
  parseEventsSortModel,
  serializeEventsSavedViews,
  serializeEventsColumnState,
} from '../../../features/events/EventsGridState'
import { toGraphQLDate } from '../../../features/events/useEventsPageState'

describe('EventsPage grid type filter', () => {
  it('preserves date-only URL filters in time zones west of UTC', () => {
    vi.stubEnv('TZ', 'America/Los_Angeles')
    try {
      expect(new Date('2026-01-01').getDate()).toBe(31)
      expect(toGraphQLDate('2026-01-01')).toBe('2026-01-01')
    } finally {
      vi.unstubAllEnvs()
    }
  })

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

  it('round-trips grid filters as readable URL parameters and sorting without dropping other arguments', () => {
    const filterModel = { type: { values: ['REPAIR'] }, name: { filter: 'service' } }
    const sortModel = [{ colId: 'name', sort: 'desc' as const }]
    const params = applyEventsGridState(new URLSearchParams('view=table'), filterModel, sortModel)

    expect(params.get('view')).toBe('table')
    expect(params.get(`${EVENTS_FILTER_PREFIX}name.filter`)).toBe('service')
    expect(params.get(`${EVENTS_FILTER_PREFIX}type.values`)).toBe('REPAIR')
    expect(params.has(EVENTS_FILTERS_PARAM)).toBe(false)
    expect(
      [...params.keys()].filter((key) => key.startsWith(EVENTS_FILTER_PREFIX)).join('&'),
    ).not.toContain('%')
    expect(params.get(EVENTS_SORT_PARAM)).toBe(JSON.stringify(sortModel))
    expect(parseEventsFilterModel(params)).toEqual(filterModel)
    expect(parseEventsSortModel(params)).toEqual(sortModel)
  })

  it('ignores malformed and unsupported grid URL state', () => {
    const params = new URLSearchParams(
      `${EVENTS_FILTERS_PARAM}=%7Bbad&${EVENTS_SORT_PARAM}=%5B%7B%22colId%22%3A%22unknown%22%2C%22sort%22%3A%22asc%22%7D%5D`,
    )

    expect(parseEventsFilterModel(params)).toEqual({})
    expect(parseEventsSortModel(params)).toEqual([])
  })

  it('round-trips column order, widths, pinning and visibility without persisting sorting', () => {
    const serialized = serializeEventsColumnState([
      { colId: 'description', width: 420, hide: true, pinned: null },
      { colId: 'name', width: 300, hide: false, pinned: 'left' },
    ])

    expect(parseEventsColumnState(serialized)).toEqual([
      { colId: 'description', width: 420, hide: true, pinned: null },
      { colId: 'name', width: 300, hide: false, pinned: 'left' },
    ])
    expect(
      parseEventsColumnState(
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

  it.each([
    ['equals', 'eq'],
    ['notEqual', 'neq'],
    ['contains', 'contains'],
    ['notContains', 'ncontains'],
    ['startsWith', 'startsWith'],
    ['endsWith', 'endsWith'],
  ])('translates the %s text filter to the backend operator', (type, operator) => {
    expect(
      getGridQuery([], { name: { filter: 'ride', type } }, null).where,
    ).toEqual({ name: { [operator]: 'ride' } })
  })

  it.each([
    ['equals', { eq: '2026-03-10' }],
    ['notEqual', { neq: '2026-03-10' }],
    ['lessThan', { lt: '2026-03-10' }],
    ['greaterThan', { gt: '2026-03-10' }],
    ['inRange', { gte: '2026-03-10', lte: '2026-03-20' }],
  ])('translates the %s date filter to the backend operator', (type, expected) => {
    const filter = {
      type,
      dateFrom: '2026-03-10',
      ...(type === 'inRange' ? { dateTo: '2026-03-20' } : {}),
    }

    expect(getGridQuery([], { startDate: filter }, null).where).toEqual({
      startDate: expected,
    })
  })

  it('translates non-equality text operators for tag names', () => {
    expect(
      getGridQuery([], { tags: { filter: 'winter', type: 'notContains' } }, null).where,
    ).toEqual({ tags: { some: { name: { ncontains: 'winter' } } } })
  })

  it.each([
    ['blank', { or: [{ name: { eq: null } }, { name: { eq: '' } }] }],
    ['notBlank', { and: [{ name: { neq: null } }, { name: { neq: '' } }] }],
  ])('translates the %s text filter', (type, expected) => {
    expect(getGridQuery([], { name: { type } }, null).where).toEqual(expected)
  })

  it.each([
    ['blank', { startDate: { eq: null } }],
    ['notBlank', { startDate: { neq: null } }],
  ])('translates the %s date filter', (type, expected) => {
    expect(getGridQuery([], { startDate: { type } }, null).where).toEqual(expected)
  })

  it('translates a tag blank filter to an empty tag collection', () => {
    expect(getGridQuery([], { tags: { type: 'blank' } }, null).where).toEqual({
      tags: { none: {} },
    })
  })

  it('does not send a backend clause for the default none filter', () => {
    const baseWhere = { type: { eq: 'REPAIR' as const } }
    expect(getGridQuery([], { name: { type: 'none' } }, baseWhere).where).toEqual(baseWhere)
    expect(getGridQuery([], { name: { type: 'none' } }, null).where).toBeNull()
  })

  it('clears only no-op filters and notifies the grid after clearing', async () => {
    const cleared: string[] = []
    let notified = false

    const didClear = await clearNoOpGridFilters(
      {
        name: { type: 'none' },
        startDate: { type: 'none' },
        description: { type: 'contains', filter: 'race' },
      },
      async (column) => {
        cleared.push(column)
      },
      () => {
        notified = true
      },
    )

    expect(didClear).toBe(true)
    expect(cleared).toEqual(['name', 'startDate'])
    expect(notified).toBe(true)
  })

  it('does not notify the grid when no no-op filters are present', async () => {
    const clearFilter = vi.fn()
    const notifyFilterChanged = vi.fn()

    const didClear = await clearNoOpGridFilters(
      { name: { type: 'contains', filter: 'race' } },
      clearFilter,
      notifyFilterChanged,
    )

    expect(didClear).toBe(false)
    expect(clearFilter).not.toHaveBeenCalled()
    expect(notifyFilterChanged).not.toHaveBeenCalled()
  })

  it('configures none as the default option for text and date column filters', () => {
    const columns = createEventsColumnDefs({
      t: i18next.t,
      formatDate: (date) => date.toISOString(),
      emptyValue: '—',
      isDeleting: false,
      isUpdating: false,
      pinnedEventIds: new Set(),
      onDelete: () => {},
      onTogglePin: () => {},
    })
    const textColumn = columns.find(({ field }) => field === 'name')
    const dateColumn = columns.find(({ field }) => field === 'startDate')
    const textParams = textColumn?.filterParams as { defaultOption?: string; filterOptions?: { displayKey?: string; displayName?: string }[] }
    const dateParams = dateColumn?.filterParams as { defaultOption?: string; filterOptions?: { displayKey?: string; displayName?: string }[] }

    expect(textParams.defaultOption).toBe('none')
    expect(textParams.filterOptions?.[0]?.displayKey).toBe('none')
    expect(textParams.filterOptions?.[0]?.displayName).toBe('Kein Filter')
    expect(dateParams.defaultOption).toBe('none')
    expect(dateParams.filterOptions?.[0]?.displayKey).toBe('none')
    expect(dateParams.filterOptions?.[0]?.displayName).toBe('Kein Filter')
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

    expect(parseEventsSavedViews(serializeEventsSavedViews(views))).toEqual(views)
  })

  it('ignores malformed and duplicate saved views', () => {
    const views = [
      { id: 'one', name: 'Same', filters: { quick: '', from: '', to: '', grid: {} } },
      { id: 'two', name: 'same', filters: { quick: '', from: '', to: '', grid: {} } },
      { id: 'three', name: '', filters: { quick: '', from: '', to: '', grid: {} } },
    ]

    expect(parseEventsSavedViews(JSON.stringify(views))).toEqual([
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
