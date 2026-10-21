import { Button, Stack } from '@chakra-ui/react'
import { useCallback, useMemo, useState } from 'react'
import { graphql, useLazyLoadQuery, usePaginationFragment } from 'react-relay'
import { useTranslation } from 'react-i18next'
import { LuBike, LuRotateCcw } from 'react-icons/lu'
import { useLocation, useSearchParams } from 'react-router-dom'
import { Page, PageEmptyState } from '../../components/Page'
import { QueryBoundary } from '../../components/QueryBoundary'
import { useFetchKey } from '../../relay/useFetchKey'
import {
  activeActivityFilterKeys,
  activityFiltersToWhere,
  applyActivityFilters,
  defaultActivityPeriod,
  parseActivityFilters,
} from './activityFilters'
import { ActivitiesFilterSummary } from './ActivitiesFilterSummary'
import { ActivitiesSkeleton } from './ActivitiesSkeleton'
import { ActivitiesTable } from './ActivitiesTable'
import { vehicleLabel } from './activityFormatting'
import type { ActivitiesPage_list$key } from './__generated__/ActivitiesPage_list.graphql'
import type { ActivitiesPageQuery } from './__generated__/ActivitiesPageQuery.graphql'
import type { ActivitiesPageMoreQuery } from './__generated__/ActivitiesPageMoreQuery.graphql'

const PAGE_SIZE = 50

const pageQuery = graphql`
  query ActivitiesPageQuery($first: Int = 50, $where: ActivityFilterInput) {
    ...ActivitiesPage_list @arguments(first: $first, where: $where)
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
  ) {
    activities(first: $first, after: $after, where: $where)
      @connection(key: "ActivitiesPage_activities") {
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
  }
`

interface ContentProps {
  fetchKey: number
}

function ActivitiesContent({ fetchKey }: ContentProps) {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [loadMoreError, setLoadMoreError] = useState(false)
  const filters = useMemo(() => parseActivityFilters(searchParams), [searchParams])
  const variables = useMemo(
    () => ({ first: PAGE_SIZE, where: activityFiltersToWhere(filters) }),
    [filters],
  )
  const queryData = useLazyLoadQuery<ActivitiesPageQuery>(pageQuery, variables, {
    fetchKey,
    fetchPolicy: 'network-only',
  })
  const { data, hasNext, isLoadingNext, loadNext } = usePaginationFragment<
    ActivitiesPageMoreQuery,
    ActivitiesPage_list$key
  >(listFragment, queryData)
  const activities = data.activities?.edges?.map((edge) => edge.node) ?? []
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

  // The router applies the change in a transition, so the old table stays until the new data is
  // there. `pendingKey` is the location the change started from: any later navigation, including
  // one that did not come from a filter change, gives a new location key and ends the gap.
  const location = useLocation()
  const [pendingKey, setPendingKey] = useState<string>()
  const refreshing = pendingKey !== undefined && pendingKey === location.key

  const changeFilters = useCallback(
    (next: typeof filters) => {
      const nextParams = applyActivityFilters(searchParams, next)
      setLoadMoreError(false)
      setPendingKey(location.key)
      setSearchParams(nextParams, { replace: true })
    },
    [location.key, searchParams, setSearchParams],
  )

  const resetFilters = () => changeFilters({ period: defaultActivityPeriod })

  const loadMore = () => {
    if (isLoadingNext) return
    setLoadMoreError(false)
    loadNext(PAGE_SIZE, {
      onComplete: (error) => {
        if (error) setLoadMoreError(true)
      },
    })
  }

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
        onRetryLoadMore={loadMore}
        filters={filters}
        vehicles={vehicles}
        tags={tags}
        hasMoreVehicles={hasMoreVehicles}
        hasMoreTags={hasMoreTags}
        onFiltersChange={changeFilters}
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
        fallback={<ActivitiesSkeleton />}
        errorMessage={t('activities.loadFailed')}
      >
        <ActivitiesContent fetchKey={fetchKey} />
      </QueryBoundary>
    </Page>
  )
}
