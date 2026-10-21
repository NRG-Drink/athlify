import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ActivitiesPage } from '../../../features/activities/ActivitiesPage'
import { renderWithRelay } from '../../utils/relay'

const activity: Record<string, unknown> & { id: string } = {
  __typename: 'Activity',
  id: 'activity-1',
  date: '2026-10-16T08:00:00Z',
  type: 'ROAD',
  time: 5400,
  distance: 42.5,
  averageSpeed: 28.3,
  elevationGain: null,
  tss: null,
  description: null,
  heartRateMin: null,
  heartRateMax: null,
  heartRateAverage: null,
  mood: null,
  effort: null,
  wind: null,
  vehicle: null,
  gadgets: [],
  tags: [],
}

const richActivity: typeof activity = {
  ...activity,
  id: 'activity-2',
  date: '2026-10-15T18:30:00Z',
  description: 'Feierabendrunde am See',
  heartRateMin: 120,
  heartRateMax: 170,
  heartRateAverage: 142,
  mood: 'GOOD',
  effort: 7,
  wind: 'LIGHT',
  gadgets: [{ id: 'gadget-1', brand: 'Garmin', model: 'Edge', nickname: null }],
  tags: [{ id: 'tag-1', name: 'Training' }],
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
    expect(within(table).getByText('1:30')).toBeInTheDocument()
    expect(within(table).getByText('42.5')).toBeInTheDocument()
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

  it('shows the date without time, no source column and the renamed elevation header', async () => {
    renderWithRelay(<ActivitiesPage />, () => response(), {
      path: '/activities',
      routePath: '/activities',
    })

    const table = await screen.findByRole('table')
    const time = table.querySelector('time')
    expect(time).toHaveAttribute('datetime', activity.date)
    expect(time?.textContent).not.toContain(':')
    expect(within(table).queryByText('Quelle')).not.toBeInTheDocument()
    expect(within(table).getByText('Höhenmeter').closest('th')).toBeInTheDocument()
  })

  it('shows the units in the column headers and only the number in the cells', async () => {
    renderWithRelay(<ActivitiesPage />, () => response([richActivity]), {
      path: '/activities',
      routePath: '/activities',
    })

    const table = await screen.findByRole('table')
    const headerOf = (label: string) => within(table).getByText(label).closest('th') as HTMLElement
    expect(headerOf('Dauer')).toHaveTextContent('Std.')
    expect(headerOf('Distanz')).toHaveTextContent('km')
    expect(headerOf('Höhenmeter')).toHaveTextContent('m')
    expect(headerOf('Ø Geschwindigkeit')).toHaveTextContent('km/h')
    expect(headerOf('Ø Herzfrequenz')).toHaveTextContent('bpm')
    expect(within(table).queryByText(/42\.5 km/)).not.toBeInTheDocument()
  })

  it('renders description, heart rate, effort, mood, wind, gadgets and tags', async () => {
    renderWithRelay(<ActivitiesPage />, () => response([richActivity, activity]), {
      path: '/activities',
      routePath: '/activities',
    })

    const table = await screen.findByRole('table')
    expect(within(table).getByText('Feierabendrunde am See')).toHaveAttribute(
      'title',
      'Feierabendrunde am See',
    )
    expect(within(table).getByText('142')).toHaveAttribute('title', '120–170')
    expect(within(table).getByText('7')).toBeInTheDocument()
    expect(within(table).getByText('Gut')).toBeInTheDocument()
    expect(within(table).getByText('Leicht')).toBeInTheDocument()
    expect(within(table).getByText('Garmin Edge')).toBeInTheDocument()
    expect(within(table).getByText('Training')).toBeInTheDocument()
  })

  it('sorts by effort, highest first, and puts rows without a value last', async () => {
    const { user } = renderWithRelay(<ActivitiesPage />, () => response([activity, richActivity]), {
      path: '/activities',
      routePath: '/activities',
    })

    const table = await screen.findByRole('table')
    const header = within(table).getByText('Anstrengung').closest('th') as HTMLElement
    await user.click(within(header).getByRole('button', { hidden: true }))
    expect(header).toHaveAttribute('aria-sort', 'descending')
    const rows = within(table).getAllByRole('row', { hidden: true }).slice(1)
    expect(within(rows[0]).getByText('7')).toBeInTheDocument()
    expect(within(rows[1]).queryByText('7')).not.toBeInTheDocument()
  })
})
