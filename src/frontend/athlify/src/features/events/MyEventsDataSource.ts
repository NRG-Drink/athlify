import { type SortModelItem } from 'ag-grid-community'
import { fetchQuery, type Environment, type GraphQLTaggedNode } from 'react-relay'
import type {
  EventFilterInput,
  EventSortInput,
  MyEventsPageQuery,
} from './__generated__/MyEventsPageQuery.graphql'
import { CursorInfiniteDatasource } from './CursorInfiniteDatasource'

const PAGE_SIZE = 20

type EventRow = NonNullable<
  NonNullable<MyEventsPageQuery['response']['events']>['nodes']
>[number]
type GridQuery = {
  where: EventFilterInput | null
  order: EventSortInput[]
}

type DataSourceOptions = {
  environment: Environment
  pageQuery: GraphQLTaggedNode
  initialWhere: EventFilterInput | null
  initialOrder: EventSortInput[]
  getQuery: (sort: SortModelItem[], filters: Record<string, unknown>) => GridQuery
  onLoadFailed: (failed: boolean) => void
  onLoadStateChange: (loading: boolean) => void
}

export class MyEventsDataSource extends CursorInfiniteDatasource<EventRow, GridQuery> {
  constructor({
    environment,
    pageQuery,
    initialWhere,
    initialOrder,
    getQuery,
    onLoadFailed,
    onLoadStateChange,
  }: DataSourceOptions) {
    super({
      pageSize: PAGE_SIZE,
      initialQuery: { where: initialWhere, order: initialOrder },
      getQuery,
      fetchPage: async (first, after, { where, order }) => {
        const response = await fetchQuery<MyEventsPageQuery>(
          environment,
          pageQuery,
          { first, after, where, order },
          { fetchPolicy: 'store-or-network' },
        ).toPromise()
        if (!response) throw new Error('The events page request returned no response.')
        const connection = response.events
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
    })
  }
}