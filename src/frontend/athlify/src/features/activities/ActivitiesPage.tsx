import { Button, Stack } from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
import { graphql, useLazyLoadQuery } from 'react-relay'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LuBike, LuRotateCcw } from 'react-icons/lu'
import { Page, PageEmptyState } from '../../components/Page'
import { DataTableSkeleton } from '../../components/DataTableSkeleton'
import { QueryBoundary } from '../../components/QueryBoundary'
import { useFetchKey } from '../../relay/useFetchKey'
import type { FilterOption } from './activityFilters'
import { ActivitiesTable } from './ActivitiesTable'
import { ActivitiesGridControls } from './ActivitiesGridControls'
import { useCreateTag } from './useCreateTag'
import { vehicleLabel } from './activityFormatting'
import { useActivitiesPageState } from './useActivitiesPageState'
import type { ActivitiesPageQuery } from './__generated__/ActivitiesPageQuery.graphql'

const pageQuery = graphql`
  query ActivitiesPageQuery {
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
      __id
      nodes {
        id
        name
      }
      pageInfo {
        hasNextPage
      }
    }
    # The most recent activity regardless of filters: a new one starts with its type.
    latest: activities(first: 1, order: [{ date: DESC }, { id: DESC }]) {
      nodes {
        id
        type
      }
    }
  }
`

type Equipment = { id: string; brand: string; model: string; nickname?: string | null }

const equipmentOptions = (items: readonly Equipment[] | null | undefined): FilterOption[] =>
  items?.map((item) => ({ id: item.id, label: vehicleLabel(item) })) ?? []

const tagOptions = (
  items: readonly { id: string; name: string }[] | null | undefined,
): FilterOption[] => items?.map((tag) => ({ id: tag.id, label: tag.name })) ?? []

interface ContentProps {
  fetchKey: number
}

function ActivitiesContent({ fetchKey }: ContentProps) {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const replaceParams = useCallback(
    (next: URLSearchParams) => setSearchParams(next, { replace: true }),
    [setSearchParams],
  )
  const pageState = useActivitiesPageState(searchParams, replaceParams)
  const { query } = pageState
  const queryData = useLazyLoadQuery<ActivitiesPageQuery>(
    pageQuery,
    {},
    { fetchKey, fetchPolicy: 'store-and-network' },
  )
  const tagMutation = useCreateTag(queryData.tags?.__id)

  const vehicles = useMemo(() => equipmentOptions(queryData.vehicles?.nodes), [queryData.vehicles])
  const gadgets = useMemo(() => equipmentOptions(queryData.gadgets?.nodes), [queryData.gadgets])
  const tags = useMemo(() => tagOptions(queryData.tags?.nodes), [queryData.tags])
  const hasMoreVehicles = queryData.vehicles?.pageInfo.hasNextPage ?? false
  const hasMoreGadgets = queryData.gadgets?.pageInfo.hasNextPage ?? false
  const hasMoreTags = queryData.tags?.pageInfo.hasNextPage ?? false
  const latest = queryData.latest?.nodes?.[0]

  const filtered =
    Object.keys(query.filters).length > 0 ||
    Object.keys(query.gridFilters).length > 0 ||
    Boolean(query.quickFilter || query.fromFilter || query.toFilter)

  const emptyMessage = useMemo(
    () =>
      filtered ? (
        <PageEmptyState
          icon={LuBike}
          title={t('activities.empty.filteredTitle')}
          message={t('activities.empty.filteredMessage')}
          action={
            <Button onClick={pageState.filters.onResetFilters}>
              <LuRotateCcw aria-hidden />
              {t('activities.filters.reset')}
            </Button>
          }
        />
      ) : (
        <PageEmptyState
          icon={LuBike}
          title={t('activities.empty.title')}
          message={t('activities.empty.message')}
        />
      ),
    [filtered, pageState.filters.onResetFilters, t],
  )

  return (
    <Stack gap="6">
      <ActivitiesGridControls filters={pageState.filters} views={pageState.views} />
      <ActivitiesTable
        query={query}
        filterModel={pageState.filterModel}
        vehicles={vehicles}
        vehicleRecords={queryData.vehicles?.nodes ?? []}
        gadgets={gadgets}
        gadgetRecords={queryData.gadgets?.nodes ?? []}
        tags={tags}
        tagRecords={queryData.tags?.nodes ?? []}
        onCreateTag={tagMutation.createTag}
        isCreatingTag={tagMutation.isCreating}
        hasMoreVehicles={hasMoreVehicles}
        hasMoreGadgets={hasMoreGadgets}
        hasMoreTags={hasMoreTags}
        onGridStateChange={pageState.onGridStateChange}
        columnState={pageState.columnState}
        resetTableVersion={pageState.resetTableVersion}
        onColumnStateChange={pageState.onColumnStateChange}
        latestType={latest?.type}
        emptyMessage={emptyMessage}
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
