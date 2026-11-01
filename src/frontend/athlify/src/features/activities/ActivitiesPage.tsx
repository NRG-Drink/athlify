import { Button, Stack } from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
import { graphql, useLazyLoadQuery, usePaginationFragment } from 'react-relay'
import { useTranslation } from 'react-i18next'
import { LuBike, LuRotateCcw } from 'react-icons/lu'
import { Page, PageEmptyState } from '../../components/Page'
import { DataTableSkeleton } from '../../components/DataTableSkeleton'
import { QueryBoundary } from '../../components/QueryBoundary'
import { useFetchKey } from '../../relay/useFetchKey'
import { useLoadMore } from '../../relay/useLoadMore'
import { useParamsRefresh } from '../../relay/useParamsRefresh'
import { activeActivityFilterKeys, type ActivityFilters } from './activityFilters'
import {
  activityQueryVariables,
  applyActivityQuery,
  parseActivityQuery,
  type ActivityQuery,
  type ActivitySort,
} from './activityQuery'
import { ActivitiesFilterSummary } from './ActivitiesFilterSummary'
import { ActivitiesTable } from './ActivitiesTable'
import { vehicleLabel } from './activityFormatting'
import type { ActivitiesPage_list$key } from './__generated__/ActivitiesPage_list.graphql'
import type { ActivitiesPageQuery } from './__generated__/ActivitiesPageQuery.graphql'
import type { ActivitiesPageMoreQuery } from './__generated__/ActivitiesPageMoreQuery.graphql'

const PAGE_SIZE = 50

const pageQuery = graphql`
  query ActivitiesPageQuery(
    $first: Int = 50
    $where: ActivityFilterInput
    $order: [ActivitySortInput!]
  ) {
    ...ActivitiesPage_list @arguments(first: $first, where: $where, order: $order)
    vehicles(first: 200) {
      nodes {
        id
        brand
        model
        nickname
      }
      pageInfo {
        hasNextPage
      }
    }
    gadgets(first: 200) {
      nodes {
        id
        brand
        model
        nickname
      }
      pageInfo {
        hasNextPage
      }
    }
    tags(first: 200) {
      nodes {
        id
        name
      }
      pageInfo {
        hasNextPage
      }
    }
  }
`

const listFragment = graphql`
  fragment ActivitiesPage_list on Query
  @refetchable(queryName: "ActivitiesPageMoreQuery")
  @argumentDefinitions(
    first: { type: "Int", defaultValue: 50 }
    after: { type: "String" }
    where: { type: "ActivityFilterInput" }
    order: { type: "[ActivitySortInput!]" }
  ) {
    activities(first: $first, after: $after, where: $where, order: $order)
      @connection(key: "ActivitiesPage_activities") {
      __id
      totalCount
      edges {
        node {
          id
          ...ActivitiesTable_entries
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
    # The most recent activity regardless of filters: a new one starts with its type and bicycle.
    latest: activities(first: 1, order: [{ date: DESC }, { id: DESC }]) {
      nodes {
        id
        type
        vehicle {
          id
        }
      }
    }
  }
`

interface ContentProps {
  fetchKey: number
}

function ActivitiesContent({ fetchKey }: ContentProps) {
  const { t } = useTranslation()
  const { searchParams, replaceParams, refreshing } = useParamsRefresh()
  const query = useMemo(() => parseActivityQuery(searchParams), [searchParams])
  const { filters, sort } = query
  const variables = useMemo(() => ({ first: PAGE_SIZE, ...activityQueryVariables(query) }), [query])
  const queryData = useLazyLoadQuery<ActivitiesPageQuery>(pageQuery, variables, {
    fetchKey,
    fetchPolicy: 'network-only',
  })
  const { data, hasNext, isLoadingNext, loadNext } = usePaginationFragment<
    ActivitiesPageMoreQuery,
    ActivitiesPage_list$key
  >(listFragment, queryData)
  const activities = useMemo(
    () => data.activities?.edges?.map((edge) => edge.node) ?? [],
    [data.activities],
  )
  const vehicles = useMemo(
    () =>
      queryData.vehicles?.nodes?.map((vehicle) => ({
        id: vehicle.id,
        label: vehicleLabel(vehicle),
      })) ?? [],
    [queryData.vehicles],
  )
  const tags = useMemo(
    () => queryData.tags?.nodes?.map((tag) => ({ id: tag.id, label: tag.name })) ?? [],
    [queryData.tags],
  )
  const hasMoreVehicles = queryData.vehicles?.pageInfo.hasNextPage ?? false
  const hasMoreTags = queryData.tags?.pageInfo.hasNextPage ?? false

  const { loadMore, loadMoreError, setLoadMoreError } = useLoadMore(
    loadNext,
    isLoadingNext,
    PAGE_SIZE,
  )

  const changeQuery = useCallback(
    (next: ActivityQuery) => {
      setLoadMoreError(false)
      replaceParams(applyActivityQuery(searchParams, next))
    },
    [searchParams, replaceParams, setLoadMoreError],
  )
  const changeFilters = useCallback(
    (next: ActivityFilters) => changeQuery({ ...query, filters: next }),
    [changeQuery, query],
  )
  const changeSort = useCallback(
    (next: ActivitySort) => changeQuery({ ...query, sort: next }),
    [changeQuery, query],
  )

  const resetFilters = () => changeFilters({})

  const filtered = activeActivityFilterKeys(filters).length > 0
  const summary = (
    <ActivitiesFilterSummary
      value={filters}
      vehicles={vehicles}
      tags={tags}
      hasMoreVehicles={hasMoreVehicles}
      hasMoreTags={hasMoreTags}
      onChange={changeFilters}
      onReset={resetFilters}
    />
  )

  // Without filters an empty list is the first-use state: nothing to filter, so no table.
  if (activities.length === 0 && !filtered) {
    return (
      <PageEmptyState
        icon={LuBike}
        title={t('activities.empty.title')}
        message={t('activities.empty.message')}
      />
    )
  }

  return (
    <Stack gap="6">
      {summary}
      <ActivitiesTable
        entries={activities}
        hasNextPage={hasNext}
        isLoadingNext={isLoadingNext}
        loadMoreError={loadMoreError}
        onLoadMore={loadMore}
        filters={filters}
        vehicles={vehicles}
        tags={tags}
        hasMoreVehicles={hasMoreVehicles}
        hasMoreTags={hasMoreTags}
        onFiltersChange={changeFilters}
        sort={sort}
        onSortChange={changeSort}
        totalCount={data.activities?.totalCount ?? 0}
        busy={refreshing}
        emptyMessage={
          <PageEmptyState
            icon={LuBike}
            title={t('activities.empty.filteredTitle')}
            message={t('activities.empty.filteredMessage')}
            action={
              <Button onClick={resetFilters}>
                <LuRotateCcw aria-hidden />
                {t('activities.filters.reset')}
              </Button>
            }
          />
        }
      />
    </Stack>
  )
}

export function ActivitiesPage() {
  const { t } = useTranslation()
  const [fetchKey, retry] = useFetchKey()

  return (
    <Page title={t('nav.activities')}>
      <QueryBoundary
        onRetry={retry}
        fallback={<DataTableSkeleton />}
        errorMessage={t('activities.loadFailed')}
      >
        <ActivitiesContent fetchKey={fetchKey} />
      </QueryBoundary>
    </Page>
  )
}
