import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ActivitiesPage } from '../../../features/activities/ActivitiesPage'
import { renderWithRelay } from '../../utils/relay'

const activity = {
  __typename: 'Activity',
  id: 'activity-1',
  date: '2026-10-16T08:00:00Z',
  type: 'ROAD',
  time: 5400,
  distance: 42.5,
  averageSpeed: 28.3,
  elevationGain: null,
  tss: null,
  source: 'MANUAL',
  vehicle: null,
  tags: [],
}

const response = (nodes = [activity]) => ({
  data: {
    activities: {
      edges: nodes.map((node) => ({ cursor: node.id, node })),
      pageInfo: {
        hasNextPage: false,
        endCursor: nodes.at(-1)?.id ?? null,
      },
    },
    vehicles: { nodes: [], pageInfo: { hasNextPage: false } },
    tags: { nodes: [], pageInfo: { hasNextPage: false } },
  },
})

describe('ActivitiesPage', () => {
  it('renders a formatted activity row and sends the default period filter', async () => {
    const { calls } = renderWithRelay(<ActivitiesPage />, () => response(), {
      path: '/activities',
      routePath: '/activities',
    })

    expect(await screen.findByRole('table')).toBeInTheDocument()
    const table = screen.getByRole('table')
    expect(within(table).getByText('Strasse')).toBeInTheDocument()
    expect(within(table).getByText('1:30 Std.')).toBeInTheDocument()
    expect(within(table).getByText('42.5 km')).toBeInTheDocument()
    expect(within(table).getAllByText('—').length).toBeGreaterThan(0)
    expect(calls('ActivitiesPageQuery')).toHaveLength(1)
    expect(calls('ActivitiesPageQuery')[0]).toMatchObject({
      first: 50,
      where: { date: { gte: expect.any(String) } },
    })
  })

  it('shows a filtered empty state with a reset action', async () => {
    const { user, router } = renderWithRelay(<ActivitiesPage />, () => response([]), {
      path: '/activities?type=INDOOR',
      routePath: '/activities',
    })

    expect(await screen.findByText('Keine passenden Aktivitäten')).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Filter zurücksetzen' })[1])
    expect(router.state.location.search).toBe('')
  })

  it('shows the first-use empty state without a table', async () => {
    renderWithRelay(<ActivitiesPage />, () => response([]), {
      path: '/activities',
      routePath: '/activities',
    })

    expect(await screen.findByText('Noch keine Aktivitäten')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
