import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EventsPage } from '../../../features/events/EventsPage'
import { paths } from '../../../navigation/paths'
import { renderWithRelay } from '../../utils/relay'

const event = {
  __typename: 'Event',
  id: 'event-1',
  name: 'Sturz beim Rennen',
  type: 'CRASH',
  description: 'Sturz in einer Kurve',
  startDate: '2026-10-10',
  endDate: null,
  tags: [{ id: 'tag-1', name: 'Rennen' }],
}

const response = (nodes = [event]) => ({
  data: {
    events: {
      totalCount: nodes.length,
      edges: nodes.map((node) => ({ cursor: node.id, node })),
      pageInfo: {
        hasNextPage: false,
        endCursor: nodes.at(-1)?.id ?? null,
      },
    },
  },
})

describe('EventsPage', () => {
  it.each(['tanstack', 'ag-grid'] as const)(
    'renders the same event data with the %s table',
    async (implementation) => {
      renderWithRelay(<EventsPage implementation={implementation} />, () => response(), {
        path: paths.events,
        routePath: paths.events,
      })

      expect(
        await screen.findByText('Sturz beim Rennen', {}, { timeout: 5000 }),
      ).toBeInTheDocument()
      expect(screen.getByText('Sturz', { selector: 'td, [role="gridcell"]' })).toBeInTheDocument()
      expect(screen.getByText('1 Event')).toBeInTheDocument()
    },
  )

  it('filters through GraphQL and preserves filters when switching table routes', async () => {
    const { calls, router, user } = renderWithRelay(
      <EventsPage implementation="tanstack" />,
      () => response(),
      {
        path: paths.events,
        routePath: paths.events,
        otherRoutes: [
          {
            path: paths.eventsAgGrid,
            element: <EventsPage implementation="ag-grid" />,
          },
        ],
      },
    )

    await screen.findByText('Sturz beim Rennen')
    const search = screen.getByRole('searchbox', { name: 'Events suchen' })
    await user.type(search, 'Kurve')
    await waitFor(() => {
      expect(calls('EventsPageQuery').at(-1)).toMatchObject({
        where: {
          or: [{ name: { contains: 'Kurve' } }, { description: { contains: 'Kurve' } }],
        },
      })
    })
    expect(router.state.location.search).toContain('search=Kurve')

    const typeFilter = screen.getByRole('combobox', { name: 'Event-Typ' })
    await user.selectOptions(typeFilter, 'CRASH')

    await waitFor(() => {
      expect(calls('EventsPageQuery').at(-1)).toMatchObject({
        where: {
          and: [
            {
              or: [{ name: { contains: 'Kurve' } }, { description: { contains: 'Kurve' } }],
            },
            { type: { eq: 'CRASH' } },
          ],
        },
      })
    })
    expect(router.state.location.search).toContain('type=CRASH')
    expect(router.state.location.search).toContain('search=Kurve')

    await user.click(screen.getByRole('link', { name: 'AG Grid' }))
    await waitFor(() => expect(router.state.location.pathname).toBe(paths.eventsAgGrid))
    expect(router.state.location.search).toContain('type=CRASH')
    expect(router.state.location.search).toContain('search=Kurve')
    expect(await screen.findByText('Sturz beim Rennen')).toBeInTheDocument()
  })

  it('sorts from a TanStack column header and requests deterministic server order', async () => {
    const { calls, router, user } = renderWithRelay(
      <EventsPage implementation="tanstack" />,
      () => response(),
      { path: paths.events, routePath: paths.events },
    )

    const table = await screen.findByRole('table')
    await user.click(within(table).getByRole('button', { name: 'Event' }))

    await waitFor(() => {
      expect(calls('EventsPageQuery').at(-1)).toMatchObject({
        order: [{ name: 'DESC' }, { id: 'DESC' }],
      })
    })
    expect(router.state.location.search).toContain('sort=-name')
  })
})
