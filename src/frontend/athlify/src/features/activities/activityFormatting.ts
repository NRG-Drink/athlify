import type { TFunction } from 'i18next'
import type { Formatter } from '../../i18n/useFormat'

export function formatDuration(seconds: number, t: TFunction) {
  const totalMinutes = Math.floor(seconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const remainingSeconds = seconds % 60
  const value =
    hours > 0
      ? `${hours}:${String(minutes).padStart(2, '0')}`
      : `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
  return t('activities.duration', { value })
}

export function formatOptionalMeasure(
  format: Formatter,
  value: number | null | undefined,
  unit: string,
  decimals: number,
) {
  return value == null ? '—' : `${format.number(value, decimals)} ${unit}`
}
