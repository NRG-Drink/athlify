import type { TFunction } from 'i18next'
import { bodyStatsMetrics, type BodyStatsMetricKey } from './bodyStatsMetrics'

export type BodyStatsFormValues = Record<BodyStatsMetricKey, string> & {
  /** `datetime-local` format: YYYY-MM-DDTHH:mm. */
  date: string
  /** The one optional note (free text). */
  note: string
  /** Global ID of the saved note, so an update edits it instead of adding another. */
  noteId?: string
}

export type BodyStatsFormErrors = Partial<Record<BodyStatsMetricKey | 'date', string>>

export const MAX_NOTE_LENGTH = 2000

/** Current local date and time in the `datetime-local` input format. */
export function nowInputValue(now = new Date()): string {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

/** An ISO timestamp as local `datetime-local` input value. */
export function toInputValue(iso: string): string {
  return nowInputValue(new Date(iso))
}

/** Parses user input with a decimal point or comma; `NaN` for anything that is not a number. */
export function parseDecimal(raw: string): number {
  const text = raw.trim().replace(',', '.')
  return text === '' ? NaN : Number(text)
}

export function emptyValues(
  prefill?: Partial<Record<BodyStatsMetricKey, number>>,
): BodyStatsFormValues {
  const values = { date: nowInputValue(), note: '' } as unknown as BodyStatsFormValues
  for (const { key } of bodyStatsMetrics) {
    const value = prefill?.[key]
    values[key] = value === undefined ? '' : String(value)
  }
  return values
}

export function validate(values: BodyStatsFormValues, t: TFunction): BodyStatsFormErrors {
  const errors: BodyStatsFormErrors = {}
  if (!values.date) errors.date = t('form.errors.required')

  for (const metric of bodyStatsMetrics) {
    const raw = values[metric.key].trim()
    const value = parseDecimal(raw)
    if (raw === '') errors[metric.key] = t('form.errors.required')
    else if (!Number.isFinite(value)) errors[metric.key] = t('form.errors.number')
    else if (metric.exclusiveMin ? value <= metric.min : value < metric.min)
      errors[metric.key] = t('form.errors.positive')
    else if (metric.max !== undefined && value > metric.max)
      errors[metric.key] = t('form.errors.percentage')
  }
  return errors
}

/** Mutation input; an empty note is dropped. Call only with values that passed `validate`. */
export function toInput(values: BodyStatsFormValues) {
  return {
    date: new Date(values.date).toISOString(),
    weight: parseDecimal(values.weight),
    bodyFatPercentage: parseDecimal(values.bodyFatPercentage),
    musclePercentage: parseDecimal(values.musclePercentage),
    waterPercentage: parseDecimal(values.waterPercentage),
    boneMass: parseDecimal(values.boneMass),
    comments: values.note.trim()
      ? [{ ...(values.noteId ? { id: values.noteId } : {}), content: values.note.trim() }]
      : [],
  }
}
