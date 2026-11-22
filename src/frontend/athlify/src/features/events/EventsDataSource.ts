import { type SortModelItem } from 'ag-grid-community'
import { fetchQuery, type Environment, type GraphQLTaggedNode } from 'react-relay'
import type {
  EventFilterInput,
  EventSortInput,
  EventsManagementPageQuery,
} from './__generated__/EventsManagementPageQuery.graphql'
import { CursorInfiniteDatasource } from './CursorInfiniteDatasource'

const PAGE_SIZE = 20

type EventRow = NonNullable<NonNullable<EventsManagementPageQuery['response']['events']>['nodes']>[number]
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
  onResultCountChange: (count: number) => void
}

export class EventsDataSource extends CursorInfiniteDatasource<EventRow, GridQuery> {
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
        const response = await fetchQuery<EventsManagementPageQuery>(
          environment,
          pageQuery,
          { first, after, where, order },
          { fetchPolicy: 'network-only' },
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
      onResultCountChange,
    })
  }
}
