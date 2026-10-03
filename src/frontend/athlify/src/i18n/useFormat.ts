import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { MetricUnit } from '../lib/metrics'

// German uses the Swiss conventions of the product ("Velos", decimal point); the team decided on
// the decimal point. This is the single place to switch to de-DE (decimal comma).
const localeFor = (language: string) => (language.startsWith('de') ? 'de-CH' : 'en-GB')

const NO_VALUE = '—'
const MINUS = '−'
const NBSP = ' '

export interface Formatter {
  number: (value: number, decimals: number) => string
  /** `70.5 kg`; a missing value is shown as an em dash, never as 0. */
  measure: (value: number | undefined, unit: MetricUnit, decimals: number) => string
  /** `+0.3 kg` / `−0.7 kg` with a real minus sign; zero has no sign. */
  signed: (value: number, unit: MetricUnit, decimals: number) => string
  date: (value: Date | string) => string
  dateTime: (value: Date | string) => string
  /** Short axis label for a timestamp in milliseconds, for example `2. Okt.`. */
  axisDate: (value: number, span: 'days' | 'months' | 'years') => string
}

export function createFormatter(language: string): Formatter {
  const locale = localeFor(language)
  const toDate = (value: Date | string) => (value instanceof Date ? value : new Date(value))

  const numberFormat = (decimals: number) =>
    new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  const dateFormat = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const dateTimeFormat = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  const axisFormats = {
    days: new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }),
    months: new Intl.DateTimeFormat(locale, { month: 'short' }),
    years: new Intl.DateTimeFormat(locale, { month: 'short', year: '2-digit' }),
  }

  const number = (value: number, decimals: number) => numberFormat(decimals).format(value)

  return {
    number,
    measure: (value, unit, decimals) =>
      value === undefined ? NO_VALUE : `${number(value, decimals)}${NBSP}${unit}`,
    signed: (value, unit, decimals) => {
      const magnitude = `${number(Math.abs(value), decimals)}${NBSP}${unit}`
      if (Number(Math.abs(value).toFixed(decimals)) === 0) return magnitude
      return `${value > 0 ? '+' : MINUS}${magnitude}`
    },
    date: (value) => dateFormat.format(toDate(value)),
    dateTime: (value) => dateTimeFormat.format(toDate(value)),
    axisDate: (value, span) => axisFormats[span].format(new Date(value)),
  }
}

/** Number, unit and date formatting in the active UI language; re-renders when the language changes. */
export function useFormat(): Formatter {
  const { i18n } = useTranslation()
  return useMemo(() => createFormatter(i18n.language), [i18n.language])
}
