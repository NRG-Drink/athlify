import { Button, Stack } from '@chakra-ui/react'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { graphql, useLazyLoadQuery, usePaginationFragment } from 'react-relay'
import { useTranslation } from 'react-i18next'
import { LuActivity, LuPlus } from 'react-icons/lu'
import { useSearchParams } from 'react-router-dom'
import { Page, PageEmptyState } from '../../components/Page'
import { QueryBoundary } from '../../components/QueryBoundary'
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
import { BodyStatsChart } from './BodyStatsChart'
import { emptyValues } from './bodyStatsForm'
import { BodyStatsGrid } from './BodyStatsGrid'
import { BodyStatsPageControls } from './BodyStatsPageControls'
import { BodyStatsFormDialog } from './BodyStatsFormDialog'
import { BodyStatsKpis } from './BodyStatsKpis'
import { bodyStatsMetrics, parseMetric, type BodyStatsMetricKey } from './bodyStatsMetrics'
import { useBodyStatsSeries } from './bodyStatsSeries'
import { BodyStatsSkeleton } from './BodyStatsSkeleton'
import { useBodyStatsMutations } from './useBodyStatsMutations'
import { useBodyStatsPageState } from './useBodyStatsPageState'

const ANALYTICS_PAGE_SIZE = 200

const analyticsQuery = graphql`
  query BodyStatsPageQuery {
    ...BodyStatsPage_analytics
  }
`

const analyticsFragment = graphql`
  fragment BodyStatsPage_analytics on Query
  @refetchable(queryName: "BodyStatsPageMoreQuery")
  @argumentDefinitions(first: { type: "Int", defaultValue: 200 }, after: { type: "String" }) {
    bodyStats(first: $first, after: $after) @connection(key: "BodyStatsPage_analytics__bodyStats") {
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

type AnalyticsStatus = 'pending' | 'ready' | 'empty'

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

interface ContentProps {
  analyticsFetchKey: number
  retryAnalytics: () => void
  dialogOpen: boolean
  onDialogOpenChange: (open: boolean) => void
}

function BodyStatsContent({
  analyticsFetchKey,
  retryAnalytics,
  dialogOpen,
  onDialogOpenChange,
}: ContentProps) {
  const { t } = useTranslation()
  const [analyticsStatus, setAnalyticsStatus] = useState<AnalyticsStatus>('pending')
  const [latestValues, setLatestValues] = useState<Partial<Record<BodyStatsMetricKey, number>>>({})
  const [gridRefreshVersion, setGridRefreshVersion] = useState(0)
  const mutations = useBodyStatsMutations()
  const state = useBodyStatsPageState()

  // New entries start from the latest known value of each measurement, which may come from an older entry.
  const prefill = useMemo(() => emptyValues(latestValues), [latestValues])

  const openCreate = () => onDialogOpenChange(true)
  const closeDialog = () => onDialogOpenChange(false)

  return (
    <Stack gap="8">
      <QueryBoundary
        onRetry={retryAnalytics}
        fallback={<BodyStatsSkeleton />}
        errorMessage={t('bodyStats.loadFailed')}
      >
        <BodyStatsAnalytics
          fetchKey={analyticsFetchKey}
          onCreate={openCreate}
          onStatusChange={setAnalyticsStatus}
          onLatestChange={setLatestValues}
        />
      </QueryBoundary>

      {analyticsStatus !== 'empty' && (
        <Stack gap="6">
          <BodyStatsPageControls filters={state.filters} views={state.views} />
          <BodyStatsGrid
            where={state.where}
            filterModel={state.filterModel}
            sortModel={state.sortModel}
            columnState={state.columnState}
            resetTableVersion={state.resetTableVersion}
            refreshVersion={gridRefreshVersion}
            onCreate={openCreate}
            onColumnStateChange={state.onColumnStateChange}
            onGridStateChange={state.onGridStateChange}
          />
        </Stack>
      )}

      <BodyStatsFormDialog
        open={dialogOpen}
        onOpenChange={onDialogOpenChange}
        mode="create"
        initialValues={prefill}
        busy={mutations.isSaving}
        onSave={(input) =>
          mutations.add(input, {
            onSuccess: () => {
              closeDialog()
              setGridRefreshVersion((version) => version + 1)
            },
          })
        }
      />
    </Stack>
  )
}

export function BodyStatsPage() {
  const { t } = useTranslation()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [analyticsFetchKey, retryAnalytics] = useFetchKey()

  return (
    <Page title={t('nav.bodyStats')}>
      <BodyStatsContent
        analyticsFetchKey={analyticsFetchKey}
        retryAnalytics={retryAnalytics}
        dialogOpen={dialogOpen}
        onDialogOpenChange={setDialogOpen}
      />
    </Page>
  )
}
