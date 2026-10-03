import { Box, SimpleGrid, Text } from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import { KpiTile } from '../../components/KpiTile'
import { useFormat } from '../../i18n/useFormat'
import { filterByPeriod, latest, periodDelta } from '../../lib/metrics'
import type { Period } from '../../lib/period'
import { bodyStatsMetrics, type BodyStatsMetricKey } from './bodyStatsMetrics'
import type { BodyStatsSeries } from './bodyStatsSeries'

export interface BodyStatsKpisProps {
  series: BodyStatsSeries
  metric: BodyStatsMetricKey
  period: Period
  now: Date
  onSelectMetric: (metric: BodyStatsMetricKey) => void
}

/** One tile per measurement: latest value, change within the period; selecting one drives the chart. */
export function BodyStatsKpis({ series, metric, period, now, onSelectMetric }: BodyStatsKpisProps) {
  const { t } = useTranslation()
  const format = useFormat()
  const newest = latest(series.weight)

  return (
    <Box>
      <SimpleGrid
        as="ul"
        listStyleType="none"
        m="0"
        p="0"
        columns={{ base: 2, md: 3, lg: 5 }}
        gap="3"
        aria-label={t('bodyStats.kpi.group')}
      >
        {bodyStatsMetrics.map((definition, index) => {
          const points = series[definition.key]
          const value = latest(points)?.value
          const delta = periodDelta(points, period, now)
          const hasPeriodPoints = filterByPeriod(points, period, now).length > 0

          return (
            <Box
              as="li"
              key={definition.key}
              // The fifth tile spans the 2-column phone grid, so no cell stays empty.
              gridColumn={
                index === bodyStatsMetrics.length - 1 ? { base: 'span 2', md: 'auto' } : undefined
              }
            >
              <KpiTile
                label={t(definition.labelKey)}
                value={value === undefined ? undefined : format.number(value, definition.decimals)}
                unit={definition.unit}
                delta={
                  delta === undefined
                    ? undefined
                    : {
                        text: format.signed(delta, definition.unit, definition.decimals),
                        direction:
                          Number(delta.toFixed(definition.decimals)) === 0
                            ? 'flat'
                            : delta > 0
                              ? 'up'
                              : 'down',
                      }
                }
                note={
                  value === undefined
                    ? t('bodyStats.kpi.noData')
                    : delta === undefined
                      ? t(
                          hasPeriodPoints
                            ? 'bodyStats.kpi.notEnoughData'
                            : 'bodyStats.kpi.noPeriodData',
                        )
                      : t(`period.in.${period}`)
                }
                selected={definition.key === metric}
                onSelect={() => onSelectMetric(definition.key)}
              />
            </Box>
          )
        })}
      </SimpleGrid>
      {newest && (
        <Text mt="3" fontSize="sm" color="fg.muted">
          {t('bodyStats.kpi.lastMeasured', { date: format.date(newest.date) })}
        </Text>
      )}
    </Box>
  )
}
