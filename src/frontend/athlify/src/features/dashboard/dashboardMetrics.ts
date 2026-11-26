import type { ActivityBucket } from '../../lib/aggregate'
import type { MetricUnit } from '../../lib/metrics'

export const trackMetricKeys = ['distance', 'hours', 'elevationGain', 'tss', 'speed'] as const

export type TrackMetricKey = (typeof trackMetricKeys)[number]

export interface TrackMetric {
  key: TrackMetricKey
  /** i18n key of the label. */
  labelKey: string
  unit: MetricUnit
  decimals: number
  value: (bucket: ActivityBucket) => number | undefined
}

export const trackMetrics: readonly TrackMetric[] = [
  {
    key: 'distance',
    labelKey: 'dashboard.metrics.distance',
    unit: 'km',
    decimals: 1,
    value: (bucket) => bucket.distance,
  },
  {
    key: 'hours',
    labelKey: 'dashboard.metrics.hours',
    unit: 'h',
    decimals: 1,
    value: (bucket) => bucket.hours,
  },
  {
    key: 'elevationGain',
    labelKey: 'dashboard.metrics.elevationGain',
    unit: 'm',
    decimals: 0,
    value: (bucket) => bucket.elevationGain,
  },
  {
    key: 'tss',
    labelKey: 'dashboard.metrics.tss',
    unit: 'TSS',
    decimals: 0,
    value: (bucket) => bucket.tss,
  },
  {
    key: 'speed',
    labelKey: 'dashboard.metrics.speed',
    unit: 'km/h',
    decimals: 1,
    value: (bucket) => bucket.speed,
  },
]

export const trackMetricByKey = (key: TrackMetricKey) =>
  trackMetrics.find((metric) => metric.key === key) ?? trackMetrics[0]

export const parseTrackMetric = (raw: unknown): TrackMetricKey =>
  trackMetrics.find((metric) => metric.key === raw)?.key ?? 'distance'
