import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { localeFor } from '../../i18n/useFormat'
import type { Grouping } from '../../lib/aggregate'
import { formatDate, formatDayMonth } from '../../lib/dates'

const DAY = 24 * 60 * 60 * 1000

/** ISO 8601 week number and week-year of a date. */
export function isoWeek(date: Date): { week: number; year: number } {
  const thursday = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  thursday.setDate(thursday.getDate() + 3 - ((thursday.getDay() + 6) % 7))
  const firstThursday = new Date(thursday.getFullYear(), 0, 4)
  const offset = (firstThursday.getDay() + 6) % 7
  const week =
    1 + Math.round(((thursday.getTime() - firstThursday.getTime()) / DAY - 3 + offset) / 7)
  return { week, year: thursday.getFullYear() }
}

export interface BucketLabels {
  /** Short label for the chart axis. */
  axis: (start: Date, grouping: Grouping) => string
  /** Full label for the table and tooltips. */
  full: (start: Date, grouping: Grouping) => string
}

/** Labels of a bucket by its first day, in the active UI language. */
export function useBucketLabels(): BucketLabels {
  const { t, i18n } = useTranslation()
  return useMemo(() => {
    const locale = localeFor(i18n.language)
    const month = new Intl.DateTimeFormat(locale, { month: 'short', year: '2-digit' })
    const longMonth = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' })
    return {
      axis: (start, grouping) => {
        switch (grouping) {
          case 'day':
            return formatDayMonth(start)
          case 'week':
            return t('dashboard.grouping.weekShort', { week: isoWeek(start).week })
          case 'month':
            return month.format(start)
          case 'year':
            return String(start.getFullYear())
        }
      },
      full: (start, grouping) => {
        switch (grouping) {
          case 'day':
            return formatDate(start)
          case 'week': {
            const { week, year } = isoWeek(start)
            return t('dashboard.grouping.weekLong', { week, year })
          }
          case 'month':
            return longMonth.format(start)
          case 'year':
            return String(start.getFullYear())
        }
      },
    }
  }, [i18n.language, t])
}
