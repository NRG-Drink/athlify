import type { GridApi } from 'ag-grid-community'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { handleGridFilterChanged } from '../../components/ag-grid/gridFilterChange'
import { getGridSortModel, sortModelToColumnState } from '../../components/ag-grid/gridSortModel'

function fakeApi(filterModel: Record<string, unknown> | null) {
  return {
    getFilterModel: vi.fn(() => filterModel),
    setColumnFilterModel: vi.fn(() => Promise.resolve()),
    onFilterChanged: vi.fn(),
  }
}

const asApi = (api: ReturnType<typeof fakeApi>) => api as unknown as GridApi

afterEach(() => vi.restoreAllMocks())

describe('handleGridFilterChanged', () => {
  it('reports the change when no filter was cleared', async () => {
    const onFilterChanged = vi.fn()

    handleGridFilterChanged(asApi(fakeApi({ name: { type: 'contains' } })), onFilterChanged, 'fail')

    await vi.waitFor(() => expect(onFilterChanged).toHaveBeenCalledOnce())
  })

  it('treats a missing filter model as no filter', async () => {
    const onFilterChanged = vi.fn()

    handleGridFilterChanged(asApi(fakeApi(null)), onFilterChanged, 'fail')

    await vi.waitFor(() => expect(onFilterChanged).toHaveBeenCalledOnce())
  })

  it('clears "no filter" selections and lets the grid report the change instead', async () => {
    const api = fakeApi({ name: { type: 'none' } })
    const onFilterChanged = vi.fn()

    handleGridFilterChanged(asApi(api), onFilterChanged, 'fail')

    await vi.waitFor(() => expect(api.onFilterChanged).toHaveBeenCalledOnce())
    expect(api.setColumnFilterModel).toHaveBeenCalledWith('name', null)
    expect(onFilterChanged).not.toHaveBeenCalled()
  })

  it('logs the failure message when clearing fails', async () => {
    const error = new Error('boom')
    const api = fakeApi({ name: { type: 'none' } })
    api.setColumnFilterModel.mockRejectedValue(error)
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})

    handleGridFilterChanged(asApi(api), vi.fn(), 'Could not clear filter.')

    await vi.waitFor(() => expect(log).toHaveBeenCalledWith('Could not clear filter.', error))
  })
})

describe('grid sort model', () => {
  it('reads the sorted columns by sort index and ignores unsorted ones', () => {
    const api = {
      getColumnState: () => [
        { colId: 'a', sort: 'asc', sortIndex: 1 },
        { colId: 'b', sort: null },
        { colId: 'c', sort: 'desc', sortIndex: 0 },
        { colId: 'd', sort: 'asc' },
      ],
    } as unknown as GridApi

    expect(getGridSortModel(api)).toEqual([
      { colId: 'c', sort: 'desc' },
      { colId: 'd', sort: 'asc' },
      { colId: 'a', sort: 'asc' },
    ])
  })

  it('numbers a sort model as column state', () => {
    expect(
      sortModelToColumnState([
        { colId: 'a', sort: 'desc' },
        { colId: 'b', sort: 'asc' },
      ]),
    ).toEqual([
      { colId: 'a', sort: 'desc', sortIndex: 0 },
      { colId: 'b', sort: 'asc', sortIndex: 1 },
    ])
  })
})
