import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { EventsPage } from '../../../features/events/EventsPage'
import { renderWithRelay } from '../../utils/relay'

const event = {
  __typename: 'Event',
  id: 'event-1',
  name: 'Veloservice',
  type: 'REPAIR',
  description: 'Kette ersetzt',
  startDate: '2026-10-16',
  endDate: null,
}

describe('EventsPage', () => {
  const mockViewport = () => {
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
  }

  it('renders formatted event data from the Events connection', async () => {
    mockViewport()
    const { calls } = renderWithRelay(
      <EventsPage />,
      () => ({
        data: {
          events: {
            nodes: [event],
          },
        },
      }),
      { path: '/events', routePath: '/events' },
    )

    const table = await screen.findByRole('table', { name: 'Events' })
    expect(within(table).getByText('Veloservice')).toBeInTheDocument()
    expect(within(table).getByText('Reparatur')).toBeInTheDocument()
    expect(within(table).getByText('16.10.2026')).toBeInTheDocument()
    expect(within(table).getByText('Kette ersetzt')).toBeInTheDocument()
    expect(within(table).getByText('—')).toBeInTheDocument()
    expect(calls('EventsPageQuery')).toEqual([{}])
  })

  it('virtualizes a long Events list', async () => {
    mockViewport()
    const events = Array.from({ length: 100 }, (_, index) => ({
      ...event,
      id: `event-${index}`,
      name: `Event ${index}`,
    }))
    renderWithRelay(
      <EventsPage />,
      () => ({
        data: {
          events: {
            nodes: events,
          },
        },
      }),
      { path: '/events', routePath: '/events' },
    )

    const table = await screen.findByRole('table')
    expect(within(table).getByText('Event 0')).toBeInTheDocument()
    expect(within(table).queryByText('Event 99')).not.toBeInTheDocument()
  })
})
