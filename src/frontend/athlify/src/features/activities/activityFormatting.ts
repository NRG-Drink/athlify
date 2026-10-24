import type { TFunction } from 'i18next'
import type { Formatter } from '../../i18n/useFormat'
import { winds } from './activityFilters'

/** Hours and minutes, matching the "Std." unit of the column: 2400 s is "0:40", 5400 s is "1:30". */
export function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}:${String(minutes).padStart(2, '0')}`
}

/** The unit is shown in the column header, so the cell holds the number only. */
export function formatOptionalNumber(
  format: Formatter,
  value: number | null | undefined,
  decimals: number,
) {
  return value == null ? '—' : format.number(value, decimals)
}

export function vehicleLabel(item: { brand: string; model: string; nickname?: string | null }) {
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

/** Rank in the natural order so that sorting by mood or wind is not alphabetical; -1 for null or unknown. */
const rankIn = (order: readonly string[]) => (value: string | null | undefined) =>
  order.indexOf(value ?? '')

export const moodRank = rankIn(MOODS)
export const windRank = rankIn(winds)

/** Translated label of an enum value; an unknown (newer) value is shown as it is. */
export function enumLabel(
  t: TFunction,
  group: 'moods' | 'winds',
  value: string | null | undefined,
) {
  return value == null ? '—' : t(`activities.${group}.${value}`, { defaultValue: value })
}

const TAG_PALETTES = ['blue', 'green', 'orange', 'purple', 'pink', 'teal', 'cyan', 'red', 'yellow']

/** The same tag always gets the same colour: derived from its id, not from its position. */
export function tagColorPalette(id: string) {
  let hash = 0
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return TAG_PALETTES[hash % TAG_PALETTES.length]
}
