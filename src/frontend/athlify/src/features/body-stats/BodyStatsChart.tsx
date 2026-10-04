import { Button, Flex, Heading, Stack, Text } from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import { MetricChart } from '../../components/MetricChart'
import { PeriodPicker } from '../../components/PeriodPicker'
import { useFormat } from '../../i18n/useFormat'
import { filterByPeriod, sortByDate } from '../../lib/metrics'
import { periodStart, type Period } from '../../lib/period'
import { metricByKey, type BodyStatsMetricKey } from './bodyStatsMetrics'
import type { BodyStatsSeries } from './bodyStatsSeries'

export interface BodyStatsChartProps {
  series: BodyStatsSeries
  metric: BodyStatsMetricKey
  period: Period
  now: Date
  onPeriodChange: (period: Period) => void
}

const DAY = 24 * 60 * 60 * 1000

/** The selected measurement over the selected period, with the period picker. */
export function BodyStatsChart({
  series,
  metric,
  period,
  now,
  onPeriodChange,
}: BodyStatsChartProps) {
  const { t } = useTranslation()
  const format = useFormat()
  const definition = metricByKey(metric)
  const points = filterByPeriod(series[metric], period, now)
  const label = t(definition.labelKey)

  // A bounded period always spans the whole period, so gaps without data stay visible.
  const first = points[0]?.date ?? now
  const last = points[points.length - 1]?.date ?? now
  const start = periodStart(period, now) ?? first
  const end = period === 'all' ? last : new Date(Math.max(now.getTime(), last.getTime()))
  const domain: [Date, Date] =
    end.getTime() > start.getTime()
      ? [start, end]
      : [new Date(start.getTime() - DAY), new Date(end.getTime() + DAY)]

  const summary =
    points.length === 0
      ? `${label}: ${t(`bodyStats.chart.empty.${period}`)}`
      : t('bodyStats.chart.summary', {
          metric: label,
          period: t(`period.long.${period}`),
          from: format.measure(sortByDate(points)[0].value, definition.unit, definition.decimals),
          to: format.measure(points[points.length - 1].value, definition.unit, definition.decimals),
          count: points.length,
        })

  return (
    <Stack gap="4" bg="bg.panel" borderWidth="1px" borderRadius="l3" p={{ base: '4', md: '6' }}>
      <Flex justify="space-between" align="center" gap="3" wrap="wrap">
        <Flex align="baseline" gap="2">
          <Heading as="h2" size="lg">
            {label}
          </Heading>
          <Text color="fg.muted">{definition.unit}</Text>
        </Flex>
        <PeriodPicker value={period} onChange={onPeriodChange} />
      </Flex>
      <MetricChart
        points={points}
        unit={definition.unit}
        decimals={definition.decimals}
        summary={summary}
        domain={domain}
        emptyMessage={t(`bodyStats.chart.empty.${period}`)}
        emptyAction={
          period === 'all' ? undefined : (
            <Button size="sm" variant="ghost" onClick={() => onPeriodChange('all')}>
              {t('bodyStats.chart.showAll')}
            </Button>
          )
        }
      />
    </Stack>
  )
}
