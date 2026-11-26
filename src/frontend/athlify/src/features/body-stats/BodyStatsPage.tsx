import { Button, Stack } from '@chakra-ui/react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LuActivity, LuPlus } from 'react-icons/lu'
import { useSearchParams } from 'react-router-dom'
import { Page, PageEmptyState } from '../../components/Page'
import { useFetchKey } from '../../relay/useFetchKey'
import { BodyStatsChart } from './BodyStatsChart'
import { newMeasurementInput } from './bodyStatsForm'
import { BodyStatsGrid } from './BodyStatsGrid'
import { getGridQuery } from './BodyStatsGridQuery'
import { BodyStatsPageControls } from './BodyStatsPageControls'
import type { BodyStatsRow } from './BodyStatsGridTypes'
import { parseMetric, type BodyStatsMetricKey } from './bodyStatsMetrics'
import { useBodyStatsOverview } from './useBodyStatsOverview'
import { useBodyStatsPreferences } from './bodyStatsPreferences'
import { useBodyStatsMutations } from './useBodyStatsMutations'
import { useBodyStatsPageState } from './useBodyStatsPageState'

interface ContentProps {
  refreshKey: number
  onDataChanged: () => void
}

function BodyStatsContent({ refreshKey, onDataChanged }: ContentProps) {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const overview = useBodyStatsOverview(refreshKey)
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
    mutations.add(newMeasurementInput(overview.latestValues), {
      onSuccess: (created) => {
        setCreatedRow(created)
        setGridRefreshVersion((version) => version + 1)
        onDataChanged()
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
      {overview.isEmpty && (
        <PageEmptyState
          icon={LuActivity}
          title={t('bodyStats.empty.title')}
          message={t('bodyStats.empty.message')}
          action={
            <Button onClick={createMeasurement} loading={mutations.isSaving}>
              <LuPlus aria-hidden />
              {t('bodyStats.empty.action')}
            </Button>
          }
        />
      )}

      {!overview.isEmpty && (
        <Stack gap="6">
          <BodyStatsPageControls
            filters={state.filters}
            views={state.views}
            open={preferences.controlsOpen}
            onOpenChange={(controlsOpen) => updatePreferences({ controlsOpen })}
          />
          <BodyStatsChart
            where={chartWhere}
            refreshKey={refreshKey}
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
            isCreating={mutations.isSaving || !overview.isLoaded}
            onCreate={createMeasurement}
            onDataChanged={onDataChanged}
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
  const [refreshKey, onDataChanged] = useFetchKey()

  return (
    <Page title={t('nav.bodyStats')}>
      <BodyStatsContent refreshKey={refreshKey} onDataChanged={onDataChanged} />
    </Page>
  )
}
