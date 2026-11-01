/**
 * The one date format of the app, in every language: `DD.MM.YYYY` and `DD.MM.YYYY, HH:MM` (24 h),
 * in local time. Forms take dates as text in the same format, so input and display always match;
 * native date inputs would follow the browser's locale instead (for example `11/01/2026, 11:31 PM`).
 */

const two = (value: number) => String(value).padStart(2, '0')

/** `01.11.2026` */
export function formatDate(date: Date): string {
  return `${two(date.getDate())}.${two(date.getMonth() + 1)}.${date.getFullYear()}`
}

/** `01.11.2026, 23:31` */
export function formatDateTime(date: Date): string {
  return `${formatDate(date)}, ${two(date.getHours())}:${two(date.getMinutes())}`
}

/** A local date, or null when the parts do not form a real calendar date (31.02.2026). */
function localDate(day: number, month: number, year: number, hours = 0, minutes = 0) {
  const date = new Date(year, month - 1, day, hours, minutes)
  const real =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
  return real ? date : null
}

const DATE = /^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/
const TIME = /^(\d{1,2})(?:[:.](\d{1,2}))?$/
const COMPACT_TIME = /^(\d{1,2})(\d{2})$/

/** A two-digit year means this century: `25` is 2025. */
const fullYear = (year: string) => (year.length === 2 ? 2000 + Number(year) : Number(year))

/** Reads `D.M.YYYY` or `D.M.YY` (leading zeros optional); null when it is not a real date. */
export function parseDate(text: string): Date | null {
  const match = DATE.exec(text.trim())
  if (!match) return null
  return localDate(Number(match[1]), Number(match[2]), fullYear(match[3]))
}

/**
 * Reads a time of day as `{ hours, minutes }`: `19:30`, `19.30`, `1930`, `7:5` (07:05) or `7` (07:00).
 * Null when it is not a time between 00:00 and 23:59.
 */
export function parseTime(text: string): { hours: number; minutes: number } | null {
  const trimmed = text.trim()
  const match = COMPACT_TIME.exec(trimmed) ?? TIME.exec(trimmed)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2] ?? 0)
  return hours <= 23 && minutes <= 59 ? { hours, minutes } : null
}

/** `HH:MM` */
export function formatTime({ hours, minutes }: { hours: number; minutes: number }): string {
  return `${two(hours)}:${two(minutes)}`
}

/** Reads a date and a time, `D.M.YYYY, H:MM` (comma optional, see `parseTime`); null when invalid. */
export function parseDateTime(text: string): Date | null {
  const [datePart, timePart] = splitDateTime(text)
  const date = parseDate(datePart)
  const time = parseTime(timePart)
  if (!date || !time) return null
  date.setHours(time.hours, time.minutes)
  return date
}

/** Date and time text of a `DD.MM.YYYY, HH:MM` value; either part may be empty. */
export function splitDateTime(text: string): [date: string, time: string] {
  const match = /^\s*(\S*?),?(?:\s+(.*))?$/.exec(text)
  return [match?.[1] ?? '', (match?.[2] ?? '').trim()]
}

/** Joins the two parts again; an empty time leaves only the date. */
export function joinDateTime(date: string, time: string): string {
  return time.trim() === '' ? date.trim() : `${date.trim()}, ${time.trim()}`
}
