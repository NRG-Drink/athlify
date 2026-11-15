import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AgEventsPage } from '../../../features/events/AgEventsPage'
import { renderWithRelay } from '../../utils/relay'

afterEach(() => {
  vi.unstubAllGlobals()
})

const event = {
  __typename: 'Event',
  id: 'RXZlbnQ6NDI=',
  name: 'Veloservice',
  type: 'REPAIR',
  description: 'Kette ersetzt',
  startDate: '2026-10-16',
  endDate: null,
  tags: [],
}

function mockGridViewport() {
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
}

describe('AgEventsPage', () => {
  it('configures event columns and reports the total event count', async () => {
    mockGridViewport()
    const { calls } = renderWithRelay(
      <AgEventsPage />,
      () => ({
        data: {
          events: {
            nodes: [event],
            totalCount: 1,
            pageInfo: { endCursor: null, hasNextPage: false },
          },
        },
      }),
      { path: '/ag-events', routePath: '/ag-events' },
    )

    const region = await screen.findByRole('region', { name: 'Events' })
    expect(screen.getByText('1 Event')).toBeInTheDocument()
    await within(region).findByText('42')
    expect(calls('AgEventsPageQuery')).toEqual([
      {
        first: 20,
        after: null,
        where: null,
        order: [{ startDate: 'DESC' }, { id: 'DESC' }],
      },
    ])
  })

  it('fetches the next cursor page when scrolling to the end of a block', async () => {
    mockGridViewport()
    const events = Array.from({ length: 20 }, (_, index) => ({
      ...event,
      id: `event-${index}`,
      name: `Event ${index}`,
    }))
    const { calls } = renderWithRelay(
      <AgEventsPage />,
      (_operation, variables) => ({
        data: {
          events:
            variables.after === 'cursor-20'
              ? {
                  nodes: [{ ...event, id: 'event-20', name: 'Event 20' }],
                  totalCount: 205,
                  pageInfo: { endCursor: null, hasNextPage: false },
                }
              : {
                  nodes: events,
                  totalCount: 205,
                  pageInfo: { endCursor: 'cursor-20', hasNextPage: true },
                },
        },
      }),
      { path: '/ag-events', routePath: '/ag-events' },
    )

    const region = await screen.findByRole('region', { name: 'Events' })
    const grid = within(region).getByRole('grid')
    expect(screen.getByText('205 Events')).toBeInTheDocument()
    const viewport = grid
    viewport.scrollTop = 2000
    fireEvent.scroll(viewport)

    await waitFor(() => {
      expect(calls('AgEventsPageQuery')).toHaveLength(2)
    })
    expect(calls('AgEventsPageQuery')[1]).toEqual({
      first: 20,
      after: 'cursor-20',
      where: null,
      order: [{ startDate: 'DESC' }, { id: 'DESC' }],
    })
  })
})
