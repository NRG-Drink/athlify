import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DashboardPage } from '../../../features/dashboard/DashboardPage'
import { DASHBOARD_PREFERENCES_STORAGE_KEY } from '../../../features/dashboard/dashboardPreferences'
import { DASHBOARD_COLUMN_STORAGE_KEY } from '../../../features/dashboard/dashboardTableColumns'
import { mockGridViewport } from '../../utils/gridViewport'
import { renderWithRelay } from '../../utils/relay'

const ACTIVITIES = 'useDashboardDataActivitiesQuery'
const BODY_STATS = 'useDashboardDataBodyStatsQuery'
const EVENTS = 'useDashboardDataEventsQuery'
const TAGS = 'useDashboardTagsQuery'

const noMore = { endCursor: null, hasNextPage: false }

const activity = (date: string, distance: number, tss: number | null) => ({
  date,
  time: 3600,
  distance,
  elevationGain: 100,
  tss,
})

const body = (date: string, weight: number) => ({
  date,
  weight,
  bodyFatPercentage: 15,
  musclePercentage: 40,
  waterPercentage: 60,
  boneMass: 3,
})

const isWarmUp = (variables: unknown) => JSON.stringify(variables).includes('"tss":{"neq":null}')

const handler =
  (overrides: Record<string, unknown> = {}) =>
  (operation: string, variables: unknown = {}) => {
    if (operation === ACTIVITIES && isWarmUp(variables) && !overrides[ACTIVITIES]) {
      return { data: { activities: { nodes: [], pageInfo: noMore } } }
    }
    const responses: Record<string, unknown> = {
      [ACTIVITIES]: {
        data: {
          activities: {
            nodes: [
              activity('2026-11-03T10:00:00Z', 40, 80),
              activity('2026-11-04T10:00:00Z', 20, 40),
              activity('2026-11-11T10:00:00Z', 30, null),
            ],
            pageInfo: noMore,
          },
        },
      },
      [BODY_STATS]: {
        data: {
          bodyStats: {
            nodes: [body('2026-11-03T08:00:00Z', 71), body('2026-11-05T08:00:00Z', 73)],
            pageInfo: noMore,
          },
        },
      },
      [EVENTS]: {
        data: {
          events: {
            nodes: [
              {
                id: 'e1',
                name: 'Sturz am Pass',
                type: 'CRASH',
                startDate: '2026-11-04',
                endDate: null,
              },
            ],
            pageInfo: noMore,
          },
        },
      },
      [TAGS]: { data: { tags: { nodes: [{ id: 't1', name: 'Rennen' }], pageInfo: noMore } } },
      ...overrides,
    }
    return responses[operation]
  }

const cell = (grid: HTMLElement, rowId: string, column: string) =>
  grid.querySelector(`[row-id="${rowId}"] [col-id="${column}"]`)

const path = '/?from=2026-11-01&to=2026-11-30&group=week'

describe('DashboardPage', () => {
  afterEach(() => vi.unstubAllGlobals())

  beforeEach(() => {
    window.localStorage.clear()
    mockGridViewport()
  })

  it('aggregates activities and body stats per week and lists the events of the period', async () => {
    renderWithRelay(<DashboardPage />, handler(), { path })

    const grid = await screen.findByRole('grid')
    await waitFor(() => expect(cell(grid, '2026-11-02', 'count')).not.toBeNull())
    expect(cell(grid, '2026-11-02', 'period')).toHaveTextContent('KW 45')
    expect(cell(grid, '2026-11-02', 'count')).toHaveTextContent('2')
    expect(cell(grid, '2026-11-02', 'distance')).toHaveTextContent('60.0')
    expect(cell(grid, '2026-11-02', 'tss')).toHaveTextContent('120')
    expect(cell(grid, '2026-11-02', 'weight')).toHaveTextContent('72.0')
    expect(cell(grid, '2026-11-02', 'events')).toHaveTextContent('Sturz am Pass')
    expect(screen.getAllByText('1 Events im Zeitraum sind im Diagramm markiert.').length).toBe(1)
  })

  it('offers optional columns and remembers the choice', async () => {
    const { user } = renderWithRelay(<DashboardPage />, handler(), { path })
    const grid = await screen.findByRole('grid')
    await waitFor(() => expect(cell(grid, '2026-11-02', 'count')).not.toBeNull())
    expect(cell(grid, '2026-11-02', 'bodyFat')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Spalten' }))
    await user.click(await screen.findByRole('checkbox', { name: 'Körperfett [%]' }))

    // jsdom has no layout, so AG Grid does not draw a newly shown column; the stored state proves it.
    await waitFor(() =>
      expect(window.localStorage.getItem(DASHBOARD_COLUMN_STORAGE_KEY)).not.toBeNull(),
    )
    const stored = JSON.parse(window.localStorage.getItem(DASHBOARD_COLUMN_STORAGE_KEY) ?? '[]')
    expect(stored.find((column: { colId: string }) => column.colId === 'bodyFat')).toMatchObject({
      hide: false,
    })
  })

  it('asks the server for the range and the selected type', async () => {
    const { calls, user } = renderWithRelay(<DashboardPage />, handler(), { path })
    await screen.findByRole('grid')

    await user.click(screen.getByRole('button', { name: 'Indoor' }))

    await waitFor(() => {
      const where = JSON.stringify(calls(ACTIVITIES).at(-1))
      expect(where).toContain('"type":{"in":["INDOOR"]}')
    })
    expect(JSON.stringify(calls(EVENTS)[0])).toContain('"startDate":{"lte":"2026-11-30"}')
  })

  it('reloads only the activities when the type filter changes', async () => {
    const { calls, user } = renderWithRelay(<DashboardPage />, handler(), { path })
    await screen.findByRole('grid')
    expect(calls(BODY_STATS)).toHaveLength(1)
    expect(calls(EVENTS)).toHaveLength(1)
    expect(calls(ACTIVITIES).filter(isWarmUp)).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Indoor' }))

    await waitFor(() => expect(calls(ACTIVITIES)).toHaveLength(4))
    expect(calls(BODY_STATS)).toHaveLength(1)
    expect(calls(EVENTS)).toHaveLength(1)
  })

  it('shows empty messages when nothing matches', async () => {
    renderWithRelay(
      <DashboardPage />,
      handler({
        [ACTIVITIES]: { data: { activities: { nodes: [], pageInfo: noMore } } },
        [BODY_STATS]: { data: { bodyStats: { nodes: [], pageInfo: noMore } } },
        [EVENTS]: { data: { events: { nodes: [], pageInfo: noMore } } },
      }),
      { path },
    )

    expect(
      await screen.findByText('Keine Aktivitäten für die aktuellen Filter.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Keine Messungen im gewählten Zeitraum.')).toBeInTheDocument()
    expect(screen.getByText(/Keine TSS-Werte vorhanden/)).toBeInTheDocument()
  })

  it('shows an error with a retry when loading fails', async () => {
    const { user } = renderWithRelay(
      <DashboardPage />,
      handler({ [ACTIVITIES]: { data: null, errors: [{ message: 'boom' }] } }),
      { path },
    )

    expect((await screen.findAllByText('Das Dashboard konnte nicht geladen werden.')).length).toBe(
      2,
    )
    expect(screen.getAllByRole('button', { name: 'Erneut versuchen' })).toHaveLength(2)
    await user.click(screen.getAllByRole('button', { name: 'Erneut versuchen' })[0])
  })

  it('hides a chart panel and remembers it in the browser', async () => {
    const { user } = renderWithRelay(<DashboardPage />, handler(), { path })
    await screen.findByRole('grid')
    expect(screen.getByRole('group', { name: 'Messwert für Körper-Metriken' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Körper-Metriken' }))

    await waitFor(() =>
      expect(
        screen.queryByRole('group', { name: 'Messwert für Körper-Metriken' }),
      ).not.toBeInTheDocument(),
    )
    expect(
      JSON.parse(window.localStorage.getItem(DASHBOARD_PREFERENCES_STORAGE_KEY) ?? '{}'),
    ).toMatchObject({ cardsOpen: { track: true, fitness: true, body: false } })
  })

  it('hides the data table and remembers it in the browser', async () => {
    const { user } = renderWithRelay(<DashboardPage />, handler(), { path })
    await screen.findByRole('grid')

    await user.click(screen.getByRole('button', { name: 'Aggregierte Daten' }))

    await waitFor(() => expect(screen.queryByRole('grid')).not.toBeInTheDocument())
    expect(
      JSON.parse(window.localStorage.getItem(DASHBOARD_PREFERENCES_STORAGE_KEY) ?? '{}'),
    ).toMatchObject({ cardsOpen: { table: false } })
  })

  it('remembers the selected metric in the browser', async () => {
    const { user } = renderWithRelay(<DashboardPage />, handler(), { path })
    await screen.findByRole('grid')

    const group = screen.getByRole('group', { name: 'Messwert für Track-Metriken' })
    await user.click(within(group).getByRole('button', { name: 'Höhenmeter' }))

    expect(
      JSON.parse(window.localStorage.getItem(DASHBOARD_PREFERENCES_STORAGE_KEY) ?? '{}'),
    ).toMatchObject({
      trackMetric: 'elevationGain',
    })
  })
})
