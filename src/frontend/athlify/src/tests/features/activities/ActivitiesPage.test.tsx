import { formatDateTime } from '../../../lib/dates'
import { act, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ActivitiesPage } from '../../../features/activities/ActivitiesPage'
import {
  ACTIVITIES_COLUMN_STORAGE_KEY,
  activitiesColumnIds,
} from '../../../features/activities/ActivitiesGridState'
import { mockAgGridViewport } from '../../utils/mockAgGridViewport'
import { createTestEnvironment, renderWithRelay } from '../../utils/relay'

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
  source: null,
  merge: null,
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
      totalCount: nodes.length,
      edges: nodes.map((node) => ({ cursor: node.id, node })),
      pageInfo: {
        hasNextPage: false,
        endCursor: nodes.at(-1)?.id ?? null,
      },
    },
    latest: { nodes: [] },
    vehicles: { nodes: [], pageInfo: { hasNextPage: false } },
    gadgets: { nodes: [], pageInfo: { hasNextPage: false } },
    tags: { nodes: [], pageInfo: { hasNextPage: false } },
  },
})

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

async function findActivitiesGrid() {
  const grid = await screen.findByRole('grid')
  await waitFor(() =>
    expect(within(grid).getAllByRole('columnheader').length).toBeGreaterThan(0),
  )
  return grid
}

function showColumns(...columnIds: (typeof activitiesColumnIds)[number][]) {
  const visible = new Set(columnIds)
  window.localStorage.setItem(
    ACTIVITIES_COLUMN_STORAGE_KEY,
    JSON.stringify(activitiesColumnIds.map((colId) => ({ colId, hide: !visible.has(colId) }))),
  )
}

function columnHeader(grid: HTMLElement, label: string) {
  return within(grid).getByRole('columnheader', { name: new RegExp(label) })
}

beforeEach(() => mockAgGridViewport())
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  window.localStorage.removeItem(ACTIVITIES_COLUMN_STORAGE_KEY)
})

describe('ActivitiesPage', () => {
  it('renders an activity and requests the default server order without filters', async () => {
    const { calls } = renderWithRelay(<ActivitiesPage />, () => response(), {
      path: '/activities',
      routePath: '/activities',
    })

    const grid = await findActivitiesGrid()
    await within(grid).findByText('Strasse')
    await waitFor(() => expect(calls('ActivitiesPageQuery')).toHaveLength(1))
    expect(calls('ActivitiesPageQuery')[0]).toMatchObject({
      first: 50,
      where: null,
      order: [{ date: 'DESC' }, { id: 'DESC' }],
    })
  })

  it('keeps cached rows visible while refreshing after returning to the page', async () => {
    let holdResponse = false
    let releaseResponse: (() => void) | undefined
    const relay = createTestEnvironment(async () => {
      if (holdResponse) {
        await new Promise<void>((resolve) => {
          releaseResponse = resolve
        })
      }
      return response()
    })
    const options = {
      path: '/activities',
      routePath: '/activities',
      testEnvironment: relay,
    }

    const { router } = renderWithRelay(<ActivitiesPage />, () => response(), {
      ...options,
      otherRoutes: [{ path: '/other', element: <div /> }],
    })
    holdResponse = true
    await act(async () => router.navigate('/other'))
    await act(async () => router.navigate('/activities'))

    await waitFor(() => expect(relay.calls('ActivitiesPageQuery')).toHaveLength(2))
    expect(await screen.findByText('Strasse')).toBeInTheDocument()
    await act(async () => releaseResponse?.())
  })

  it('shows the add action for an empty first-use grid', async () => {
    renderWithRelay(<ActivitiesPage />, () => response([]), {
      path: '/activities',
      routePath: '/activities',
    })

    await findActivitiesGrid()
    expect(await screen.findByRole('button', { name: 'Aktivität erfassen' })).toBeInTheDocument()
  })

  it('shows the filtered empty state and resets filters without changing the sort', async () => {
    const { calls, router, user } = renderWithRelay(<ActivitiesPage />, () => response([]), {
      path: '/activities?type=INDOOR&sort=-distance',
      routePath: '/activities',
    })

    await screen.findByText('Keine passenden Aktivitäten')
    await waitFor(() =>
      expect(calls('ActivitiesPageQuery')[0]).toMatchObject({
        where: { type: { in: ['INDOOR'] } },
      }),
    )
    const resetButtons = await screen.findAllByRole('button', { name: 'Filter zurücksetzen' })
    await user.click(resetButtons[0])
    expect(router.state.location.search).toBe('?sort=-distance')
  })

  it('shows localized date and start time in the date cell without a source column', async () => {
    renderWithRelay(<ActivitiesPage />, () => response(), {
      path: '/activities',
      routePath: '/activities',
    })

    const grid = await findActivitiesGrid()
    await screen.findByText('Strasse')
    await waitFor(() => expect(grid.querySelector('time')).not.toBeNull())
    const time = grid.querySelector('time')
    expect(time).toHaveAttribute('datetime', activity.date)
    expect(time).toHaveTextContent(formatDateTime(new Date(activity.date as string)))
    expect(time?.textContent).toMatch(/^\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}$/)
    expect(columnHeader(grid, 'Datum')).toBeInTheDocument()
    expect(within(grid).queryByRole('columnheader', { name: /Quelle/ })).not.toBeInTheDocument()
  })

  it('shows the duration value and unit in its header', async () => {
    showColumns('date', 'time')
    renderWithRelay(<ActivitiesPage />, () => response(), {
      path: '/activities',
      routePath: '/activities',
    })

    const grid = await findActivitiesGrid()
    await within(grid).findByText('1:30')
    const header = columnHeader(grid, 'Dauer')
    expect(header).toHaveTextContent('Std.')
  })

  it('renders description and heart rate details in their visible columns', async () => {
    showColumns('date', 'description')
    renderWithRelay(<ActivitiesPage />, () => response([richActivity]), {
      path: '/activities',
      routePath: '/activities',
    })

    const grid = await findActivitiesGrid()
    expect(await within(grid).findByText('Feierabendrunde am See')).toHaveAttribute(
      'title',
      'Feierabendrunde am See',
    )
  })

  it('shows average heart rate with its range as a tooltip', async () => {
    mockWideViewport()
    showColumns('heartRate')
    renderWithRelay(<ActivitiesPage />, () => response([richActivity]), {
      path: '/activities',
      routePath: '/activities',
    })

    const grid = await findActivitiesGrid()
    expect(await within(grid).findByText('142')).toHaveAttribute('title', '120–170')
  })

  it('renders effort and mood with their accessible labels', async () => {
    mockWideViewport()
    showColumns('effort', 'mood')
    renderWithRelay(<ActivitiesPage />, () => response([richActivity]), {
      path: '/activities',
      routePath: '/activities',
    })

    const grid = await findActivitiesGrid()
    expect(await within(grid).findByTitle('Hart')).toHaveTextContent('🥵 7')
    expect(within(grid).getByTitle('Gut')).toHaveTextContent('🙂')
    expect(within(grid).getByTitle('Gut')).toHaveAttribute('aria-label', 'Gut')
  })

  it('renders wind with its accessible label', async () => {
    mockWideViewport()
    showColumns('wind')
    renderWithRelay(<ActivitiesPage />, () => response([richActivity]), {
      path: '/activities',
      routePath: '/activities',
    })

    const grid = await findActivitiesGrid()
    expect(await within(grid).findByTitle('Leicht')).toHaveTextContent('🍃')
  })

  it('renders gadgets and tag chips, limiting the visible tags to two', async () => {
    mockWideViewport()
    showColumns('gadgets', 'tags')
    const manyTags = {
      ...richActivity,
      tags: ['Eins', 'Zwei', 'Drei', 'Vier', 'Fuenf'].map((name) => ({ id: name, name })),
    }
    renderWithRelay(<ActivitiesPage />, () => response([manyTags]), {
      path: '/activities',
      routePath: '/activities',
    })

    const grid = await findActivitiesGrid()
    expect(await within(grid).findByText('Garmin Edge')).toBeInTheDocument()
    expect(within(grid).getByText('Eins')).toBeInTheDocument()
    expect(within(grid).getByText('Zwei')).toBeInTheDocument()
    expect(within(grid).queryByText('Drei')).not.toBeInTheDocument()
    expect(within(grid).getByText('+3')).toBeInTheDocument()
  })

  it('uses the server order for rows when a sort is read from the URL', async () => {
    showColumns('date')
    const { calls } = renderWithRelay(
      <ActivitiesPage />,
      () => response([activity, richActivity]),
      { path: '/activities?sort=-heartRate', routePath: '/activities' },
    )

    const grid = await findActivitiesGrid()
    await waitFor(() => expect(grid.querySelectorAll('time')).toHaveLength(2))
    expect(calls('ActivitiesPageQuery')[0]).toMatchObject({
      order: [{ heartRateAverage: 'DESC' }, { id: 'DESC' }],
    })
    const dates = [...grid.querySelectorAll('time')].map((time) => time.getAttribute('datetime'))
    expect(dates).toEqual([activity.date, richActivity.date])
  })

  it('does not sort by activity type', async () => {
    showColumns('type')
    const { router, user } = renderWithRelay(<ActivitiesPage />, () => response(), {
      path: '/activities',
      routePath: '/activities',
    })

    const grid = await findActivitiesGrid()
    const header = columnHeader(grid, 'Typ')
    await user.click(header)
    expect(router.state.location.search).toBe('')
    expect(header).not.toHaveAttribute('aria-sort')
  })

  it('shows the total number of matching activities across pages', async () => {
    renderWithRelay(
      <ActivitiesPage />,
      () => {
        const result = response([activity, richActivity])
        return {
          data: { ...result.data, activities: { ...result.data.activities, totalCount: 42 } },
        }
      },
      { path: '/activities', routePath: '/activities' },
    )

    expect(await screen.findByText('42 Aktivitäten')).toBeInTheDocument()
  })

  it('writes the description search to the URL and sends it to the server', async () => {
    const { calls, router, user } = renderWithRelay(<ActivitiesPage />, () => response(), {
      path: '/activities',
      routePath: '/activities',
    })

    await user.type(screen.getByRole('textbox', { name: 'Beschreibung durchsuchen' }), 'See')
    await waitFor(() => expect(router.state.location.search).toBe('?q=See'))
    await waitFor(() =>
      expect(calls('ActivitiesPageQuery').at(-1)).toMatchObject({
        where: { description: { contains: 'See' } },
      }),
    )
  })
})
