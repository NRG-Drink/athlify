import { two } from '../../lib/dates'
import type { TFunction } from 'i18next'
import type { Formatter } from '../../i18n/useFormat'
import { asEnum, moods, winds, type Mood, type Wind } from './activityFilters'

/** Hours and minutes, matching the "Std." unit of the column: 2400 s is "0:40", 5400 s is "1:30". */
export function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}:${two(minutes)}`
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

/** Emoji of each mood, in the form's choice and the table; they carry the value, not decoration. */
export const moodEmoji: Record<Mood, string> = {
  VERY_BAD: '😫',
  BAD: '🙁',
  NEUTRAL: '😐',
  GOOD: '🙂',
  VERY_GOOD: '😄',
}

/** Emoji of each wind, in the form's choice and the table, rising with the wind's strength. */
export const windEmoji: Record<Wind, string> = {
  CALM: '🌿',
  LIGHT: '🍃',
  MODERATE: '🌬️',
  STRONG: '💨',
  STORMY: '🌪️',
}

/** The effort scale in four groups, so a list shows a handful of emoji instead of ten values. */
const effortLevels = [
  { max: 3, key: 'easy', emoji: '😌' },
  { max: 6, key: 'moderate', emoji: '😅' },
  { max: 8, key: 'hard', emoji: '🥵' },
  { max: 10, key: 'max', emoji: '🔥' },
] as const

/** Group of an effort from 1 to 10 with its emoji and translated label; undefined when not set. */
export function effortLevel(t: TFunction, effort: number | null | undefined) {
  if (effort == null || effort < 1) return undefined
  const level =
    effortLevels.find((candidate) => effort <= candidate.max) ??
    effortLevels[effortLevels.length - 1]
  return { emoji: level.emoji, label: t(`activities.effortLevels.${level.key}`) }
}

/** The emoji of a mood from the API; undefined for none or a value newer than this client. */
export const moodEmojiOf = (value: string | null | undefined) => {
  const mood = asEnum(moods, value)
  return mood && moodEmoji[mood]
}

/** The emoji of a wind from the API; undefined for none or a value newer than this client. */
export const windEmojiOf = (value: string | null | undefined) => {
  const wind = asEnum(winds, value)
  return wind && windEmoji[wind]
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
