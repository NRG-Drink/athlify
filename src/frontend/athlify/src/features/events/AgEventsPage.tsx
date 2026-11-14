import { Alert, Button, Flex, Grid, Text } from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { graphql, useLazyLoadQuery, usePaginationFragment } from 'react-relay'
import { Link as RouterLink } from 'react-router-dom'
import { DataTableSkeleton } from '../../components/DataTableSkeleton'
import { Page } from '../../components/Page'
import { QueryBoundary } from '../../components/QueryBoundary'
import { useFetchKey } from '../../relay/useFetchKey'
import { paths } from '../../navigation/paths'
import { AgEventsGrid } from './AgEventsGrid'
import type { AgEventsGrid_rows$key } from './__generated__/AgEventsGrid_rows.graphql'
import type { AgEventsPage_events$key } from './__generated__/AgEventsPage_events.graphql'
import type { AgEventsPageMoreQuery } from './__generated__/AgEventsPageMoreQuery.graphql'
import type { AgEventsPageQuery } from './__generated__/AgEventsPageQuery.graphql'

const PAGE_SIZE = 200

const pageQuery = graphql`
  query AgEventsPageQuery($first: Int = 200) {
    ...AgEventsPage_events @arguments(first: $first)
  }
`

const listFragment = graphql`
  fragment AgEventsPage_events on Query
  @refetchable(queryName: "AgEventsPageMoreQuery")
  @argumentDefinitions(first: { type: "Int", defaultValue: 200 }, after: { type: "String" }) {
    events(first: $first, after: $after)
      @connection(key: "AgEventsPage_events") {
      totalCount
      edges {
        node {
          ...AgEventsGrid_rows
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`

function AgEventsContent({ fetchKey }: { fetchKey: number }) {
  const { t } = useTranslation()
  const queryData = useLazyLoadQuery<AgEventsPageQuery>(pageQuery, { first: PAGE_SIZE }, {
    fetchKey,
    fetchPolicy: 'store-and-network',
  })
  const { data, hasNext, isLoadingNext, loadNext } = usePaginationFragment<
    AgEventsPageMoreQuery,
    AgEventsPage_events$key
  >(listFragment, queryData)
  const entries = useMemo(
    () => (data.events?.edges ?? []).map((edge) => edge.node) as AgEventsGrid_rows$key,
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

  return (
    <Grid gap="4">
      <Text color="fg.muted" fontSize="sm" aria-live="polite">
        {loadingAll
          ? t('events.agEvents.loadingAll', { loaded: loadedCount, count: totalCount })
          : t('events.agEvents.loadedCount', { loaded: loadedCount, count: totalCount })}
      </Text>
      {loadMoreError && (
        <Alert.Root status="error" role="alert" alignItems="center">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{t('events.agEvents.loadAllFailed')}</Alert.Description>
          </Alert.Content>
          <Button size="sm" variant="outline" onClick={loadNextPage}>
            {t('page.retry')}
          </Button>
        </Alert.Root>
      )}
      <AgEventsGrid entries={entries} loading={loadingAll || isLoadingNext} />
    </Grid>
  )
}

export function AgEventsPage() {
  const { t } = useTranslation()
  const [fetchKey, retry] = useFetchKey()

  return (
    <Page
      title={t('nav.agEvents')}
      actions={
        <Flex role="group" aria-label={t('events.implementation.label')} gap="2">
          <Button asChild size="sm" variant="outline">
            <RouterLink to={paths.events}>{t('events.implementation.tanstack')}</RouterLink>
          </Button>
          <Button asChild size="sm" variant="outline">
            <RouterLink to={paths.eventsAgGrid}>{t('events.implementation.agGrid')}</RouterLink>
          </Button>
        </Flex>
      }
    >
      <Grid gap="4">
        <Text color="fg.muted">{t('events.agEvents.description')}</Text>
        <QueryBoundary
          onRetry={retry}
          fallback={<DataTableSkeleton />}
          errorMessage={t('events.loadFailed')}
        >
          <AgEventsContent fetchKey={fetchKey} />
        </QueryBoundary>
      </Grid>
    </Page>
  )
}
