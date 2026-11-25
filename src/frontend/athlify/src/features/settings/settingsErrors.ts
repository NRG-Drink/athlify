export interface GraphQLErrorLike {
  message: string
  extensions?: Record<string, unknown> | null
}

type SettingsField = 'firstName' | 'lastName' | 'currentPassword' | 'newPassword'

export interface MappedErrors {
  /** i18n key per field. */
  fieldErrors: Partial<Record<SettingsField, string>>
  /** True when at least one error could not be tied to a field (show a generic toast). */
  general: boolean
}

const FIELDS: readonly SettingsField[] = ['firstName', 'lastName', 'currentPassword', 'newPassword']

function isSettingsField(value: unknown): value is SettingsField {
  return FIELDS.some((field) => field === value)
}

/**
 * Maps the `updateMe` errors to i18n keys. The server's messages are English and never shown:
 * a field error is identified by `extensions.field` and `extensions.code`.
 */
export function mapUpdateMeErrors(errors: readonly GraphQLErrorLike[]): MappedErrors {
  const fieldErrors: MappedErrors['fieldErrors'] = {}
  let general = false
  for (const error of errors) {
    const code = error.extensions?.code
    const field = error.extensions?.field
    if (code === 'CURRENT_PASSWORD_INCORRECT') {
      fieldErrors.currentPassword = 'settings.errors.currentPasswordIncorrect'
    } else if (code === 'VALIDATION_ERROR' && isSettingsField(field)) {
      fieldErrors[field] = 'form.errors.required'
    } else {
      general = true
    }
  }
  return { fieldErrors, general }
}
