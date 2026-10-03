import { graphql, useFragment } from 'react-relay'
import type { MetricPoint } from '../../lib/metrics'
import type {
  bodyStatsSeries_entries$data,
  bodyStatsSeries_entries$key,
} from './__generated__/bodyStatsSeries_entries.graphql'
import { bodyStatsMetrics, type BodyStatsMetricKey } from './bodyStatsMetrics'

const seriesFragment = graphql`
  fragment bodyStatsSeries_entries on BodyStats @relay(plural: true) {
    date
    weight
    bodyFatPercentage
    musclePercentage
    waterPercentage
    boneMass
  }
`

export type BodyStatsSeries = Record<BodyStatsMetricKey, MetricPoint[]>

export function toSeries(entries: bodyStatsSeries_entries$data): BodyStatsSeries {
  const series = {} as BodyStatsSeries
  for (const { key } of bodyStatsMetrics) {
    series[key] = entries.map((entry) => ({ date: new Date(entry.date), value: entry[key] }))
  }
  return series
}

/** The measurements of all entries as one time series per metric (unsorted, as delivered). */
export function useBodyStatsSeries(entries: bodyStatsSeries_entries$key): BodyStatsSeries {
  return toSeries(useFragment(seriesFragment, entries))
}

export type { bodyStatsSeries_entries$key }
