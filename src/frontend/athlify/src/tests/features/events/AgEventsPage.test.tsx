import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AgEventsPage } from '../../../features/events/AgEventsPage'
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

describe('AgEventsPage', () => {
  it('loads the complete cursor connection before enabling local grid filtering', async () => {
    const { calls } = renderWithRelay(
      <AgEventsPage />,
      (operation) =>
        operation === 'AgEventsPageMoreQuery'
          ? response([repairEvent])
          : response([crashEvent], { totalCount: 2, hasNextPage: true }),
      { path: paths.agEvents, routePath: paths.agEvents },
    )

    expect(await screen.findByText('Werkstatttermin')).toBeInTheDocument()
    expect(screen.getByText('Sturz beim Rennen')).toBeInTheDocument()
    expect(calls('AgEventsPageQuery')).toMatchObject([{ first: 200 }])
    expect(calls('AgEventsPageMoreQuery')).toHaveLength(1)
  })

  it('quick-filters rows and lets the user hide optional columns', async () => {
    const { user } = renderWithRelay(<AgEventsPage />, () => response(), {
      path: paths.agEvents,
      routePath: paths.agEvents,
    })

    expect(await screen.findByText('Sturz beim Rennen')).toBeInTheDocument()
    expect(screen.getByText('Werkstatttermin')).toBeInTheDocument()

    const quickFilter = screen.getByRole('searchbox', { name: 'Schnellfilter' })
    await user.type(quickFilter, 'Werkstatt')
    await waitFor(() => {
      expect(screen.queryByText('Sturz beim Rennen')).not.toBeInTheDocument()
      expect(screen.getByText('Werkstatttermin')).toBeInTheDocument()
    })

    await user.clear(quickFilter)
    await user.click(screen.getByRole('button', { name: 'Spalten' }))
    await user.click(screen.getByRole('checkbox', { name: 'Beschreibung' }))

    await waitFor(() => {
      expect(screen.queryByRole('columnheader', { name: /Beschreibung/ })).not.toBeInTheDocument()
    })
    expect(screen.getByRole('columnheader', { name: /Event/ })).toBeInTheDocument()

    await user.type(quickFilter, 'Bremsen')
    await waitFor(() => {
      expect(screen.queryByText('Sturz beim Rennen')).not.toBeInTheDocument()
      expect(screen.getByText('Werkstatttermin')).toBeInTheDocument()
    })
  })
})
