import { dateFromKey, localDateKey } from './period'
import { bucketKey, type ActivityRow, type Grouping } from './aggregate'

/** Time constants in days of the chronic and the acute training load. */
export const CTL_DAYS = 42
export const ATL_DAYS = 7

export interface FitnessDay {
  key: string
  date: Date
  /** Chronic Training Load: long-term average load. */
  ctl: number
  /** Acute Training Load: short-term average load. */
  atl: number
  /** Training Stress Balance (form): CTL minus ATL. */
  tsb: number
}

/**
 * Daily exponentially weighted CTL, ATL and TSB from the TSS of the activities. The series starts
 * on the first day with a TSS and ends on `until`; days without activities count as zero load.
 * Empty when no activity has a TSS.
 */
export function computeFitness(rows: readonly ActivityRow[], until: Date): FitnessDay[] {
  const daily = new Map<string, number>()
  for (const row of rows) {
    if (row.tss === null) continue
    const key = localDateKey(row.date)
    daily.set(key, (daily.get(key) ?? 0) + row.tss)
  }
  if (daily.size === 0) return []

  const first = dateFromKey([...daily.keys()].sort()[0])
  const last = dateFromKey(localDateKey(until))
  const days: FitnessDay[] = []
  let ctl = 0
  let atl = 0
  for (
    let date = first;
    date.getTime() <= last.getTime();
    date = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
  ) {
    const key = localDateKey(date)
    const load = daily.get(key) ?? 0
    ctl += (load - ctl) / CTL_DAYS
    atl += (load - atl) / ATL_DAYS
    days.push({ key, date, ctl, atl, tsb: ctl - atl })
  }
  return days
}

/** The last day of every bucket: the fitness state at the end of the period. */
export function fitnessPerBucket(days: readonly FitnessDay[], grouping: Grouping): FitnessDay[] {
  const last = new Map<string, FitnessDay>()
  for (const day of days) last.set(bucketKey(day.date, grouping), day)
  return [...last.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, day]) => day)
}
