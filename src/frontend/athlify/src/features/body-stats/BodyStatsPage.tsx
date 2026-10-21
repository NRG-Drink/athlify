import { Button, Flex, Heading, Skeleton, Stack } from '@chakra-ui/react'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { graphql, useLazyLoadQuery, usePaginationFragment } from 'react-relay'
import { useTranslation } from 'react-i18next'
import { LuActivity, LuPlus } from 'react-icons/lu'
import { useSearchParams } from 'react-router-dom'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Page, PageEmptyState } from '../../components/Page'
import { QueryBoundary } from '../../components/QueryBoundary'
import { useFormat } from '../../i18n/useFormat'
import { useFetchKey } from '../../relay/useFetchKey'
import { latest } from '../../lib/metrics'
import {
  defaultDateRange,
  parseAggregation,
  parseDateRange,
  type Aggregation,
  type DateRange,
} from '../../lib/period'
import { toaster } from '../../components/ui/toaster'
import type { BodyStatsPage_analytics$key } from './__generated__/BodyStatsPage_analytics.graphql'
import type { BodyStatsPageMoreQuery } from './__generated__/BodyStatsPageMoreQuery.graphql'
import type { BodyStatsPageQuery } from './__generated__/BodyStatsPageQuery.graphql'
import type { BodyStatsPage_history$key } from './__generated__/BodyStatsPage_history.graphql'
import type { BodyStatsPageHistoryMoreQuery } from './__generated__/BodyStatsPageHistoryMoreQuery.graphql'
import type { BodyStatsPageHistoryQuery } from './__generated__/BodyStatsPageHistoryQuery.graphql'
import { BodyStatsChart } from './BodyStatsChart'
import { emptyValues, toInputValue, type BodyStatsFormValues } from './bodyStatsForm'
import { BodyStatsFormDialog } from './BodyStatsFormDialog'
import { BodyStatsKpis } from './BodyStatsKpis'
import { bodyStatsMetrics, parseMetric, type BodyStatsMetricKey } from './bodyStatsMetrics'
import { useBodyStatsSeries } from './bodyStatsSeries'
import { BodyStatsSkeleton } from './BodyStatsSkeleton'
import { BodyStatsTable, type BodyStatsRow } from './BodyStatsTable'
import { useBodyStatsMutations } from './useBodyStatsMutations'

const ANALYTICS_PAGE_SIZE = 200
const HISTORY_PAGE_SIZE = 50

const analyticsQuery = graphql`
  query BodyStatsPageQuery {
    ...BodyStatsPage_analytics
  }
`

const analyticsFragment = graphql`
  fragment BodyStatsPage_analytics on Query
  @refetchable(queryName: "BodyStatsPageMoreQuery")
  @argumentDefinitions(first: { type: "Int", defaultValue: 200 }, after: { type: "String" }) {
    bodyStats(first: $first, after: $after)
      @connection(key: "BodyStatsPage_analytics__bodyStats") {
      edges {
        node {
          ...bodyStatsSeries_entries
        }
      }
      pageInfo {
        hasNextPage
      }
    }
  }
`

const historyQuery = graphql`
  query BodyStatsPageHistoryQuery {
    ...BodyStatsPage_history
  }
`

const historyFragment = graphql`
  fragment BodyStatsPage_history on Query
  @refetchable(queryName: "BodyStatsPageHistoryMoreQuery")
  @argumentDefinitions(first: { type: "Int", defaultValue: 50 }, after: { type: "String" }) {
    bodyStats(first: $first, after: $after)
      @connection(key: "BodyStatsPage_history__bodyStats") {
      edges {
        node {
          ...BodyStatsTable_entries
        }
      }
      pageInfo {
        hasNextPage
      }
    }
  }
`

type Dialog = { kind: 'closed' } | { kind: 'create' } | { kind: 'edit'; row: BodyStatsRow }
type AnalyticsStatus = 'pending' | 'ready' | 'empty'

function rowToValues(row: BodyStatsRow): BodyStatsFormValues {
  return {
    date: toInputValue(row.date),
    weight: String(row.weight),
    bodyFatPercentage: String(row.bodyFatPercentage),
    musclePercentage: String(row.musclePercentage),
    waterPercentage: String(row.waterPercentage),
    boneMass: String(row.boneMass),
    note: row.comment ?? '',
  }
}

interface AnalyticsProps {
  fetchKey: number
  onCreate: () => void
  onStatusChange: (status: Exclude<AnalyticsStatus, 'pending'>) => void
  onLatestChange: (values: Partial<Record<BodyStatsMetricKey, number>>) => void
}

function BodyStatsAnalytics({
  fetchKey,
  onCreate,
  onStatusChange,
  onLatestChange,
}: AnalyticsProps) {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [isChartPending, startChartTransition] = useTransition()
  const [pagingFailed, setPagingFailed] = useState(false)
  const queryData = useLazyLoadQuery<BodyStatsPageQuery>(
    analyticsQuery,
    {},
    { fetchKey, fetchPolicy: 'store-or-network' },
  )
  const { data, hasNext, isLoadingNext, loadNext } = usePaginationFragment<
    BodyStatsPageMoreQuery,
    BodyStatsPage_analytics$key
  >(analyticsFragment, queryData)
  const bodyStats = useMemo(
    () => (data.bodyStats?.edges ?? []).map((edge) => edge.node),
    [data.bodyStats],
  )

  useEffect(() => {
    onStatusChange(bodyStats.length === 0 && !hasNext ? 'empty' : 'ready')
  }, [bodyStats.length, hasNext, onStatusChange])

  useEffect(() => {
    if (!hasNext || isLoadingNext || pagingFailed) return
    startChartTransition(() => {
      loadNext(ANALYTICS_PAGE_SIZE, {
        onComplete: (error) => {
          if (!error) return
          setPagingFailed(true)
          toaster.create({ type: 'error', title: t('bodyStats.loadFailed') })
        },
      })
    })
  }, [hasNext, isLoadingNext, loadNext, pagingFailed, startChartTransition, t])

  const series = useBodyStatsSeries(bodyStats)
  // The series is rebuilt on every render, so the memo is keyed on the entries it derives from.
  const latestValues = useMemo(() => {
    const values: Partial<Record<BodyStatsMetricKey, number>> = {}
    for (const { key } of bodyStatsMetrics) values[key] = latest(series[key])?.value
    return values
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodyStats])

  useEffect(() => onLatestChange(latestValues), [latestValues, onLatestChange])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const now = useMemo(() => new Date(), [bodyStats])
  const metric = parseMetric(searchParams.get('metric'))
  const range = parseDateRange(
    searchParams.get('from'),
    searchParams.get('to'),
    defaultDateRange(now),
    now,
    searchParams.get('period'),
  )
  const aggregation = parseAggregation(searchParams.get('aggregation'))

  const setView = (next: {
    metric?: BodyStatsMetricKey
    range?: DateRange
    aggregation?: Aggregation
  }) =>
    startChartTransition(() =>
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current)
          if (next.metric) params.set('metric', next.metric)
          if (next.range) {
            params.set('from', next.range.from)
            params.set('to', next.range.to)
            params.delete('period')
          }
          if (next.aggregation) params.set('aggregation', next.aggregation)
          return params
        },
        { replace: true },
      ),
    )

  if (bodyStats.length === 0 && !hasNext) {
    return (
      <PageEmptyState
        icon={LuActivity}
        title={t('bodyStats.empty.title')}
        message={t('bodyStats.empty.message')}
        action={
          <Button onClick={onCreate}>
            <LuPlus aria-hidden />
            {t('bodyStats.empty.action')}
          </Button>
        }
      />
    )
  }

  return (
    <Stack gap="8">
      <BodyStatsKpis
        series={series}
        metric={metric}
        range={range}
        onSelectMetric={(next) => setView({ metric: next })}
      />
      <BodyStatsChart
        series={series}
        metric={metric}
        range={range}
        aggregation={aggregation}
        isPending={isChartPending}
        onRangeChange={(next) => setView({ range: next.range, aggregation: next.aggregation })}
      />
    </Stack>
  )
}

interface HistoryProps {
  fetchKey: number
  onCreate: () => void
  onEdit: (row: BodyStatsRow) => void
  onDelete: (row: BodyStatsRow) => void
}

function BodyStatsHistory({ fetchKey, onCreate, onEdit, onDelete }: HistoryProps) {
  const { t } = useTranslation()
  const { data, hasNext, isLoadingNext, loadNext } = usePaginationFragment<
    BodyStatsPageHistoryMoreQuery,
    BodyStatsPage_history$key
  >(historyFragment, useLazyLoadQuery<BodyStatsPageHistoryQuery>(
    historyQuery,
    {},
    { fetchKey, fetchPolicy: 'store-or-network' },
  ))
  const [loadMoreError, setLoadMoreError] = useState(false)
  const rows = useMemo(
    () => (data.bodyStats?.edges ?? []).map((edge) => edge.node),
    [data.bodyStats],
  )

  const loadMore = () => {
    if (isLoadingNext) return
    setLoadMoreError(false)
    loadNext(HISTORY_PAGE_SIZE, {
      onComplete: (error) => {
        if (error) setLoadMoreError(true)
      },
    })
  }

  return (
    <Stack gap="4">
      <Flex justify="space-between" align="center" gap="3" wrap="wrap">
        <Heading as="h2" size="lg">
          {t('bodyStats.history')}
        </Heading>
        <Button onClick={onCreate}>
          <LuPlus aria-hidden />
          {t('bodyStats.add.open')}
        </Button>
      </Flex>
      <BodyStatsTable
        entries={rows}
        hasNextPage={hasNext}
        isLoadingNext={isLoadingNext}
        loadMoreError={loadMoreError}
        onLoadMore={loadMore}
        onRetryLoadMore={loadMore}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </Stack>
  )
}

function BodyStatsHistorySkeleton() {
  return (
    <Stack gap="2" role="status" aria-busy="true">
      {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} h="10" />)}
    </Stack>
  )
}

interface ContentProps {
  fetchKey: number
  dialog: Dialog
  onDialogChange: (dialog: Dialog) => void
  onRetry: () => void
}

function BodyStatsContent({ fetchKey, dialog, onDialogChange, onRetry }: ContentProps) {
  const { t } = useTranslation()
  const format = useFormat()
  const [deleting, setDeleting] = useState<BodyStatsRow | null>(null)
  const [analyticsStatus, setAnalyticsStatus] = useState<AnalyticsStatus>('pending')
  const [latestValues, setLatestValues] = useState<Partial<Record<BodyStatsMetricKey, number>>>({})
  const mutations = useBodyStatsMutations()

  // New entries start from the latest known value of each measurement, which may come from an older entry.
  const prefill = useMemo(() => emptyValues(latestValues), [latestValues])

  const closeDialog = () => onDialogChange({ kind: 'closed' })
  const openCreate = () => onDialogChange({ kind: 'create' })

  return (
    <Stack gap="8">
      <QueryBoundary
        onRetry={onRetry}
        fallback={<BodyStatsSkeleton />}
        errorMessage={t('bodyStats.loadFailed')}
      >
        <BodyStatsAnalytics
          fetchKey={fetchKey}
          onCreate={openCreate}
          onStatusChange={setAnalyticsStatus}
          onLatestChange={setLatestValues}
        />
      </QueryBoundary>

      {analyticsStatus !== 'empty' && (
        <QueryBoundary
          onRetry={onRetry}
          fallback={<BodyStatsHistorySkeleton />}
          errorMessage={t('bodyStats.loadFailed')}
        >
          <BodyStatsHistory
            fetchKey={fetchKey}
            onCreate={openCreate}
            onEdit={(row) => onDialogChange({ kind: 'edit', row })}
            onDelete={setDeleting}
          />
        </QueryBoundary>
      )}

      <BodyStatsFormDialog
        open={dialog.kind !== 'closed'}
        onOpenChange={(open) => !open && closeDialog()}
        mode={dialog.kind === 'edit' ? 'edit' : 'create'}
        initialValues={dialog.kind === 'edit' ? rowToValues(dialog.row) : prefill}
        busy={mutations.isSaving}
        onSave={(input) =>
          dialog.kind === 'edit'
            ? mutations.update(dialog.row.id, input, { onSuccess: closeDialog })
            : mutations.add(input, { onSuccess: closeDialog })
        }
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t('bodyStats.delete.title')}
        description={
          deleting
            ? t('bodyStats.delete.description', {
                date: format.date(deleting.date),
                weight: format.measure(deleting.weight, 'kg', 1),
              })
            : ''
        }
        confirmLabel={t('bodyStats.delete.confirm')}
        busy={mutations.isDeleting}
        onConfirm={() =>
          deleting && mutations.remove(deleting.id, { onSettled: () => setDeleting(null) })
        }
      />
    </Stack>
  )
}

export function BodyStatsPage() {
  const { t } = useTranslation()
  const [dialog, setDialog] = useState<Dialog>({ kind: 'closed' })
  const [fetchKey, retry] = useFetchKey()

  return (
    <Page title={t('nav.bodyStats')}>
      <QueryBoundary
        onRetry={retry}
        fallback={<BodyStatsSkeleton />}
        errorMessage={t('bodyStats.loadFailed')}
      >
        <BodyStatsContent
          fetchKey={fetchKey}
          dialog={dialog}
          onDialogChange={setDialog}
          onRetry={retry}
        />
      </QueryBoundary>
    </Page>
  )
}
