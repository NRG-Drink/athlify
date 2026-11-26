import type { GridApi } from 'ag-grid-community'
import { useCallback, useMemo, useState } from 'react'
import { useRelayEnvironment, type GraphQLTaggedNode } from 'react-relay'
import type { ActivityFilterInput } from './__generated__/ActivitiesTablePageQuery.graphql'
import { ActivitiesDataSource, type GridQuery } from './ActivitiesDataSource'
import type { ActivityRow } from './ActivitiesGridTypes'
import {
  activityQueryVariables,
  defaultActivitySort,
  splitActivityFilterModel,
  type ActivityGridFilterModel,
  type ActivityQuery,
  type ActivitySort,
} from './activityQuery'

interface UseActivitiesRowsOptions {
  pageQuery: GraphQLTaggedNode
  /** The URL-backed query; the grid's own filter and sort model are sent to the server on top of it. */
  query: ActivityQuery
  gridApi: GridApi<ActivityRow> | null
}

/** Loads the pages of activities for the grid, and reloads them after a change. */
export function useActivitiesRows({ pageQuery, query, gridApi }: UseActivitiesRowsOptions) {
  const environment = useRelayEnvironment()
  const [loadFailed, setLoadFailed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<{ count: number } | null>(null)
  const { quickFilter, fromFilter, toFilter } = query

  const getQuery = useCallback(
    (gridSort: ActivitySort, gridFilters: ActivityGridFilterModel): GridQuery => {
      const { where, order } = activityQueryVariables({
        ...splitActivityFilterModel(gridFilters),
        quickFilter,
        fromFilter,
        toFilter,
        sort: gridSort,
      })
      return { where: (where ?? null) as ActivityFilterInput | null, order }
    },
    [fromFilter, quickFilter, toFilter],
  )

  const onResultCountChange = useCallback((count: number) => setResult({ count }), [])

  const datasource = useMemo(
    () =>
      new ActivitiesDataSource({
        environment,
        pageQuery,
        initialQuery: getQuery(defaultActivitySort, {}),
        getQuery,
        onLoadFailed: setLoadFailed,
        onLoadStateChange: setLoading,
        onResultCountChange,
      }),
    [environment, getQuery, onResultCountChange, pageQuery],
  )

  const reloadRows = useCallback(() => {
    datasource.reset()
    gridApi?.refreshInfiniteCache()
  }, [datasource, gridApi])

  return { datasource, loading, loadFailed, result, reloadRows }
}
