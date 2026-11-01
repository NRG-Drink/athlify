import type { TFunction } from 'i18next'
import type { Formatter } from '../../i18n/useFormat'
import { moods, winds, type Mood, type Wind } from './activityFilters'

const twoDigits = (value: number) => String(value).padStart(2, '0')

/** Hours and minutes, matching the "Std." unit of the column: 2400 s is "0:40", 5400 s is "1:30". */
export function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}:${twoDigits(minutes)}`
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

/** Rank in the natural order so that sorting by mood or wind is not alphabetical; -1 for null or unknown. */
const rankIn = (order: readonly string[]) => (value: string | null | undefined) =>
  order.indexOf(value ?? '')

export const moodRank = rankIn(moods)
export const windRank = rankIn(winds)

type EnumGroup = 'types' | 'moods' | 'winds' | 'sources'

/** Translated label of an enum value; an unknown (newer) value is shown as it is. */
export function enumLabel(t: TFunction, group: EnumGroup, value: string | null | undefined) {
  return value == null ? '—' : t(`activities.${group}.${value}`, { defaultValue: value })
}

/** Every value of an enum with its translated label, in the enum's order, for selects and checklists. */
export function enumOptions<T extends string>(
  t: TFunction,
  group: EnumGroup,
  values: readonly T[],
) {
  return values.map((value) => ({ id: value, label: enumLabel(t, group, value) }))
}

/** Shown next to the label in the form's mood choice; they carry the value, not decoration. */
export const moodEmoji: Record<Mood, string> = {
  VERY_BAD: '😫',
  BAD: '🙁',
  NEUTRAL: '😐',
  GOOD: '🙂',
  VERY_GOOD: '😄',
}

/** Shown next to the label in the form's wind choice, rising with the wind's strength. */
export const windEmoji: Record<Wind, string> = {
  CALM: '🌿',
  LIGHT: '🍃',
  MODERATE: '💨',
  STRONG: '🌬️',
  STORMY: '🌪️',
}

/** `enumOptions` with the emoji of each value, for the form's emoji choices. */
export function emojiOptions<T extends string>(
  t: TFunction,
  group: EnumGroup,
  values: readonly T[],
  emoji: Record<T, string>,
) {
  return enumOptions(t, group, values).map((option) => ({ ...option, emoji: emoji[option.id] }))
}

const TAG_PALETTES = ['blue', 'green', 'orange', 'purple', 'pink', 'teal', 'cyan', 'red', 'yellow']

/** The same tag always gets the same colour: derived from its id, not from its position. */
export function tagColorPalette(id: string) {
  let hash = 0
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return TAG_PALETTES[hash % TAG_PALETTES.length]
}
