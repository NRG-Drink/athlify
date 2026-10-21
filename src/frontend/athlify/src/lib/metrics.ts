import { periodStart, type Aggregation, type DateRange, type Period } from './period'

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
  const start = periodStart(period, now)
  let dataPoints = points;
  if (start) {
    dataPoints = dataPoints.filter((point) => point.date >= start)
  }

  return sortByDate(dataPoints)
}

/** Points whose local calendar date falls within the inclusive range, oldest first. */
export function filterByRange(
  points: readonly MetricPoint[],
  range: DateRange,
): MetricPoint[] {
  const dataPoints = points.filter((point) => {
    const date = point.date
    const key = `${date.getFullYear().toString().padStart(4, '0')}-${(date.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
    return key >= range.from && key <= range.to
  })
  return sortByDate(dataPoints)
}

function bucketKey(date: Date, aggregation: Aggregation): string {
  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()

  if (aggregation === 'day') {
    return `${year.toString().padStart(4, '0')}-${(month + 1).toString().padStart(2, '0')}-${day
      .toString()
      .padStart(2, '0')}`
  }
  if (aggregation === 'month') {
    return `${year.toString().padStart(4, '0')}-${(month + 1).toString().padStart(2, '0')}`
  }
  if (aggregation === 'year') return year.toString().padStart(4, '0')

  const calendarDate = Date.UTC(year, month, day)
  const weekday = new Date(calendarDate).getUTCDay() || 7
  const thursday = new Date(calendarDate + (4 - weekday) * 24 * 60 * 60 * 1000)
  const weekYear = thursday.getUTCFullYear()
  const firstThursday = Date.UTC(weekYear, 0, 4)
  const week = 1 + Math.round((thursday.getTime() - firstThursday) / (7 * 24 * 60 * 60 * 1000))
  return `${weekYear.toString().padStart(4, '0')}-W${week.toString().padStart(2, '0')}`
}

/** Keeps the latest real observation in each local calendar bucket. */
export function aggregateByResolution(
  points: readonly MetricPoint[],
  aggregation: Aggregation,
): MetricPoint[] {
  if (aggregation === 'none') return sortByDate(points)

  const latestByBucket = new Map<string, MetricPoint>()
  for (const point of sortByDate(points)) {
    latestByBucket.set(bucketKey(point.date, aggregation), point)
  }
  return sortByDate([...latestByBucket.values()])
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

/** Latest value minus the first value inside the range; undefined with fewer than two points. */
export function rangeDelta(
  points: readonly MetricPoint[],
  range: DateRange,
): number | undefined {
  const inRange = filterByRange(points, range)
  if (inRange.length < 2) return undefined
  return inRange[inRange.length - 1].value - inRange[0].value
}
