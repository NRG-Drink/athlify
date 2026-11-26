import { Stack } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Page } from '../../components/Page'
import { TrendChart, type TrendMarker, type TrendSeries } from '../../components/TrendChart'
import { useFormat } from '../../i18n/useFormat'
import { useFetchKey } from '../../relay/useFetchKey'
import { bodyStatsMetrics, metricByKey, parseMetric } from '../body-stats/bodyStatsMetrics'
import { DashboardFilters } from './DashboardFilters'
import { DASHBOARD_CHART_HEIGHT, DashboardMetricCard } from './DashboardMetricCard'
import { DashboardTable } from './DashboardTable'
import { buildTableRows } from './dashboardTableRows'
import { buildDashboardView } from './dashboardView'
import { parseTrackMetric, trackMetricByKey, trackMetrics } from './dashboardMetrics'
import {
  useDashboardPreferences,
  useDashboardViews,
  type DashboardCard,
} from './dashboardPreferences'
import { useBucketLabels } from './useBucketLabels'
import {
  useDashboardActivities,
  useDashboardBodyStats,
  useDashboardEvents,
  type DashboardData,
} from './useDashboardData'
import { useDashboardPageState } from './useDashboardPageState'
import { useDashboardTags } from './useDashboardTags'

const NO_ACTIVITIES: DashboardData['activities'] = []
const NO_BODY_STATS: DashboardData['bodyStats'] = []
const NO_EVENTS: DashboardData['events'] = []
const NO_MARKERS: TrendMarker[] = []

const fitnessLines = [
  { key: 'ctl', color: 'var(--chakra-colors-chart-primary)' },
  { key: 'atl', color: 'var(--chakra-colors-chart-effort)' },
  { key: 'tsb', color: 'var(--chakra-colors-chart-form)' },
] as const

function DashboardContent({ refreshKey }: { refreshKey: number }) {
  const { t } = useTranslation()
  const format = useFormat()
  const labels = useBucketLabels()
  const state = useDashboardPageState()
  const { preferences, updatePreferences } = useDashboardPreferences()
  const savedViews = useDashboardViews()
  const tags = useDashboardTags()
  const activities = useDashboardActivities(state.range, state.filters, refreshKey)
  const bodyStats = useDashboardBodyStats(state.range, refreshKey)
  const events = useDashboardEvents(state.range, refreshKey)
  const allReady =
    activities.status === 'ready' && bodyStats.status === 'ready' && events.status === 'ready'

  const activityRows = activities.status === 'ready' ? activities.data : NO_ACTIVITIES
  const bodyRows = bodyStats.status === 'ready' ? bodyStats.data : NO_BODY_STATS
  const eventRows = events.status === 'ready' ? events.data : NO_EVENTS
  const view = useMemo(() => {
    const data: DashboardData = {
      activities: activityRows,
      bodyStats: bodyRows,
      events: eventRows,
    }
    return buildDashboardView(data, state.range, state.grouping)
  }, [activityRows, bodyRows, eventRows, state.range, state.grouping])

  const tableRows = useMemo(
    () => (allReady ? buildTableRows(view, state.grouping, labels) : undefined),
    [allReady, view, state.grouping, labels],
  )

  const buckets = useMemo(
    () =>
      view.buckets.map(({ key, start }, _index, all) => ({
        key,
        label: labels.axis(
          start,
          state.grouping,
          start.getFullYear() !== all[0].start.getFullYear() ||
            start.getFullYear() !== all[all.length - 1].start.getFullYear(),
        ),
      })),
    [view, labels, state.grouping],
  )

  const trackMetric = trackMetricByKey(preferences.trackMetric)
  const bodyMetric = metricByKey(preferences.bodyMetric)

  const trackSeries = useMemo<TrendSeries[]>(() => {
    const values = new Map<string, number>()
    for (const [key, bucket] of view.activities) {
      const value = trackMetric.value(bucket)
      if (value !== undefined) values.set(key, value)
    }
    return [
      {
        key: trackMetric.key,
        label: t(trackMetric.labelKey),
        unit: trackMetric.unit,
        decimals: trackMetric.decimals,
        color: 'var(--chakra-colors-chart-primary)',
        kind: 'bar',
        values,
      },
    ]
  }, [view, trackMetric, t])

  const fitnessSeries = useMemo<TrendSeries[]>(
    () =>
      fitnessLines.map(({ key, color }) => ({
        key,
        label: t(`dashboard.fitness.${key}`),
        unit: 'TSS',
        decimals: 0,
        color,
        kind: 'line',
        values: new Map([...view.fitness].map(([bucket, day]) => [bucket, day[key]])),
      })),
    [view, t],
  )

  const bodySeries = useMemo<TrendSeries[]>(() => {
    const values = new Map<string, number>()
    for (const [key, bucket] of view.bodyStats) values.set(key, bucket[bodyMetric.key])
    return [
      {
        key: bodyMetric.key,
        label: t(bodyMetric.labelKey),
        unit: bodyMetric.unit,
        decimals: bodyMetric.decimals,
        color: 'var(--chakra-colors-chart-secondary)',
        kind: 'line',
        values,
      },
    ]
  }, [view, bodyMetric, t])

  const setCardOpen = (card: DashboardCard, open: boolean) =>
    updatePreferences({ cardsOpen: { ...preferences.cardsOpen, [card]: open } })

  const first = view.buckets[0]
  const last = view.buckets[view.buckets.length - 1]
  const eventsReady = events.status === 'ready'
  const eventCount = eventsReady ? view.markers.length : 0
  const summaryFor = (title: string, series: readonly TrendSeries[]) =>
    first && last && series.some((entry) => entry.values.size > 0)
      ? t('dashboard.chart.summary', {
          title,
          fromDate: format.date(first.start),
          toDate: format.date(last.start),
          count: series[0].values.size,
          events: eventCount,
        })
      : t('dashboard.chart.emptySummary', { title })
  const eventNote =
    eventCount > 0 ? t('dashboard.chart.eventsNote', { count: eventCount }) : undefined
  const markers = eventsReady ? view.markers : NO_MARKERS

  return (
    <Stack gap="6">
      <DashboardFilters
        state={state}
        tags={tags.options}
        hasMoreTags={tags.hasMore}
        views={savedViews.views}
        viewsStorageFailed={savedViews.storageFailed}
        onSaveView={savedViews.save}
        onDeleteView={savedViews.remove}
        open={preferences.controlsOpen}
        onOpenChange={(controlsOpen) => updatePreferences({ controlsOpen })}
      />

      <DashboardMetricCard
        title={t('dashboard.track.title')}
        status={activities.status}
        open={preferences.cardsOpen.track}
        onOpenChange={(open) => setCardOpen('track', open)}
        onRetry={activities.retry}
        metrics={trackMetrics.map(({ key, labelKey }) => ({ key, label: t(labelKey) }))}
        metric={trackMetric.key}
        onMetricChange={(key) => updatePreferences({ trackMetric: parseTrackMetric(key) })}
        note={eventNote}
      >
        <TrendChart
          buckets={buckets}
          series={trackSeries}
          markers={markers}
          summary={summaryFor(t('dashboard.track.title'), trackSeries)}
          emptyMessage={t('dashboard.track.empty')}
          height={DASHBOARD_CHART_HEIGHT}
        />
      </DashboardMetricCard>

      <DashboardMetricCard
        title={t('dashboard.fitness.title')}
        status={activities.status}
        open={preferences.cardsOpen.fitness}
        onOpenChange={(open) => setCardOpen('fitness', open)}
        onRetry={activities.retry}
        note={t('dashboard.fitness.note')}
      >
        <TrendChart
          buckets={buckets}
          series={fitnessSeries}
          markers={markers}
          summary={summaryFor(t('dashboard.fitness.title'), fitnessSeries)}
          emptyMessage={t('dashboard.fitness.empty')}
          height={DASHBOARD_CHART_HEIGHT}
        />
      </DashboardMetricCard>

      <DashboardMetricCard
        title={t('dashboard.body.title')}
        status={bodyStats.status}
        open={preferences.cardsOpen.body}
        onOpenChange={(open) => setCardOpen('body', open)}
        onRetry={bodyStats.retry}
        metrics={bodyStatsMetrics.map(({ key, labelKey }) => ({ key, label: t(labelKey) }))}
        metric={bodyMetric.key}
        onMetricChange={(key) => updatePreferences({ bodyMetric: parseMetric(key) })}
        note={t('dashboard.body.note')}
      >
        <TrendChart
          buckets={buckets}
          series={bodySeries}
          markers={markers}
          summary={summaryFor(t('dashboard.body.title'), bodySeries)}
          emptyMessage={t('dashboard.body.empty')}
          height={DASHBOARD_CHART_HEIGHT}
        />
      </DashboardMetricCard>

      {tableRows && (
        <DashboardTable
          rows={tableRows}
          open={preferences.cardsOpen.table}
          onOpenChange={(open) => setCardOpen('table', open)}
        />
      )}
    </Stack>
  )
}

export function DashboardPage() {
  const { t } = useTranslation()
  const [refreshKey] = useFetchKey()

  return (
    <Page title={t('nav.dashboard')}>
      <DashboardContent refreshKey={refreshKey} />
    </Page>
  )
}
