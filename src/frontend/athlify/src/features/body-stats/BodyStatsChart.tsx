import { Button, Center, Flex, Heading, SimpleGrid, Skeleton, Stack, Text } from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import { MetricChart } from '../../components/MetricChart'
import { useFormat } from '../../i18n/useFormat'
import { sortByDate, type MetricPoint } from '../../lib/metrics'
import { dateFromKey, localDateKey } from '../../lib/period'
import type { BodyStatsFilterInput } from './__generated__/BodyStatsChartPageQuery.graphql'
import { bodyStatsMetrics, metricByKey, type BodyStatsMetricKey } from './bodyStatsMetrics'
import { useBodyStatsChartPoints } from './useBodyStatsChartPoints'

export interface BodyStatsChartProps {
  /** The table's filters: the chart shows the measurements the table lists. */
  where: BodyStatsFilterInput | null
  /** Changes whenever a measurement was added, edited or deleted. */
  refreshKey: number
  metric: BodyStatsMetricKey
  onMetricChange: (metric: BodyStatsMetricKey) => void
}

const DAY = 24 * 60 * 60 * 1000

/** The chart area is this tall while loading, on error and when drawn, so the page does not jump. */
const CHART_HEIGHT = 240
const EMPTY_VALUE = '—'

function domainOf(points: readonly MetricPoint[]): [Date, Date] {
  const first = dateFromKey(localDateKey(points[0].date))
  const last = dateFromKey(localDateKey(points[points.length - 1].date))
  return last.getTime() > first.getTime()
    ? [first, last]
    : [new Date(first.getTime() - DAY), new Date(last.getTime() + DAY)]
}

interface StatProps {
  label: string
  value: string
}

function Stat({ label, value }: StatProps) {
  return (
    <Stack gap="0">
      <Text textStyle="kicker" color="fg.muted">
        {label}
      </Text>
      <Text textStyle="kpi" fontSize={{ base: 'lg', md: 'xl' }}>
        {value}
      </Text>
    </Stack>
  )
}

/** One selectable measurement over time, for the measurements the table currently lists. */
export function BodyStatsChart({ where, refreshKey, metric, onMetricChange }: BodyStatsChartProps) {
  const { t } = useTranslation()
  const format = useFormat()
  const data = useBodyStatsChartPoints(where, refreshKey)
  const definition = metricByKey(metric)
  const label = t(definition.labelKey)
  const points = data.status === 'ready' ? sortByDate(data.points[metric]) : []
  const first = points[0]
  const last = points[points.length - 1]
  const values = points.map((point) => point.value)
  const measure = (value: number) => format.measure(value, definition.unit, definition.decimals)

  const summary = !first
    ? t('bodyStats.chart.emptySummary', { metric: label, message: t('bodyStats.chart.empty') })
    : t('bodyStats.chart.summary', {
        metric: label,
        fromDate: format.date(first.date),
        toDate: format.date(last.date),
        from: measure(first.value),
        to: measure(last.value),
        count: points.length,
      })

  return (
    <Stack gap="4" bg="bg.panel" borderWidth="1px" borderRadius="l3" p={{ base: '4', md: '6' }}>
      <Heading as="h2" size="lg">
        {t('bodyStats.chart.title')}
      </Heading>
      <Flex role="group" aria-label={t('bodyStats.chart.metricGroup')} wrap="wrap" gap="2">
        {bodyStatsMetrics.map(({ key, labelKey }) => (
          <Button
            key={key}
            size="sm"
            variant={key === metric ? 'solid' : 'outline'}
            aria-pressed={key === metric}
            onClick={() => onMetricChange(key)}
          >
            {t(labelKey)}
          </Button>
        ))}
      </Flex>

      <SimpleGrid columns={{ base: 2, md: 4 }} gap="4">
        <Stat
          label={t('bodyStats.chart.latest')}
          value={first ? measure(last.value) : EMPTY_VALUE}
        />
        <Stat
          label={t('bodyStats.chart.change')}
          value={
            points.length < 2
              ? EMPTY_VALUE
              : format.signed(last.value - first.value, definition.unit, definition.decimals)
          }
        />
        <Stat
          label={t('bodyStats.chart.average')}
          value={
            first
              ? measure(values.reduce((sum, value) => sum + value, 0) / values.length)
              : EMPTY_VALUE
          }
        />
        <Stat
          label={t('bodyStats.chart.range')}
          value={
            first
              ? `${format.number(
                  values.reduce((low, value) => Math.min(low, value)),
                  definition.decimals,
                )} – ${measure(values.reduce((high, value) => Math.max(high, value)))}`
              : EMPTY_VALUE
          }
        />
      </SimpleGrid>

      {data.status === 'failed' && (
        <Center h={`${CHART_HEIGHT}px`} role="alert">
          <Stack align="center" gap="3">
            <Text color="fg.error">{t('bodyStats.loadFailed')}</Text>
            <Button size="sm" variant="outline" onClick={data.retry}>
              {t('page.retry')}
            </Button>
          </Stack>
        </Center>
      )}

      {data.status === 'loading' && (
        <Skeleton
          h={`${CHART_HEIGHT}px`}
          borderRadius="l2"
          role="status"
          aria-busy="true"
          aria-label={t('page.loading')}
        />
      )}

      {data.status === 'ready' && (
        <MetricChart
          points={points}
          unit={definition.unit}
          decimals={definition.decimals}
          summary={summary}
          domain={first ? domainOf(points) : [new Date(), new Date()]}
          emptyMessage={t('bodyStats.chart.empty')}
          height={CHART_HEIGHT}
        />
      )}
    </Stack>
  )
}
