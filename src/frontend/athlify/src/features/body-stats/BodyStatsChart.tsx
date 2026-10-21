import {
  Box,
  Flex,
  Heading,
  Spinner,
  Stack,
  Text,
  VisuallyHidden,
} from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import { DateRangePicker } from '../../components/DateRangePicker'
import { MetricChart } from '../../components/MetricChart'
import { useFormat } from '../../i18n/useFormat'
import { aggregateByResolution, filterByRange, sortByDate } from '../../lib/metrics'
import { dateFromKey, type Aggregation, type DateRange } from '../../lib/period'
import { metricByKey, type BodyStatsMetricKey } from './bodyStatsMetrics'
import type { BodyStatsSeries } from './bodyStatsSeries'

export interface BodyStatsChartProps {
  series: BodyStatsSeries
  metric: BodyStatsMetricKey
  range: DateRange
  aggregation: Aggregation
  isPending?: boolean
  onRangeChange: (selection: { range: DateRange; aggregation: Aggregation }) => void
}

const DAY = 24 * 60 * 60 * 1000

/** The selected measurement over the selected date range, with its range picker. */
export function BodyStatsChart({
  series,
  metric,
  range,
  aggregation,
  isPending = false,
  onRangeChange,
}: BodyStatsChartProps) {
  const { t } = useTranslation()
  const format = useFormat()
  const definition = metricByKey(metric)
  const points = aggregateByResolution(filterByRange(series[metric], range), aggregation)
  const label = t(definition.labelKey)

  const start = dateFromKey(range.from)
  const end = dateFromKey(range.to)
  const domain: [Date, Date] =
    end.getTime() > start.getTime()
      ? [start, end]
      : [new Date(start.getTime() - DAY), new Date(end.getTime() + DAY)]

  const summary =
    points.length === 0
      ? `${label}: ${t('bodyStats.chart.empty.range')}`
      : t('bodyStats.chart.summary', {
          metric: label,
          fromDate: format.date(dateFromKey(range.from)),
          toDate: format.date(dateFromKey(range.to)),
          from: format.measure(sortByDate(points)[0].value, definition.unit, definition.decimals),
          to: format.measure(points[points.length - 1].value, definition.unit, definition.decimals),
          count: points.length,
        })

  return (
    <Stack
      position="relative"
      gap="4"
      bg="bg.panel"
      borderWidth="1px"
      borderRadius="l3"
      p={{ base: '4', md: '6' }}
    >
      <Flex
        direction={{ base: 'column', md: 'row' }}
        justify="space-between"
        align={{ base: 'stretch', md: 'start' }}
        gap="4"
      >
        <Flex align="baseline" gap="2">
          <Heading as="h2" size="lg">
            {label}
          </Heading>
          <Text color="fg.muted">{definition.unit}</Text>
        </Flex>
        <DateRangePicker value={{ range, aggregation }} onChange={onRangeChange} />
      </Flex>
      <MetricChart
        points={points}
        unit={definition.unit}
        decimals={definition.decimals}
        summary={summary}
        domain={domain}
        emptyMessage={t('bodyStats.chart.empty.range')}
      />
      {isPending && (
        <Box
          position="absolute"
          inset="0"
          display="flex"
          alignItems="center"
          justifyContent="center"
          bg="bg.panel/80"
          borderRadius="inherit"
          role="status"
          aria-live="polite"
        >
          <Spinner size="lg" color="colorPalette.solid" />
          <VisuallyHidden>{t('page.loading')}</VisuallyHidden>
        </Box>
      )}
    </Stack>
  )
}
