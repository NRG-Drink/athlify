import type { TFunction } from 'i18next'
import { parseDateTime } from '../../lib/dates'
import { parseDecimal } from '../../lib/formValues'
import { bodyStatsMetrics, type BodyStatsMetricKey } from './bodyStatsMetrics'

export type BodyStatsFormValues = Record<BodyStatsMetricKey, string> & {
  /** `DD.MM.YYYY, HH:MM`, local time. */
  date: string
  /** The one optional note (free text). */
  note: string
}

export type BodyStatsFormErrors = Partial<Record<BodyStatsMetricKey | 'date', string>>

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

/**
 * Input of a new measurement that is created without a form: now, the latest known value of each
 * measurement (a valid placeholder where there is none yet) and no note.
 */
export function newMeasurementInput(
  latestValues: Partial<Record<BodyStatsMetricKey, number>>,
  now = new Date(),
) {
  const input = { date: now.toISOString(), comment: null } as {
    date: string
    comment: null
  } & Record<BodyStatsMetricKey, number>
  for (const metric of bodyStatsMetrics) {
    input[metric.key] = latestValues[metric.key] ?? (metric.exclusiveMin ? 1 : metric.min)
  }
  return input
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
