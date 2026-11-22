import { graphql, useMutation } from 'react-relay'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../auth/context'
import { toaster } from '../../components/ui/toaster'
import { toI18nLanguage } from '../../i18n/languages'
import { toPasswordChangeInput, type PasswordValues } from './passwordValues'
import { toProfileInput, type ProfileValues } from './profileValues'
import {
  mapUpdateMeErrors,
  relayErrorsOf,
  type GraphQLErrorLike,
  type MappedErrors,
} from './settingsErrors'
import type { useUpdateMeMutation } from './__generated__/useUpdateMeMutation.graphql'

const mutation = graphql`
  mutation useUpdateMeMutation($input: UpdateMeInput!) {
    updateMe(input: $input) {
      id
      firstName
      lastName
      language
    }
  }
`

interface Callbacks {
  /** Called with the i18n key of each field the server rejected. */
  onFieldErrors: (fieldErrors: MappedErrors['fieldErrors']) => void
  /** Called after the server confirmed the change. */
  onSuccess?: () => void
}

/**
 * The self-service `updateMe` mutation for the Settings page: one function per form. Server messages
 * are never shown; field errors come back as i18n keys, everything else as a generic toast.
 */
export function useUpdateMe() {
  const { t, i18n } = useTranslation()
  const { logout } = useAuth()
  const [commit, isSaving] = useMutation<useUpdateMeMutation>(mutation)

  const failed = (errors: readonly GraphQLErrorLike[], { onFieldErrors }: Callbacks) => {
    const { fieldErrors, general } = mapUpdateMeErrors(errors)
    onFieldErrors(fieldErrors)
    if (general || Object.keys(fieldErrors).length === 0) {
      toaster.create({ type: 'error', title: t('settings.errors.saveFailed') })
    }
  }

  const run = (input: useUpdateMeMutation['variables']['input'], callbacks: Callbacks) =>
    commit({
      variables: { input },
      onCompleted: (response, errors) => {
        if (errors?.length || !response.updateMe) {
          failed(errors ?? [], callbacks)
          return
        }
        callbacks.onSuccess?.()
      },
      onError: (error) => failed(relayErrorsOf(error), callbacks),
    })

  /** Saves name and language; the language applies to the UI immediately. */
  const saveProfile = (values: ProfileValues, callbacks: Callbacks) =>
    run(toProfileInput(values), {
      ...callbacks,
      onSuccess: () => {
        void i18n.changeLanguage(toI18nLanguage(values.language))
        toaster.create({ type: 'success', title: i18n.t('settings.profile.success') })
        callbacks.onSuccess?.()
      },
    })

  /** Changes the password. The server revokes every refresh token, so the user signs in again. */
  const changePassword = (values: PasswordValues, callbacks: Callbacks) =>
    run(
      { passwordChange: toPasswordChangeInput(values) },
      {
        ...callbacks,
        onSuccess: () => {
          toaster.create({ type: 'success', title: t('settings.password.success') })
          callbacks.onSuccess?.()
          // The session is already cleared locally; a failing sign-out request changes nothing for the user.
          void logout().catch(() => {})
        },
      },
    )

  return { saveProfile, changePassword, isSaving }
}
