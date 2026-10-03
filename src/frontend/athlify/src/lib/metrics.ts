import { periodStart, type Period } from './period'

/** Describes one measured value; tiles, chart, table columns and form fields are all generated from these. */
export interface MetricDefinition<K extends string = string> {
  key: K
  /** i18n key of the full label, for example `bodyStats.fields.weight`. */
  labelKey: string
  unit: MetricUnit
  decimals: number
  /** Smallest accepted value (inclusive for percentages, exclusive for `exclusiveMin`). */
  min: number
  exclusiveMin?: boolean
  max?: number
}

export type MetricUnit = 'kg' | '%'

export interface MetricPoint {
  date: Date
  value: number
}

/** Ascending by date (oldest first); the input is not changed. */
export function sortByDate(points: readonly MetricPoint[]): MetricPoint[] {
  return [...points].sort((a, b) => a.date.getTime() - b.date.getTime())
}

/** Points that fall inside the period ending at `now`, oldest first. */
export function filterByPeriod(
  points: readonly MetricPoint[],
  period: Period,
  now: Date,
): MetricPoint[] {
  const sorted = sortByDate(points)
  const start = periodStart(period, now)
  return start ? sorted.filter((point) => point.date >= start) : sorted
}

/** The point with the newest date over all points. */
export function latest(points: readonly MetricPoint[]): MetricPoint | undefined {
  return points.reduce<MetricPoint | undefined>(
    (newest, point) => (!newest || point.date > newest.date ? point : newest),
    undefined,
  )
}

/** Latest value minus the first value inside the period; `undefined` with fewer than two points. */
export function periodDelta(
  points: readonly MetricPoint[],
  period: Period,
  now: Date,
): number | undefined {
  const inPeriod = filterByPeriod(points, period, now)
  if (inPeriod.length < 2) return undefined
  return inPeriod[inPeriod.length - 1].value - inPeriod[0].value
}
