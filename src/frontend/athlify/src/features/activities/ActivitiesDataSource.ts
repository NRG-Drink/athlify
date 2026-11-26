import { type SortModelItem } from 'ag-grid-community'
import { fetchQuery, type Environment, type GraphQLTaggedNode } from 'react-relay'
import { CursorInfiniteDatasource } from '../events/CursorInfiniteDatasource'
import type {
  ActivitiesTablePageQuery,
  ActivityFilterInput,
  ActivitySortInput,
} from './__generated__/ActivitiesTablePageQuery.graphql'
import type { ActivityRow } from './ActivitiesGridTypes'

const PAGE_SIZE = 20

export type GridQuery = {
  where: ActivityFilterInput | null
  order: ActivitySortInput[]
}

type DataSourceOptions = {
  environment: Environment
  pageQuery: GraphQLTaggedNode
  initialQuery: GridQuery
  getQuery: (sort: SortModelItem[], filters: Record<string, unknown>) => GridQuery
  onLoadFailed: (failed: boolean) => void
  onLoadStateChange: (loading: boolean) => void
  onResultCountChange: (count: number) => void
}

export class ActivitiesDataSource extends CursorInfiniteDatasource<ActivityRow, GridQuery> {
  constructor({
    environment,
    pageQuery,
    initialQuery,
    getQuery,
    onLoadFailed,
    onLoadStateChange,
    onResultCountChange,
  }: DataSourceOptions) {
    super({
      pageSize: PAGE_SIZE,
      initialQuery,
      getQuery,
      fetchPage: async (first, after, { where, order }) => {
        const response = await fetchQuery<ActivitiesTablePageQuery>(
          environment,
          pageQuery,
          { first, after, where, order },
          { fetchPolicy: 'network-only' },
        ).toPromise()
        if (!response) throw new Error('The activities page request returned no response.')
        const connection = response.activities
        if (!connection) throw new Error('The activities page request returned no connection.')
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
