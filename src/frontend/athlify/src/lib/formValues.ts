import { formatDateTime } from './dates'

/** Helpers shared by the create/edit forms: their inputs hold text, the API takes numbers and ISO dates. */

/** Current local date and time as form text: `DD.MM.YYYY, HH:MM`. Read it back with `parseDateTime`. */
export function nowInputValue(now = new Date()): string {
  return formatDateTime(now)
}

/** An ISO timestamp as form text in local time. */
export function toInputValue(iso: string): string {
  return formatDateTime(new Date(iso))
}

/**
 * The canonical text of a number field, used when the field is left: `42,50` becomes `42.5`.
 * Text that is not a number stays as typed, so its error message still makes sense.
 */
export function normalizeDecimal(raw: string): string {
  const value = parseDecimal(raw)
  return Number.isFinite(value) ? String(value) : raw
}

/** Parses user input with a decimal point or comma; `NaN` for anything that is not a number. */
export function parseDecimal(raw: string): number {
  const text = raw.trim().replace(',', '.')
  return text === '' ? NaN : Number(text)
}
