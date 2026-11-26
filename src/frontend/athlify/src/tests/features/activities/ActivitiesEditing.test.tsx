import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ActivitiesPage } from '../../../features/activities/ActivitiesPage'
import {
  ACTIVITIES_COLUMN_STORAGE_KEY,
  activitiesColumnIds,
} from '../../../features/activities/ActivitiesGridState'
import { mockAgGridViewport } from '../../utils/mockAgGridViewport'
import { renderWithRelay } from '../../utils/relay'

beforeEach(() => mockAgGridViewport())
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  window.localStorage.removeItem(ACTIVITIES_COLUMN_STORAGE_KEY)
})

const QUERY = 'ActivitiesPageQuery'
const GRID = 'ActivitiesTablePageQuery'
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

const rows = (nodes: Activity[]) => ({
  data: {
    activities: {
      totalCount: nodes.length,
      nodes,
      pageInfo: { hasNextPage: false, endCursor: nodes.at(-1)?.id ?? null },
    },
  },
})

const lookups = (latest: Activity | undefined = base) => ({
  data: {
    latest: { nodes: latest ? [{ id: latest.id, type: latest.type }] : [] },
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

/** Serves the lookups and the rows; `after` replaces the rows once `trigger` has been called. */
function serve(before: Activity[], after: Activity[] = before, latest?: Activity) {
  let changed = false
  return {
    trigger: () => {
      changed = true
    },
    handler: (operation: string) => {
      if (operation === QUERY) return lookups(latest ?? before[0])
      if (operation === GRID) return rows(changed ? after : before)
      return undefined
    },
  }
}

function mockWideViewport() {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query) =>
      ({
        matches: query.includes('min-width'),
        media: query,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  )
}

type Handler = Parameters<typeof renderWithRelay>[1]

const page = (handler: Handler, path = '/activities') =>
  renderWithRelay(<ActivitiesPage />, handler, { path, routePath: '/activities' })

const okQuery = serve([base, second]).handler

// `hidden`: an open modal hides the table from the accessibility tree.
const table = () => screen.getByRole('grid', { hidden: true })
const activityCell = async (date: string) => {
  return waitFor(() => {
    const time = [...table().querySelectorAll('time')].find(
      (candidate) => candidate.getAttribute('datetime') === date,
    )
    if (!time) throw new Error(`No activity date found for ${date}.`)
    const cell = time.closest('[role="gridcell"]')
    if (!(cell instanceof HTMLElement)) throw new Error(`No activity cell found for ${date}.`)
    return cell
  })
}
const rowCount = () =>
  new Set([...table().querySelectorAll('[row-index]')].map((row) => row.getAttribute('row-index')))
    .size

const findRowActionButton = (date: string, name: string) => {
  const time = [...table().querySelectorAll('time')].find((candidate) =>
    candidate.textContent?.includes(date),
  )
  if (!time) throw new Error(`No activity date found for ${date}.`)
  const row = time.closest('[row-index]')
  if (!(row instanceof HTMLElement)) throw new Error(`No activity row found for ${date}.`)
  return within(row).getByRole('button', { name })
}
const rowActionButton = (date: string, name: string) =>
  waitFor(() => findRowActionButton(date, name))
const expectRowAction = (date: string, name: string) =>
  waitFor(() => expect(findRowActionButton(date, name).isConnected).toBe(true))
const clickRowAction = (date: string, name: string) =>
  waitFor(() => fireEvent.click(findRowActionButton(date, name)))

describe('ActivitiesPage editing', () => {
  describe('row actions', () => {
    it('does not open an edit form from the row and exposes row actions as buttons', async () => {
      const { user } = page(okQuery)
      const row = await activityCell('2026-10-16T08:00:00Z')
      await user.click(row)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

      expect(screen.queryByRole('button', { name: 'Duplizieren' })).not.toBeInTheDocument()
      expect(await rowActionButton('16.10.2026', 'Aktivität anheften')).toBeInTheDocument()
      expect(await rowActionButton('16.10.2026', 'Löschen')).toBeInTheDocument()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    }, 15000)

    it('pins multiple existing rows above results and can unpin them independently', async () => {
      page(okQuery)
      await clickRowAction('16.10.2026', 'Aktivität anheften')
      await clickRowAction('14.10.2026', 'Aktivität anheften')

      await expectRowAction('16.10.2026', 'Anheftung lösen')
      await expectRowAction('14.10.2026', 'Anheftung lösen')

      await clickRowAction('16.10.2026', 'Anheftung lösen')
      await expectRowAction('14.10.2026', 'Anheftung lösen')
      await clickRowAction('14.10.2026', 'Anheftung lösen')

      await expectRowAction('16.10.2026', 'Aktivität anheften')
      await expectRowAction('14.10.2026', 'Aktivität anheften')
    })

    it('works with the keyboard alone', async () => {
      const { user } = page(okQuery)
      await waitFor(async () => {
        const dialog = screen.queryByRole('alertdialog', { name: 'Aktivität löschen?' })
        if (dialog) return dialog
        const button = findRowActionButton('16.10.2026', 'Löschen')
        expect(button.isConnected).toBe(true)
        button.focus()
        expect(button).toHaveFocus()
      })
      await user.keyboard('{Enter}')
    })
  })

  describe('inline editing', () => {
    it('reloads server-filtered rows after an edit no longer matches', async () => {
      mockWideViewport()
      window.localStorage.setItem(
        ACTIVITIES_COLUMN_STORAGE_KEY,
        JSON.stringify(
          activitiesColumnIds.map((colId) => ({ colId, hide: colId !== 'description' })),
        ),
      )
      const server = serve([base], [])
      const { user, calls, router } = page((operation) => {
        if (operation === UPDATE) {
          server.trigger()
          return { data: { updateActivity: { ...base, description: 'No longer matching' } } }
        }
        return server.handler(operation)
      }, '/activities?q=Feierabendrunde')

      await screen.findByText('Feierabendrunde')
      const descriptionCell = within(table()).getByRole('gridcell', { name: 'Feierabendrunde' })
      descriptionCell.focus()
      await user.keyboard('{Enter}')
      const editors = await screen.findAllByDisplayValue('Feierabendrunde')
      const editor = editors.at(-1)!
      await user.clear(editor)
      await user.type(editor, 'No longer matching{Enter}')

      await waitFor(() => {
        expect(calls(UPDATE)).toHaveLength(1)
        expect(calls(GRID)).toHaveLength(2)
      })
      expect(calls(UPDATE)[0]).toMatchObject({
        id: 'activity-1',
        input: {
          description: 'No longer matching',
          time: 5400,
          distance: 42.5,
          type: 'ROAD',
        },
      })
      expect(calls(GRID)[1]).toMatchObject({
        where: { description: { contains: 'Feierabendrunde' } },
      })
      expect(router.state.location.search).toBe('?q=Feierabendrunde')
      expect(await screen.findByText('Keine passenden Aktivitäten')).toBeInTheDocument()
      expect(screen.queryByText('Feierabendrunde')).not.toBeInTheDocument()
    })
  })

  describe('deleting', () => {
    it('asks first, removes the row, lowers the count and reloads the rows', async () => {
      const server = serve([base, second], [second])
      const { user, calls } = page((operation) => {
        if (operation === DELETE) {
          server.trigger()
          return { data: { deleteActivity: 'activity-1' } }
        }
        return server.handler(operation)
      })
      await clickRowAction('16.10.2026', 'Löschen')

      const confirm = await screen.findByRole('alertdialog', { name: 'Aktivität löschen?' })
      expect(confirm).toHaveTextContent(
        'Die Aktivität vom 16.10.2026 (Feierabendrunde) verschwindet aus allen Listen und Auswertungen.',
      )
      expect(confirm).not.toHaveTextContent('Merge')
      await user.click(within(confirm).getByRole('button', { name: 'Löschen' }))

      expect(await screen.findByText('Aktivität gelöscht.')).toBeInTheDocument()
      expect(calls(DELETE)).toEqual([{ id: 'activity-1' }])
      await waitFor(() => expect(rowCount()).toBe(1))
      // The row and its menu are gone; the count line takes the focus.
      await waitFor(() => expect(screen.getByText('1 Aktivität')).toHaveFocus())
      expect(calls(GRID)).toHaveLength(2)
      expect(calls(QUERY)).toHaveLength(1)
    })

    it('keeps the row when the server refuses the delete', async () => {
      const { user } = page((operation) =>
        operation === DELETE
          ? { data: { deleteActivity: null }, errors: [{ message: 'Failed' }] }
          : okQuery(operation),
      )
      await clickRowAction('16.10.2026', 'Löschen')
      const confirm = await screen.findByRole('alertdialog')
      await user.click(within(confirm).getByRole('button', { name: 'Löschen' }))

      expect(await screen.findByText(/Löschen fehlgeschlagen/)).toBeInTheDocument()
      expect(rowCount()).toBe(2)
      expect(screen.getByText('2 Aktivitäten')).toBeInTheDocument()
    })

    it('keeps the activity when cancelled', async () => {
      const { user, calls } = page(okQuery)
      await clickRowAction('16.10.2026', 'Löschen')
      const confirm = await screen.findByRole('alertdialog')

      await user.click(within(confirm).getByRole('button', { name: 'Abbrechen' }))

      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
      expect(calls(DELETE)).toHaveLength(0)
      expect(rowCount()).toBe(2)
    })

    it('warns that a merge may be dissolved and names the type when there is no description', async () => {
      page(okQuery)
      await clickRowAction('14.10.2026', 'Löschen')

      const confirm = await screen.findByRole('alertdialog')
      expect(confirm).toHaveTextContent('Die Aktivität vom 14.10.2026 (Gravel)')
      expect(confirm).toHaveTextContent(
        'Sie gehört zu einem Merge. Bleiben darin weniger als zwei Aktivitäten, wird der Merge aufgelöst.',
      )
    })

    it('shows the first-use empty state and keeps Add in the grid toolbar after the last delete', async () => {
      const server = serve([base], [])
      const { user } = page((operation) => {
        if (operation === DELETE) {
          server.trigger()
          return { data: { deleteActivity: 'activity-1' } }
        }
        return server.handler(operation)
      })
      await clickRowAction('16.10.2026', 'Löschen')
      await user.click(
        within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Löschen' }),
      )

      expect(await screen.findByRole('grid')).toBeInTheDocument()
      expect(rowCount()).toBe(0)
      expect(screen.getByRole('button', { name: 'Aktivität erfassen' })).toBeInTheDocument()
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

    const creating = (before: Activity[], after: Activity[], latest?: Activity) => {
      const server = serve(before, after, latest)
      return (operation: string) => {
        if (operation === CREATE) {
          server.trigger()
          return { data: { createActivity: created } }
        }
        return server.handler(operation)
      }
    }

    it('creates with minimal valid values and the latest type, then pins the row', async () => {
      const { user, calls } = page(creating([second, base], [created, second, base], second))
      await user.click(await screen.findByRole('button', { name: 'Aktivität erfassen' }))

      await waitFor(() => expect(calls(CREATE)).toHaveLength(1))
      expect(calls(CREATE)[0].input).toMatchObject({
        type: 'GRAVEL',
        time: 60,
        distance: 0,
        vehicleId: null,
        gadgetIds: [],
        tagIds: [],
      })
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(await rowActionButton('20.10.2026', 'Anheftung lösen')).toBeInTheDocument()
    })

    it('creates immediately, then reloads the rows, keeping filter and order', async () => {
      const { user, calls } = page(
        creating([base, second], [created, base, second]),
        '/activities?sort=-distance',
      )
      await user.click(await screen.findByRole('button', { name: 'Aktivität erfassen' }))

      await waitFor(() => expect(calls(CREATE)).toHaveLength(1))
      expect(calls(CREATE)[0].input).toMatchObject({
        type: 'ROAD',
        time: 60,
        distance: 0,
        description: 'Neue Aktivität',
        vehicleId: null,
        gadgetIds: [],
        tagIds: [],
      })
      expect(await screen.findByText('Aktivität gespeichert.')).toBeInTheDocument()
      await waitFor(() => expect(calls(GRID)).toHaveLength(2))
      expect(calls(GRID).at(-1)).toMatchObject({
        first: 20,
        order: [{ distance: 'DESC' }, { id: 'DESC' }],
      })
      await waitFor(() => expect(screen.getByText('3 Aktivitäten')).toBeInTheDocument())
      expect(await rowActionButton('20.10.2026', 'Anheftung lösen')).toBeInTheDocument()
    })

    it('says so when the active filters hide the new activity', async () => {
      const { user, calls, router } = page(
        creating([base, second], [base, second]),
        '/activities?type=GRAVEL',
      )
      await user.click(await screen.findByRole('button', { name: 'Aktivität erfassen' }))

      expect(
        await screen.findByText('Aktivität gespeichert. Die aktiven Filter blenden sie aus.'),
      ).toBeInTheDocument()
      await waitFor(() => expect(calls(GRID).length).toBeGreaterThan(1))
      expect(calls(GRID).at(-1)).toMatchObject({ where: { type: { in: ['GRAVEL'] } } })
      expect(router.state.location.search).toBe('?type=GRAVEL')
    })

    it('can add the first activity from the empty state', async () => {
      const { user, calls } = page(creating([], [created]))
      await user.click(await screen.findByRole('button', { name: 'Aktivität erfassen' }))

      await waitFor(() => expect(calls(CREATE)).toHaveLength(1))
      expect(calls(CREATE)[0].input).toMatchObject({
        type: 'ROAD',
        time: 60,
        distance: 0,
        vehicleId: null,
      })
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })
})
