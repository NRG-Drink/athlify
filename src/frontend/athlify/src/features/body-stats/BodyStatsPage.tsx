import { Button, Stack } from '@chakra-ui/react'
import { useEffect, useMemo, useState } from 'react'
import { graphql, useLazyLoadQuery } from 'react-relay'
import { useTranslation } from 'react-i18next'
import { LuActivity, LuPlus } from 'react-icons/lu'
import { useSearchParams } from 'react-router-dom'
import { Page, PageEmptyState } from '../../components/Page'
import { QueryBoundary } from '../../components/QueryBoundary'
import { useFetchKey } from '../../relay/useFetchKey'
import type { BodyStatsPageQuery } from './__generated__/BodyStatsPageQuery.graphql'
import { BodyStatsChart } from './BodyStatsChart'
import { newMeasurementInput } from './bodyStatsForm'
import { BodyStatsGrid } from './BodyStatsGrid'
import { getGridQuery } from './BodyStatsGridQuery'
import { BodyStatsPageControls } from './BodyStatsPageControls'
import { useBodyStatsPreferences } from './bodyStatsPreferences'
import type { BodyStatsRow } from './BodyStatsGridTypes'
import { bodyStatsMetrics, parseMetric, type BodyStatsMetricKey } from './bodyStatsMetrics'
import { BodyStatsSkeleton } from './BodyStatsSkeleton'
import { useBodyStatsMutations } from './useBodyStatsMutations'
import { useBodyStatsPageState } from './useBodyStatsPageState'

const overviewQuery = graphql`
  query BodyStatsPageQuery {
    bodyStats(first: 1, order: [{ date: DESC }, { id: DESC }]) {
      totalCount
      nodes {
        weight
        bodyFatPercentage
        musclePercentage
        waterPercentage
        boneMass
      }
    }
  }
`

type LatestValues = Partial<Record<BodyStatsMetricKey, number>>

interface OverviewProps {
  fetchKey: number
  onCreate: () => void
  isCreating: boolean
  onOverviewChange: (overview: { isEmpty: boolean; latestValues: LatestValues }) => void
}

/** Loads whether any measurement exists and the latest values; shows the empty state if none. */
function BodyStatsOverview({ fetchKey, onCreate, isCreating, onOverviewChange }: OverviewProps) {
  const { t } = useTranslation()
  const data = useLazyLoadQuery<BodyStatsPageQuery>(
    overviewQuery,
    {},
    { fetchKey, fetchPolicy: 'network-only' },
  )
  const newest = data.bodyStats?.nodes?.[0]
  const isEmpty = (data.bodyStats?.totalCount ?? 0) === 0
  const latestValues = useMemo(() => {
    const values: LatestValues = {}
    if (newest) for (const { key } of bodyStatsMetrics) values[key] = newest[key]
    return values
  }, [newest])

  useEffect(
    () => onOverviewChange({ isEmpty, latestValues }),
    [isEmpty, latestValues, onOverviewChange],
  )

  if (!isEmpty) return null

  return (
    <PageEmptyState
      icon={LuActivity}
      title={t('bodyStats.empty.title')}
      message={t('bodyStats.empty.message')}
      action={
        <Button onClick={onCreate} loading={isCreating}>
          <LuPlus aria-hidden />
          {t('bodyStats.empty.action')}
        </Button>
      }
    />
  )
}

interface ContentProps {
  overviewFetchKey: number
  refreshOverview: () => void
}

function BodyStatsContent({ overviewFetchKey, refreshOverview }: ContentProps) {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [overview, setOverview] = useState<{ isEmpty: boolean; latestValues: LatestValues } | null>(
    null,
  )
  const [gridRefreshVersion, setGridRefreshVersion] = useState(0)
  const [createdRow, setCreatedRow] = useState<BodyStatsRow | null>(null)
  const mutations = useBodyStatsMutations()
  const state = useBodyStatsPageState()
  const { preferences, updatePreferences } = useBodyStatsPreferences()
  const metricParam = searchParams.get('metric')
  const metric = metricParam ? parseMetric(metricParam) : preferences.metric
  const chartWhere = useMemo(
    () => getGridQuery([], state.filterModel, state.where).where,
    [state.filterModel, state.where],
  )

  const createMeasurement = () =>
    mutations.add(newMeasurementInput(overview?.latestValues ?? {}), {
      onSuccess: (created) => {
        setCreatedRow(created)
        setGridRefreshVersion((version) => version + 1)
        refreshOverview()
      },
    })

  const selectMetric = (next: BodyStatsMetricKey) => {
    updatePreferences({ metric: next })
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current)
        params.set('metric', next)
        return params
      },
      { replace: true },
    )
  }

  return (
    <Stack gap="8">
      <QueryBoundary
        onRetry={refreshOverview}
        fallback={<BodyStatsSkeleton />}
        errorMessage={t('bodyStats.loadFailed')}
      >
        <BodyStatsOverview
          fetchKey={overviewFetchKey}
          onCreate={createMeasurement}
          isCreating={mutations.isSaving}
          onOverviewChange={setOverview}
        />
      </QueryBoundary>

      {overview && !overview.isEmpty && (
        <Stack gap="6">
          <BodyStatsPageControls
            filters={state.filters}
            views={state.views}
            open={preferences.controlsOpen}
            onOpenChange={(controlsOpen) => updatePreferences({ controlsOpen })}
          />
          <BodyStatsChart
            where={chartWhere}
            refreshKey={overviewFetchKey}
            metric={metric}
            onMetricChange={selectMetric}
          />
          <BodyStatsGrid
            where={state.where}
            filterModel={state.filterModel}
            sortModel={state.sortModel}
            columnState={state.columnState}
            resetTableVersion={state.resetTableVersion}
            refreshVersion={gridRefreshVersion}
            createdRow={createdRow}
            isCreating={mutations.isSaving}
            onCreate={createMeasurement}
            onDataChanged={refreshOverview}
            onColumnStateChange={state.onColumnStateChange}
            onGridStateChange={state.onGridStateChange}
          />
        </Stack>
      )}
    </Stack>
  )
}

export function BodyStatsPage() {
  const { t } = useTranslation()
  const [overviewFetchKey, refreshOverview] = useFetchKey()

  return (
    <Page title={t('nav.bodyStats')}>
      <BodyStatsContent overviewFetchKey={overviewFetchKey} refreshOverview={refreshOverview} />
    </Page>
  )
}
