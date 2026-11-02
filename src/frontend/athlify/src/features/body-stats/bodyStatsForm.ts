import type { TFunction } from 'i18next'
import { formatDateTime, parseDateTime } from '../../lib/dates'
import { parseDecimal } from '../../lib/formValues'
import { bodyStatsMetrics, type BodyStatsMetricKey } from './bodyStatsMetrics'

export type BodyStatsFormValues = Record<BodyStatsMetricKey, string> & {
  /** `DD.MM.YYYY, HH:MM`, local time. */
  date: string
  /** The one optional note (free text). */
  note: string
}

export type BodyStatsFormErrors = Partial<Record<BodyStatsMetricKey | 'date', string>>

export const MAX_NOTE_LENGTH = 2000

export function emptyValues(
  prefill?: Partial<Record<BodyStatsMetricKey, number>>,
): BodyStatsFormValues {
  const values = { date: formatDateTime(new Date()), note: '' } as unknown as BodyStatsFormValues
  for (const { key } of bodyStatsMetrics) {
    const value = prefill?.[key]
    values[key] = value === undefined ? '' : String(value)
  }
  return values
}

export function validate(values: BodyStatsFormValues, t: TFunction): BodyStatsFormErrors {
  const errors: BodyStatsFormErrors = {}
  if (values.date.trim() === '') errors.date = t('form.errors.required')
  else if (!parseDateTime(values.date)) errors.date = t('form.errors.dateTime')

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

/** Mutation input; an empty note becomes null. Call only with values that passed `validate`. */
export function toInput(values: BodyStatsFormValues) {
  return {
    date: (parseDateTime(values.date) ?? new Date(NaN)).toISOString(),
    weight: parseDecimal(values.weight),
    bodyFatPercentage: parseDecimal(values.bodyFatPercentage),
    musclePercentage: parseDecimal(values.musclePercentage),
    waterPercentage: parseDecimal(values.waterPercentage),
    boneMass: parseDecimal(values.boneMass),
    comment: values.note.trim() || null,
  }
}
