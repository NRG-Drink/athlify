import { type SortModelItem } from 'ag-grid-community'
import { fetchQuery, type Environment, type GraphQLTaggedNode } from 'react-relay'
import { CursorInfiniteDatasource } from '../events/CursorInfiniteDatasource'
import type {
  BodyStatsFilterInput,
  BodyStatsGridPageQuery,
  BodyStatsSortInput,
} from './__generated__/BodyStatsGridPageQuery.graphql'
import type { BodyStatsRow } from './BodyStatsGridTypes'

const PAGE_SIZE = 20

type GridQuery = {
  where: BodyStatsFilterInput | null
  order: BodyStatsSortInput[]
}

type DataSourceOptions = {
  environment: Environment
  pageQuery: GraphQLTaggedNode
  initialWhere: BodyStatsFilterInput | null
  initialOrder: BodyStatsSortInput[]
  getQuery: (sort: SortModelItem[], filters: Record<string, unknown>) => GridQuery
  onLoadFailed: (failed: boolean) => void
  onLoadStateChange: (loading: boolean) => void
  onResultCountChange: (count: number) => void
}

export class BodyStatsDataSource extends CursorInfiniteDatasource<BodyStatsRow, GridQuery> {
  constructor({
    environment,
    pageQuery,
    initialWhere,
    initialOrder,
    getQuery,
    onLoadFailed,
    onLoadStateChange,
    onResultCountChange,
  }: DataSourceOptions) {
    super({
      pageSize: PAGE_SIZE,
      initialQuery: { where: initialWhere, order: initialOrder },
      getQuery,
      fetchPage: async (first, after, { where, order }) => {
        const response = await fetchQuery<BodyStatsGridPageQuery>(
          environment,
          pageQuery,
          { first, after, where, order },
          { fetchPolicy: 'network-only' },
        ).toPromise()
        if (!response) throw new Error('The body stats page request returned no response.')
        const connection = response.bodyStats
        if (!connection) throw new Error('The body stats page request returned no connection.')
        return {
          rows: connection.nodes ?? [],
          totalCount: connection.totalCount,
          endCursor: connection.pageInfo.endCursor ?? null,
          hasNextPage: connection.pageInfo.hasNextPage,
        }
      },
      mapRow: (row) => ({ ...row }),
      onLoadFailed,
      onLoadStateChange,
      onResultCountChange,
    })
  }
}
