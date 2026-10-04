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
