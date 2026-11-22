import { Box } from '@chakra-ui/react'
import {
  AllCommunityModule,
  InfiniteRowModelModule,
  ModuleRegistry,
  colorSchemeDarkBlue,
  themeQuartz,
  type IDatasource,
} from 'ag-grid-community'
import { AgGridProvider, AgGridReact } from 'ag-grid-react'
import { screen, waitFor, within } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { EventsTypeFilter } from '../../../features/events/EventsTypeFilter'
import { renderWithRelay } from '../../utils/relay'

ModuleRegistry.registerModules([AllCommunityModule, InfiniteRowModelModule])

type EventRow = { type: string }

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
  vi.spyOn(HTMLElement.prototype, 'offsetParent', 'get').mockReturnValue(document.body)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

it('uses AG Grid custom filter props to send checkbox selections to its datasource', async () => {
  mockGridViewport()
  const filterModels: Record<string, unknown>[] = []
  const gridRef = createRef<AgGridReact<EventRow>>()
  const datasource: IDatasource = {
    getRows: (params) => {
      filterModels.push(params.filterModel)
      params.successCallback([{ type: 'REPAIR' }], 1)
    },
  }
  const { user } = renderWithRelay(
    <AgGridProvider modules={[AllCommunityModule, InfiniteRowModelModule]}>
      <Box height="400px">
        <AgGridReact<EventRow>
          ref={gridRef}
          rowModelType="infinite"
          datasource={datasource}
          columnDefs={[{ field: 'type', filter: EventsTypeFilter }]}
          theme={themeQuartz.withPart(colorSchemeDarkBlue)}
        />
      </Box>
    </AgGridProvider>,
    () => ({ data: {} }),
  )

  await screen.findByRole('grid')
  await waitFor(() => expect(gridRef.current).not.toBeNull())
  gridRef.current?.api.showColumnFilter('type')

  const filter = await screen.findByRole('group', { name: 'Nach Eventtyp filtern' })
  await user.click(within(filter).getByRole('checkbox', { name: 'Alle auswählen' }))
  await user.click(within(filter).getByRole('checkbox', { name: 'Reparatur' }))

  await waitFor(() => {
    expect(filterModels.at(-1)).toEqual({ type: { values: ['REPAIR'] } })
  })
})
