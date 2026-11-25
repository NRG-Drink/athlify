import type { TFunction } from 'i18next'
import { PASSWORD_RULE_KEYS } from './passwordValues'

export interface GraphQLErrorLike {
  message: string
  extensions?: Record<string, unknown> | null
}

const FIELDS = ['firstName', 'lastName', 'currentPassword', 'newPassword'] as const

type SettingsField = (typeof FIELDS)[number]

/** Extensions that carry a configured limit, and the interpolation name the message uses for it. */
const LIMIT_EXTENSIONS = { minLength: 'min', maxLength: 'max' } as const

export interface MappedFieldErrors<F extends string> {
  /** i18n key per field. */
  fieldErrors: Partial<Record<F, string>>
  /** Interpolation values per field, e.g. `{ min: 8 }` for a password that is too short. */
  fieldValues: Partial<Record<F, Record<string, number>>>
  /** True when at least one error could not be tied to a field (show a generic toast). */
  general: boolean
}

export type MappedErrors = MappedFieldErrors<SettingsField>

/** Relay reports a response without data (a failed non-null mutation) through `onError`, with the GraphQL errors in `source`. */
export function relayErrorsOf(error: Error): readonly GraphQLErrorLike[] {
  const source = (error as { source?: { errors?: readonly GraphQLErrorLike[] } }).source
  return source?.errors ?? []
}

/** The entry of a lookup table for a key the server sent; keys such as `constructor` are not entries. */
function ownValue<V>(table: Readonly<Record<string, V>>, key: unknown): V | undefined {
  return typeof key === 'string' && Object.hasOwn(table, key) ? table[key] : undefined
}

/**
 * Maps GraphQL errors to i18n keys. The server's messages are English and never shown: an error is
 * identified by `extensions.code` (looked up in `byCode`) or, for `VALIDATION_ERROR`, by the
 * `extensions.field` it names (one of `fields`).
 */
export function mapFieldErrors<F extends string>(
  errors: readonly GraphQLErrorLike[],
  fields: readonly F[],
  byCode: Readonly<Record<string, { field: F; key: string }>>,
  /** Message per `extensions.rule` of a `VALIDATION_ERROR`; a rule that is not listed reads as "required". */
  byRule: Readonly<Record<string, string>> = {},
): MappedFieldErrors<F> {
  const fieldErrors: Partial<Record<F, string>> = {}
  const fieldValues: Partial<Record<F, Record<string, number>>> = {}
  let general = false
  for (const error of errors) {
    const { code, field, rule } = error.extensions ?? {}
    const known = ownValue(byCode, code)
    if (known) {
      fieldErrors[known.field] = known.key
    } else if (code === 'VALIDATION_ERROR' && fields.some((f) => f === field)) {
      const target = field as F
      fieldErrors[target] = ownValue(byRule, rule) ?? 'form.errors.required'
      for (const [extension, name] of Object.entries(LIMIT_EXTENSIONS)) {
        const limit = error.extensions?.[extension]
        if (typeof limit === 'number') fieldValues[target] = { ...fieldValues[target], [name]: limit }
      }
    } else {
      general = true
    }
  }
  return { fieldErrors, fieldValues, general }
}

/** Translates the keys of a mapped result, with their interpolation values. */
export function translateFieldErrors<F extends string>(
  t: TFunction,
  { fieldErrors, fieldValues }: MappedFieldErrors<F>,
): Partial<Record<F, string>> {
  const translated: Partial<Record<F, string>> = {}
  for (const field of Object.keys(fieldErrors) as F[]) {
    translated[field] = t(fieldErrors[field] ?? '', fieldValues[field])
  }
  return translated
}

/** Maps the `updateMe` errors. */
export function mapUpdateMeErrors(errors: readonly GraphQLErrorLike[]): MappedErrors {
  return mapFieldErrors(
    errors,
    FIELDS,
    {
      CURRENT_PASSWORD_INCORRECT: {
        field: 'currentPassword',
        key: 'settings.errors.currentPasswordIncorrect',
      },
    },
    PASSWORD_RULE_KEYS,
  )
}
