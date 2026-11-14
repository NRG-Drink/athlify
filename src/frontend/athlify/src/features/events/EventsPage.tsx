import { Button, Field, Flex, Grid, Input, NativeSelect } from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { graphql, useLazyLoadQuery, usePaginationFragment } from 'react-relay'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import { LuCalendarDays, LuRotateCcw } from 'react-icons/lu'
import { DataTableSkeleton } from '../../components/DataTableSkeleton'
import { Page, PageEmptyState } from '../../components/Page'
import { QueryBoundary } from '../../components/QueryBoundary'
import { useFetchKey } from '../../relay/useFetchKey'
import { useLoadMore } from '../../relay/useLoadMore'
import { useParamsRefresh } from '../../relay/useParamsRefresh'
import { paths } from '../../navigation/paths'
import { EventsTable } from './EventsTable'
import {
  applyEventQuery,
  defaultEventSort,
  eventQueryVariables,
  eventTypes,
  isEventType,
  parseEventQuery,
  type EventSort,
  type EventType,
} from './eventsQuery'
import type { EventsPage_events$key } from './__generated__/EventsPage_events.graphql'
import type { EventsPageMoreQuery } from './__generated__/EventsPageMoreQuery.graphql'
import type { EventsPageQuery } from './__generated__/EventsPageQuery.graphql'
import type { EventsTable_entries$key } from './__generated__/EventsTable_entries.graphql'

const PAGE_SIZE = 50

const pageQuery = graphql`
  query EventsPageQuery($first: Int = 50, $where: EventFilterInput, $order: [EventSortInput!]) {
    ...EventsPage_events @arguments(first: $first, where: $where, order: $order)
  }
`

const listFragment = graphql`
  fragment EventsPage_events on Query
  @refetchable(queryName: "EventsPageMoreQuery")
  @argumentDefinitions(
    first: { type: "Int", defaultValue: 50 }
    after: { type: "String" }
    where: { type: "EventFilterInput" }
    order: { type: "[EventSortInput!]" }
  ) {
    events(first: $first, after: $after, where: $where, order: $order)
      @connection(key: "EventsPage_events", filters: ["where", "order"]) {
      __id
      totalCount
      edges {
        node {
          ...EventsTable_entries
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`

export type EventsImplementation = 'tanstack' | 'ag-grid'

interface EventsPageProps {
  implementation: EventsImplementation
}

interface EventsContentProps extends EventsPageProps {
  fetchKey: number
  search: string
  onSearchChange: (search: string) => void
}

function EventsSwitcher({
  implementation,
  query,
  search,
  searchParams,
}: {
  implementation: EventsImplementation
  query: ReturnType<typeof parseEventQuery>
  search: string
  searchParams: URLSearchParams
}) {
  const { t } = useTranslation()
  const params = applyEventQuery(searchParams, {
    ...query,
    filters: { ...query.filters, search },
  })
  const searchString = params.toString()
  const route = (pathname: string) => ({
    pathname,
    search: pathname === paths.eventsAgGrid && searchString ? `?${searchString}` : '',
  })

  return (
    <Flex role="group" aria-label={t('events.implementation.label')} gap="2">
      <Button asChild size="sm" variant={implementation === 'tanstack' ? 'solid' : 'outline'}>
        <RouterLink
          to={route(paths.events)}
          aria-current={implementation === 'tanstack' ? 'page' : undefined}
        >
          {t('events.implementation.tanstack')}
        </RouterLink>
      </Button>
      <Button asChild size="sm" variant={implementation === 'ag-grid' ? 'solid' : 'outline'}>
        <RouterLink
          to={route(paths.eventsAgGrid)}
          aria-current={implementation === 'ag-grid' ? 'page' : undefined}
        >
          {t('events.implementation.agGrid')}
        </RouterLink>
      </Button>
    </Flex>
  )
}

function EventsContent({ implementation, fetchKey, search, onSearchChange }: EventsContentProps) {
  const { t } = useTranslation()
  const { searchParams, replaceParams, refreshing } = useParamsRefresh()
  const query = useMemo(() => parseEventQuery(searchParams), [searchParams])
  const variables = useMemo(() => ({ first: PAGE_SIZE, ...eventQueryVariables(query) }), [query])
  const queryData = useLazyLoadQuery<EventsPageQuery>(pageQuery, variables, {
    fetchKey,
    fetchPolicy: 'store-and-network',
  })
  const { data, hasNext, isLoadingNext, loadNext } = usePaginationFragment<
    EventsPageMoreQuery,
    EventsPage_events$key
  >(listFragment, queryData)
  const entries = useMemo(
    () => (data.events?.edges ?? []).map((edge) => edge.node) as EventsTable_entries$key,
    [data.events],
  )
  const totalCount = data.events?.totalCount ?? 0
  const { loadMore, loadMoreError, setLoadMoreError } = useLoadMore(
    loadNext,
    isLoadingNext,
    PAGE_SIZE,
  )

  useEffect(() => {
    if (search === query.filters.search) return
    const timeout = window.setTimeout(() => {
      setLoadMoreError(false)
      replaceParams(
        applyEventQuery(searchParams, {
          ...query,
          filters: { ...query.filters, search },
        }),
      )
    }, 250)
    return () => window.clearTimeout(timeout)
  }, [search, query, replaceParams, searchParams, setLoadMoreError])

  const changeQuery = useCallback(
    (next: { filters: { search: string; type: EventType | undefined }; sort: EventSort }) => {
      setLoadMoreError(false)
      replaceParams(applyEventQuery(searchParams, next))
    },
    [searchParams, replaceParams, setLoadMoreError],
  )

  const changeType = (type: EventType | undefined) =>
    changeQuery({ ...query, filters: { ...query.filters, search, type } })

  const changeSort = (sort: EventSort) =>
    changeQuery({ ...query, filters: { ...query.filters, search }, sort })

  const resetFilters = () => {
    onSearchChange('')
    changeQuery({ ...query, filters: { search: '', type: undefined }, sort: defaultEventSort })
  }

  const filtered = query.filters.search.length > 0 || query.filters.type !== undefined

  const emptyState =
    totalCount === 0 ? (
      filtered ? (
        <PageEmptyState
          icon={LuCalendarDays}
          title={t('events.empty.filteredTitle')}
          message={t('events.empty.filteredMessage')}
          action={
            <Button variant="outline" onClick={resetFilters}>
              <LuRotateCcw aria-hidden />
              {t('events.filters.reset')}
            </Button>
          }
        />
      ) : (
        <PageEmptyState
          icon={LuCalendarDays}
          title={t('events.empty.title')}
          message={t('events.empty.message')}
        />
      )
    ) : null

  return (
    <Grid gap="5">
      <Grid
        alignItems="end"
        gap="4"
        templateColumns={{ base: '1fr', md: 'minmax(0, 2fr) minmax(12rem, 1fr) auto' }}
      >
        <Field.Root>
          <Field.Label>{t('events.filters.search')}</Field.Label>
          <Input
            type="search"
            value={search}
            placeholder={t('events.filters.searchPlaceholder')}
            onChange={(event) => onSearchChange(event.currentTarget.value)}
          />
        </Field.Root>
        <Field.Root>
          <Field.Label>{t('events.filters.type')}</Field.Label>
          <NativeSelect.Root>
            <NativeSelect.Field
              value={query.filters.type ?? ''}
              aria-label={t('events.filters.type')}
              onChange={(event) =>
                changeType(
                  isEventType(event.currentTarget.value) ? event.currentTarget.value : undefined,
                )
              }
            >
              <option value="">{t('events.filters.allTypes')}</option>
              {eventTypes.map((type) => (
                <option key={type} value={type}>
                  {t(`events.types.${type}`)}
                </option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Field.Root>
        {filtered && (
          <Button variant="outline" onClick={resetFilters}>
            <LuRotateCcw aria-hidden />
            {t('events.filters.reset')}
          </Button>
        )}
      </Grid>
      {emptyState ?? (
        <EventsTable
          implementation={implementation}
          entries={entries}
          sort={query.sort}
          onSortChange={changeSort}
          count={t('events.resultCount', { count: totalCount })}
          busy={refreshing}
          hasNextPage={hasNext}
          isLoadingNext={isLoadingNext}
          loadMoreError={loadMoreError}
          onLoadMore={loadMore}
        />
      )}
    </Grid>
  )
}

export function EventsPage({ implementation }: EventsPageProps) {
  const { t } = useTranslation()
  const [fetchKey, retry] = useFetchKey()
  const { searchParams } = useParamsRefresh()
  const location = useLocation()
  const query = useMemo(() => parseEventQuery(searchParams), [searchParams])
  const [searchDraft, setSearchDraft] = useState({
    locationKey: location.key,
    value: query.filters.search,
  })
  const search = searchDraft.locationKey === location.key ? searchDraft.value : query.filters.search
  const onSearchChange = (value: string) => setSearchDraft({ locationKey: location.key, value })

  return (
    <Page
      title={t('nav.events')}
      actions={
        <EventsSwitcher
          implementation={implementation}
          query={query}
          search={search}
          searchParams={searchParams}
        />
      }
    >
      <QueryBoundary
        onRetry={retry}
        fallback={<DataTableSkeleton />}
        errorMessage={t('events.loadFailed')}
      >
        <EventsContent
          implementation={implementation}
          fetchKey={fetchKey}
          search={search}
          onSearchChange={onSearchChange}
        />
      </QueryBoundary>
    </Page>
  )
}
