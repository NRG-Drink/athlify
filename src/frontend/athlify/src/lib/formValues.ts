/** Helpers shared by the create/edit forms: their inputs hold text, the API takes numbers and ISO dates. */

/** Current local date and time in the `datetime-local` input format (YYYY-MM-DDTHH:mm). */
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
