import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TanStackEventsPage } from '../../../features/events/TanStackEventsPage'
import { paths } from '../../../navigation/paths'
import { renderWithRelay } from '../../utils/relay'

const crashEvent = {
  __typename: 'Event',
  id: 'event-1',
  name: 'Sturz beim Rennen',
  type: 'CRASH',
  description: 'Sturz in einer Kurve',
  startDate: '2026-10-10',
  endDate: null,
  tags: [{ id: 'tag-1', name: 'Rennen' }],
}

const repairEvent = {
  ...crashEvent,
  id: 'event-2',
  name: 'Werkstatttermin',
  type: 'REPAIR',
  description: 'Bremsen kontrollieren',
  startDate: '2026-10-11',
  tags: [],
}

const laterEvent = {
  ...repairEvent,
  id: 'event-3',
  name: 'Trainingstag',
  startDate: '2026-10-12',
}

const manyEvents = Array.from({ length: 120 }, (_, index) => ({
  ...crashEvent,
  id: `event-${index + 1}`,
  name: `Event ${String(index + 1).padStart(2, '0')}`,
  startDate: new Date(Date.UTC(2026, 0, index + 1)).toISOString().slice(0, 10),
}))

const response = (
  nodes = [crashEvent, repairEvent],
  { totalCount = nodes.length, hasNextPage = false } = {},
) => ({
  data: {
    events: {
      totalCount,
      edges: nodes.map((node) => ({ cursor: node.id, node })),
      pageInfo: {
        hasNextPage,
        endCursor: nodes.at(-1)?.id ?? null,
      },
    },
  },
})

describe('TanStackEventsPage', () => {
  beforeEach(() => {
    localStorage.removeItem('athlify.events.tanstack.columnWidths')
  })

  it('loads the complete cursor connection before enabling local table operations', async () => {
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(function (
      this: HTMLElement,
    ) {
      return this.tagName === 'SECTION' ? 600 : 0
    })
    const { calls } = renderWithRelay(
      <TanStackEventsPage />,
      (operation) =>
        operation === 'TanStackEventsPageMoreQuery'
          ? response([repairEvent])
          : response([crashEvent], { totalCount: 2, hasNextPage: true }),
      { path: paths.events, routePath: paths.events },
    )

    expect(await screen.findByText('Werkstatttermin')).toBeInTheDocument()
    expect(screen.getByText('Sturz beim Rennen')).toBeInTheDocument()
    expect(calls('TanStackEventsPageQuery')).toMatchObject([{ first: 200 }])
    expect(calls('TanStackEventsPageMoreQuery')).toHaveLength(1)
  })

  it('filters hidden columns, filters by type, and hides optional columns', async () => {
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(function (
      this: HTMLElement,
    ) {
      return this.tagName === 'SECTION' ? 600 : 0
    })
    const { user, router } = renderWithRelay(<TanStackEventsPage />, () => response(), {
      path: paths.events,
      routePath: paths.events,
    })

    expect(await screen.findByText('Sturz beim Rennen')).toBeInTheDocument()
    expect(screen.getByText('Werkstatttermin')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Spalten' }))
    await user.click(screen.getByRole('checkbox', { name: 'Beschreibung' }))
    await waitFor(() => {
      expect(screen.queryByRole('columnheader', { name: /Beschreibung/ })).not.toBeInTheDocument()
    })

    fireEvent.change(screen.getByRole('searchbox', { name: 'Schnellfilter' }), {
      target: { value: 'Bremsen' },
    })
    await waitFor(() => {
      expect(screen.queryByText('Sturz beim Rennen')).not.toBeInTheDocument()
      expect(screen.getByText('Werkstatttermin')).toBeInTheDocument()
    })

    await user.clear(screen.getByRole('searchbox', { name: 'Schnellfilter' }))
    await user.click(screen.getByRole('button', { name: 'Typ filtern' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Typ filtern' }), 'REPAIR')
    await waitFor(() => {
      expect(screen.queryByText('Sturz beim Rennen')).not.toBeInTheDocument()
      expect(screen.getByText('Werkstatttermin')).toBeInTheDocument()
      expect(new URLSearchParams(router.state.location.search).get('eventsTableType')).toBe(
        'REPAIR',
      )
    })
  })

  it('supports multi-column sorting while virtualizing rows', async () => {
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(function (
      this: HTMLElement,
    ) {
      return this.tagName === 'SECTION' ? 600 : 0
    })
    const { user } = renderWithRelay(<TanStackEventsPage />, () => response(manyEvents), {
      path: paths.events,
      routePath: paths.events,
    })

    expect(await screen.findAllByText(/^Event \d+$/)).not.toHaveLength(0)
    const table = screen.getByRole('table')
    expect(within(table).getAllByRole('row').length).toBeLessThan(manyEvents.length)
    expect(table.querySelector('thead')).toHaveStyle({ position: 'sticky', zIndex: '2' })
    expect(table.querySelector('tbody tr[data-index] td')).toHaveStyle({ zIndex: '1' })
    await user.click(within(table).getByRole('button', { name: 'Event' }))
    await user.keyboard('{Shift>}')
    await user.click(within(table).getByRole('button', { name: 'Typ' }))
    await user.keyboard('{/Shift}')
    expect(within(table).getByRole('button', { name: /Typ2/ })).toBeInTheDocument()
  }, 15_000)

  it('uses fixed column widths and filters date ranges inclusively with either endpoint', async () => {
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(function (
      this: HTMLElement,
    ) {
      return this.tagName === 'SECTION' ? 600 : 0
    })
    const { user } = renderWithRelay(
      <TanStackEventsPage />,
      () => response([crashEvent, repairEvent, laterEvent]),
      { path: paths.events, routePath: paths.events },
    )

    expect(await screen.findByText('Trainingstag')).toBeInTheDocument()
    const table = screen.getByRole('table')
    const columns = table.querySelectorAll('col')
    expect(columns[0]).toHaveStyle({ width: '256px' })
    expect(columns[1]).toHaveStyle({ width: '144px' })

    const openStartDateFilter = () =>
      user.click(screen.getByRole('button', { name: 'Startdatum filtern' }))
    const updateDateField = (label: string, value: string) =>
      fireEvent.change(screen.getByRole('textbox', { name: label }), {
        target: { value },
      })

    await openStartDateFilter()
    updateDateField('Von', '11.10.2026')
    updateDateField('Bis', '11.10.2026')
    await user.click(screen.getByRole('button', { name: 'Anwenden' }))
    await waitFor(() => {
      expect(screen.queryByText('Sturz beim Rennen')).not.toBeInTheDocument()
      expect(screen.getByText('Werkstatttermin')).toBeInTheDocument()
      expect(screen.queryByText('Trainingstag')).not.toBeInTheDocument()
    })

    await openStartDateFilter()
    await user.click(screen.getByRole('button', { name: 'Filter löschen' }))
    updateDateField('Von', '11.10.2026')
    await user.click(screen.getByRole('button', { name: 'Anwenden' }))
    await waitFor(() => {
      expect(screen.queryByText('Sturz beim Rennen')).not.toBeInTheDocument()
      expect(screen.getByText('Werkstatttermin')).toBeInTheDocument()
      expect(screen.getByText('Trainingstag')).toBeInTheDocument()
    })

    await openStartDateFilter()
    await user.click(screen.getByRole('button', { name: 'Filter löschen' }))
    updateDateField('Bis', '11.10.2026')
    await user.click(screen.getByRole('button', { name: 'Anwenden' }))
    await waitFor(() => {
      expect(screen.getByText('Sturz beim Rennen')).toBeInTheDocument()
      expect(screen.getByText('Werkstatttermin')).toBeInTheDocument()
      expect(screen.queryByText('Trainingstag')).not.toBeInTheDocument()
    })
  }, 15_000)

  it('restores saved widths and clamps them to supported bounds', async () => {
    localStorage.setItem(
      'athlify.events.tanstack.columnWidths',
      JSON.stringify({ name: 480, type: 80, startDate: 200, unknown: 320 }),
    )
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(function (
      this: HTMLElement,
    ) {
      return this.tagName === 'SECTION' ? 600 : 0
    })
    renderWithRelay(<TanStackEventsPage />, () => response(), {
      path: paths.events,
      routePath: paths.events,
    })

    expect(await screen.findByText('Sturz beim Rennen')).toBeInTheDocument()
    const columns = screen.getByRole('table').querySelectorAll('col')
    expect(columns[0]).toHaveStyle({ width: '480px' })
    expect(columns[1]).toHaveStyle({ width: '144px' })
    expect(columns[2]).toHaveStyle({ width: '200px' })
  })

  it('restores filters from the URL and updates URL filters without dropping unrelated params', async () => {
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(function (
      this: HTMLElement,
    ) {
      return this.tagName === 'SECTION' ? 600 : 0
    })
    const { router } = renderWithRelay(<TanStackEventsPage />, () => response(), {
      path: `${paths.events}?keep=1&eventsTableSearch=Bremsen`,
      routePath: paths.events,
    })

    expect(await screen.findByText('Werkstatttermin')).toBeInTheDocument()
    expect(screen.queryByText('Sturz beim Rennen')).not.toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Schnellfilter' })).toHaveValue('Bremsen')

    fireEvent.change(screen.getByRole('searchbox', { name: 'Schnellfilter' }), {
      target: { value: 'Werkstatt' },
    })
    await waitFor(() => {
      const params = new URLSearchParams(router.state.location.search)
      expect(params.get('keep')).toBe('1')
      expect(params.get('eventsTableSearch')).toBe('Werkstatt')
    })

    await router.navigate(`${paths.events}?keep=1&eventsTableSearch=Sturz`)
    await waitFor(() => {
      expect(screen.getByRole('searchbox', { name: 'Schnellfilter' })).toHaveValue('Sturz')
      expect(screen.getByText('Sturz beim Rennen')).toBeInTheDocument()
      expect(screen.queryByText('Werkstatttermin')).not.toBeInTheDocument()
    })
  })

  it('resizes columns with pointer and keyboard input while keeping the Event column pinned', async () => {
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(function (
      this: HTMLElement,
    ) {
      return this.tagName === 'SECTION' ? 600 : 0
    })
    const { user } = renderWithRelay(<TanStackEventsPage />, () => response(), {
      path: paths.events,
      routePath: paths.events,
    })

    expect(await screen.findByText('Sturz beim Rennen')).toBeInTheDocument()
    const table = screen.getByRole('table')
    const resizeHandle = screen.getByRole('separator', {
      name: 'Spaltenbreite von Event anpassen',
    })

    fireEvent.pointerDown(resizeHandle, { button: 0, pointerId: 1, clientX: 256 })
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 320 })
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 320 })
    expect(resizeHandle).toHaveAttribute('aria-valuenow', '320')
    expect(table.querySelector('col')).toHaveStyle({ width: '320px' })
    expect(screen.getByText('Sturz beim Rennen').closest('td')).toHaveStyle({ width: '320px' })
    await waitFor(() => {
      expect(
        JSON.parse(localStorage.getItem('athlify.events.tanstack.columnWidths') ?? '{}'),
      ).toMatchObject({
        name: 320,
      })
    })

    resizeHandle.focus()
    await user.keyboard('{ArrowRight}')
    expect(resizeHandle).toHaveAttribute('aria-valuenow', '336')

    const firstHeader = table.querySelector('thead th')
    expect(firstHeader).toHaveStyle({ position: 'sticky', left: '0px' })
    await user.click(screen.getByRole('button', { name: 'Spalten' }))
    const columnsGroup = screen.getByRole('group', { name: 'Sichtbare Event-Spalten' })
    expect(within(columnsGroup).queryByRole('checkbox', { name: 'Event' })).not.toBeInTheDocument()
  })

  it('clips cell text by default and lets users enable wrapping', async () => {
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(function (
      this: HTMLElement,
    ) {
      return this.tagName === 'SECTION' ? 600 : 0
    })
    const { user } = renderWithRelay(<TanStackEventsPage />, () => response(), {
      path: paths.events,
      routePath: paths.events,
    })

    expect(await screen.findByText('Sturz beim Rennen')).toBeInTheDocument()
    const cell = screen.getByText('Sturz beim Rennen').closest('td')
    const content = cell?.firstElementChild
    const row = cell?.closest('tr')
    expect(row).toHaveStyle({ height: '48px' })
    expect(cell).toHaveStyle({ overflow: 'hidden' })
    expect(content).toHaveStyle({
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    })

    await user.click(screen.getByRole('button', { name: 'Spalten' }))
    const wrapOption = screen.getByRole('checkbox', { name: 'Zellentext umbrechen' })
    await user.click(wrapOption)

    expect(wrapOption).toBeChecked()
    expect(row).not.toHaveStyle({ height: '48px' })
    expect(content).toHaveStyle({ whiteSpace: 'normal', overflowWrap: 'anywhere' })
  })
})
