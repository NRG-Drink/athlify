import type { Grouping } from '../../lib/aggregate'
import type { DashboardView } from './dashboardView'
import type { BucketLabels } from './useBucketLabels'

/** One bucket of the overview table; a missing value means the period has no data for it. */
export interface DashboardTableRow {
  /** First day of the bucket as `YYYY-MM-DD`; also the row id and the sort value of the period. */
  key: string
  period: string
  count: number | undefined
  hours: number | undefined
  distance: number | undefined
  elevationGain: number | undefined
  tss: number | undefined
  speed: number | undefined
  weight: number | undefined
  bodyFat: number | undefined
  muscle: number | undefined
  water: number | undefined
  bone: number | undefined
  ctl: number | undefined
  atl: number | undefined
  tsb: number | undefined
  events: string
}

/** The rows of the overview table, one per bucket of the displayed range. */
export function buildTableRows(
  view: DashboardView,
  grouping: Grouping,
  labels: BucketLabels,
): DashboardTableRow[] {
  return view.buckets.map(({ key, start }) => {
    const activity = view.activities.get(key)
    const body = view.bodyStats.get(key)
    const form = view.fitness.get(key)
    return {
      key,
      period: labels.full(start, grouping),
      count: activity?.count,
      hours: activity?.hours,
      distance: activity?.distance,
      elevationGain: activity?.elevationGain,
      tss: activity?.tss,
      speed: activity?.speed,
      weight: body?.weight,
      bodyFat: body?.bodyFatPercentage,
      muscle: body?.musclePercentage,
      water: body?.waterPercentage,
      bone: body?.boneMass,
      ctl: form?.ctl,
      atl: form?.atl,
      tsb: form?.tsb,
      events: view.markers
        .filter((marker) => marker.startKey <= key && key <= marker.endKey)
        .map((marker) => marker.name)
        .join(', '),
    }
  })
}
