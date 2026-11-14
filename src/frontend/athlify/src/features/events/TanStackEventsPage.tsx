import { Alert, Button, Grid, Text } from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { graphql, useLazyLoadQuery, usePaginationFragment } from 'react-relay'
import { DataTableSkeleton } from '../../components/DataTableSkeleton'
import { Page, PageEmptyState } from '../../components/Page'
import { QueryBoundary } from '../../components/QueryBoundary'
import { useFetchKey } from '../../relay/useFetchKey'
import { LuCalendarDays } from 'react-icons/lu'
import { TanStackEventsShowcaseTable } from './TanStackEventsShowcaseTable'
import type { TanStackEventsPage_events$key } from './__generated__/TanStackEventsPage_events.graphql'
import type { TanStackEventsPageMoreQuery } from './__generated__/TanStackEventsPageMoreQuery.graphql'
import type { TanStackEventsPageQuery } from './__generated__/TanStackEventsPageQuery.graphql'
import type { TanStackEventsShowcaseTable_rows$key } from './__generated__/TanStackEventsShowcaseTable_rows.graphql'

const PAGE_SIZE = 200

const pageQuery = graphql`
  query TanStackEventsPageQuery($first: Int = 200) {
    ...TanStackEventsPage_events @arguments(first: $first)
  }
`

const listFragment = graphql`
  fragment TanStackEventsPage_events on Query
  @refetchable(queryName: "TanStackEventsPageMoreQuery")
  @argumentDefinitions(first: { type: "Int", defaultValue: 200 }, after: { type: "String" }) {
    events(first: $first, after: $after) @connection(key: "TanStackEventsPage_events") {
      totalCount
      edges {
        node {
          ...TanStackEventsShowcaseTable_rows
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`

function TanStackEventsContent({ fetchKey }: { fetchKey: number }) {
  const { t } = useTranslation()
  const queryData = useLazyLoadQuery<TanStackEventsPageQuery>(pageQuery, { first: PAGE_SIZE }, {
    fetchKey,
    fetchPolicy: 'store-and-network',
  })
  const { data, hasNext, isLoadingNext, loadNext } = usePaginationFragment<
    TanStackEventsPageMoreQuery,
    TanStackEventsPage_events$key
  >(listFragment, queryData)
  const entries = useMemo(
    () =>
      (data.events?.edges ?? []).map((edge) => edge.node) as TanStackEventsShowcaseTable_rows$key,
    [data.events],
  )
  const [loadMoreError, setLoadMoreError] = useState(false)
  const loadingRef = useRef(false)
  const loadNextPage = useCallback(() => {
    if (!hasNext || isLoadingNext || loadingRef.current) return
    loadingRef.current = true
    setLoadMoreError(false)
    loadNext(PAGE_SIZE, {
      onComplete: (error) => {
        loadingRef.current = false
        if (error) setLoadMoreError(true)
      },
    })
  }, [hasNext, isLoadingNext, loadNext])

  useEffect(() => {
    if (hasNext && !loadMoreError) loadNextPage()
  }, [hasNext, loadMoreError, loadNextPage])

  const loadedCount = entries.length
  const totalCount = data.events?.totalCount ?? 0
  const loadingAll = hasNext && !loadMoreError

  if (!loadingAll && totalCount === 0) {
    return (
      <PageEmptyState
        icon={LuCalendarDays}
        title={t('events.empty.title')}
        message={t('events.empty.message')}
      />
    )
  }

  return (
    <Grid gap="4">
      <Text color="fg.muted" fontSize="sm" aria-live="polite">
        {loadingAll
          ? t('events.tanStack.loadingAll', { loaded: loadedCount, count: totalCount })
          : t('events.tanStack.loadedCount', { loaded: loadedCount, count: totalCount })}
      </Text>
      {loadMoreError && (
        <Alert.Root status="error" role="alert" alignItems="center">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{t('events.tanStack.loadAllFailed')}</Alert.Description>
          </Alert.Content>
          <Button size="sm" variant="outline" onClick={loadNextPage}>
            {t('page.retry')}
          </Button>
        </Alert.Root>
      )}
      <TanStackEventsShowcaseTable entries={entries} loading={loadingAll || isLoadingNext} />
    </Grid>
  )
}

export function TanStackEventsPage() {
  const { t } = useTranslation()
  const [fetchKey, retry] = useFetchKey()

  return (
    <Page
      title={t('nav.events')}
    >
      <Grid gap="4">
        <Text color="fg.muted">{t('events.tanStack.description')}</Text>
        <QueryBoundary
          onRetry={retry}
          fallback={<DataTableSkeleton />}
          errorMessage={t('events.loadFailed')}
        >
          <TanStackEventsContent fetchKey={fetchKey} />
        </QueryBoundary>
      </Grid>
    </Page>
  )
}
