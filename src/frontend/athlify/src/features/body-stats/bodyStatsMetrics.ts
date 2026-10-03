import type { MetricDefinition } from '../../lib/metrics'

export type BodyStatsMetricKey =
  'weight' | 'bodyFatPercentage' | 'musclePercentage' | 'waterPercentage' | 'boneMass'

/** The single source for tiles, chart, table columns and form fields of a measurement. */
export const bodyStatsMetrics: readonly MetricDefinition<BodyStatsMetricKey>[] = [
  {
    key: 'weight',
    labelKey: 'bodyStats.metrics.weight',
    unit: 'kg',
    decimals: 1,
    min: 0,
    exclusiveMin: true,
  },
  {
    key: 'bodyFatPercentage',
    labelKey: 'bodyStats.metrics.bodyFatPercentage',
    unit: '%',
    decimals: 1,
    min: 0,
    max: 100,
  },
  {
    key: 'musclePercentage',
    labelKey: 'bodyStats.metrics.musclePercentage',
    unit: '%',
    decimals: 1,
    min: 0,
    max: 100,
  },
  {
    key: 'waterPercentage',
    labelKey: 'bodyStats.metrics.waterPercentage',
    unit: '%',
    decimals: 1,
    min: 0,
    max: 100,
  },
  {
    key: 'boneMass',
    labelKey: 'bodyStats.metrics.boneMass',
    unit: 'kg',
    decimals: 1,
    min: 0,
    exclusiveMin: true,
  },
]

export const defaultMetric: BodyStatsMetricKey = 'weight'

/** Reads a metric from user-controlled input (for example a URL parameter); unknown values fall back. */
export function parseMetric(raw: string | null): BodyStatsMetricKey {
  return bodyStatsMetrics.find((metric) => metric.key === raw)?.key ?? defaultMetric
}

export const metricByKey = (key: BodyStatsMetricKey) =>
  bodyStatsMetrics.find((metric) => metric.key === key) ?? bodyStatsMetrics[0]
