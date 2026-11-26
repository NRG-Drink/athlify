import type { TFunction } from 'i18next'
import { asEnum, activityTypes, moods, winds } from './activityFilters'
import { activityToValues, toInput, validate, type ActivityMutationInput } from './activityInput'
import type { ActivityInputSource } from './activityInput'

export type ActivityCellEditResult =
  | { input: ActivityMutationInput }
  | { error: string }

const text = (value: unknown) => (value == null ? '' : String(value))

export function activityInputFromCellChange(
  row: ActivityInputSource,
  column: string,
  value: unknown,
  t: TFunction,
): ActivityCellEditResult | null {
  const values = activityToValues(row)
  const nextText = text(value)

  switch (column) {
    case 'date':
      values.date = nextText
      break
    case 'type': {
      const next = asEnum(activityTypes, nextText)
      if (!next) return { error: t('form.errors.required') }
      values.type = next
      break
    }
    case 'description':
      values.description = nextText
      break
    case 'time':
      values.duration = nextText
      break
    case 'distance':
      values.distance = nextText
      break
    case 'elevationGain':
      values.elevationGain = nextText
      break
    case 'heartRate':
      values.heartRateAverage = nextText
      break
    case 'heartRateMin':
      values.heartRateMin = nextText
      break
    case 'heartRateMax':
      values.heartRateMax = nextText
      break
    case 'effort':
      values.effort = nextText
      break
    case 'mood': {
      const next = nextText === '' ? '' : asEnum(moods, nextText)
      if (next === undefined) return { error: t('form.errors.required') }
      values.mood = next
      break
    }
    case 'wind': {
      const next = nextText === '' ? '' : asEnum(winds, nextText)
      if (next === undefined) return { error: t('form.errors.required') }
      values.wind = next
      break
    }
    case 'vehicle':
      values.vehicleId = nextText
      break
    case 'gadgets':
      if (!Array.isArray(value)) return null
      values.gadgetIds = value.filter((id): id is string => typeof id === 'string')
      break
    case 'tags':
      if (!Array.isArray(value)) return null
      values.tagIds = value.filter((id): id is string => typeof id === 'string')
      break
    default:
      return null
  }

  const validationError = Object.values(validate(values, t))[0]
  return validationError ? { error: validationError } : { input: toInput(values) }
}
