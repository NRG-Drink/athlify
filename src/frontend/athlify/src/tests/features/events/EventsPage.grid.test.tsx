import { screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { EventsPage } from '../../../features/events/EventsPage'
import {
  EVENTS_COLUMN_STORAGE_KEY,
  EVENTS_VIEWS_STORAGE_KEY,
  parseEventsColumnState,
  parseEventsFilterModel,
  parseEventsSavedViews,
} from '../../../features/events/EventsGridState'
import { EVENTS_PREFERENCES_STORAGE_KEY } from '../../../features/events/eventsPreferences'
import { mockGridViewport } from '../../utils/gridViewport'
import { renderWithRelay } from '../../utils/relay'

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.removeItem(EVENTS_COLUMN_STORAGE_KEY)
  localStorage.removeItem(EVENTS_VIEWS_STORAGE_KEY)
  localStorage.removeItem(EVENTS_PREFERENCES_STORAGE_KEY)
})

const emptyEvents = () => ({
  data: {
    events: { totalCount: 0, nodes: [], pageInfo: { endCursor: null, hasNextPage: false } },
  },
})

it('shows the filter panel open by default', async () => {
  mockGridViewport()
  renderWithRelay(<EventsPage />, emptyEvents)

  await screen.findByRole('grid')
  expect(screen.getByLabelText('Events durchsuchen')).toBeVisible()
})

it('remembers a collapsed filter panel after leaving the page', async () => {
  mockGridViewport()
  const first = renderWithRelay(<EventsPage />, emptyEvents)
  await first.user.click(await screen.findByText('Events filtern'))
  await waitFor(() =>
    expect(
      JSON.parse(localStorage.getItem(EVENTS_PREFERENCES_STORAGE_KEY) ?? '{}'),
    ).toMatchObject({ controlsOpen: false }),
  )
  first.unmount()

  renderWithRelay(<EventsPage />, emptyEvents)

  await screen.findByRole('grid')
  expect(screen.getByLabelText('Events durchsuchen')).not.toBeVisible()
})

it('ignores damaged remembered panel values', async () => {
  mockGridViewport()
  localStorage.setItem(EVENTS_PREFERENCES_STORAGE_KEY, '{"controlsOpen":3}')
  renderWithRelay(<EventsPage />, emptyEvents)

  await screen.findByRole('grid')
  expect(screen.getByLabelText('Events durchsuchen')).toBeVisible()
})

it('restores URL filters and sorting plus locally saved column visibility', async () => {
  mockGridViewport()
  localStorage.setItem(
    EVENTS_COLUMN_STORAGE_KEY,
    JSON.stringify([
      { colId: 'id', width: 100, pinned: 'left' },
      { colId: 'name', width: 300 },
      { colId: 'startDate', width: 180 },
      { colId: 'endDate', width: 180 },
      { colId: 'type', width: 120 },
      { colId: 'tags', width: 120 },
      { colId: 'description', width: 400, hide: true },
    ]),
  )
  const query = new URLSearchParams({
    q: 'journey',
    from: '2026-01-01',
    gridFilters: JSON.stringify({
      name: { filter: 'trail', type: 'contains' },
      type: { values: ['REPAIR'] },
    }),
    gridSort: JSON.stringify([{ colId: 'name', sort: 'desc' }]),
  })

  const { calls, router, user } = renderWithRelay(
    <EventsPage />,
    () => ({
      data: {
        events: {
          totalCount: 0,
          nodes: [],
          pageInfo: { endCursor: null, hasNextPage: false },
        },
      },
    }),
    { path: `/?${query.toString()}` },
  )

  await screen.findByRole('grid')
  await waitFor(() => {
    expect(calls('EventsManagementPageQuery')).toContainEqual(
      expect.objectContaining({
        order: [{ name: 'DESC' }, { id: 'ASC' }],
        where: {
          and: [
            {
              and: [
                { startDate: { gte: '2026-01-01' } },
                {
                  or: [{ name: { contains: 'journey' } }, { description: { contains: 'journey' } }],
                },
              ],
            },
            { name: { contains: 'trail' } },
            { type: { in: ['REPAIR'] } },
          ],
        },
      }),
    )
  })

  await user.click(screen.getByRole('button', { name: 'Spalten' }))
  const descriptionColumn = await screen.findByRole('checkbox', { name: 'Beschreibung' })
  expect(descriptionColumn).not.toBeChecked()
  await user.click(descriptionColumn)
  await waitFor(() => {
    expect(
      parseEventsColumnState(localStorage.getItem(EVENTS_COLUMN_STORAGE_KEY)).find(
        ({ colId }) => colId === 'description',
      )?.hide,
    ).toBe(false)
  })
  await waitFor(() => {
    expect(router.state.location.search).toContain('filter.name.filter=trail')
    expect(router.state.location.search).toContain('filter.type.values=REPAIR')
    expect(router.state.location.search).toContain('gridSort=')
  })

  await user.click(screen.getByRole('button', { name: 'Ansicht speichern' }))
  await user.type(await screen.findByRole('textbox', { name: 'Name der Ansicht' }), 'Reiseansicht')
  await user.click(screen.getByRole('button', { name: 'Speichern' }))

  const savedView = parseEventsSavedViews(localStorage.getItem(EVENTS_VIEWS_STORAGE_KEY))[0]
  expect(savedView).toMatchObject({
    name: 'Reiseansicht',
    filters: {
      quick: 'journey',
      from: '2026-01-01',
      grid: {
        name: { filter: 'trail', type: 'contains' },
        type: { values: ['REPAIR'] },
      },
    },
    sort: [{ colId: 'name', sort: 'desc' }],
  })
  expect(savedView.columns.find(({ colId }) => colId === 'description')?.hide).toBe(false)

  await user.click(descriptionColumn)
  await user.clear(screen.getByRole('textbox', { name: 'Events durchsuchen' }))
  await user.type(screen.getByRole('textbox', { name: 'Events durchsuchen' }), 'different')
  await waitFor(() => {
    expect(new URLSearchParams(router.state.location.search).get('q')).toBe('different')
  })
  await user.selectOptions(
    screen.getByRole('combobox', { name: 'Gespeicherte Ansichten' }),
    savedView.id,
  )
  await waitFor(() => {
    expect(new URLSearchParams(router.state.location.search).get('q')).toBe('journey')
    expect(screen.getByRole('button', { name: 'Ansicht löschen' })).toBeEnabled()
  })
  await user.click(screen.getByRole('button', { name: 'Spalten' }))
  await waitFor(() => {
    expect(screen.getByRole('checkbox', { name: 'Beschreibung' })).toBeChecked()
  })
  await user.click(screen.getByRole('button', { name: 'Ansicht löschen' }))
  await waitFor(() => {
    expect(parseEventsSavedViews(localStorage.getItem(EVENTS_VIEWS_STORAGE_KEY))).toEqual([])
  })

  await user.click(screen.getByRole('button', { name: 'Tabelle zurücksetzen' }))
  await waitFor(() => {
    expect(router.state.location.search).toBe('')
  })
  await waitFor(() => {
    expect(
      parseEventsColumnState(localStorage.getItem(EVENTS_COLUMN_STORAGE_KEY)).find(
        ({ colId }) => colId === 'description',
      )?.hide,
    ).not.toBe(true)
  })
}, 20000)

it('deletes a row and reloads with the active filter and sorting intact', async () => {
  mockGridViewport()
  let deleted = false
  const { calls, user } = renderWithRelay(
    <EventsPage />,
    (operation) => {
      if (operation === 'EventsGridDeleteMutation') {
        deleted = true
        return { data: { deleteEvent: 'Event:1' } }
      }
      return {
        data: {
          events: {
            totalCount: deleted ? 0 : 1,
            nodes: deleted
              ? []
              : [
                  {
                    id: 'RXZlbnQ6MQ==',
                    name: 'Deleted event',
                    startDate: '2026-01-01',
                    endDate: null,
                    description: null,
                    type: 'OTHER',
                    tags: [],
                  },
                ],
            pageInfo: { endCursor: null, hasNextPage: false },
          },
        },
      }
    },
    {
      path: `/?gridFilters=${encodeURIComponent(JSON.stringify({ name: { filter: 'Deleted event', type: 'contains' } }))}&gridSort=${encodeURIComponent(JSON.stringify([{ colId: 'name', sort: 'desc' }]))}`,
    },
  )

  await screen.findByText('Deleted event', {}, { timeout: 5000 })
  await user.click(screen.getByRole('button', { name: 'Löschen' }))
  await waitFor(() => expect(screen.queryByText('Deleted event')).not.toBeInTheDocument())
  expect(calls('EventsGridDeleteMutation')).toEqual([{ id: 'RXZlbnQ6MQ==' }])
  await waitFor(() => {
    expect(calls('EventsManagementPageQuery').at(-1)).toMatchObject({
      order: [{ name: 'DESC' }, { id: 'ASC' }],
      where: { name: { contains: 'Deleted event' } },
    })
  })
})

it('refreshes server-filtered rows after a successful cell edit', async () => {
  mockGridViewport()
  let updated = false
  const { calls, user } = renderWithRelay(
    <EventsPage />,
    (operation) => {
      if (operation === 'EventsGridUpdateMutation') {
        updated = true
        return {
          data: {
            updateEvent: {
              id: 'RXZlbnQ6MQ==',
              name: 'No longer matching',
              startDate: '2026-01-01',
              endDate: null,
              description: null,
              type: 'OTHER',
              tags: [],
            },
          },
        }
      }
      return {
        data: {
          events: {
            totalCount: updated ? 0 : 1,
            nodes: updated
              ? []
              : [
                  {
                    id: 'RXZlbnQ6MQ==',
                    name: 'Matching event',
                    startDate: '2026-01-01',
                    endDate: null,
                    description: null,
                    type: 'OTHER',
                    tags: [],
                  },
                ],
            pageInfo: { endCursor: null, hasNextPage: false },
          },
        },
      }
    },
    {
      path: '/?filter.name.filter=Matching&filter.name.type=contains',
    },
  )

  await screen.findByText('Matching event')
  await user.dblClick(screen.getByText('Matching event'))
  const nameEditor = await screen.findByDisplayValue('Matching event')
  await user.clear(nameEditor)
  await user.type(nameEditor, 'No longer matching{Enter}')

  await waitFor(() => {
    expect(calls('EventsGridUpdateMutation')).toHaveLength(1)
    expect(screen.queryByText('Matching event')).not.toBeInTheDocument()
  })
  expect(calls('EventsManagementPageQuery').at(-1)).toMatchObject({
    where: { name: { contains: 'Matching' } },
  })
})

it('accepts localized date filters and writes ISO dates to the URL', async () => {
  mockGridViewport()
  const { router, user } = renderWithRelay(
    <EventsPage />,
    () => ({
      data: {
        events: {
          totalCount: 0,
          nodes: [],
          pageInfo: { endCursor: null, hasNextPage: false },
        },
      },
    }),
    { path: '/' },
  )

  await screen.findByRole('grid')
  const fromFilter = screen.getByRole('textbox', { name: 'Von' })
  expect(fromFilter).toHaveValue('')
  await user.type(fromFilter, '12.02.2026')

  await waitFor(() => {
    expect(new URLSearchParams(router.state.location.search).get('from')).toBe('2026-02-12')
  })
})

it('pins a new event through active filters until the user unpins it', async () => {
  mockGridViewport()
  const filters = new URLSearchParams({
    q: 'unmatched',
    from: '2026-01-01',
    gridFilters: JSON.stringify({ name: { filter: 'unmatched', type: 'contains' } }),
    gridSort: JSON.stringify([{ colId: 'name', sort: 'desc' }]),
  })
  const { calls, user, router } = renderWithRelay(
    <EventsPage />,
    (operation) => {
      if (operation === 'EventsGridCreateMutation') {
        return {
          data: {
            createEvent: {
              id: 'RXZlbnQ6Mg==',
              name: 'Neues Event',
              startDate: new Date().toLocaleDateString('sv-SE'),
              endDate: null,
              description: null,
              type: 'OTHER',
              tags: [],
            },
          },
        }
      }
      if (operation === 'EventsGridUpdateMutation') {
        return {
          data: {
            updateEvent: {
              id: 'RXZlbnQ6Mg==',
              name: 'Überarbeitetes Event',
              startDate: new Date().toLocaleDateString('sv-SE'),
              endDate: null,
              description: null,
              type: 'OTHER',
              tags: [],
            },
          },
        }
      }
      return {
        data: {
          events: {
            totalCount: 0,
            nodes: [],
            pageInfo: { endCursor: null, hasNextPage: false },
          },
        },
      }
    },
    { path: `/?${filters.toString()}` },
  )

  await screen.findByRole('grid')
  await user.click(screen.getByRole('button', { name: 'Event hinzufügen' }))

  await screen.findByText('Neues Event')
  expect(screen.getByRole('button', { name: 'Anheftung lösen' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Event hinzufügen' })).toBeEnabled()
  await waitFor(() => {
    const search = new URLSearchParams(router.state.location.search)
    expect(search.get('q')).toBe('unmatched')
    expect(search.get('from')).toBe('2026-01-01')
    expect(parseEventsFilterModel(search)).toMatchObject({
      name: { filter: 'unmatched', type: 'contains' },
    })
    expect(search.get('gridSort')).toBe(filters.get('gridSort'))
  })
  expect(calls('EventsGridCreateMutation')).toEqual([
    {
      event: {
        name: 'Neues Event',
        startDate: new Date().toLocaleDateString('sv-SE'),
        type: 'OTHER',
        description: null,
        endDate: null,
        tagIds: [],
      },
    },
  ])

  await user.dblClick(screen.getByText('Neues Event'))
  const nameEditor = await screen.findByDisplayValue('Neues Event')
  await user.clear(nameEditor)
  await user.type(nameEditor, 'Überarbeitetes Event{Enter}')
  await waitFor(() => {
    expect(calls('EventsGridUpdateMutation')).toEqual([
      {
        id: 'RXZlbnQ6Mg==',
        event: {
          name: 'Überarbeitetes Event',
          startDate: new Date().toLocaleDateString('sv-SE'),
          endDate: null,
          description: null,
          type: 'OTHER',
          tagIds: [],
        },
      },
    ])
  })
  expect(await screen.findByText('Überarbeitetes Event')).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Anheftung lösen' }))
  await waitFor(() => {
    expect(screen.queryByText('Überarbeitetes Event')).not.toBeInTheDocument()
  })
  expect(screen.getByRole('button', { name: 'Event hinzufügen' })).toBeEnabled()
})

it('lets the user pin and unpin an existing event row', async () => {
  mockGridViewport()
  const { user } = renderWithRelay(<EventsPage />, () => ({
    data: {
      events: {
        totalCount: 1,
        nodes: [
          {
            id: 'RXZlbnQ6Mw==',
            name: 'Existing event',
            startDate: '2026-01-01',
            endDate: null,
            description: null,
            type: 'OTHER',
            tags: [],
          },
        ],
        pageInfo: { endCursor: null, hasNextPage: false },
      },
    },
  }))

  await screen.findByText('Existing event')
  await user.click(screen.getByRole('button', { name: 'Event anheften' }))
  await waitFor(() => {
    expect(screen.getAllByText('Existing event')).toHaveLength(2)
  })

  await user.click(screen.getAllByRole('button', { name: 'Anheftung lösen' })[0])
  await waitFor(() => {
    expect(screen.getAllByText('Existing event')).toHaveLength(1)
  })
})
