import type { IDatasource, IGetRowsParams, SortModelItem } from 'ag-grid-community'

export type CursorPage<TRow> = {
  rows: ReadonlyArray<TRow>
  totalCount: number
  endCursor: string | null
  hasNextPage: boolean
}

type CursorInfiniteDatasourceOptions<TRow, TQuery> = {
  pageSize: number
  initialQuery: TQuery
  getQuery: (sort: SortModelItem[], filters: Record<string, unknown>) => TQuery
  fetchPage: (first: number, after: string | null, query: TQuery) => Promise<CursorPage<TRow>>
  mapRow?: (row: TRow) => TRow
  onLoadFailed: (failed: boolean) => void
  onLoadStateChange: (loading: boolean) => void
  onResultCountChange?: (count: number) => void
}

export class CursorInfiniteDatasource<TRow, TQuery> implements IDatasource {
  private activeQueryKey: string
  private generation = 0
  private cursors = new Map<number, string | null>([[0, null]])
  private nextBlockStart = 0
  private hasNextPage = true
  private totalCount = 0
  private pendingRequests = 0
  private requestQueue: Promise<void> = Promise.resolve()
  private destroyed = false
  private readonly options: CursorInfiniteDatasourceOptions<TRow, TQuery>

  constructor(options: CursorInfiniteDatasourceOptions<TRow, TQuery>) {
    this.options = options
    this.activeQueryKey = this.queryKey(options.initialQuery)
  }

  get rowCount(): number {
    return this.totalCount
  }

  reset(): void {
    this.resetForQuery(this.activeQueryKey)
  }

  getRows = (params: IGetRowsParams<TRow>): void => {
    const query = this.options.getQuery(params.sortModel, params.filterModel)
    const queryKey = this.queryKey(query)
    if (queryKey !== this.activeQueryKey) this.resetForQuery(queryKey)

    this.pendingRequests += 1
    this.options.onLoadStateChange(true)
    const generation = this.generation
    const request = this.requestQueue.then(() =>
      this.loadRows(params.startRow, query, generation),
    )
    // This ensures that requests are processed sequentially, maintaining the correct order of row loading and preventing race conditions.
    this.requestQueue = request.then(
      () => undefined,
      () => undefined,
    )

    void request
      .then(
        (rows) => {
          if (!this.isCurrent(generation) || rows === null) return
          this.options.onLoadFailed(false)
          params.successCallback(
            rows.map((row) => (this.options.mapRow ?? identity)(row)),
            this.totalCount,
          )
        },
        () => {
          if (!this.isCurrent(generation)) return
          this.options.onLoadFailed(true)
          params.failCallback()
        },
      )
      .finally(() => {
        this.pendingRequests -= 1
        this.options.onLoadStateChange(this.pendingRequests > 0)
      })
  }

  destroy(): void {
    this.destroyed = true
  }

  private async loadRows(
    startRow: number,
    query: TQuery,
    generation: number,
  ): Promise<ReadonlyArray<TRow> | null> {
    if (!this.isCurrent(generation)) return null

    // Load rows until we have a cursor for the requested startRow or there are no more pages.
    while (!this.cursors.has(startRow) && this.hasNextPage) {
      const cursor = this.cursors.get(this.nextBlockStart)
      if (cursor === undefined) {
        throw new Error('The connection has no cursor for its next page.')
      }
      const rows = await this.fetchBlock(this.nextBlockStart, cursor, query, generation)
      if (rows === null) return null
    }

    const cursor = this.cursors.get(startRow)
    if (cursor === undefined) return []
    return this.fetchBlock(startRow, cursor, query, generation)
  }

  private async fetchBlock(
    startRow: number,
    cursor: string | null,
    query: TQuery,
    generation: number,
  ): Promise<ReadonlyArray<TRow> | null> {
    if (!this.isCurrent(generation)) return null
    const page = await this.options.fetchPage(this.options.pageSize, cursor, query)
    if (!this.isCurrent(generation)) return null

    this.totalCount = page.totalCount
    this.options.onResultCountChange?.(page.totalCount)
    if (startRow === this.nextBlockStart) {
      this.hasNextPage = page.hasNextPage
      this.nextBlockStart += this.options.pageSize
      if (page.endCursor) this.cursors.set(this.nextBlockStart, page.endCursor)
    }
    return page.rows
  }

  private resetForQuery(queryKey: string): void {
    this.activeQueryKey = queryKey
    this.generation += 1
    this.cursors = new Map([[0, null]])
    this.nextBlockStart = 0
    this.hasNextPage = true
    this.totalCount = 0
  }

  private isCurrent(generation: number): boolean {
    return !this.destroyed && generation === this.generation
  }

  private queryKey(query: TQuery): string {
    return JSON.stringify(query)
  }
}

function identity<TRow>(row: TRow): TRow {
  return row
}
