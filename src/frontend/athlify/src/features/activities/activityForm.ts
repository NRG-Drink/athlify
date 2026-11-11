import type { TFunction } from 'i18next'
import { formatDateTime, parseDateTime } from '../../lib/dates'
import { parseDecimal } from '../../lib/formValues'
import {
  activityTypes,
  asEnum,
  moods,
  winds,
  type ActivityType,
  type Mood,
  type Wind,
} from './activityFilters'
import { formatDuration } from './activityFormatting'
import type { useActivityMutationsCreateMutation } from './__generated__/useActivityMutationsCreateMutation.graphql'

/** Text values of the activity form; empty strings stand for "not set". */
export interface ActivityFormValues {
  /** `DD.MM.YYYY, HH:MM`, local time. */
  date: string
  type: ActivityType
  /** `h:mm`; `.` works as separator as well. */
  duration: string
  /**
   * The stored duration in seconds of the activity the form started from, `null` for a new one.
   * Imported rides have seconds the form does not show; they are kept while the minutes are unchanged.
   */
  time: number | null
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

export const heartRateFields = ['heartRateMin', 'heartRateAverage', 'heartRateMax'] as const

/** The fields folded under "More details". */
export const detailFields = [
  ...heartRateFields,
  'effort',
  'mood',
  'wind',
  'gadgetIds',
  'tagIds',
] as const satisfies readonly (keyof ActivityFormValues)[]

/** Mutation input for creating or updating an activity, as the schema defines it. */
export type ActivityFormInput = useActivityMutationsCreateMutation['variables']['input']

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
const MIN_HEART_RATE = 20
const MAX_HEART_RATE = 250
const MIN_EFFORT = 1
export const MAX_EFFORT = 10

const DAY_MS = 24 * 60 * 60 * 1000

/** Seconds from `h:mm` (`:` or `.` as separator); `null` when the text is not a duration. */
export function parseDuration(raw: string): number | null {
  const match = /^(\d+)[:.](\d{2})$/.exec(raw.trim())
  if (!match) return null
  const [hours, minutes] = match.slice(1).map(Number)
  if (minutes >= 60) return null
  return hours * 3600 + minutes * 60
}

/** The canonical duration text, used when the field is left: `1.20` becomes `1:20`. */
export function normalizeDuration(raw: string): string {
  const seconds = parseDuration(raw)
  return seconds === null ? raw : formatDuration(seconds)
}

const text = (value: number | null | undefined) => (value == null ? '' : String(value))

/** An empty form; type and bicycle come from the latest activity when there is one. */
export function newActivityValues(
  defaults: { type?: string | null; vehicleId?: string | null },
  now = new Date(),
): ActivityFormValues {
  return {
    date: formatDateTime(now),
    type: asEnum(activityTypes, defaults.type) ?? 'ROAD',
    duration: '',
    time: null,
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
    date: formatDateTime(asCopy ? now : new Date(activity.date)),
    type: asEnum(activityTypes, activity.type) ?? 'ROAD',
    duration: formatDuration(activity.time),
    time: activity.time,
    distance: String(activity.distance),
    elevationGain: text(activity.elevationGain),
    vehicleId: activity.vehicle?.id ?? '',
    description: activity.description ?? '',
    heartRateMin: text(activity.heartRateMin),
    heartRateAverage: text(activity.heartRateAverage),
    heartRateMax: text(activity.heartRateMax),
    effort: text(activity.effort),
    mood: asEnum(moods, activity.mood) ?? '',
    wind: asEnum(winds, activity.wind) ?? '',
    gadgetIds: activity.gadgets.map((gadget) => gadget.id),
    tagIds: activity.tags.map((tag) => tag.id),
  }
}

/** How many of the folded detail fields hold a value. */
export function countDetails(values: ActivityFormValues): number {
  return detailFields.filter((field) => values[field].length > 0).length
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

  const date = parseDateTime(values.date)
  if (values.date.trim() === '') errors.date = t('form.errors.required')
  else if (!date) errors.date = t('form.errors.dateTime')
  else if (date.getTime() > now.getTime() + DAY_MS)
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
  for (const field of heartRateFields) {
    const value = heartRates[field]
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
    if (effort === undefined || Number.isNaN(effort) || effort < MIN_EFFORT || effort > MAX_EFFORT)
      errors.effort = t('activities.form.errors.effortRange')
  }

  if (values.description.length > MAX_DESCRIPTION_LENGTH)
    errors.description = t('activities.form.errors.descriptionLength', {
      max: MAX_DESCRIPTION_LENGTH,
    })

  return errors
}

/** The entered duration; the stored seconds when the minutes still match them. */
function seconds(values: ActivityFormValues): number {
  const entered = parseDuration(values.duration) ?? 0
  const { time } = values
  return time !== null && entered === time - (time % 60) ? time : entered
}

const optionalNumber = (raw: string) => (raw.trim() === '' ? null : parseDecimal(raw))

/** Mutation input; empty optional fields become null. Call only with values that passed `validate`. */
export function toInput(values: ActivityFormValues): ActivityFormInput {
  return {
    date: (parseDateTime(values.date) ?? new Date(NaN)).toISOString(),
    type: values.type,
    time: seconds(values),
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
