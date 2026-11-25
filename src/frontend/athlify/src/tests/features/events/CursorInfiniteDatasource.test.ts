import type { IGetRowsParams } from 'ag-grid-community'
import { expect, it, vi } from 'vitest'
import {
  CursorInfiniteDatasource,
  type CursorPage,
} from '../../../features/events/CursorInfiniteDatasource'

type Query = { search: string }

function createParams(
  startRow: number,
  successCallback: (rowsThisBlock: string[], lastRow?: number) => void,
): IGetRowsParams<string> {
  return {
    startRow,
    endRow: startRow + 20,
    sortModel: [],
    filterModel: {},
    successCallback,
    failCallback: vi.fn(),
    api: {} as unknown as IGetRowsParams<string>['api'],
    context: undefined,
  }
}

it('ignores a pending request and its cursor after reset', async () => {
  let resolveStalePage!: (page: CursorPage<string>) => void
  const stalePage = new Promise<CursorPage<string>>((resolve) => {
    resolveStalePage = resolve
  })
  const firstFreshPage: CursorPage<string> = {
    rows: ['fresh page 1'],
    totalCount: 21,
    endCursor: 'fresh-cursor',
    hasNextPage: true,
  }
  const secondFreshPage: CursorPage<string> = {
    rows: ['fresh page 2'],
    totalCount: 21,
    endCursor: null,
    hasNextPage: false,
  }
  let requestCount = 0
  const fetchPage = vi.fn((_first: number, after: string | null) => {
    if (requestCount++ === 0) return stalePage
    return Promise.resolve(after === null ? firstFreshPage : secondFreshPage)
  })
  const onLoadFailed = vi.fn()
  const onLoadStateChange = vi.fn()
  const onResultCountChange = vi.fn()
  const query = { search: '' }
  const datasource = new CursorInfiniteDatasource<string, Query>({
    pageSize: 20,
    initialQuery: query,
    getQuery: () => query,
    fetchPage,
    onLoadFailed,
    onLoadStateChange,
    onResultCountChange,
  })
  const staleSuccess = vi.fn()

  datasource.getRows(createParams(0, staleSuccess))
  await vi.waitFor(() => expect(fetchPage).toHaveBeenCalledTimes(1))

  datasource.reset()
  resolveStalePage({
    rows: ['stale page'],
    totalCount: 99,
    endCursor: 'stale-cursor',
    hasNextPage: true,
  })
  await vi.waitFor(() => expect(onLoadStateChange).toHaveBeenLastCalledWith(false))

  expect(staleSuccess).not.toHaveBeenCalled()
  expect(onLoadFailed).not.toHaveBeenCalled()
  expect(onResultCountChange).not.toHaveBeenCalled()
  expect(datasource.rowCount).toBe(0)

  const freshSuccess = vi.fn()
  datasource.getRows(createParams(20, freshSuccess))
  await vi.waitFor(() => expect(freshSuccess).toHaveBeenCalledOnce())

  expect(fetchPage.mock.calls.map(([, after]) => after)).toEqual([
    null,
    null,
    'fresh-cursor',
  ])
  expect(freshSuccess).toHaveBeenCalledWith(['fresh page 2'], 21)
  expect(datasource.rowCount).toBe(21)
})
