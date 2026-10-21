import { act, screen, waitFor, within } from '@testing-library/react'
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
  it('renders a formatted activity row and sends no filter by default', async () => {
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
    expect(calls('ActivitiesPageQuery')[0]).toMatchObject({ first: 50, where: null })
  })

  it('shows a filtered empty state with a reset action', async () => {
    const { user, router } = renderWithRelay(<ActivitiesPage />, () => response([]), {
      path: '/activities?type=INDOOR',
      routePath: '/activities',
    })

    expect(await screen.findByText('Keine passenden Aktivitäten')).toBeInTheDocument()
    const table = screen.getByRole('table')
    expect(
      within(table).getByRole('button', { name: /Nach Aktivitätstyp filtern/ }),
    ).toBeInTheDocument()
    await user.click(within(table).getByRole('button', { name: 'Filter zurücksetzen' }))
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

  it('shows the first two tags and counts the rest in a "+N" chip', async () => {
    const manyTags = {
      ...richActivity,
      tags: ['Eins', 'Zwei', 'Drei', 'Vier', 'Fuenf'].map((name) => ({ id: name, name })),
    }
    renderWithRelay(<ActivitiesPage />, () => response([manyTags]), {
      path: '/activities',
      routePath: '/activities',
    })

    const table = await screen.findByRole('table')
    expect(within(table).getByText('Eins')).toBeInTheDocument()
    expect(within(table).getByText('Zwei')).toBeInTheDocument()
    expect(within(table).queryByText('Drei')).not.toBeInTheDocument()
    expect(within(table).getByText('+3')).toBeInTheDocument()
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

  describe('column filters', () => {
    const headerOf = (label: string) =>
      within(screen.getByRole('table')).getByText(label).closest('th') as HTMLElement

    it('offers a filter trigger next to the sort button of the filterable columns only', async () => {
      renderWithRelay(<ActivitiesPage />, () => response(), {
        path: '/activities',
        routePath: '/activities',
      })

      await screen.findByRole('table')
      for (const label of ['Typ', 'Velo', 'Wind', 'Tags']) {
        expect(
          within(headerOf(label)).getByRole('button', { name: /^Nach .* filtern/, hidden: true }),
        ).toBeInTheDocument()
      }
      expect(
        within(headerOf('Datum')).queryByRole('button', { name: /filtern/, hidden: true }),
      ).not.toBeInTheDocument()
      expect(
        within(headerOf('Distanz')).queryByRole('button', { name: /filtern/, hidden: true }),
      ).not.toBeInTheDocument()
    })

    it('keeps sorting and filtering on separate buttons', async () => {
      const { user, router } = renderWithRelay(<ActivitiesPage />, () => response(), {
        path: '/activities',
        routePath: '/activities',
      })

      await screen.findByRole('table')
      const header = headerOf('Typ')
      await user.click(within(header).getByRole('button', { name: 'Typ' }))
      expect(header).toHaveAttribute('aria-sort', 'ascending')
      expect(router.state.location.search).toBe('')
      await user.click(within(header).getByRole('button', { name: 'Nach Aktivitätstyp filtern' }))
      expect(await screen.findByRole('combobox', { name: 'Aktivitätstyp' })).toBeInTheDocument()
      expect(header).toHaveAttribute('aria-sort', 'ascending')
    })

    it('filters by type from the header, closes the popover and returns the focus', async () => {
      const { user, router, calls } = renderWithRelay(<ActivitiesPage />, () => response(), {
        path: '/activities',
        routePath: '/activities',
      })

      await screen.findByRole('table')
      const trigger = within(headerOf('Typ')).getByRole('button', {
        name: 'Nach Aktivitätstyp filtern',
      })
      await user.click(trigger)
      await user.selectOptions(
        await screen.findByRole('combobox', { name: 'Aktivitätstyp' }),
        'INDOOR',
      )

      expect(router.state.location.search).toBe('?type=INDOOR')
      await waitFor(() =>
        expect(calls('ActivitiesPageQuery').at(-1)).toMatchObject({
          where: { type: { eq: 'INDOOR' } },
        }),
      )
      await waitFor(() =>
        expect(screen.queryByRole('combobox', { name: 'Aktivitätstyp' })).not.toBeInTheDocument(),
      )
      expect(
        await within(headerOf('Typ')).findByRole('button', {
          name: 'Nach Aktivitätstyp filtern, aktiv: Indoor',
        }),
      ).toBeInTheDocument()
    })

    it('closes the popover with Escape', async () => {
      const { user } = renderWithRelay(<ActivitiesPage />, () => response(), {
        path: '/activities',
        routePath: '/activities',
      })

      await screen.findByRole('table')
      await user.click(
        within(headerOf('Typ')).getByRole('button', { name: 'Nach Aktivitätstyp filtern' }),
      )
      await screen.findByRole('combobox', { name: 'Aktivitätstyp' })
      await user.keyboard('{Escape}')
      await waitFor(() =>
        expect(screen.queryByRole('combobox', { name: 'Aktivitätstyp' })).not.toBeInTheDocument(),
      )
    })

    it('lists every active filter as a chip that can be removed, and resets all', async () => {
      const { user, router } = renderWithRelay(<ActivitiesPage />, () => response(), {
        path: '/activities?type=INDOOR&wind=STRONG',
        routePath: '/activities',
      })

      const chips = await screen.findByRole('group', { name: 'Aktive Filter' })
      expect(within(chips).getByText('Wind: Stark')).toBeInTheDocument()
      expect(within(chips).getByText('Aktivitätstyp: Indoor')).toBeInTheDocument()

      await user.click(
        within(chips).getByRole('button', { name: 'Filter Aktivitätstyp entfernen' }),
      )
      expect(router.state.location.search).toBe('?wind=STRONG')

      await user.click(
        within(await screen.findByRole('group', { name: 'Aktive Filter' })).getByRole('button', {
          name: 'Filter zurücksetzen',
        }),
      )
      expect(router.state.location.search).toBe('')
    })

    it('keeps the table, dimmed and busy, while a filter change is loading', async () => {
      let release: (value: unknown) => void = () => {}
      const { user } = renderWithRelay(
        <ActivitiesPage />,
        (_operation, variables) =>
          variables.where && 'type' in (variables.where as object)
            ? new Promise((resolve) => (release = resolve))
            : response(),
        { path: '/activities', routePath: '/activities' },
      )

      const table = await screen.findByRole('table')
      await user.click(
        within(headerOf('Typ')).getByRole('button', { name: 'Nach Aktivitätstyp filtern' }),
      )
      await user.selectOptions(
        await screen.findByRole('combobox', { name: 'Aktivitätstyp' }),
        'INDOOR',
      )

      await waitFor(() => expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true'))
      expect(screen.getByRole('table')).toBe(table)
      release(response([richActivity]))
      await waitFor(() => expect(screen.getByRole('table')).not.toHaveAttribute('aria-busy'))
      expect(
        within(screen.getByRole('table')).getByText('Feierabendrunde am See'),
      ).toBeInTheDocument()
    })

    it('stops dimming the table when the URL moves on without the filter change', async () => {
      const { user, router } = renderWithRelay(<ActivitiesPage />, () => response(), {
        path: '/activities',
        routePath: '/activities',
      })

      await screen.findByRole('table')
      await user.click(
        within(headerOf('Typ')).getByRole('button', { name: 'Nach Aktivitätstyp filtern' }),
      )
      await user.selectOptions(
        await screen.findByRole('combobox', { name: 'Aktivitätstyp' }),
        'INDOOR',
      )
      await waitFor(() => expect(router.state.location.search).toBe('?type=INDOOR'))
      await waitFor(() => expect(screen.getByRole('table')).not.toHaveAttribute('aria-busy'))

      await act(() => router.navigate('/activities'))

      expect(router.state.location.search).toBe('')
      expect(screen.getByRole('table')).not.toHaveAttribute('aria-busy')
    })

    it('keeps the filtered empty state inside the table so its filters stay reachable', async () => {
      renderWithRelay(<ActivitiesPage />, () => response([]), {
        path: '/activities?tag=tag-1',
        routePath: '/activities',
      })

      const table = await screen.findByRole('table')
      expect(within(table).getByText('Keine passenden Aktivitäten')).toBeInTheDocument()
      expect(
        within(table).getByRole('button', { name: /Nach Aktivitätstyp filtern/ }),
      ).toBeInTheDocument()
    })

    it('sends the wind filter from the URL as a where clause', async () => {
      const { calls } = renderWithRelay(<ActivitiesPage />, () => response([]), {
        path: '/activities?wind=STRONG',
        routePath: '/activities',
      })

      await screen.findByRole('table')
      expect(calls('ActivitiesPageQuery')[0]).toMatchObject({
        where: { wind: { eq: 'STRONG' } },
      })
    })

    it('tabs from the sort button to the filter button', async () => {
      const { user } = renderWithRelay(<ActivitiesPage />, () => response(), {
        path: '/activities',
        routePath: '/activities',
      })

      await screen.findByRole('table')
      await user.click(within(headerOf('Typ')).getByRole('button', { name: 'Typ' }))
      await user.tab()
      expect(
        within(headerOf('Typ')).getByRole('button', { name: 'Nach Aktivitätstyp filtern' }),
      ).toHaveFocus()
    })
  })
})
