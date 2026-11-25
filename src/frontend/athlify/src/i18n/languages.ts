/** The `Language` enum of the API (`DE`, `EN`) and the language codes of i18next (`de`, `en`). */
export type ApiLanguage = 'DE' | 'EN'

/** The languages the API accepts. The enum is closed, so the list is a constant. */
export const API_LANGUAGES: readonly ApiLanguage[] = ['DE', 'EN']

export function toI18nLanguage(language: string): string {
  return language.toLowerCase()
}

const labelFormatters = new Map<string, Intl.DisplayNames>()

/** The name of a language in that language itself ("Deutsch", "English"). */
export function languageLabel(code: string): string {
  let formatter = labelFormatters.get(code)
  if (!formatter) {
    formatter = new Intl.DisplayNames([code], { type: 'language' })
    labelFormatters.set(code, formatter)
  }
  return formatter.of(code) ?? code
}
