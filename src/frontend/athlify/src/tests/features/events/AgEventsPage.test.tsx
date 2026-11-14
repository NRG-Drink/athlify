import { screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AgEventsPage } from '../../../features/events/AgEventsPage'
import { renderWithRelay } from '../../utils/relay'

afterEach(() => {
  vi.unstubAllGlobals()
})

const event = {
  __typename: 'Event',
  id: 'event-1',
  name: 'Veloservice',
  type: 'REPAIR',
  description: 'Kette ersetzt',
  startDate: '2026-10-16',
  endDate: null,
}

describe('AgEventsPage', () => {
  it('renders formatted event data in the AG Grid', async () => {
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
    const { calls } = renderWithRelay(
      <AgEventsPage />,
      () => ({
        data: {
          events: {
            nodes: [event],
          },
        },
      }),
      { path: '/ag-events', routePath: '/ag-events' },
    )

    const region = await screen.findByRole('region', { name: 'Events' })
    const grid = within(region).getByRole('grid')
    expect(await within(grid).findByText('Veloservice')).toBeInTheDocument()
    expect(await within(grid).findByText('16.10.2026')).toBeInTheDocument()
    expect(within(grid).getByRole('columnheader', { name: /Beginn/ })).toBeInTheDocument()
    expect(within(grid).getByRole('columnheader', { name: 'Name' })).toBeInTheDocument()
    expect(screen.getByText('1 Event')).toBeInTheDocument()
    expect(calls('AgEventsPageQuery')).toEqual([{}])
  })
})
