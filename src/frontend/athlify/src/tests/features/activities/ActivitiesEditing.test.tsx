import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ActivitiesPage } from '../../../features/activities/ActivitiesPage'
import { renderWithRelay } from '../../utils/relay'

const QUERY = 'ActivitiesPageQuery'
const MORE = 'ActivitiesPageMoreQuery'
const CREATE = 'useActivityMutationsCreateMutation'
const UPDATE = 'useActivityMutationsUpdateMutation'
const DELETE = 'useActivityMutationsDeleteMutation'

type Activity = Record<string, unknown> & { id: string }

const base: Activity = {
  __typename: 'Activity',
  id: 'activity-1',
  date: '2026-10-16T08:00:00Z',
  type: 'ROAD',
  time: 5400,
  distance: 42.5,
  averageSpeed: 28.3,
  elevationGain: null,
  tss: null,
  description: 'Feierabendrunde',
  heartRateMin: null,
  heartRateMax: null,
  heartRateAverage: null,
  mood: null,
  effort: null,
  wind: null,
  source: 'MANUAL',
  merge: null,
  vehicle: null,
  gadgets: [],
  tags: [],
}

const canyon = {
  __typename: 'Vehicle',
  id: 'vehicle-1',
  brand: 'Canyon',
  model: 'Grail',
  nickname: null,
}

const second: Activity = {
  ...base,
  id: 'activity-2',
  date: '2026-10-14T08:00:00Z',
  type: 'GRAVEL',
  description: null,
  heartRateAverage: 142,
  vehicle: canyon,
  merge: { __typename: 'ActivityMerge', id: 'merge-1' },
}

const list = (nodes: Activity[], latest: Activity | undefined = nodes[0]) => ({
  activities: {
    totalCount: nodes.length,
    edges: nodes.map((node) => ({ cursor: node.id, node })),
    pageInfo: { hasNextPage: false, endCursor: nodes.at(-1)?.id ?? null },
  },
  latest: { nodes: latest ? [{ id: latest.id, type: latest.type, vehicle: latest.vehicle }] : [] },
})

const query = (nodes: Activity[]) => ({
  data: {
    ...list(nodes),
    vehicles: { nodes: [canyon], pageInfo: { hasNextPage: false } },
    gadgets: { nodes: [], pageInfo: { hasNextPage: false } },
    tags: {
      nodes: [{ __typename: 'Tag', id: 'tag-1', name: 'Intervall' }],
      pageInfo: { hasNextPage: false },
    },
  },
})

type Handler = Parameters<typeof renderWithRelay>[1]

const page = (handler: Handler, path = '/activities') =>
  renderWithRelay(<ActivitiesPage />, handler, { path, routePath: '/activities' })

const okQuery = (operation: string) => (operation === QUERY ? query([base, second]) : undefined)

const table = () => screen.getByRole('table')
const rowCount = () => within(table()).getAllByRole('row').length - 1

const openMenu = async (user: ReturnType<typeof page>['user'], date: string) => {
  await user.click(
    await screen.findByRole('button', { name: `Weitere Aktionen für die Aktivität vom ${date}` }),
  )
}

describe('ActivitiesPage editing', () => {
  describe('row actions', () => {
    it('offers edit directly and duplicate and delete in a menu, delete last', async () => {
      const { user } = page(okQuery)
      expect(
        await screen.findByRole('button', { name: 'Aktivität vom 16. Okt. 2026 bearbeiten' }),
      ).toBeInTheDocument()

      await openMenu(user, '16. Okt. 2026')
      const items = await screen.findAllByRole('menuitem')
      expect(items.map((item) => item.textContent)).toEqual(['Duplizieren', 'Löschen'])
      // The menu belongs to its button: opening it does not open the row's edit form.
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('works with the keyboard alone', async () => {
      const { user } = page(okQuery)
      const trigger = await screen.findByRole('button', {
        name: 'Weitere Aktionen für die Aktivität vom 16. Okt. 2026',
      })
      trigger.focus()
      await user.keyboard('{Enter}')
      await screen.findAllByRole('menuitem')
      await user.keyboard('{End}{Enter}')

      expect(
        await screen.findByRole('alertdialog', { name: 'Aktivität löschen?' }),
      ).toBeInTheDocument()
    })
  })

  describe('deleting', () => {
    it('asks first, removes the row, lowers the count and does not reload the list', async () => {
      const { user, calls } = page((operation) =>
        operation === DELETE ? { data: { deleteActivity: 'activity-1' } } : okQuery(operation),
      )
      await openMenu(user, '16. Okt. 2026')
      await user.click(await screen.findByRole('menuitem', { name: 'Löschen' }))

      const confirm = await screen.findByRole('alertdialog', { name: 'Aktivität löschen?' })
      expect(confirm).toHaveTextContent(
        'Die Aktivität vom 16. Okt. 2026 (Feierabendrunde) verschwindet aus allen Listen und Auswertungen.',
      )
      expect(confirm).not.toHaveTextContent('Merge')
      await user.click(within(confirm).getByRole('button', { name: 'Löschen' }))

      expect(await screen.findByText('Aktivität gelöscht.')).toBeInTheDocument()
      expect(calls(DELETE)).toEqual([{ id: 'activity-1' }])
      await waitFor(() => expect(rowCount()).toBe(1))
      // The row and its menu are gone; the count line takes the focus.
      await waitFor(() => expect(screen.getByText('1 Aktivität')).toHaveFocus())
      expect(calls(MORE)).toHaveLength(0)
      expect(calls(QUERY)).toHaveLength(1)
    })

    it('keeps the activity when cancelled', async () => {
      const { user, calls } = page(okQuery)
      await openMenu(user, '16. Okt. 2026')
      await user.click(await screen.findByRole('menuitem', { name: 'Löschen' }))
      const confirm = await screen.findByRole('alertdialog')

      await user.click(within(confirm).getByRole('button', { name: 'Abbrechen' }))

      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
      expect(calls(DELETE)).toHaveLength(0)
      expect(rowCount()).toBe(2)
    })

    it('warns that a merge may be dissolved and names the type when there is no description', async () => {
      const { user } = page(okQuery)
      await openMenu(user, '14. Okt. 2026')
      await user.click(await screen.findByRole('menuitem', { name: 'Löschen' }))

      const confirm = await screen.findByRole('alertdialog')
      expect(confirm).toHaveTextContent('Die Aktivität vom 14. Okt. 2026 (Gravel)')
      expect(confirm).toHaveTextContent(
        'Sie gehört zu einem Merge. Bleiben darin weniger als zwei Aktivitäten, wird der Merge aufgelöst.',
      )
    })

    it('shows the first-use empty state with the add action after the last activity is deleted', async () => {
      const { user } = page((operation) =>
        operation === DELETE
          ? { data: { deleteActivity: 'activity-1' } }
          : operation === QUERY
            ? query([base])
            : undefined,
      )
      await openMenu(user, '16. Okt. 2026')
      await user.click(await screen.findByRole('menuitem', { name: 'Löschen' }))
      await user.click(
        within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Löschen' }),
      )

      expect(await screen.findByText('Noch keine Aktivitäten')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Erste Aktivität erfassen' })).toBeInTheDocument()
    })
  })

  describe('editing', () => {
    it('edits through the pencil with the values prefilled and updates the row in place', async () => {
      const { user, calls } = page((operation) =>
        operation === UPDATE
          ? { data: { updateActivity: { ...base, distance: 50 } } }
          : okQuery(operation),
      )
      await user.click(
        await screen.findByRole('button', { name: 'Aktivität vom 16. Okt. 2026 bearbeiten' }),
      )
      const dialog = await screen.findByRole('dialog', { name: 'Aktivität bearbeiten' })
      expect(within(dialog).getByLabelText(/^Dauer/)).toHaveValue('1:30:00')
      const distance = within(dialog).getByLabelText(/^Distanz/)
      expect(distance).toHaveValue('42.5')

      await user.clear(distance)
      await user.type(distance, '50')
      await user.click(within(dialog).getByRole('button', { name: 'Speichern' }))

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(calls(UPDATE)[0]).toMatchObject({
        id: 'activity-1',
        input: { distance: 50, time: 5400, type: 'ROAD', description: 'Feierabendrunde' },
      })
      expect(await within(table()).findByText('50.0')).toBeInTheDocument()
      expect(await screen.findByText('Aktivität aktualisiert.')).toBeInTheDocument()
      expect(calls(MORE)).toHaveLength(0)
    })

    it('opens the editor by clicking a row, with the details open when they hold a value', async () => {
      const { user } = page(okQuery)
      await screen.findByRole('table')
      await user.click(within(table()).getByText('14. Okt. 2026'))

      const dialog = await screen.findByRole('dialog', { name: 'Aktivität bearbeiten' })
      expect(within(dialog).getByRole('button', { name: 'Weitere Details' })).toHaveAttribute(
        'aria-expanded',
        'true',
      )
      expect(within(dialog).getByLabelText(/^Ø/)).toHaveValue('142')
      expect(within(dialog).getByLabelText(/^Velo/)).toHaveValue('vehicle-1')
    })

    it('shows calculated values read-only, marked with *, and "—" when missing', async () => {
      const { user } = page(okQuery)
      await user.click(
        await screen.findByRole('button', { name: 'Aktivität vom 16. Okt. 2026 bearbeiten' }),
      )
      const dialog = await screen.findByRole('dialog')

      expect(within(dialog).getByText('Ø Geschwindigkeit*')).toBeInTheDocument()
      expect(within(dialog).getByText('28.3 km/h')).toBeInTheDocument()
      expect(within(dialog).getByText('TSS*').nextElementSibling).toHaveTextContent('—')
      expect(within(dialog).getByText('Manuell')).toBeInTheDocument()
      expect(within(dialog).getByText('* Wird automatisch berechnet.')).toBeInTheDocument()
      expect(within(dialog).queryByRole('textbox', { name: /Geschwindigkeit|TSS/ })).toBeNull()
    })

    it('blocks saving with errors under the fields and sends nothing', async () => {
      const { user, calls } = page(okQuery)
      await user.click(
        await screen.findByRole('button', { name: 'Aktivität vom 16. Okt. 2026 bearbeiten' }),
      )
      const dialog = await screen.findByRole('dialog')
      await user.clear(within(dialog).getByLabelText(/^Dauer/))
      await user.type(within(dialog).getByLabelText(/^Distanz/), 'x')
      await user.click(within(dialog).getByRole('button', { name: 'Speichern' }))

      expect(await within(dialog).findByText('Pflichtfeld.')).toBeInTheDocument()
      expect(within(dialog).getByText('Bitte eine Zahl eingeben.')).toBeInTheDocument()
      expect(calls(UPDATE)).toHaveLength(0)
    })

    it('opens the details when an error is inside them', async () => {
      const { user } = page(okQuery)
      await user.click(
        await screen.findByRole('button', { name: 'Aktivität vom 16. Okt. 2026 bearbeiten' }),
      )
      const dialog = await screen.findByRole('dialog')
      const details = within(dialog).getByRole('button', { name: 'Weitere Details' })
      expect(details).toHaveAttribute('aria-expanded', 'false')
      await user.click(details)
      await user.type(within(dialog).getByLabelText(/^Min/), '300')
      await user.click(details)
      await user.click(within(dialog).getByRole('button', { name: 'Speichern' }))

      await waitFor(() => expect(details).toHaveAttribute('aria-expanded', 'true'))
      expect(
        within(dialog).getByText('Bitte einen Wert zwischen 20 und 250 eingeben.'),
      ).toBeInTheDocument()
    })

    it('removes an activity that no longer exists on the server and tells the user', async () => {
      const { user } = page((operation) =>
        operation === UPDATE ? { data: { updateActivity: null } } : okQuery(operation),
      )
      await user.click(
        await screen.findByRole('button', { name: 'Aktivität vom 16. Okt. 2026 bearbeiten' }),
      )
      await user.click(
        within(await screen.findByRole('dialog')).getByRole('button', { name: 'Speichern' }),
      )

      expect(await screen.findByText('Diese Aktivität existiert nicht mehr.')).toBeInTheDocument()
      await waitFor(() => expect(rowCount()).toBe(1))
      expect(screen.getByText('1 Aktivität')).toBeInTheDocument()
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    })

    it('keeps the dialog and its values when saving fails', async () => {
      const { user } = page((operation) =>
        operation === UPDATE ? Promise.reject(new Error('offline')) : okQuery(operation),
      )
      await user.click(
        await screen.findByRole('button', { name: 'Aktivität vom 16. Okt. 2026 bearbeiten' }),
      )
      const dialog = await screen.findByRole('dialog')
      const distance = within(dialog).getByLabelText(/^Distanz/)
      await user.clear(distance)
      await user.type(distance, '77')
      await user.click(within(dialog).getByRole('button', { name: 'Speichern' }))

      expect(
        await screen.findByText('Speichern fehlgeschlagen. Bitte versuche es nochmals.'),
      ).toBeInTheDocument()
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(within(screen.getByRole('dialog')).getByLabelText(/^Distanz/)).toHaveValue('77')
    })
  })

  describe('creating', () => {
    const created: Activity = {
      ...base,
      id: 'activity-3',
      date: '2026-10-20T06:00:00Z',
      type: 'GRAVEL',
      time: 3600,
      distance: 30,
      description: null,
      vehicle: canyon,
    }

    const creating = (operation: string) => {
      if (operation === CREATE) return { data: { createActivity: created } }
      if (operation === MORE) return { data: list([created, base, second]) }
      return okQuery(operation)
    }

    const fillRequired = async (user: ReturnType<typeof page>['user'], dialog: HTMLElement) => {
      await user.type(within(dialog).getByLabelText(/^Dauer/), '1.00')
      await user.type(within(dialog).getByLabelText(/^Distanz/), '30')
      await user.click(within(dialog).getByRole('button', { name: 'Speichern' }))
    }

    it('starts with type and bicycle of the latest activity', async () => {
      const latestFirst = (operation: string) =>
        operation === QUERY ? query([second, base]) : undefined
      const { user } = page(latestFirst)
      await user.click(await screen.findByRole('button', { name: 'Aktivität erfassen' }))

      const dialog = await screen.findByRole('dialog', { name: 'Neue Aktivität' })
      expect(within(dialog).getByLabelText(/^Typ/)).toHaveValue('GRAVEL')
      expect(within(dialog).getByLabelText(/^Velo/)).toHaveValue('vehicle-1')
      expect(within(dialog).getByLabelText(/^Dauer/)).toHaveValue('')
      expect(within(dialog).getByRole('button', { name: 'Weitere Details' })).toHaveAttribute(
        'aria-expanded',
        'false',
      )
      expect(within(dialog).queryByText('Berechnet')).not.toBeInTheDocument()
    })

    it('saves, then reloads the list as far as it was loaded, keeping filter and order', async () => {
      const { user, calls } = page(creating, '/activities?sort=-distance')
      await user.click(await screen.findByRole('button', { name: 'Aktivität erfassen' }))
      const dialog = await screen.findByRole('dialog')
      await fillRequired(user, dialog)

      await waitFor(() => expect(calls(CREATE)).toHaveLength(1))
      expect(calls(CREATE)[0].input).toMatchObject({
        type: 'ROAD',
        time: 3600,
        distance: 30,
        vehicleId: null,
        gadgetIds: [],
        tagIds: [],
      })
      expect(await screen.findByText('Aktivität gespeichert.')).toBeInTheDocument()
      await waitFor(() => expect(calls(MORE)).toHaveLength(1))
      expect(calls(MORE)[0]).toMatchObject({
        first: 50,
        order: [{ distance: 'DESC' }, { id: 'DESC' }],
      })
      await waitFor(() => expect(rowCount()).toBe(3))
      expect(screen.getByText('3 Aktivitäten')).toBeInTheDocument()
    })

    it('says so when the active filters hide the new activity', async () => {
      const { user, calls, router } = page(creating, '/activities?type=GRAVEL')
      await user.click(await screen.findByRole('button', { name: 'Aktivität erfassen' }))
      const dialog = await screen.findByRole('dialog')
      await user.selectOptions(within(dialog).getByLabelText(/^Typ/), 'INDOOR')
      await fillRequired(user, dialog)

      expect(
        await screen.findByText('Aktivität gespeichert. Die aktiven Filter blenden sie aus.'),
      ).toBeInTheDocument()
      await waitFor(() => expect(calls(MORE)).toHaveLength(1))
      expect(calls(MORE)[0]).toMatchObject({ where: { type: { in: ['GRAVEL'] } } })
      expect(router.state.location.search).toBe('?type=GRAVEL')
    })

    it('can add the first activity from the empty state', async () => {
      const { user } = page((operation) => (operation === QUERY ? query([]) : undefined))
      await user.click(await screen.findByRole('button', { name: 'Erste Aktivität erfassen' }))

      const dialog = await screen.findByRole('dialog', { name: 'Neue Aktivität' })
      expect(within(dialog).getByLabelText(/^Typ/)).toHaveValue('ROAD')
      expect(within(dialog).getByLabelText(/^Velo/)).toHaveValue('')
    })
  })

  describe('duplicating', () => {
    it('opens a new activity with the values of the row and the current date', async () => {
      const { user, calls } = page((operation) =>
        operation === CREATE
          ? { data: { createActivity: { ...second, id: 'activity-3' } } }
          : operation === MORE
            ? { data: list([base, second]) }
            : okQuery(operation),
      )
      await openMenu(user, '14. Okt. 2026')
      await user.click(await screen.findByRole('menuitem', { name: 'Duplizieren' }))

      const dialog = await screen.findByRole('dialog', { name: 'Aktivität duplizieren' })
      expect(within(dialog).getByLabelText(/^Typ/)).toHaveValue('GRAVEL')
      expect(within(dialog).getByLabelText(/^Dauer/)).toHaveValue('1:30:00')
      const date = within(dialog).getByLabelText(/^Datum/) as HTMLInputElement
      expect(new Date(date.value).toDateString()).toBe(new Date().toDateString())

      await user.click(within(dialog).getByRole('button', { name: 'Speichern' }))
      await waitFor(() => expect(calls(CREATE)).toHaveLength(1))
      expect(calls(CREATE)[0].input).toMatchObject({
        type: 'GRAVEL',
        heartRateAverage: 142,
        vehicleId: 'vehicle-1',
      })
      expect(calls(UPDATE)).toHaveLength(0)
    })
  })
})
