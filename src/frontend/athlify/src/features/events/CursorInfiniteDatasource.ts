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
}

export class CursorInfiniteDatasource<TRow, TQuery> implements IDatasource {
  private activeQueryKey: string
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

  getRows = (params: IGetRowsParams<TRow>): void => {
    const query = this.options.getQuery(params.sortModel, params.filterModel)
    const queryKey = this.queryKey(query)
    if (queryKey !== this.activeQueryKey) this.resetForQuery(queryKey)

    this.pendingRequests += 1
    this.options.onLoadStateChange(true)
    const generationKey = this.activeQueryKey
    const request = this.requestQueue.then(() =>
      this.loadRows(params.startRow, query, generationKey),
    )
    // This ensures that requests are processed sequentially, maintaining the correct order of row loading and preventing race conditions.
    this.requestQueue = request.then(
      () => undefined,
      () => undefined,
    )

    void request.then(
      (rows) => {
        if (!this.isCurrent(generationKey) || rows === null) return
        this.options.onLoadFailed(false)
        params.successCallback(rows.map((row) => (this.options.mapRow ?? identity)(row)), this.totalCount)
      },
      () => {
        if (!this.isCurrent(generationKey)) return
        this.options.onLoadFailed(true)
        params.failCallback()
      },
    ).finally(() => {
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
    generationKey: string,
  ): Promise<ReadonlyArray<TRow> | null> {
    // Load rows until we have a cursor for the requested startRow or there are no more pages.
    while (!this.cursors.has(startRow) && this.hasNextPage) {
      const cursor = this.cursors.get(this.nextBlockStart)
      if (cursor === undefined) {
        throw new Error('The connection has no cursor for its next page.')
      }
      const rows = await this.fetchBlock(this.nextBlockStart, cursor, query, generationKey)
      if (rows === null) return null
    }

    const cursor = this.cursors.get(startRow)
    if (cursor === undefined) return []
    return this.fetchBlock(startRow, cursor, query, generationKey)
  }

  private async fetchBlock(
    startRow: number,
    cursor: string | null,
    query: TQuery,
    generationKey: string,
  ): Promise<ReadonlyArray<TRow> | null> {
    const page = await this.options.fetchPage(this.options.pageSize, cursor, query)
    if (!this.isCurrent(generationKey)) return null

    this.totalCount = page.totalCount
    if (startRow === this.nextBlockStart) {
      this.hasNextPage = page.hasNextPage
      this.nextBlockStart += this.options.pageSize
      if (page.endCursor) this.cursors.set(this.nextBlockStart, page.endCursor)
    }
    return page.rows
  }

  private resetForQuery(queryKey: string): void {
    this.activeQueryKey = queryKey
    this.cursors = new Map([[0, null]])
    this.nextBlockStart = 0
    this.hasNextPage = true
    this.totalCount = 0
  }

  private isCurrent(generationKey: string): boolean {
    return !this.destroyed && generationKey === this.activeQueryKey
  }

  private queryKey(query: TQuery): string {
    return JSON.stringify(query)
  }
}

function identity<TRow>(row: TRow): TRow {
  return row
}
