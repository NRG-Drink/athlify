import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { formatDate, formatDateTime } from '../lib/dates'
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
  /** `01.11.2026` in every language (see `lib/dates.ts`). */
  date: (value: Date | string) => string
  /** `01.11.2026, 23:31` (24 h) in every language. */
  dateTime: (value: Date | string) => string
  /** Short axis label for a timestamp in milliseconds, for example `02.10.` or `Okt.`. */
  axisDate: (value: number, span: 'days' | 'months' | 'years') => string
}

export function createFormatter(language: string): Formatter {
  const locale = localeFor(language)
  const toDate = (value: Date | string) => (value instanceof Date ? value : new Date(value))

  const numberFormats = new Map<number, Intl.NumberFormat>()
  const numberFormat = (decimals: number) => {
    let format = numberFormats.get(decimals)
    if (!format) {
      format = new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
      numberFormats.set(decimals, format)
    }
    return format
  }
  const axisFormats = {
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
    date: (value) => formatDate(toDate(value)),
    dateTime: (value) => formatDateTime(toDate(value)),
    // Days as `02.10.`, the date format without the year; months and years by name.
    axisDate: (value, span) =>
      span === 'days'
        ? formatDate(new Date(value)).slice(0, 6)
        : axisFormats[span].format(new Date(value)),
  }
}

/** Number, unit and date formatting in the active UI language; re-renders when the language changes. */
export function useFormat(): Formatter {
  const { i18n } = useTranslation()
  return useMemo(() => createFormatter(i18n.language), [i18n.language])
}
