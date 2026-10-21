export const periods = ['30d', '90d', '1y', 'all'] as const

export type Period = (typeof periods)[number]

const periodDays: Record<Exclude<Period, 'all'>, number> = {
  '30d': 30,
  '90d': 90,
  '1y': 365,
}

/** Reads a period from user-controlled input (for example a URL parameter); unknown values fall back. */
export function parsePeriod(raw: string | null, fallback: Period): Period {
  return periods.find((period) => period === raw) ?? fallback
}

/** First moment of the period: local midnight, N days before `now`. `undefined` means unbounded. */
export function periodStart(period: Period, now: Date): Date | undefined {
  if (period === 'all') return undefined
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - periodDays[period])
}

export interface DateRange {
  from: string
  to: string
}

export type DateRangeValidation =
  | { valid: true; range: DateRange }
  | { valid: false; error: 'missing' | 'invalidDate' | 'fromAfterTo' }

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

const localDateKey = (date: Date): string =>
  `${date.getFullYear().toString().padStart(4, '0')}-${(date.getMonth() + 1)
    .toString()
    .padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`

export function dateFromKey(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function defaultDateRange(today: Date): DateRange {
  const from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - periodDays['90d'])
  return { from: localDateKey(from), to: localDateKey(today) }
}

function isValidDateString(value: string): boolean {
  if (!ISO_DATE.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

export function validateDateRange(from: string, to: string): DateRangeValidation {
  if (!from || !to) return { valid: false, error: 'missing' }
  if (!isValidDateString(from) || !isValidDateString(to)) {
    return { valid: false, error: 'invalidDate' }
  }
  if (from > to) return { valid: false, error: 'fromAfterTo' }
  return { valid: true, range: { from, to } }
}

export function rangeFromPeriod(period: Period, now: Date): DateRange {
  if (period === 'all') return { from: '1900-01-01', to: localDateKey(now) }
  const start = periodStart(period, now) ?? now
  return { from: localDateKey(start), to: localDateKey(now) }
}

export function parseDateRange(
  from: string | null,
  to: string | null,
  fallback: DateRange,
  now = new Date(),
  legacyPeriod?: string | null,
): DateRange {
  const parsed = from && to ? validateDateRange(from, to) : undefined
  if (parsed?.valid) return parsed.range
  if (legacyPeriod) {
    const period = parsePeriod(legacyPeriod, '90d')
    return rangeFromPeriod(period, now)
  }
  return fallback
}
