import type { TrendMarker } from '../../components/TrendChart'
import {
  aggregateActivities,
  aggregateBodyStats,
  bucketKey,
  bucketRange,
  type ActivityBucket,
  type BodyBucket,
  type Grouping,
} from '../../lib/aggregate'
import { computeFitness, type FitnessDay } from '../../lib/fitness'
import { dateFromKey, localDateKey, type DateRange } from '../../lib/period'
import { toMarkers } from './dashboardEvents'
import { ALL_SINCE } from './useDashboardPageState'
import type { DashboardData } from './useDashboardData'

export interface DashboardView {
  /** First day of every bucket of the displayed range, oldest first. */
  buckets: { key: string; start: Date }[]
  activities: Map<string, ActivityBucket>
  bodyStats: Map<string, BodyBucket>
  /** The fitness at the end of each bucket. */
  fitness: Map<string, FitnessDay>
  markers: TrendMarker[]
  /** Whether the range holds any activity, measurement or event. */
  hasData: boolean
}

const byKey = <T extends { key: string }>(items: readonly T[]) =>
  new Map(items.map((item) => [item.key, item]))

/** The earliest day with data, so a range that starts "at the beginning" does not list empty years. */
function firstDataKey(data: DashboardData, fallback: string): string {
  const keys = [
    ...data.activities.map((row) => localDateKey(row.date)),
    ...data.bodyStats.map((row) => localDateKey(row.date)),
    ...data.events.map((event) => event.startDate),
  ].sort()
  return keys[0] ?? fallback
}

/**
 * Everything the dashboard shows, derived from the loaded data: the activities are cut to the
 * range (the days before it only warm up the fitness), then bucketed by the grouping.
 */
export function buildDashboardView(
  data: DashboardData,
  range: DateRange,
  grouping: Grouping,
): DashboardView {
  const fromKey = range.from === ALL_SINCE ? firstDataKey(data, range.to) : range.from
  const from = dateFromKey(fromKey)
  const to = dateFromKey(range.to)
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate() + 1)

  const inRange = data.activities.filter(
    (row) => row.date.getTime() >= from.getTime() && row.date.getTime() < end.getTime(),
  )
  const fitness = new Map<string, FitnessDay>()
  for (const day of computeFitness(data.activities, to)) {
    if (day.date.getTime() >= from.getTime()) fitness.set(bucketKey(day.date, grouping), day)
  }

  const buckets = bucketRange(from, to, grouping).map((start) => ({
    key: localDateKey(start),
    start,
  }))
  const markers = buckets.length
    ? toMarkers(data.events, grouping, buckets[0].key, buckets[buckets.length - 1].key)
    : []

  return {
    buckets,
    activities: byKey(aggregateActivities(inRange, grouping)),
    bodyStats: byKey(aggregateBodyStats(data.bodyStats, grouping)),
    fitness,
    markers,
    hasData: inRange.length > 0 || data.bodyStats.length > 0 || data.events.length > 0,
  }
}
