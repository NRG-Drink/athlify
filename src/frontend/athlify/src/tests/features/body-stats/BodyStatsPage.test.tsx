import { act, screen, waitFor, within } from '@testing-library/react'
import i18n from 'i18next'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BodyStatsPage } from '../../../features/body-stats/BodyStatsPage'
import { mockGridViewport } from '../../utils/gridViewport'
import { renderWithRelay } from '../../utils/relay'

const QUERY = 'BodyStatsPageQuery'
const MORE = 'BodyStatsPageMoreQuery'
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
const page = (handler: Handler, path = '/body-stats', gridRows: Entry[] = seed) =>
  renderWithRelay(
    <BodyStatsPage />,
    (operation, variables) =>
      operation === GRID ? gridPage(gridRows) : handler(operation, variables),
    { path, routePath: '/body-stats' },
  )

const connection = (entries: Entry[], hasNextPage = false) => ({
  edges: entries.map((node) => ({ cursor: node.id, node })),
  pageInfo: {
    hasNextPage,
    endCursor: entries.at(-1)?.id ?? null,
    hasPreviousPage: false,
    startCursor: entries[0]?.id ?? null,
  },
})

const okQuery = (entries: Entry[] = seed) => ({ data: { bodyStats: connection(entries) } })

// Looked up by structure, not by name: the names change with the language, and a modal dialog hides
// the page behind it from the accessibility tree, so these are called while no dialog is open.
const tiles = () => within(document.querySelector('ul[aria-label]') as HTMLElement)

beforeEach(() => {
  mockGridViewport()
  // Only Date is faked, so periods are deterministic while timers keep working.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 3, 12, 0))
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('BodyStatsPage', () => {
  describe('overview', () => {
    it('shows the latest value of each measurement in tiles and selects weight', async () => {
      page(() => okQuery())

      const weight = await tiles().findByRole('button', { name: /Gewicht/ })

      expect(weight).toHaveAttribute('aria-pressed', 'true')
      expect(weight).toHaveTextContent('70.5')
      expect(weight).toHaveTextContent('−0.7 kg')
      expect(weight).not.toHaveTextContent('05.07.2026')
      expect(tiles().getByRole('button', { name: /Körperfett/ })).toHaveAttribute(
        'aria-pressed',
        'false',
      )
      expect(tiles().getAllByRole('button')).toHaveLength(5)
    })

    it('loads the list once', async () => {
      const { calls } = page(() => okQuery())
      await tiles().findByRole('button', { name: /Gewicht/ })

      expect(calls(QUERY)).toHaveLength(1)
    })

    it('keeps loading pages of the analytics history', async () => {
      const { calls } = page((operation) =>
        operation === MORE
          ? { data: { bodyStats: connection([oldest, longAgo]) } }
          : { data: { bodyStats: connection([newest, middle], true) } },
      )

      await waitFor(() => expect(calls(MORE)).toHaveLength(1))

      expect(calls(MORE)).toEqual([{ first: 200, after: 'bs-b' }])
      expect(calls(QUERY)).toHaveLength(1)
    })

    it('keeps the content on screen while further pages load', async () => {
      const { calls } = page((operation) =>
        operation === MORE
          ? { data: { bodyStats: connection([oldest, longAgo]) } }
          : { data: { bodyStats: connection([newest, middle], true) } },
      )
      await tiles().findByRole('button', { name: /Gewicht/ })

      let skeletonShown = false
      const observer = new MutationObserver(() => {
        if (document.querySelector('[aria-busy="true"]')) skeletonShown = true
      })
      observer.observe(document.body, { childList: true, subtree: true, attributes: true })
      await waitFor(() => expect(calls(MORE)).toHaveLength(1))
      observer.disconnect()

      expect(skeletonShown).toBe(false)
    })

    it('stops loading and tells the user when a further page fails', async () => {
      const { calls } = page((operation) =>
        operation === MORE
          ? { data: null, errors: [{ message: 'boom' }] }
          : { data: { bodyStats: connection([newest, middle], true) } },
      )

      expect(
        await screen.findByText('Body-Stats konnten nicht geladen werden.'),
      ).toBeInTheDocument()

      expect(calls(MORE)).toHaveLength(1)
    })

    it('draws the chart from oldest to newest even when the server order differs', async () => {
      page(() => okQuery())

      expect(
        await screen.findByRole('img', { name: /von 71\.2 kg auf 70\.5 kg, 3 Messungen/ }),
      ).toBeInTheDocument()
    })

    it('selects the measurement of a tile for the chart and keeps it in the URL', async () => {
      const { user, router } = page(() => okQuery())

      await user.click(await tiles().findByRole('button', { name: /Körperfett/ }))

      expect(await screen.findByRole('img', { name: /^Körperfett, / })).toBeInTheDocument()
      expect(tiles().getByRole('button', { name: /Körperfett/ })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
      expect(router.state.location.search).toContain('metric=bodyFatPercentage')
    })

    it('restores metric and legacy period from the URL', async () => {
      page(() => okQuery(), '/body-stats?metric=boneMass&period=1y')
      expect(
        await screen.findByRole('img', { name: /^Knochenmasse, .*4 Messungen/ }),
      ).toBeInTheDocument()
    })

    it('restores aggregation from the URL and keeps KPI deltas raw', async () => {
      page(() => okQuery(), '/body-stats?from=2026-01-01&to=2026-10-03&aggregation=month')

      expect(await screen.findByRole('img', { name: /3 Messungen/ })).toBeInTheDocument()
      expect(tiles().getByRole('button', { name: /Gewicht/ })).toHaveTextContent('−3.5 kg')
      expect(screen.getByRole('button', { name: /Zeitraum ändern: Zeitraum:/ })).toHaveTextContent(
        '1 M',
      )
    })

    it('falls back to the defaults for invalid URL parameters', async () => {
      page(() => okQuery(), '/body-stats?metric=nonsense&period=forever')

      expect(
        await screen.findByRole('img', { name: /^Gewicht, .*3 Messungen/ }),
      ).toBeInTheDocument()
    })

    it('changes the date range of chart and tiles', async () => {
      const { user, router, calls } = page(() => okQuery())
      await screen.findByRole('img', { name: /3 Messungen/ })

      await user.click(screen.getByRole('button', { name: /Zeitraum ändern: Zeitraum:/ }))
      const picker = await screen.findByRole('dialog')
      const from = within(picker).getByRole('textbox', { name: 'Von' })
      const to = within(picker).getByRole('textbox', { name: 'Bis' })
      await user.clear(from)
      await user.type(from, '01.01.2026')
      await user.clear(to)
      await user.type(to, '03.10.2026')
      await user.click(within(picker).getByRole('button', { name: 'Anwenden' }))

      expect(
        await screen.findByRole('img', {
          name: /01\.01\.2026 bis 03\.10\.2026: von 74\.0 kg auf 70\.5 kg, 4 Messungen/,
        }),
      ).toBeInTheDocument()
      expect(tiles().getByRole('button', { name: /Gewicht/ })).toHaveTextContent('−3.5 kg')
      expect(router.state.location.search).toContain('from=2026-01-01')
      expect(router.state.location.search).toContain('to=2026-10-03')
      expect(calls(QUERY)).toHaveLength(1)
    })

    it('changes aggregation locally without refetching or changing KPI delta', async () => {
      const { user, router, calls } = page(
        () => okQuery(),
        '/body-stats?from=2026-01-01&to=2026-10-03',
      )
      await screen.findByRole('img', { name: /4 Messungen/ })

      await user.click(screen.getByRole('button', { name: /Zeitraum ändern: Zeitraum:/ }))
      await user.selectOptions(screen.getByLabelText('Auflösung'), 'year')
      await user.click(screen.getByRole('button', { name: 'Anwenden' }))

      expect(await screen.findByRole('img', { name: /1 Messung/ })).toBeInTheDocument()
      expect(tiles().getByRole('button', { name: /Gewicht/ })).toHaveTextContent('−3.5 kg')
      expect(router.state.location.search).toContain('aggregation=year')
      expect(calls(QUERY)).toHaveLength(1)
    })

    it('shows every measurement when aggregation is disabled', async () => {
      const { user, router, calls } = page(
        () => okQuery(),
        '/body-stats?from=2026-01-01&to=2026-10-03&aggregation=none',
      )

      expect(await screen.findByRole('img', { name: /4 Messungen/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Zeitraum ändern: Zeitraum:/ })).toHaveTextContent(
        'Keine',
      )

      await user.click(screen.getByRole('button', { name: /Zeitraum ändern: Zeitraum:/ }))
      await user.selectOptions(screen.getByLabelText('Auflösung'), 'none')
      await user.click(screen.getByRole('button', { name: 'Anwenden' }))

      expect(await screen.findByRole('img', { name: /4 Messungen/ })).toBeInTheDocument()
      expect(router.state.location.search).toContain('aggregation=none')
      expect(calls(QUERY)).toHaveLength(1)
    })

    it('says so when the range has too little data for a change', async () => {
      page(() => okQuery([newest, longAgo]), '/body-stats?from=2026-09-01&to=2026-10-03')

      expect(await tiles().findByRole('button', { name: /Gewicht/ })).toHaveTextContent(
        'Zu wenig Daten im Zeitraum',
      )
    })

    it('says so when nothing was measured in the selected range', async () => {
      page(() => okQuery([longAgo]), '/body-stats?from=2026-09-01&to=2026-10-03')

      expect(await screen.findByText('Keine Messungen in diesem Zeitraum.')).toBeInTheDocument()
      expect(tiles().getByRole('button', { name: /Gewicht/ })).toHaveTextContent(
        'Keine Messung im Zeitraum',
      )
    })

    it('uses the same names in tiles and form', async () => {
      const { user } = page(() => okQuery())
      await tiles().findByRole('button', { name: /Gewicht/ })
      const names = ['Gewicht', 'Körperfett', 'Muskelanteil', 'Wasseranteil', 'Knochenmasse']
      for (const name of names) {
        expect(tiles().getByRole('button', { name: new RegExp(name) })).toBeInTheDocument()
      }

      await user.click(screen.getByRole('button', { name: 'Messung erfassen' }))
      const dialog = await screen.findByRole('dialog')

      for (const name of names) {
        expect(within(dialog).getByLabelText(new RegExp(`^${name}`))).toBeInTheDocument()
      }
    })

    it('formats labels, dates and numbers again after a language switch', async () => {
      page(() => okQuery())
      await tiles().findByRole('button', { name: /Gewicht/ })

      await act(() => i18n.changeLanguage('en'))

      expect(await tiles().findByRole('button', { name: /Weight/ })).toHaveTextContent('−0.7 kg')
      expect(
        screen.getByRole('button', { name: /Change date range: Date range:/ }),
      ).toHaveTextContent('Date range: 05.07.2026 – 03.10.2026')
    })
  })

  describe('states', () => {
    it('shows a skeleton of the page while loading', async () => {
      page(() => new Promise(() => {}))

      const [skeleton] = await screen.findAllByRole('status')
      expect(skeleton).toHaveAttribute('aria-busy', 'true')
      expect(screen.getByRole('heading', { level: 1, name: 'Body-Stats' })).toBeInTheDocument()
    })

    it('shows an empty state with the add action instead of an empty grid', async () => {
      const { user } = page(() => okQuery([]))

      expect(await screen.findByText('Noch keine Messungen')).toBeInTheDocument()
      expect(screen.queryByRole('grid')).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Erste Messung erfassen' }))
      expect(await screen.findByRole('dialog')).toBeInTheDocument()
    })

    it('shows a load error inside the page and retries with a new request', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      let attempt = 0
      const { user, calls } = page(() => {
        attempt += 1
        return attempt === 1 ? Promise.reject(new Error('offline')) : Promise.resolve(okQuery())
      })

      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent('Body-Stats konnten nicht geladen werden.')
      expect(screen.getByRole('heading', { level: 1, name: 'Body-Stats' })).toBeInTheDocument()

      await user.click(within(alert).getByRole('button', { name: 'Erneut versuchen' }))

      await screen.findByRole('list')
      expect(await tiles().findByRole('button', { name: /Gewicht/ })).toBeInTheDocument()
      expect(calls(QUERY)).toHaveLength(2)
    })
  })

  describe('returning to the page', () => {
    it('loads again instead of showing the old load error', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      let attempt = 0
      const { router, calls } = renderWithRelay(
        <BodyStatsPage />,
        () => {
          attempt += 1
          return attempt === 1 ? Promise.reject(new Error('offline')) : Promise.resolve(okQuery())
        },
        {
          path: '/body-stats',
          routePath: '/body-stats',
          otherRoutes: [{ path: '/other', element: <p>Andere Seite</p> }],
        },
      )
      await screen.findByRole('alert')

      await act(() => router.navigate('/other'))
      await screen.findByText('Andere Seite')
      await act(() => router.navigate('/body-stats'))

      expect(await tiles().findByRole('button', { name: /Gewicht/ })).toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(calls(QUERY)).toHaveLength(2)
    })
  })

  describe('adding', () => {
    const added = entry('bs-new', '2026-10-03T10:00:00Z', 72.5, 'neu')

    it('prefills from the newest measurement, not from the first one delivered', async () => {
      const { user } = page(() => okQuery())
      await tiles().findByRole('button', { name: /Gewicht/ })

      await user.click(screen.getByRole('button', { name: 'Messung erfassen' }))
      const dialog = await screen.findByRole('dialog', { name: 'Neue Messung' })

      expect(within(dialog).getByLabelText(/^Gewicht/)).toHaveValue('70.5')
    })

    it('validates the form and sends nothing while it is invalid', async () => {
      const { user, calls } = page(() => okQuery([]))
      await user.click(await screen.findByRole('button', { name: 'Erste Messung erfassen' }))
      const dialog = await screen.findByRole('dialog')

      await user.click(within(dialog).getByRole('button', { name: 'Speichern' }))

      expect(await within(dialog).findAllByText('Pflichtfeld.')).toHaveLength(5)
      expect(calls(ADD)).toHaveLength(0)
    })

    it('rejects values outside the allowed range', async () => {
      const { user, calls } = page(() => okQuery())
      await user.click(await screen.findByRole('button', { name: 'Messung erfassen' }))
      const dialog = await screen.findByRole('dialog')

      const fat = within(dialog).getByLabelText(/^Körperfett/)
      await user.clear(fat)
      await user.type(fat, '120')
      const weight = within(dialog).getByLabelText(/^Gewicht/)
      await user.clear(weight)
      await user.type(weight, '0')
      await user.click(within(dialog).getByRole('button', { name: 'Speichern' }))

      expect(
        await within(dialog).findByText('Bitte einen Wert zwischen 0 und 100 eingeben.'),
      ).toBeInTheDocument()
      expect(
        within(dialog).getByText('Bitte einen Wert grösser als 0 eingeben.'),
      ).toBeInTheDocument()
      expect(calls(ADD)).toHaveLength(0)
    })

    it('sends a decimal comma as a number, trims the note, and reloads the grid rows', async () => {
      const { user, calls } = page((operation) =>
        operation === ADD ? { data: { addBodyStats: added } } : okQuery(),
      )
      await screen.findByRole('grid')
      const gridCallsBefore = calls(GRID).length
      await user.click(await screen.findByRole('button', { name: 'Messung erfassen' }))
      const dialog = await screen.findByRole('dialog')

      const weight = within(dialog).getByLabelText(/^Gewicht/)
      await user.clear(weight)
      await user.type(weight, '72,5')
      await user.type(within(dialog).getByRole('textbox', { name: 'Notiz' }), '  neu  ')
      await user.click(within(dialog).getByRole('button', { name: 'Speichern' }))

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(calls(ADD)).toEqual([
        {
          input: {
            date: new Date(2026, 9, 3, 12, 0).toISOString(),
            weight: 72.5,
            bodyFatPercentage: 15.2,
            musclePercentage: 40.3,
            waterPercentage: 60.1,
            boneMass: 3.2,
            comment: 'neu',
          },
          connections: [expect.stringContaining('BodyStatsPage_analytics__bodyStats')],
        },
      ])
      await waitFor(() => expect(calls(GRID).length).toBeGreaterThan(gridCallsBefore))
      expect(await screen.findByText('Messung gespeichert.')).toBeInTheDocument()
      expect(calls(QUERY)).toHaveLength(1)
    })

    it('keeps the dialog and its values when saving fails', async () => {
      const { user } = page((operation) =>
        operation === ADD ? { data: null, errors: [{ message: 'boom' }] } : okQuery(),
      )
      await user.click(await screen.findByRole('button', { name: 'Messung erfassen' }))
      const dialog = await screen.findByRole('dialog')

      await user.click(within(dialog).getByRole('button', { name: 'Speichern' }))

      expect(
        await screen.findByText('Speichern fehlgeschlagen. Bitte versuche es nochmals.'),
      ).toBeInTheDocument()
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(within(screen.getByRole('dialog')).getByLabelText(/^Gewicht/)).toHaveValue('70.5')
    })

    it('sends one request when the save button is pressed twice', async () => {
      let finish: (value: unknown) => void = () => {}
      const pending = new Promise((resolve) => {
        finish = resolve
      })
      const { user, calls } = page((operation) =>
        operation === ADD ? (pending as never) : okQuery(),
      )
      await user.click(await screen.findByRole('button', { name: 'Messung erfassen' }))
      const dialog = await screen.findByRole('dialog')
      const save = within(dialog).getByRole('button', { name: 'Speichern' })

      await user.click(save)
      await user.click(save)

      expect(calls(ADD)).toHaveLength(1)
      expect(save).toBeDisabled()
      await act(async () => finish({ data: { addBodyStats: added } }))
    })
  })

})
