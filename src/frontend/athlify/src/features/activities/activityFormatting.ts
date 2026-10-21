import type { TFunction } from 'i18next'
import type { Formatter } from '../../i18n/useFormat'

export function formatDuration(seconds: number) {
  const totalMinutes = Math.floor(seconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const remainingSeconds = seconds % 60
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}`
    : `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
}

/** The unit is shown in the column header, so the cell holds the number only. */
export function formatOptionalNumber(
  format: Formatter,
  value: number | null | undefined,
  decimals: number,
) {
  return value == null ? '—' : format.number(value, decimals)
}

export function vehicleLabel(item: {
  brand: string
  model: string
  nickname?: string | null
}) {
  return item.nickname ?? `${item.brand} ${item.model}`
}

export function formatHeartRate(
  average: number | null | undefined,
  min: number | null | undefined,
  max: number | null | undefined,
) {
  if (average == null) return { text: '—' }
  const text = String(average)
  return min != null && max != null ? { text, title: `${min}–${max}` } : { text }
}

const MOODS = ['VERY_BAD', 'BAD', 'NEUTRAL', 'GOOD', 'VERY_GOOD']
const WINDS = ['CALM', 'LIGHT', 'MODERATE', 'STRONG', 'STORMY']

/** Rank in the natural order so that sorting by mood or wind is not alphabetical; -1 for null or unknown. */
const rankIn = (order: string[]) => (value: string | null | undefined) => order.indexOf(value ?? '')

export const moodRank = rankIn(MOODS)
export const windRank = rankIn(WINDS)

/** Translated label of an enum value; an unknown (newer) value is shown as it is. */
export function enumLabel(
  t: TFunction,
  group: 'moods' | 'winds',
  value: string | null | undefined,
) {
  return value == null ? '—' : t(`activities.${group}.${value}`, { defaultValue: value })
}
