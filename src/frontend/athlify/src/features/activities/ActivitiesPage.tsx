import { Button, Stack } from '@chakra-ui/react'
import { useMemo, useState } from 'react'
import { graphql, useLazyLoadQuery, usePaginationFragment } from 'react-relay'
import { useTranslation } from 'react-i18next'
import { LuBike, LuRotateCcw } from 'react-icons/lu'
import { useSearchParams } from 'react-router-dom'
import { Page, PageEmptyState } from '../../components/Page'
import { QueryBoundary } from '../../components/QueryBoundary'
import { useFetchKey } from '../../relay/useFetchKey'
import { hasActiveActivityFilters, activityFiltersToWhere, applyActivityFilters, parseActivityFilters } from './activityFilters'
import { ActivitiesFilters } from './ActivitiesFilters'
import { ActivitiesSkeleton } from './ActivitiesSkeleton'
import { ActivitiesTable } from './ActivitiesTable'
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
  const vehicles =
    queryData.vehicles?.nodes?.map((vehicle) => ({
      id: vehicle.id,
      label: vehicle.nickname ?? `${vehicle.brand} ${vehicle.model}`,
    })) ?? []
  const tags = queryData.tags?.nodes?.map((tag) => ({ id: tag.id, label: tag.name })) ?? []
  const hasMoreVehicles = queryData.vehicles?.pageInfo.hasNextPage ?? false
  const hasMoreTags = queryData.tags?.pageInfo.hasNextPage ?? false

  const changeFilters = (next: typeof filters) => {
    setLoadMoreError(false)
    setSearchParams(applyActivityFilters(searchParams, next), { replace: true })
  }

  const resetFilters = () => changeFilters({ period: '90d' })

  const loadMore = () => {
    if (isLoadingNext) return
    setLoadMoreError(false)
    loadNext(PAGE_SIZE, {
      onComplete: (error) => {
        if (error) setLoadMoreError(true)
      },
    })
  }

  if (activities.length === 0) {
    return (
      <Stack gap="6">
        <ActivitiesFilters
          value={filters}
          vehicles={vehicles}
          tags={tags}
          hasMoreVehicles={hasMoreVehicles}
          hasMoreTags={hasMoreTags}
          onChange={changeFilters}
          onReset={resetFilters}
        />
        <PageEmptyState
          icon={LuBike}
          title={
            hasActiveActivityFilters(filters)
              ? t('activities.empty.filteredTitle')
              : t('activities.empty.title')
          }
          message={
            hasActiveActivityFilters(filters)
              ? t('activities.empty.filteredMessage')
              : t('activities.empty.message')
          }
          action={
            hasActiveActivityFilters(filters) ? (
              <Button onClick={resetFilters}>
                <LuRotateCcw aria-hidden />
                {t('activities.filters.reset')}
              </Button>
            ) : undefined
          }
        />
      </Stack>
    )
  }

  return (
    <Stack gap="6">
      <ActivitiesFilters
        value={filters}
        vehicles={vehicles}
        tags={tags}
        hasMoreVehicles={hasMoreVehicles}
        hasMoreTags={hasMoreTags}
        onChange={changeFilters}
        onReset={resetFilters}
      />
      <ActivitiesTable
        entries={activities}
        hasNextPage={hasNext}
        isLoadingNext={isLoadingNext}
        loadMoreError={loadMoreError}
        onLoadMore={loadMore}
        onRetryLoadMore={loadMore}
      />
    </Stack>
  )
}

export function ActivitiesPage() {
  const { t } = useTranslation()
  const [fetchKey, retry] = useFetchKey()

  return (
    <Page
      title={t('nav.activities')}
      description={t('activities.description')}
    >
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
