import type { TFunction } from 'i18next'
import { nowInputValue, parseDecimal, toInputValue } from '../../lib/formValues'
import { activityTypes, type ActivityType, type Mood, type Wind } from './activityFilters'

/** Text values of the activity form; empty strings stand for "not set". */
export interface ActivityFormValues {
  /** `datetime-local` format: YYYY-MM-DDTHH:mm. */
  date: string
  type: ActivityType
  /** `h:mm` or `h:mm:ss`; `.` works as separator as well. */
  duration: string
  distance: string
  elevationGain: string
  /** Empty for "no bicycle". */
  vehicleId: string
  description: string
  heartRateMin: string
  heartRateAverage: string
  heartRateMax: string
  /** Empty or `1` to `10`. */
  effort: string
  mood: Mood | ''
  wind: Wind | ''
  gadgetIds: string[]
  tagIds: string[]
}

export type ActivityFormErrors = Partial<Record<keyof ActivityFormValues, string>>

/** The fields folded under "More details". */
export const detailFields = [
  'heartRateMin',
  'heartRateAverage',
  'heartRateMax',
  'effort',
  'mood',
  'wind',
  'gadgetIds',
  'tagIds',
] as const satisfies readonly (keyof ActivityFormValues)[]

/** Mutation input for creating or updating an activity. */
export interface ActivityFormInput {
  date: string
  type: ActivityType
  time: number
  distance: number
  elevationGain: number | null
  description: string | null
  heartRateMin: number | null
  heartRateMax: number | null
  heartRateAverage: number | null
  mood: Mood | null
  effort: number | null
  wind: Wind | null
  vehicleId: string | null
  gadgetIds: string[]
  tagIds: string[]
}

/** What the form reads from an existing activity. */
export interface ActivityFormSource {
  date: string
  type: string
  time: number
  distance: number
  elevationGain?: number | null
  description?: string | null
  heartRateMin?: number | null
  heartRateMax?: number | null
  heartRateAverage?: number | null
  mood?: string | null
  effort?: number | null
  wind?: string | null
  vehicle?: { id: string } | null
  gadgets: readonly { id: string }[]
  tags: readonly { id: string }[]
}

export const MAX_DESCRIPTION_LENGTH = 2000
export const MIN_HEART_RATE = 20
export const MAX_HEART_RATE = 250
export const efforts = Array.from({ length: 10 }, (_, index) => String(index + 1))

const DAY_MS = 24 * 60 * 60 * 1000

/** Seconds from `h:mm` or `h:mm:ss` (`:` or `.` as separator); `null` when the text is not a duration. */
export function parseDuration(raw: string): number | null {
  const match = /^(\d+)[:.](\d{2})(?:[:.](\d{2}))?$/.exec(raw.trim())
  if (!match) return null
  const [hours, minutes, seconds = 0] = match.slice(1).map((part) => Number(part ?? 0))
  if (minutes >= 60 || seconds >= 60) return null
  return hours * 3600 + minutes * 60 + seconds
}

/** `h:mm:ss`, the format the form shows: 3725 s is "1:02:05". */
export function formatDurationInput(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const rest = seconds % 60
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

const text = (value: number | null | undefined) => (value == null ? '' : String(value))

/** An empty form; type and bicycle come from the latest activity when there is one. */
export function newActivityValues(
  defaults: { type?: string | null; vehicleId?: string | null },
  now = new Date(),
): ActivityFormValues {
  return {
    date: nowInputValue(now),
    type: activityTypes.find((type) => type === defaults.type) ?? 'ROAD',
    duration: '',
    distance: '',
    elevationGain: '',
    vehicleId: defaults.vehicleId ?? '',
    description: '',
    heartRateMin: '',
    heartRateAverage: '',
    heartRateMax: '',
    effort: '',
    mood: '',
    wind: '',
    gadgetIds: [],
    tagIds: [],
  }
}

/** The values of an existing activity; as a copy (duplicate) it gets the current date and time. */
export function activityToValues(
  activity: ActivityFormSource,
  { asCopy = false, now = new Date() }: { asCopy?: boolean; now?: Date } = {},
): ActivityFormValues {
  return {
    date: asCopy ? nowInputValue(now) : toInputValue(activity.date),
    type: activity.type as ActivityType,
    duration: formatDurationInput(activity.time),
    distance: String(activity.distance),
    elevationGain: text(activity.elevationGain),
    vehicleId: activity.vehicle?.id ?? '',
    description: activity.description ?? '',
    heartRateMin: text(activity.heartRateMin),
    heartRateAverage: text(activity.heartRateAverage),
    heartRateMax: text(activity.heartRateMax),
    effort: text(activity.effort),
    mood: (activity.mood ?? '') as Mood | '',
    wind: (activity.wind ?? '') as Wind | '',
    gadgetIds: activity.gadgets.map((gadget) => gadget.id),
    tagIds: activity.tags.map((tag) => tag.id),
  }
}

/** Whether any of the folded detail fields holds a value. */
export function hasDetails(values: ActivityFormValues): boolean {
  return detailFields.some((field) => values[field].length > 0)
}

/** Whole number, `undefined` when empty, `NaN` when the text is not a whole number. */
function parseInteger(raw: string): number | undefined {
  if (raw.trim() === '') return undefined
  const value = parseDecimal(raw)
  return Number.isInteger(value) ? value : NaN
}

/** Mirrors the backend's `ActivityValidation`; the server stays authoritative. */
export function validate(
  values: ActivityFormValues,
  t: TFunction,
  now = new Date(),
): ActivityFormErrors {
  const errors: ActivityFormErrors = {}

  if (!values.date) errors.date = t('form.errors.required')
  else if (new Date(values.date).getTime() > now.getTime() + DAY_MS)
    errors.date = t('activities.form.errors.futureDate')

  if (values.duration.trim() === '') errors.duration = t('form.errors.required')
  else {
    const seconds = parseDuration(values.duration)
    if (seconds === null) errors.duration = t('activities.form.errors.duration')
    else if (seconds <= 0) errors.duration = t('form.errors.positive')
  }

  const distance = parseDecimal(values.distance)
  if (values.distance.trim() === '') errors.distance = t('form.errors.required')
  else if (!Number.isFinite(distance)) errors.distance = t('form.errors.number')
  else if (distance < 0) errors.distance = t('form.errors.nonNegative')

  if (values.elevationGain.trim() !== '') {
    const elevation = parseDecimal(values.elevationGain)
    if (!Number.isFinite(elevation)) errors.elevationGain = t('form.errors.number')
    else if (elevation < 0) errors.elevationGain = t('form.errors.nonNegative')
  }

  const heartRates = {
    heartRateMin: parseInteger(values.heartRateMin),
    heartRateAverage: parseInteger(values.heartRateAverage),
    heartRateMax: parseInteger(values.heartRateMax),
  }
  for (const [field, value] of Object.entries(heartRates) as [
    keyof typeof heartRates,
    number | undefined,
  ][]) {
    if (value === undefined) continue
    if (Number.isNaN(value)) errors[field] = t('form.errors.integer')
    else if (value < MIN_HEART_RATE || value > MAX_HEART_RATE)
      errors[field] = t('activities.form.errors.heartRateRange')
  }
  const { heartRateMin: min, heartRateAverage: average, heartRateMax: max } = heartRates
  const valid = (value: number | undefined): value is number =>
    value !== undefined && !Number.isNaN(value)
  if (!errors.heartRateMin && !errors.heartRateMax && valid(min) && valid(max) && min > max)
    errors.heartRateMax = t('activities.form.errors.heartRateOrder')
  if (
    !errors.heartRateAverage &&
    valid(average) &&
    ((valid(min) && average < min) || (valid(max) && average > max))
  )
    errors.heartRateAverage = t('activities.form.errors.heartRateOrder')

  if (values.effort !== '') {
    const effort = parseInteger(values.effort)
    if (effort === undefined || Number.isNaN(effort) || effort < 1 || effort > 10)
      errors.effort = t('activities.form.errors.effortRange')
  }

  if (values.description.length > MAX_DESCRIPTION_LENGTH)
    errors.description = t('activities.form.errors.descriptionLength', {
      max: MAX_DESCRIPTION_LENGTH,
    })

  return errors
}

const optionalNumber = (raw: string) => (raw.trim() === '' ? null : parseDecimal(raw))

/** Mutation input; empty optional fields become null. Call only with values that passed `validate`. */
export function toInput(values: ActivityFormValues): ActivityFormInput {
  return {
    date: new Date(values.date).toISOString(),
    type: values.type,
    time: parseDuration(values.duration) ?? 0,
    distance: parseDecimal(values.distance),
    elevationGain: optionalNumber(values.elevationGain),
    description: values.description.trim() || null,
    heartRateMin: optionalNumber(values.heartRateMin),
    heartRateMax: optionalNumber(values.heartRateMax),
    heartRateAverage: optionalNumber(values.heartRateAverage),
    mood: values.mood || null,
    effort: optionalNumber(values.effort),
    wind: values.wind || null,
    vehicleId: values.vehicleId || null,
    gadgetIds: values.gadgetIds,
    tagIds: values.tagIds,
  }
}
