import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BodyStatsPage } from '../../../features/body-stats/BodyStatsPage'
import { dayEndIso, dayStartIso } from '../../../features/body-stats/BodyStatsGridQuery'
import {
  BODY_STATS_COLUMN_STORAGE_KEY,
  BODY_STATS_VIEWS_STORAGE_KEY,
  parseBodyStatsColumnState,
  parseBodyStatsSavedViews,
} from '../../../features/body-stats/BodyStatsGridState'
import { formatDateTime } from '../../../lib/dates'
import { mockGridViewport } from '../../utils/gridViewport'
import { renderWithRelay } from '../../utils/relay'

const GRID = 'BodyStatsGridPageQuery'
const UPDATE = 'useBodyStatsMutationsUpdateMutation'
const DELETE = 'useBodyStatsMutationsDeleteMutation'

const entry = (id: string, date: string, weight: number, comment: string | null = null) => ({
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
const older = entry('bs-b', '2026-10-01T08:00:00Z', 71)

const connection = (entries: ReturnType<typeof entry>[]) => ({
  edges: entries.map((node) => ({ cursor: node.id, node })),
  pageInfo: { hasNextPage: false, endCursor: null, hasPreviousPage: false, startCursor: null },
})

const gridPage = (nodes: ReturnType<typeof entry>[]) => ({
  data: {
    bodyStats: {
      totalCount: nodes.length,
      nodes,
      pageInfo: { endCursor: null, hasNextPage: false },
    },
  },
})

type Handler = (operation: string, variables: unknown) => unknown

const page = (handler: Handler = () => undefined, path = '/body-stats', rows = [newest, older]) =>
  renderWithRelay(
    <BodyStatsPage />,
    (operation, variables) => {
      if (operation === GRID) return gridPage(rows)
      if (operation === 'BodyStatsPageQuery') return { data: { bodyStats: connection(rows) } }
      return handler(operation, variables)
    },
    { path, routePath: '/body-stats' },
  )

const waitForRows = () => screen.findByText(formatDateTime(new Date(newest.date)))

const weightCell = async () => {
  await waitForRows()
  return document.querySelector('[role="gridcell"][col-id="weight"]') as HTMLElement
}

beforeEach(() => {
  mockGridViewport()
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1800)
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(1800)
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 1800,
    height: 480,
    top: 0,
    left: 0,
    bottom: 480,
    right: 1800,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  localStorage.removeItem(BODY_STATS_COLUMN_STORAGE_KEY)
  localStorage.removeItem(BODY_STATS_VIEWS_STORAGE_KEY)
})

describe('BodyStatsPage grid', () => {
  it('shows the measurements newest first and asks the server for that order', async () => {
    const { calls } = page()

    expect(await screen.findByText(formatDateTime(new Date(newest.date)))).toBeInTheDocument()
    expect(screen.getByText(formatDateTime(new Date(older.date)))).toBeInTheDocument()
    expect(calls(GRID)[0]).toMatchObject({ order: [{ date: 'DESC' }, { id: 'DESC' }], where: null })
    expect(await screen.findByText('2 Messungen')).toBeInTheDocument()
  })

  it('restores URL filters and sorting, and keeps them apart from the chart range', async () => {
    const query = new URLSearchParams({
      q: 'easy',
      tableFrom: '2026-01-01',
      from: '2026-02-01',
      gridFilters: JSON.stringify({ weight: { filter: 70, type: 'greaterThan' } }),
      gridSort: JSON.stringify([{ colId: 'weight', sort: 'desc' }]),
    })
    const { calls } = page(undefined, `/body-stats?${query.toString()}`)

    await waitFor(() => {
      expect(calls(GRID)).toContainEqual(
        expect.objectContaining({
          order: [{ weight: 'DESC' }, { id: 'DESC' }],
          where: {
            and: [
              {
                and: [
                  { date: { gte: dayStartIso('2026-01-01') } },
                  { comment: { contains: 'easy' } },
                ],
              },
              { weight: { gt: 70 } },
            ],
          },
        }),
      )
    })
  })

  it('applies the to-date as the end of that day', async () => {
    const { calls } = page(undefined, '/body-stats?tableTo=2026-10-01')

    await waitFor(() => {
      expect(calls(GRID)).toContainEqual(
        expect.objectContaining({ where: { date: { lte: dayEndIso('2026-10-01') } } }),
      )
    })
  })

  it('saves, applies and deletes a view, and persists column visibility', async () => {
    const { user, router } = page(undefined, '/body-stats?q=easy')
    await waitForRows()

    await user.click(screen.getByRole('button', { name: 'Spalten' }))
    const noteColumn = await screen.findByRole('checkbox', { name: 'Notiz' })
    expect(noteColumn).toBeChecked()
    await user.click(noteColumn)
    await waitFor(() => {
      expect(
        parseBodyStatsColumnState(localStorage.getItem(BODY_STATS_COLUMN_STORAGE_KEY)).find(
          ({ colId }) => colId === 'comment',
        )?.hide,
      ).toBe(true)
    })

    await user.click(screen.getByRole('button', { name: 'Aktuelle Ansicht speichern' }))
    await user.type(await screen.findByRole('textbox', { name: 'Name der Ansicht' }), 'Locker')
    await user.click(screen.getByRole('button', { name: 'Ansicht speichern' }))

    const saved = parseBodyStatsSavedViews(localStorage.getItem(BODY_STATS_VIEWS_STORAGE_KEY))
    expect(saved).toHaveLength(1)
    expect(saved[0]).toMatchObject({ name: 'Locker', filters: { quick: 'easy' } })
    expect(saved[0]?.columns.find(({ colId }) => colId === 'comment')?.hide).toBe(true)

    await user.clear(screen.getByRole('textbox', { name: 'Notizen durchsuchen' }))
    await user.type(screen.getByRole('textbox', { name: 'Notizen durchsuchen' }), 'hard')
    await waitFor(() => {
      expect(new URLSearchParams(router.state.location.search).get('q')).toBe('hard')
    })

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Gespeicherte Ansicht auswählen' }),
      saved[0]!.id,
    )
    await waitFor(() => {
      expect(new URLSearchParams(router.state.location.search).get('q')).toBe('easy')
      expect(screen.getByRole('button', { name: 'Ansicht löschen' })).toBeEnabled()
    })

    await user.click(screen.getByRole('button', { name: 'Ansicht löschen' }))
    await waitFor(() => {
      expect(parseBodyStatsSavedViews(localStorage.getItem(BODY_STATS_VIEWS_STORAGE_KEY))).toEqual(
        [],
      )
    })
  }, 30000)

  it('resets filters, sorting and column preferences', async () => {
    const { user, router } = page(undefined, '/body-stats?q=easy&tableFrom=2026-01-01')
    await waitForRows()

    await user.click(screen.getByRole('button', { name: 'Tabelle zurücksetzen' }))

    await waitFor(() => {
      const params = new URLSearchParams(router.state.location.search)
      expect(params.get('q')).toBeNull()
      expect(params.get('tableFrom')).toBeNull()
    })
  })

  it('sets the from-date to the start of the year', async () => {
    const { user, router } = page()
    await waitForRows()

    await user.click(screen.getByRole('button', { name: 'Seit Jahresbeginn' }))

    await waitFor(() => {
      expect(new URLSearchParams(router.state.location.search).get('tableFrom')).toBe(
        `${new Date().getFullYear()}-01-01`,
      )
    })
  })

  it('saves an edited cell and reloads the rows', async () => {
    const { user, calls } = page((operation) =>
      operation === UPDATE
        ? { data: { updateBodyStats: { ...newest, weight: 69.5 } } }
        : undefined,
    )

    await user.dblClick(await weightCell())
    const editor = await screen.findByDisplayValue('70.5')
    await user.clear(editor)
    await user.type(editor, '69,5{Enter}')

    await waitFor(() => expect(calls(UPDATE)).toHaveLength(1))
    expect(calls(UPDATE)[0]).toMatchObject({
      id: 'bs-a',
      input: { weight: 69.5, comment: 'Locker', boneMass: 3.2 },
    })
    expect(await screen.findByText('Messung aktualisiert.')).toBeInTheDocument()
    await waitFor(() => expect(calls(GRID).length).toBeGreaterThan(1))
  }, 20000)

  it('rejects an invalid edit without a request and restores the value', async () => {
    const { user, calls } = page()

    await user.dblClick(await weightCell())
    const editor = await screen.findByDisplayValue('70.5')
    await user.clear(editor)
    await user.type(editor, '0{Enter}')

    expect(await screen.findByText('Bitte einen Wert grösser als 0 eingeben.')).toBeInTheDocument()
    expect(calls(UPDATE)).toHaveLength(0)
    await waitFor(() => expect(document.querySelector('[role="gridcell"][col-id="weight"]')).toHaveTextContent('70.5'))
  }, 20000)

  it('keeps the old value when the server rejects an edit', async () => {
    const { user, calls } = page((operation) =>
      operation === UPDATE ? { data: null, errors: [{ message: 'boom' }] } : undefined,
    )

    await user.dblClick(await weightCell())
    const editor = await screen.findByDisplayValue('70.5')
    await user.clear(editor)
    await user.type(editor, '69{Enter}')

    expect(
      await screen.findByText('Speichern fehlgeschlagen. Bitte versuche es nochmals.'),
    ).toBeInTheDocument()
    expect(calls(UPDATE)).toHaveLength(1)
    await waitFor(() => expect(document.querySelector('[role="gridcell"][col-id="weight"]')).toHaveTextContent('70.5'))
  }, 20000)

  it('asks before deleting, then deletes and reloads the rows', async () => {
    const { user, calls } = page((operation) =>
      operation === DELETE ? { data: { deleteBodyStats: 'bs-a' } } : undefined,
    )
    await waitForRows()

    await user.click(screen.getAllByRole('button', { name: 'Messung löschen' })[0]!)
    const confirm = await screen.findByRole('alertdialog', { name: 'Messung löschen?' })
    expect(confirm).toHaveTextContent('70.5')
    await user.click(within(confirm).getByRole('button', { name: 'Abbrechen' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(calls(DELETE)).toHaveLength(0)

    await user.click(screen.getAllByRole('button', { name: 'Messung löschen' })[0]!)
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Löschen' }),
    )

    await waitFor(() => expect(calls(DELETE)).toEqual([{ id: 'bs-a' }]))
    expect(await screen.findByText('Messung gelöscht.')).toBeInTheDocument()
    await waitFor(() => expect(calls(GRID).length).toBeGreaterThan(1))
  }, 20000)

  it('pins a row to the top and unpins it again', async () => {
    const { user } = page()
    await waitForRows()

    await user.click(screen.getAllByRole('button', { name: 'Messung anheften' })[1]!)

    const unpin = await screen.findAllByRole('button', { name: 'Anheftung lösen' })
    expect(unpin[0]).toHaveAttribute('aria-pressed', 'true')
    await user.click(unpin[0]!)
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Anheftung lösen' })).not.toBeInTheDocument()
    })
  }, 20000)
})
