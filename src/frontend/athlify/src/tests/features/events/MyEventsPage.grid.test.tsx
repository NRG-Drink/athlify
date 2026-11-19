import { screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { MyEventsPage } from '../../../features/events/MyEventsPage'
import {
  MY_EVENTS_COLUMN_STORAGE_KEY,
  MY_EVENTS_VIEWS_STORAGE_KEY,
  parseMyEventsColumnState,
  parseMyEventsSavedViews,
} from '../../../features/events/myEventsGridState'
import { renderWithRelay } from '../../utils/relay'

function mockGridViewport() {
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return []
      }
    },
  )
  class TestResizeObserver implements ResizeObserver {
    private readonly callback: ResizeObserverCallback

    constructor(callback: ResizeObserverCallback) {
      this.callback = callback
    }

    observe(target: Element) {
      const contentRect = target.getBoundingClientRect()
      const size = { inlineSize: contentRect.width, blockSize: contentRect.height }
      this.callback(
        [
          {
            target,
            contentRect,
            borderBoxSize: [size],
            contentBoxSize: [size],
            devicePixelContentBoxSize: [size],
          },
        ],
        this,
      )
    }

    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal('ResizeObserver', TestResizeObserver)
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 800,
    height: 480,
    top: 0,
    left: 0,
    bottom: 480,
    right: 800,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  })
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(480)
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(480)
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(800)
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(800)
  vi.spyOn(HTMLElement.prototype, 'offsetParent', 'get').mockReturnValue(document.body)
}

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.removeItem(MY_EVENTS_COLUMN_STORAGE_KEY)
  localStorage.removeItem(MY_EVENTS_VIEWS_STORAGE_KEY)
})

it('restores URL filters and sorting plus locally saved column visibility', async () => {
  mockGridViewport()
  localStorage.setItem(
    MY_EVENTS_COLUMN_STORAGE_KEY,
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
    <MyEventsPage />,
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
    expect(calls('MyEventsPageQuery')).toContainEqual(
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
      parseMyEventsColumnState(localStorage.getItem(MY_EVENTS_COLUMN_STORAGE_KEY)).find(
        ({ colId }) => colId === 'description',
      )?.hide,
    ).toBe(false)
  })
  expect(router.state.location.search).toContain('gridFilters=')
  expect(router.state.location.search).toContain('gridSort=')

  await user.click(screen.getByRole('button', { name: 'Ansicht speichern' }))
  await user.type(await screen.findByRole('textbox', { name: 'Name der Ansicht' }), 'Reiseansicht')
  await user.click(screen.getByRole('button', { name: 'Speichern' }))

  const savedView = parseMyEventsSavedViews(localStorage.getItem(MY_EVENTS_VIEWS_STORAGE_KEY))[0]
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
  })
  await user.click(screen.getByRole('button', { name: 'Spalten' }))
  await waitFor(() => {
    expect(screen.getByRole('checkbox', { name: 'Beschreibung' })).toBeChecked()
  })
  expect(screen.getByRole('button', { name: 'Ansicht löschen' })).toBeEnabled()
  await user.click(screen.getByRole('button', { name: 'Ansicht löschen' }))
  await waitFor(() => {
    expect(parseMyEventsSavedViews(localStorage.getItem(MY_EVENTS_VIEWS_STORAGE_KEY))).toEqual([])
  })

  await user.click(screen.getByRole('button', { name: 'Tabelle zurücksetzen' }))
  await waitFor(() => {
    expect(router.state.location.search).toBe('')
  })
  await waitFor(() => {
    expect(
      parseMyEventsColumnState(localStorage.getItem(MY_EVENTS_COLUMN_STORAGE_KEY)).find(
        ({ colId }) => colId === 'description',
      )?.hide,
    ).not.toBe(true)
  })
})
