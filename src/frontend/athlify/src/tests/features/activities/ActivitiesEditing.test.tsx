import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ActivitiesPage } from '../../../features/activities/ActivitiesPage'
import { renderWithRelay } from '../../utils/relay'

const QUERY = 'ActivitiesPageQuery'
const MORE = 'ActivitiesPageMoreQuery'
const CREATE = 'useActivityMutationsCreateMutation'
const UPDATE = 'useActivityMutationsUpdateMutation'
const DELETE = 'useActivityMutationsDeleteMutation'
const CREATE_TAG = 'useCreateTagMutation'

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
    gadgets: {
      nodes: [
        { __typename: 'Gadget', id: 'gadget-1', brand: 'Wahoo', model: 'Elemnt', nickname: null },
      ],
      pageInfo: { hasNextPage: false },
    },
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

// `hidden`: an open modal hides the table from the accessibility tree.
const table = () => screen.getByRole('table', { hidden: true })
const rowCount = () => within(table()).getAllByRole('row', { hidden: true }).length - 1

const openMenu = async (user: ReturnType<typeof page>['user'], date: string) => {
  await user.click(
    await screen.findByRole('button', { name: `Weitere Aktionen für die Aktivität vom ${date}` }),
  )
}

describe('ActivitiesPage editing', () => {
  describe('row actions', () => {
    it('edits through the row itself and offers duplicate and delete in a menu, delete last', async () => {
      const { user } = page(okQuery)
      const row = await screen.findByRole('row', { name: 'Aktivität vom 16. Okt. 2026 bearbeiten' })
      // No separate edit button: the row is the edit action, also by keyboard.
      expect(screen.queryByRole('button', { name: /bearbeiten$/ })).not.toBeInTheDocument()
      row.focus()
      await user.keyboard('{Enter}')
      expect(
        await screen.findByRole('dialog', { name: 'Aktivität bearbeiten' }),
      ).toBeInTheDocument()
      await user.keyboard('{Escape}')
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

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

    it('keeps the row when the server refuses the delete', async () => {
      const { user } = page((operation) =>
        operation === DELETE
          ? { data: { deleteActivity: null }, errors: [{ message: 'Failed' }] }
          : okQuery(operation),
      )
      await openMenu(user, '16. Okt. 2026')
      await user.click(await screen.findByRole('menuitem', { name: 'Löschen' }))
      const confirm = await screen.findByRole('alertdialog')
      await user.click(within(confirm).getByRole('button', { name: 'Löschen' }))

      expect(await screen.findByText(/Löschen fehlgeschlagen/)).toBeInTheDocument()
      expect(rowCount()).toBe(2)
      expect(screen.getByText('2 Aktivitäten')).toBeInTheDocument()
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
        await screen.findByRole('row', { name: 'Aktivität vom 16. Okt. 2026 bearbeiten' }),
      )
      const dialog = await screen.findByRole('dialog', { name: 'Aktivität bearbeiten' })
      expect(within(dialog).getByLabelText(/^Dauer/)).toHaveValue('1:30')
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

    it('has only "Abbrechen" to leave, and a click beside the dialog discards without asking', async () => {
      const { user, calls } = page(okQuery)
      await user.click(
        await screen.findByRole('row', { name: 'Aktivität vom 16. Okt. 2026 bearbeiten' }),
      )
      const dialog = await screen.findByRole('dialog', { name: 'Aktivität bearbeiten' })
      expect(within(dialog).getAllByRole('button', { name: 'Abbrechen' })).toHaveLength(1)
      await user.type(within(dialog).getByLabelText(/^Distanz/), '9')

      // The modal sets `pointer-events: none` around the content, which user-event refuses to click
      // through; Zag closes on the pointerdown outside the content.
      const beside = document.querySelector('[data-scope="dialog"][data-part="positioner"]')
      fireEvent.pointerDown(beside as HTMLElement)
      fireEvent.pointerUp(beside as HTMLElement)
      fireEvent.click(beside as HTMLElement)

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
      expect(calls(UPDATE)).toHaveLength(0)
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
        await screen.findByRole('row', { name: 'Aktivität vom 16. Okt. 2026 bearbeiten' }),
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
        await screen.findByRole('row', { name: 'Aktivität vom 16. Okt. 2026 bearbeiten' }),
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
        await screen.findByRole('row', { name: 'Aktivität vom 16. Okt. 2026 bearbeiten' }),
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
        await screen.findByRole('row', { name: 'Aktivität vom 16. Okt. 2026 bearbeiten' }),
      )
      await user.click(
        within(await screen.findByRole('dialog')).getByRole('button', { name: 'Speichern' }),
      )

      expect(await screen.findByText('Diese Aktivität existiert nicht mehr.')).toBeInTheDocument()
      await waitFor(() => expect(rowCount()).toBe(1))
      expect(screen.getByText('1 Aktivität')).toBeInTheDocument()
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    })

    it('keeps the row when the server rejects the change', async () => {
      const { user } = page((operation) =>
        operation === UPDATE
          ? { data: { updateActivity: null }, errors: [{ message: 'Invalid' }] }
          : okQuery(operation),
      )
      await user.click(
        await screen.findByRole('row', { name: 'Aktivität vom 16. Okt. 2026 bearbeiten' }),
      )
      await user.click(
        within(await screen.findByRole('dialog')).getByRole('button', { name: 'Speichern' }),
      )

      expect(
        await screen.findByText('Speichern fehlgeschlagen. Bitte versuche es nochmals.'),
      ).toBeInTheDocument()
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(rowCount()).toBe(2)
    })

    it('keeps the dialog and its values when saving fails', async () => {
      const { user } = page((operation) =>
        operation === UPDATE ? Promise.reject(new Error('offline')) : okQuery(operation),
      )
      await user.click(
        await screen.findByRole('row', { name: 'Aktivität vom 16. Okt. 2026 bearbeiten' }),
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
      // The server applies the filters: the reloaded list neither shows the new one nor counts it.
      const hiding = (operation: string) =>
        operation === MORE ? { data: list([base, second]) } : creating(operation)
      const { user, calls, router } = page(hiding, '/activities?type=GRAVEL')
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
      expect(within(dialog).getByLabelText(/^Dauer/)).toHaveValue('1:30')
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

  describe('detail fields', () => {
    const openDetails = async (user: ReturnType<typeof page>['user']) => {
      await user.click(
        await screen.findByRole('row', { name: 'Aktivität vom 16. Okt. 2026 bearbeiten' }),
      )
      const dialog = await screen.findByRole('dialog', { name: 'Aktivität bearbeiten' })
      await user.click(within(dialog).getByRole('button', { name: 'Weitere Details' }))
      return dialog
    }

    // Many interactions in one flow; under a full parallel run it can pass the default 5 s.
    it('sets effort with a slider, mood and wind with emoji buttons and tags as chips', async () => {
      const { user, calls } = page((operation) => {
        if (operation === CREATE_TAG)
          return { data: { createTag: { __typename: 'Tag', id: 'tag-2', name: 'Hügel' } } }
        if (operation === UPDATE) return { data: { updateActivity: base } }
        return okQuery(operation)
      })
      const dialog = await openDetails(user)

      // Without an effort the slider rests at the far left.
      const slider = within(dialog).getByRole('slider', { name: 'Anstrengung' })
      expect(slider).toHaveAttribute('aria-valuenow', '0')
      expect(slider).toHaveAttribute('aria-valuetext', 'Keine Angabe')
      slider.focus()
      await user.keyboard('{End}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}')
      expect(within(dialog).getByText('6/10 · Mittel')).toBeInTheDocument()
      expect(slider).toHaveAttribute('aria-valuetext', '6/10 · Mittel')
      // The group's emoji pops out above the thumb.
      expect(slider).toHaveTextContent('😅')

      const good = within(dialog).getByRole('button', { name: 'Gut' })
      await user.click(good)
      expect(good).toHaveAttribute('aria-pressed', 'true')
      await user.click(within(dialog).getByRole('button', { name: 'Stark' }))

      await user.click(within(dialog).getByRole('button', { name: 'Wahoo Elemnt' }))
      await user.click(within(dialog).getByRole('button', { name: 'Intervall' }))
      await user.click(within(dialog).getByRole('button', { name: 'Neuer Tag' }))
      const name = await within(dialog).findByRole('textbox', { name: 'Name des Tags' })
      await waitFor(() => expect(name).toHaveFocus())
      await user.type(name, 'Hügel{Enter}')
      expect(await screen.findByText('Tag «Hügel» erstellt.')).toBeInTheDocument()
      expect(calls(CREATE_TAG)).toEqual([{ input: { name: 'Hügel' } }])
      expect(within(dialog).getByRole('button', { name: 'Hügel' })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
      await waitFor(() =>
        expect(
          within(dialog).queryByRole('textbox', { name: 'Name des Tags' }),
        ).not.toBeInTheDocument(),
      )
      // Enter created the tag, it did not save the activity.
      expect(calls(UPDATE)).toHaveLength(0)

      await user.click(within(dialog).getByRole('button', { name: 'Speichern' }))
      await waitFor(() => expect(calls(UPDATE)).toHaveLength(1))
      expect(calls(UPDATE)[0]).toMatchObject({
        input: {
          effort: 6,
          mood: 'GOOD',
          wind: 'STRONG',
          gadgetIds: ['gadget-1'],
          tagIds: ['tag-1', 'tag-2'],
        },
      })
    }, 15_000)

    it('clears the effort at the far left and a choice when it is pressed again', async () => {
      const { user, calls } = page((operation) =>
        operation === UPDATE ? { data: { updateActivity: base } } : okQuery(operation),
      )
      const dialog = await openDetails(user)
      const slider = within(dialog).getByRole('slider', { name: 'Anstrengung' })
      slider.focus()
      await user.keyboard('{ArrowRight}{ArrowRight}{Home}')
      expect(slider).toHaveAttribute('aria-valuetext', 'Keine Angabe')

      const calm = within(dialog).getByRole('button', { name: 'Windstill' })
      await user.click(calm)
      await user.click(calm)
      expect(calm).toHaveAttribute('aria-pressed', 'false')

      await user.click(within(dialog).getByRole('button', { name: 'Speichern' }))
      await waitFor(() => expect(calls(UPDATE)).toHaveLength(1))
      expect(calls(UPDATE)[0]).toMatchObject({ input: { effort: null, wind: null } })
    })

    it('tells how many details are filled while they are folded', async () => {
      const { user } = page(okQuery)
      await user.click(
        await screen.findByRole('row', { name: 'Aktivität vom 14. Okt. 2026 bearbeiten' }),
      )
      const dialog = await screen.findByRole('dialog', { name: 'Aktivität bearbeiten' })
      const trigger = within(dialog).getByRole('button', { name: 'Weitere Details' })
      expect(trigger).toHaveAttribute('aria-expanded', 'true')

      await user.click(trigger)
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
      expect(trigger).toHaveTextContent('Weitere Details· 1 Angabe')
    })

    it('says so when there are no gadgets yet', async () => {
      const { user } = page((operation) => {
        const result = okQuery(operation)
        return (
          result && {
            data: { ...result.data, gadgets: { nodes: [], pageInfo: { hasNextPage: false } } },
          }
        )
      })
      const dialog = await openDetails(user)
      expect(within(dialog).getByText('Noch keine Gadgets erfasst.')).toBeInTheDocument()
    })

    it('ticks an existing tag instead of creating it again', async () => {
      const { user, calls } = page(okQuery)
      const dialog = await openDetails(user)
      await user.click(within(dialog).getByRole('button', { name: 'Neuer Tag' }))
      await user.type(
        await within(dialog).findByRole('textbox', { name: 'Name des Tags' }),
        'intervall',
      )
      await user.click(within(dialog).getByRole('button', { name: 'Erstellen' }))

      expect(within(dialog).getByRole('button', { name: 'Intervall' })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
      expect(calls(CREATE_TAG)).toHaveLength(0)
    })
  })
})
