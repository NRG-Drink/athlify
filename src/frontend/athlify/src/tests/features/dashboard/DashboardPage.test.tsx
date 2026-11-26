import { screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { DashboardPage } from '../../../features/dashboard/DashboardPage'
import { DASHBOARD_PREFERENCES_STORAGE_KEY } from '../../../features/dashboard/dashboardPreferences'
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

const handler = (overrides: Record<string, unknown> = {}) => (operation: string) => {
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

const path = '/?from=2026-11-01&to=2026-11-30&group=week'

describe('DashboardPage', () => {
  beforeEach(() => window.localStorage.clear())

  it('aggregates activities and body stats per week and lists the events of the period', async () => {
    renderWithRelay(<DashboardPage />, handler(), { path })

    const table = await screen.findByRole('table')
    const firstWeek = await within(table).findByRole('row', { name: /KW 45/ })
    const cells = within(firstWeek).getAllByRole('cell')
    expect(cells[1]).toHaveTextContent('2')
    expect(cells[3]).toHaveTextContent('60.0')
    expect(cells[5]).toHaveTextContent('120')
    expect(cells[7]).toHaveTextContent('72.0')
    expect(cells[10]).toHaveTextContent('Sturz am Pass')
    expect(screen.getAllByText('1 Events im Zeitraum sind im Diagramm markiert.').length).toBe(1)
  })

  it('asks the server for the range and the selected type', async () => {
    const { calls, user } = renderWithRelay(<DashboardPage />, handler(), { path })
    await screen.findByRole('table')

    await user.click(screen.getByRole('button', { name: 'Indoor' }))

    await waitFor(() => {
      const where = JSON.stringify(calls(ACTIVITIES).at(-1))
      expect(where).toContain('"type":{"in":["INDOOR"]}')
    })
    expect(JSON.stringify(calls(EVENTS)[0])).toContain('"startDate":{"lte":"2026-11-30"}')
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

    expect(await screen.findByText('Keine Aktivitäten für die aktuellen Filter.')).toBeInTheDocument()
    expect(screen.getByText('Keine Messungen im gewählten Zeitraum.')).toBeInTheDocument()
    expect(screen.getByText(/Keine TSS-Werte vorhanden/)).toBeInTheDocument()
  })

  it('shows an error with a retry when loading fails', async () => {
    const { user } = renderWithRelay(
      <DashboardPage />,
      handler({ [ACTIVITIES]: { data: null, errors: [{ message: 'boom' }] } }),
      { path },
    )

    expect((await screen.findAllByText('Das Dashboard konnte nicht geladen werden.')).length).toBe(3)
    expect(screen.getAllByRole('button', { name: 'Erneut versuchen' })).toHaveLength(3)
    await user.click(screen.getAllByRole('button', { name: 'Erneut versuchen' })[0])
  })

  it('remembers the selected metric in the browser', async () => {
    const { user } = renderWithRelay(<DashboardPage />, handler(), { path })
    await screen.findByRole('table')

    const group = screen.getByRole('group', { name: 'Messwert für Track-Metriken' })
    await user.click(within(group).getByRole('button', { name: 'Höhenmeter' }))

    expect(JSON.parse(window.localStorage.getItem(DASHBOARD_PREFERENCES_STORAGE_KEY) ?? '{}')).toMatchObject({
      trackMetric: 'elevationGain',
    })
  })
})
