import { act, screen, waitFor, within } from '@testing-library/react'
import i18n from 'i18next'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BodyStatsPage } from '../../../features/body-stats/BodyStatsPage'
import { renderWithRelay } from '../../utils/relay'

const QUERY = 'BodyStatsPageQuery'
const MORE = 'BodyStatsPageMoreQuery'
const ADD = 'useBodyStatsMutationsAddMutation'
const UPDATE = 'useBodyStatsMutationsUpdateMutation'
const DELETE = 'useBodyStatsMutationsDeleteMutation'

interface Entry {
  id: string
  date: string
  weight: number
  bodyFatPercentage: number
  musclePercentage: number
  waterPercentage: number
  boneMass: number
  comments: { id: string; content: string }[]
}

const entry = (
  id: string,
  date: string,
  weight: number,
  comments: Entry['comments'] = [],
): Entry => ({
  id,
  date,
  weight,
  bodyFatPercentage: 15.2,
  musclePercentage: 40.3,
  waterPercentage: 60.1,
  boneMass: 3.2,
  comments,
})

const newest = entry('bs-a', '2026-10-02T08:00:00Z', 70.5, [{ id: 'c-1', content: 'Locker' }])
const middle = entry('bs-b', '2026-10-01T08:00:00Z', 71)
const oldest = entry('bs-c', '2026-09-30T08:00:00Z', 71.2)
const longAgo = entry('bs-d', '2026-03-01T08:00:00Z', 74)

// The server order is deliberately not chronological: the page must not depend on it.
const seed = [oldest, newest, longAgo, middle]

const page = (handler: Parameters<typeof renderWithRelay>[1], path = '/body-stats') =>
  renderWithRelay(<BodyStatsPage />, handler, { path, routePath: '/body-stats' })

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
const table = () => screen.getByRole('table')
const bodyRows = () => within(table()).getAllByRole('row').slice(1)
const rowCount = () => document.querySelectorAll('tbody tr').length

beforeEach(() => {
  // Only Date is faked, so periods are deterministic while timers keep working.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 3, 12, 0))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('BodyStatsPage', () => {
  describe('overview', () => {
    it('shows the latest value of each measurement in tiles and selects weight', async () => {
      page(() => okQuery())

      const weight = await tiles().findByRole('button', { name: /Gewicht/ })

      expect(weight).toHaveAttribute('aria-pressed', 'true')
      expect(weight).toHaveTextContent('70.5')
      expect(weight).toHaveTextContent('−0.7 kg in 90 Tagen')
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

    it('keeps loading pages until the whole history is there', async () => {
      const { calls } = page((operation) =>
        operation === MORE
          ? { data: { bodyStats: connection([oldest, longAgo]) } }
          : { data: { bodyStats: connection([newest, middle], true) } },
      )

      await waitFor(() => expect(rowCount()).toBe(4))

      expect(calls(MORE)).toEqual([{ first: 200, after: 'bs-b' }])
      expect(calls(QUERY)).toHaveLength(1)
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

      expect(rowCount()).toBe(2)
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

    it('restores metric and period from the URL and ignores invalid values', async () => {
      page(() => okQuery(), '/body-stats?metric=boneMass&period=1y')
      expect(
        await screen.findByRole('img', { name: /^Knochenmasse, Letztes Jahr/ }),
      ).toBeInTheDocument()
    })

    it('falls back to the defaults for invalid URL parameters', async () => {
      page(() => okQuery(), '/body-stats?metric=nonsense&period=forever')

      expect(
        await screen.findByRole('img', { name: /^Gewicht, Letzte 90 Tage/ }),
      ).toBeInTheDocument()
    })

    it('changes the period of chart and tiles', async () => {
      const { user, router } = page(() => okQuery())
      await screen.findByRole('img', { name: /3 Messungen/ })

      await user.click(screen.getByRole('button', { name: 'Letztes Jahr' }))

      expect(
        await screen.findByRole('img', {
          name: /Letztes Jahr: von 74\.0 kg auf 70\.5 kg, 4 Messungen/,
        }),
      ).toBeInTheDocument()
      expect(tiles().getByRole('button', { name: /Gewicht/ })).toHaveTextContent(
        '−3.5 kg im letzten Jahr',
      )
      expect(router.state.location.search).toContain('period=1y')
    })

    it('says so when the period has too little data for a change', async () => {
      page(() => okQuery([newest, longAgo]), '/body-stats?period=30d')

      expect(await tiles().findByRole('button', { name: /Gewicht/ })).toHaveTextContent(
        'Zu wenig Daten im Zeitraum',
      )
    })

    it('offers the whole period when nothing was measured in the selected one', async () => {
      const { user, router } = page(() => okQuery([longAgo]), '/body-stats?period=30d')

      expect(await screen.findByText('Keine Messungen in den letzten 30 Tagen')).toBeInTheDocument()
      expect(tiles().getByRole('button', { name: /Gewicht/ })).toHaveTextContent(
        'Keine Messung im Zeitraum',
      )

      await user.click(screen.getByRole('button', { name: 'Ganzen Zeitraum anzeigen' }))

      expect(
        await screen.findByRole('img', { name: /^Gewicht, Gesamter Zeitraum/ }),
      ).toBeInTheDocument()
      expect(router.state.location.search).toContain('period=all')
    })

    it('uses the same names in tiles, table and form', async () => {
      const { user } = page(() => okQuery())
      await tiles().findByRole('button', { name: /Gewicht/ })
      const names = ['Gewicht', 'Körperfett', 'Muskelanteil', 'Wasseranteil', 'Knochenmasse']
      for (const name of names) {
        expect(tiles().getByRole('button', { name: new RegExp(name) })).toBeInTheDocument()
        expect(
          within(table()).getByRole('button', { name: new RegExp(name), hidden: true }),
        ).toBeInTheDocument()
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

      expect(await tiles().findByRole('button', { name: /Weight/ })).toHaveTextContent('in 90 days')
      expect(within(table()).getByRole('button', { name: /Weight/ })).toBeInTheDocument()
      expect(within(bodyRows()[0]).getByText(/2 Oct 2026/)).toBeInTheDocument()
    })
  })

  describe('states', () => {
    it('shows a skeleton of the page while loading', async () => {
      page(() => new Promise(() => {}))

      expect(await screen.findByRole('status')).toHaveAttribute('aria-busy', 'true')
      expect(screen.getByRole('heading', { level: 1, name: 'Body-Stats' })).toBeInTheDocument()
    })

    it('shows an empty state with the add action instead of an empty table', async () => {
      const { user } = page(() => okQuery([]))

      expect(await screen.findByText('Noch keine Messungen')).toBeInTheDocument()
      expect(screen.queryByRole('table')).not.toBeInTheDocument()

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
    const added = entry('bs-new', '2026-10-03T10:00:00Z', 72.5, [{ id: 'c-new', content: 'neu' }])

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

    it('sends a decimal comma as a number, trims the note, and shows the new row without refetching', async () => {
      const { user, calls } = page((operation) =>
        operation === ADD ? { data: { addBodyStats: added } } : okQuery(),
      )
      await screen.findByRole('table')
      expect(rowCount()).toBe(4)
      await user.click(screen.getByRole('button', { name: 'Messung erfassen' }))
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
            comments: [{ content: 'neu' }],
          },
          connections: [expect.stringContaining('BodyStatsPage_bodyStats')],
        },
      ])
      expect(rowCount()).toBe(5)
      expect(within(table()).getByText('72.5')).toBeInTheDocument()
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

  describe('editing', () => {
    const openEditor = async (user: ReturnType<typeof page>['user']) => {
      await user.click(
        await screen.findByRole('button', { name: 'Messung vom 2. Okt. 2026 bearbeiten' }),
      )
      return screen.findByRole('dialog', { name: 'Messung bearbeiten' })
    }

    it('edits through the row action with the note prefilled, and updates the row in place', async () => {
      const { user, calls } = page((operation) =>
        operation === UPDATE
          ? {
              data: {
                updateBodyStats: {
                  ...newest,
                  weight: 69,
                  comments: [{ id: 'c-1', content: 'Locker' }],
                },
              },
            }
          : okQuery(),
      )
      const dialog = await openEditor(user)
      expect(within(dialog).getByLabelText(/^Gewicht/)).toHaveValue('70.5')
      expect(within(dialog).getByRole('textbox', { name: 'Notiz' })).toHaveValue('Locker')

      const weight = within(dialog).getByLabelText(/^Gewicht/)
      await user.clear(weight)
      await user.type(weight, '69')
      await user.click(within(dialog).getByRole('button', { name: 'Speichern' }))

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(calls(UPDATE)).toHaveLength(1)
      expect(calls(UPDATE)[0]).toMatchObject({
        id: 'bs-a',
        input: { weight: 69, comments: [{ id: 'c-1', content: 'Locker' }] },
      })
      expect(await within(table()).findByText('69.0')).toBeInTheDocument()
      expect(calls(QUERY)).toHaveLength(1)
    })

    it('opens the editor by clicking a row', async () => {
      const { user } = page(() => okQuery())
      await screen.findByRole('table')
      const dateTime = within(bodyRows()[0]).getByText(/2\. Okt\. 2026/)

      expect(dateTime).toHaveTextContent(/\d{2}:\d{2}/)
      await user.click(dateTime)

      expect(await screen.findByRole('dialog', { name: 'Messung bearbeiten' })).toBeInTheDocument()
    })

    it('removes an entry that no longer exists on the server and tells the user', async () => {
      const { user } = page((operation) =>
        operation === UPDATE ? { data: { updateBodyStats: null } } : okQuery(),
      )
      const dialog = await openEditor(user)

      await user.click(within(dialog).getByRole('button', { name: 'Speichern' }))

      expect(await screen.findByText('Diese Messung existiert nicht mehr.')).toBeInTheDocument()
      await waitFor(() => expect(rowCount()).toBe(3))
    })

    it('sends the edited note with its id, and a cleared note as no note', async () => {
      const { user, calls } = page((operation) =>
        operation === UPDATE ? { data: { updateBodyStats: newest } } : okQuery(),
      )
      let dialog = await openEditor(user)

      const note = within(dialog).getByRole('textbox', { name: 'Notiz' })
      await user.clear(note)
      await user.type(note, 'Müde')
      await user.click(within(dialog).getByRole('button', { name: 'Speichern' }))
      await waitFor(() => expect(calls(UPDATE)).toHaveLength(1))
      expect(calls(UPDATE)[0]).toMatchObject({
        input: { comments: [{ id: 'c-1', content: 'Müde' }] },
      })

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      dialog = await openEditor(user)
      await user.clear(within(dialog).getByRole('textbox', { name: 'Notiz' }))
      await user.click(within(dialog).getByRole('button', { name: 'Speichern' }))
      await waitFor(() => expect(calls(UPDATE)).toHaveLength(2))
      expect(calls(UPDATE)[1]).toMatchObject({ input: { comments: [] } })
    })

    it('has no notes column and shows the add button beside the table heading', async () => {
      page(() => okQuery())
      await screen.findByRole('table')

      expect(within(table()).queryByRole('button', { name: /Notiz/ })).not.toBeInTheDocument()
      expect(screen.queryByText('Locker')).not.toBeInTheDocument()
      const heading = screen.getByRole('heading', { level: 2, name: 'Verlauf' })
      expect(
        within(heading.parentElement as HTMLElement).getByRole('button', {
          name: 'Messung erfassen',
        }),
      ).toBeInTheDocument()
    })
  })

  describe('deleting', () => {
    const openConfirm = async (user: ReturnType<typeof page>['user']) => {
      await user.click(
        await screen.findByRole('button', { name: 'Messung vom 2. Okt. 2026 löschen' }),
      )
      return screen.findByRole('alertdialog', { name: 'Messung löschen?' })
    }

    it('asks for confirmation and keeps the entry when cancelled', async () => {
      const { user, calls } = page(() => okQuery())

      const confirm = await openConfirm(user)
      expect(confirm).toHaveTextContent('Die Messung vom 2. Okt. 2026 (70.5 kg)')
      await user.click(within(confirm).getByRole('button', { name: 'Abbrechen' }))

      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
      expect(calls(DELETE)).toHaveLength(0)
      expect(rowCount()).toBe(4)
    })

    it('deletes after confirmation without refetching the list', async () => {
      const { user, calls } = page((operation) =>
        operation === DELETE ? { data: { deleteBodyStats: 'bs-a' } } : okQuery(),
      )

      const confirm = await openConfirm(user)
      await user.click(within(confirm).getByRole('button', { name: 'Löschen' }))

      await waitFor(() => expect(rowCount()).toBe(3))
      expect(calls(DELETE)).toEqual([
        { id: 'bs-a', connections: [expect.stringContaining('BodyStatsPage_bodyStats')] },
      ])
      expect(await screen.findByText('Messung gelöscht.')).toBeInTheDocument()
      expect(calls(QUERY)).toHaveLength(1)
    })

    it('treats an entry that is already gone as deleted', async () => {
      const { user } = page((operation) =>
        operation === DELETE ? { data: { deleteBodyStats: null } } : okQuery(),
      )

      const confirm = await openConfirm(user)
      await user.click(within(confirm).getByRole('button', { name: 'Löschen' }))

      await waitFor(() => expect(rowCount()).toBe(3))
    })

    it('keeps the row and shows an error when deleting fails', async () => {
      const { user } = page((operation) =>
        operation === DELETE ? { data: null, errors: [{ message: 'boom' }] } : okQuery(),
      )

      const confirm = await openConfirm(user)
      await user.click(within(confirm).getByRole('button', { name: 'Löschen' }))

      expect(
        await screen.findByText('Löschen fehlgeschlagen. Bitte versuche es nochmals.'),
      ).toBeInTheDocument()
      expect(rowCount()).toBe(4)
    })
  })
})
