import { act, screen, waitFor, within } from '@testing-library/react'
import i18n from 'i18next'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BodyStatsPage } from '../../../features/body-stats/BodyStatsPage'
import { BODY_STATS_PREFERENCES_STORAGE_KEY } from '../../../features/body-stats/bodyStatsPreferences'
import { dayStartIso } from '../../../features/body-stats/BodyStatsGridQuery'
import { mockGridViewport } from '../../utils/gridViewport'
import { renderWithRelay } from '../../utils/relay'

const QUERY = 'useBodyStatsOverviewQuery'
const CHART = 'BodyStatsChartPageQuery'
const ADD = 'useBodyStatsMutationsAddMutation'
const GRID = 'BodyStatsGridPageQuery'

interface Entry {
  id: string
  date: string
  weight: number
  bodyFatPercentage: number
  musclePercentage: number
  waterPercentage: number
  boneMass: number
  comment: string | null
}

const entry = (
  id: string,
  date: string,
  weight: number,
  comment: Entry['comment'] = null,
): Entry => ({
  id,
  date,
  weight,
  bodyFatPercentage: 15.2,
  musclePercentage: 40.3,
  waterPercentage: 60.1,
  boneMass: 3.2,
  comment,
})

const newest = entry('bs-a', '2026-10-02T08:00:00Z', 70.5, 'Locker')
const middle = entry('bs-b', '2026-10-01T08:00:00Z', 71)
const oldest = entry('bs-c', '2026-09-30T08:00:00Z', 71.2)
const longAgo = entry('bs-d', '2026-03-01T08:00:00Z', 74)

// The server order is deliberately not chronological: the page must not depend on it.
const seed = [oldest, newest, longAgo, middle]

type Handler = Parameters<typeof renderWithRelay>[1]

const newestFirstRows = (entries: Entry[]) =>
  [...entries].sort((left, right) => right.date.localeCompare(left.date))

const gridPage = (entries: Entry[]) => ({
  data: {
    bodyStats: {
      totalCount: entries.length,
      nodes: newestFirstRows(entries),
      pageInfo: { endCursor: null, hasNextPage: false },
    },
  },
})

/** The grid asks for its rows in its own query; by default the mocked server answers with the seed. */
const page = (
  handler: Handler,
  path = '/body-stats',
  gridRows: Entry[] = seed,
  chartHandler: Handler = () => chartPage(gridRows),
) =>
  renderWithRelay(
    <BodyStatsPage />,
    (operation, variables) => {
      if (operation === GRID) return gridPage(gridRows)
      if (operation === CHART) return chartHandler(operation, variables)
      return handler(operation, variables)
    },
    { path, routePath: '/body-stats' },
  )

const overview = (entries: Entry[]) => ({
  data: { bodyStats: { totalCount: entries.length, nodes: newestFirstRows(entries).slice(0, 1) } },
})

const chartPage = (entries: Entry[]) => ({
  data: {
    bodyStats: {
      nodes: [...entries].sort((left, right) => left.date.localeCompare(right.date)),
      pageInfo: { endCursor: null, hasNextPage: false },
    },
  },
})

/** The overview and the chart each ask for their own data; by default both answer with the seed. */
const okQuery = (entries: Entry[] = seed) => overview(entries)

const metricButton = (name: RegExp | string) => screen.findByRole('button', { name })

beforeEach(() => {
  mockGridViewport()
  // Only Date is faked, so periods are deterministic while timers keep working.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 3, 12, 0))
})

afterEach(() => {
  localStorage.removeItem(BODY_STATS_PREFERENCES_STORAGE_KEY)
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('BodyStatsPage', () => {
  describe('overview', () => {
    it('draws the chart from oldest to newest and selects weight', async () => {
      page(() => okQuery())

      expect(
        await screen.findByRole('img', { name: /von 74\.0 kg auf 70\.5 kg, 4 Messungen/ }),
      ).toBeInTheDocument()
      expect(await metricButton('Gewicht')).toHaveAttribute('aria-pressed', 'true')
      expect(await metricButton('Körperfett')).toHaveAttribute('aria-pressed', 'false')
    })

    it('summarises the selected measurement', async () => {
      page(() => okQuery())
      await screen.findByRole('img', { name: /4 Messungen/ })

      expect(screen.getByText('Aktuell').nextSibling).toHaveTextContent('70.5 kg')
      expect(screen.getByText('Veränderung').nextSibling).toHaveTextContent('−3.5 kg')
      expect(screen.getByText('Durchschnitt').nextSibling).toHaveTextContent('71.7 kg')
      expect(screen.getByText('Min – Max').nextSibling).toHaveTextContent('70.5 – 74.0 kg')
    })

    it('loads the overview once and the chart with the same filters as the table', async () => {
      const { calls } = page(() => okQuery())
      await screen.findByRole('img', { name: /4 Messungen/ })

      expect(calls(QUERY)).toHaveLength(1)
      expect(calls(CHART)).toEqual([{ first: 200, after: null, where: null }])
    })

    it('keeps loading pages until the whole history is in the chart', async () => {
      const { calls } = page(
        () => okQuery(),
        '/body-stats',
        seed,
        (_operation, variables) => {
          const { after } = variables as { after: string | null }
          return after
            ? {
                data: {
                  bodyStats: {
                    nodes: [newest, middle],
                    pageInfo: { endCursor: null, hasNextPage: false },
                  },
                },
              }
            : {
                data: {
                  bodyStats: {
                    nodes: [longAgo, oldest],
                    pageInfo: { endCursor: 'bs-c', hasNextPage: true },
                  },
                },
              }
        },
      )

      expect(await screen.findByRole('img', { name: /4 Messungen/ })).toBeInTheDocument()
      expect(calls(CHART).map(({ after }) => after)).toEqual([null, 'bs-c'])
    })

    it('tells the user when the chart fails and loads it again on retry', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      let attempt = 0
      const { user, calls } = page(
        () => okQuery(),
        '/body-stats',
        seed,
        () => {
          attempt += 1
          return attempt === 1 ? Promise.reject(new Error('offline')) : chartPage(seed)
        },
      )

      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent('Body-Stats konnten nicht geladen werden.')
      expect(screen.getByRole('grid')).toBeInTheDocument()

      await user.click(within(alert).getByRole('button', { name: 'Erneut versuchen' }))

      expect(await screen.findByRole('img', { name: /4 Messungen/ })).toBeInTheDocument()
      expect(calls(CHART)).toHaveLength(2)
    })

    it('selects another measurement and keeps it in the URL', async () => {
      const { user, router } = page(() => okQuery())
      await screen.findByRole('img', { name: /^Gewicht, / })

      await user.click(await metricButton('Körperfett'))

      expect(await screen.findByRole('img', { name: /^Körperfett, / })).toBeInTheDocument()
      expect(await metricButton('Körperfett')).toHaveAttribute('aria-pressed', 'true')
      expect(router.state.location.search).toContain('metric=bodyFatPercentage')
    })

    it('restores the measurement from the URL and falls back for unknown values', async () => {
      page(() => okQuery(), '/body-stats?metric=boneMass')
      expect(await screen.findByRole('img', { name: /^Knochenmasse, / })).toBeInTheDocument()
    })

    it('remembers the selected measurement and uses it when the URL names none', async () => {
      const first = page(() => okQuery())
      await first.user.click(await metricButton('Körperfett'))
      await screen.findByRole('img', { name: /^Körperfett, / })
      first.unmount()

      page(() => okQuery())

      expect(await screen.findByRole('img', { name: /^Körperfett, / })).toBeInTheDocument()
    })

    it('prefers the measurement in the URL over the remembered one', async () => {
      localStorage.setItem(
        BODY_STATS_PREFERENCES_STORAGE_KEY,
        JSON.stringify({ controlsOpen: true, metric: 'bodyFatPercentage' }),
      )
      page(() => okQuery(), '/body-stats?metric=boneMass')

      expect(await screen.findByRole('img', { name: /^Knochenmasse, / })).toBeInTheDocument()
    })

    it('remembers whether the filter panel is open', async () => {
      const first = page(() => okQuery())
      await first.user.click(await screen.findByText('Messungen filtern'))
      await waitFor(() =>
        expect(
          JSON.parse(localStorage.getItem(BODY_STATS_PREFERENCES_STORAGE_KEY) ?? '{}'),
        ).toMatchObject({ controlsOpen: false }),
      )
      first.unmount()

      page(() => okQuery())

      await screen.findByRole('img', { name: /^Gewicht, / })
      expect(screen.queryByLabelText('Notizen durchsuchen')).not.toBeVisible()
    })

    it('ignores damaged remembered values', async () => {
      localStorage.setItem(
        BODY_STATS_PREFERENCES_STORAGE_KEY,
        '{"metric":"nonsense","controlsOpen":3}',
      )
      page(() => okQuery())

      expect(await screen.findByRole('img', { name: /^Gewicht, / })).toBeInTheDocument()
      expect(screen.getByLabelText('Notizen durchsuchen')).toBeVisible()
    })

    it('falls back to weight for an invalid measurement in the URL', async () => {
      page(() => okQuery(), '/body-stats?metric=nonsense')
      expect(await screen.findByRole('img', { name: /^Gewicht, / })).toBeInTheDocument()
    })

    it('shows the measurements of the table filters only', async () => {
      const { calls } = page(() => okQuery(), '/body-stats?tableFrom=2026-09-01')

      await waitFor(() =>
        expect(calls(CHART)).toContainEqual(
          expect.objectContaining({ where: { date: { gte: dayStartIso('2026-09-01') } } }),
        ),
      )
    })

    it('says so when no measurement matches the filters', async () => {
      page(() => okQuery(), '/body-stats?tableFrom=2026-09-01', [])

      expect(
        await screen.findByText('Keine Messungen für die aktuellen Filter.'),
      ).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Gewicht' })).toBeInTheDocument()
    })

    it('uses the same names for the measurements in chart and column picker', async () => {
      const { user } = page(() => okQuery())
      await screen.findByRole('img', { name: /4 Messungen/ })
      const names = ['Gewicht', 'Körperfett', 'Muskelanteil', 'Wasseranteil', 'Knochenmasse']
      for (const name of names) {
        expect(screen.getByRole('button', { name })).toBeInTheDocument()
      }

      await user.click(await screen.findByRole('button', { name: 'Spalten' }))
      for (const name of names) {
        expect(await screen.findByRole('checkbox', { name })).toBeInTheDocument()
      }
    })

    it('labels the chart again after a language switch', async () => {
      page(() => okQuery())
      await screen.findByRole('img', { name: /^Gewicht, / })

      await act(() => i18n.changeLanguage('en'))

      expect(
        await screen.findByRole('img', { name: /^Weight, .* 4 measurements/ }),
      ).toBeInTheDocument()
      expect(screen.getByText('Latest')).toBeInTheDocument()
    })
  })

  describe('states', () => {
    it('shows filters, chart and table without waiting for the overview', async () => {
      page((operation) => (operation === QUERY ? new Promise(() => {}) : undefined))

      expect(await screen.findByRole('img', { name: /^Gewicht, / })).toBeInTheDocument()
      expect(screen.getByLabelText('Notizen durchsuchen')).toBeVisible()
      expect(await screen.findByRole('grid')).toBeInTheDocument()
      expect(screen.queryByText('Noch keine Messungen')).not.toBeInTheDocument()
    })

    it('shows an empty state with the add action instead of an empty grid', async () => {
      const { user, calls } = page((operation) =>
        operation === ADD
          ? { data: { addBodyStats: entry('bs-new', '2026-10-03T10:00:00Z', 1) } }
          : okQuery([]),
      )

      expect(await screen.findByText('Noch keine Messungen')).toBeInTheDocument()
      expect(screen.queryByRole('grid')).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Erste Messung erfassen' }))
      await waitFor(() => expect(calls(ADD)).toHaveLength(1))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('tells the user when the overview fails and keeps the page', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      page((operation) => (operation === QUERY ? Promise.reject(new Error('offline')) : undefined))

      expect(
        await screen.findByText('Body-Stats konnten nicht geladen werden.'),
      ).toBeInTheDocument()
      expect(await screen.findByRole('img', { name: /^Gewicht, / })).toBeInTheDocument()
    })
  })

  describe('adding', () => {
    const added = entry('bs-new', '2026-10-03T10:00:00Z', 70.5)

    it('creates a measurement at once from the latest values, without a form', async () => {
      const { user, calls } = page((operation) =>
        operation === ADD ? { data: { addBodyStats: added } } : okQuery(),
      )
      await screen.findByRole('grid')
      await user.click(await screen.findByRole('button', { name: 'Messung erfassen' }))

      await waitFor(() => expect(calls(ADD)).toHaveLength(1))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(calls(ADD)).toEqual([
        {
          input: {
            date: new Date(2026, 9, 3, 12, 0).toISOString(),
            weight: 70.5,
            bodyFatPercentage: 15.2,
            musclePercentage: 40.3,
            waterPercentage: 60.1,
            boneMass: 3.2,
            comment: null,
          },
        },
      ])
      expect(await screen.findByText('Messung gespeichert.')).toBeInTheDocument()
      await waitFor(() => expect(calls(QUERY)).toHaveLength(2))
      await waitFor(() => expect(calls(CHART)).toHaveLength(2))
    })

    it('creates a first measurement with valid placeholders from the empty state', async () => {
      const { user, calls } = page((operation) =>
        operation === ADD ? { data: { addBodyStats: added } } : okQuery([]),
      )
      await user.click(await screen.findByRole('button', { name: 'Erste Messung erfassen' }))

      await waitFor(() => expect(calls(ADD)).toHaveLength(1))
      expect(calls(ADD)[0]).toMatchObject({
        input: {
          weight: 1,
          bodyFatPercentage: 0,
          musclePercentage: 0,
          waterPercentage: 0,
          boneMass: 1,
          comment: null,
        },
      })
    })

    it('tells the user when saving fails', async () => {
      const { user, calls } = page((operation) =>
        operation === ADD ? { data: null, errors: [{ message: 'boom' }] } : okQuery(),
      )
      await user.click(await screen.findByRole('button', { name: 'Messung erfassen' }))

      expect(
        await screen.findByText('Speichern fehlgeschlagen. Bitte versuche es nochmals.'),
      ).toBeInTheDocument()
      expect(calls(ADD)).toHaveLength(1)
    })

    it('sends one request when the button is pressed twice', async () => {
      let finish: (value: unknown) => void = () => {}
      const pending = new Promise((resolve) => {
        finish = resolve
      })
      const { user, calls } = page((operation) =>
        operation === ADD ? (pending as never) : okQuery(),
      )
      const button = await screen.findByRole('button', { name: 'Messung erfassen' })

      await user.click(button)
      await user.click(button)

      expect(calls(ADD)).toHaveLength(1)
      await act(async () => finish({ data: { addBodyStats: added } }))
    })
  })
})
