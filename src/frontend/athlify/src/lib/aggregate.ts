import { localDateKey } from './period'

export const groupings = ['day', 'week', 'month', 'year'] as const

export type Grouping = (typeof groupings)[number]

export const defaultGrouping: Grouping = 'week'

/** Reads a grouping from user-controlled input; unknown values fall back. */
export function parseGrouping(raw: string | null | undefined): Grouping {
  return groupings.find((grouping) => grouping === raw) ?? defaultGrouping
}

/** First local day of the bucket that contains `date`; weeks start on Monday (ISO). */
export function bucketStart(date: Date, grouping: Grouping): Date {
  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()
  switch (grouping) {
    case 'day':
      return new Date(year, month, day)
    case 'week':
      return new Date(year, month, day - ((date.getDay() + 6) % 7))
    case 'month':
      return new Date(year, month, 1)
    case 'year':
      return new Date(year, 0, 1)
  }
}

/** Sortable `YYYY-MM-DD` key of the bucket's first day. */
export const bucketKey = (date: Date, grouping: Grouping): string =>
  localDateKey(bucketStart(date, grouping))

export interface ActivityRow {
  date: Date
  /** Moving time in seconds. */
  time: number
  /** Kilometres. */
  distance: number
  /** Metres. */
  elevationGain: number | null
  tss: number | null
}

export interface ActivityBucket {
  key: string
  start: Date
  count: number
  /** Hours. */
  hours: number
  distance: number
  elevationGain: number
  /** Undefined when no activity of the bucket has a TSS. */
  tss: number | undefined
  /** Kilometres per hour over the whole bucket; undefined without time. */
  speed: number | undefined
}

export const bodyMetricKeys = [
  'weight',
  'bodyFatPercentage',
  'musclePercentage',
  'waterPercentage',
  'boneMass',
] as const

export type BodyMetricKey = (typeof bodyMetricKeys)[number]

export type BodyRow = { date: Date } & Record<BodyMetricKey, number>

export type BodyBucket = {
  key: string
  start: Date
  count: number
} & Record<BodyMetricKey, number>

const SECONDS_PER_HOUR = 3600

/** The first day of every bucket from the one containing `from` up to the one containing `to`. */
export function bucketRange(from: Date, to: Date, grouping: Grouping): Date[] {
  const starts: Date[] = []
  const last = bucketStart(to, grouping).getTime()
  let start = bucketStart(from, grouping)
  while (start.getTime() <= last) {
    starts.push(start)
    const next = new Date(start)
    if (grouping === 'day') next.setDate(next.getDate() + 1)
    else if (grouping === 'week') next.setDate(next.getDate() + 7)
    else if (grouping === 'month') next.setMonth(next.getMonth() + 1)
    else next.setFullYear(next.getFullYear() + 1)
    start = next
  }
  return starts
}

/** One bucket per period that has activities, oldest first; activities are summed. */
export function aggregateActivities(
  rows: readonly ActivityRow[],
  grouping: Grouping,
): ActivityBucket[] {
  const buckets = new Map<string, ActivityBucket & { seconds: number }>()
  for (const row of rows) {
    const start = bucketStart(row.date, grouping)
    const key = localDateKey(start)
    let bucket = buckets.get(key)
    if (!bucket) {
      bucket = {
        key,
        start,
        count: 0,
        hours: 0,
        distance: 0,
        elevationGain: 0,
        tss: undefined,
        speed: undefined,
        seconds: 0,
      }
      buckets.set(key, bucket)
    }
    bucket.count += 1
    bucket.seconds += row.time
    bucket.distance += row.distance
    bucket.elevationGain += row.elevationGain ?? 0
    if (row.tss !== null) {
      bucket.tss = (bucket.tss ?? 0) + row.tss
    }
  }
  return [...buckets.values()]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map(({ seconds, ...bucket }) => ({
      ...bucket,
      hours: seconds / SECONDS_PER_HOUR,
      speed: seconds > 0 ? bucket.distance / (seconds / SECONDS_PER_HOUR) : undefined,
    }))
}

/** One bucket per period that has measurements, oldest first; each metric is the mean. */
export function aggregateBodyStats(rows: readonly BodyRow[], grouping: Grouping): BodyBucket[] {
  const sums = new Map<string, { start: Date; count: number; sums: Record<BodyMetricKey, number> }>()
  for (const row of rows) {
    const start = bucketStart(row.date, grouping)
    const key = localDateKey(start)
    let entry = sums.get(key)
    if (!entry) {
      entry = {
        start,
        count: 0,
        sums: { weight: 0, bodyFatPercentage: 0, musclePercentage: 0, waterPercentage: 0, boneMass: 0 },
      }
      sums.set(key, entry)
    }
    entry.count += 1
    for (const metric of bodyMetricKeys) entry.sums[metric] += row[metric]
  }
  return [...sums.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, { start, count, sums: total }]) => {
      const bucket = { key, start, count } as BodyBucket
      for (const metric of bodyMetricKeys) bucket[metric] = total[metric] / count
      return bucket
    })
}
