import { graphql, useMutation } from 'react-relay'
import { useTranslation } from 'react-i18next'
import { toaster } from '../../components/ui/toaster'
import {
  relayErrorsOf,
  translateFieldErrors,
  type GraphQLErrorLike,
} from '../settings/settingsErrors'
import { mapAdminUserErrors, type MappedAdminErrors } from './adminUserErrors'
import type { useUserMutationsDeleteMutation } from './__generated__/useUserMutationsDeleteMutation.graphql'
import type { useUserMutationsCreateMutation } from './__generated__/useUserMutationsCreateMutation.graphql'
import type { useUserMutationsResetMutation } from './__generated__/useUserMutationsResetMutation.graphql'
import type { useUserMutationsUpdateMutation } from './__generated__/useUserMutationsUpdateMutation.graphql'

const createMutation = graphql`
  mutation useUserMutationsCreateMutation($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      username
      firstName
      lastName
      language
      role
    }
  }
`

const updateMutation = graphql`
  mutation useUserMutationsUpdateMutation($id: ID!, $input: UpdateUserInput!) {
    updateUser(id: $id, input: $input) {
      id
      firstName
      lastName
      language
      role
    }
  }
`

const resetMutation = graphql`
  mutation useUserMutationsResetMutation($id: ID!, $input: ResetUserPasswordInput!) {
    resetUserPassword(id: $id, input: $input) {
      id
    }
  }
`

const deleteMutation = graphql`
  mutation useUserMutationsDeleteMutation($id: ID!) {
    deleteUser(id: $id)
  }
`

interface Callbacks {
  /** Called with the translated message of each field the server rejected. */
  onFieldErrors?: (fieldErrors: MappedAdminErrors['fieldErrors']) => void
  /** Called after the server confirmed the change. */
  onSuccess: () => void
}

/** Create, edit and password reset of users. Server messages are never shown: field errors come back translated. */
export function useUserMutations() {
  const { t } = useTranslation()
  const [commitCreate, isCreating] = useMutation<useUserMutationsCreateMutation>(createMutation)
  const [commitUpdate, isUpdating] = useMutation<useUserMutationsUpdateMutation>(updateMutation)
  const [commitReset, isResetting] = useMutation<useUserMutationsResetMutation>(resetMutation)
  const [commitDelete, isDeleting] = useMutation<useUserMutationsDeleteMutation>(deleteMutation)

  const failed = (errors: readonly GraphQLErrorLike[], { onFieldErrors }: Callbacks) => {
    const mapped = mapAdminUserErrors(errors)
    const { general, fieldErrors } = mapped
    onFieldErrors?.(translateFieldErrors(t, mapped))
    if (general || Object.keys(fieldErrors).length === 0) {
      toaster.create({ type: 'error', title: t('adminUsers.errors.saveFailed') })
    }
  }

  const succeeded = (messageKey: string, callbacks: Callbacks) => {
    toaster.create({ type: 'success', title: t(messageKey) })
    callbacks.onSuccess()
  }

  /** A payload with GraphQL errors, or without its field, counts as a failure. */
  const settle = (
    messageKey: string,
    hasPayload: boolean,
    errors: readonly GraphQLErrorLike[] | null | undefined,
    callbacks: Callbacks,
  ) =>
    errors?.length || !hasPayload
      ? failed(errors ?? [], callbacks)
      : succeeded(messageKey, callbacks)

  /** The completion handlers every mutation shares: success needs the payload and no errors. */
  const handlers = <R>(
    messageKey: string,
    hasPayload: (response: R) => boolean,
    callbacks: Callbacks,
  ) => ({
    onCompleted: (response: R, errors: readonly GraphQLErrorLike[] | null) =>
      settle(messageKey, hasPayload(response), errors, callbacks),
    onError: (error: Error) => failed(relayErrorsOf(error), callbacks),
  })

  const create = (
    input: useUserMutationsCreateMutation['variables']['input'],
    callbacks: Callbacks,
  ) =>
    commitCreate({
      variables: { input },
      // `users` is a plain list on the root, so the new user is appended to it by hand.
      updater: (store) => {
        const created = store.getRootField('createUser')
        if (!created) return
        const root = store.getRoot()
        root.setLinkedRecords([...(root.getLinkedRecords('users') ?? []), created], 'users')
      },
      ...handlers<useUserMutationsCreateMutation['response']>(
        'adminUsers.create.success',
        (response) => !!response.createUser,
        callbacks,
      ),
    })

  const update = (
    id: string,
    input: useUserMutationsUpdateMutation['variables']['input'],
    callbacks: Callbacks,
  ) =>
    commitUpdate({
      variables: { id, input },
      ...handlers<useUserMutationsUpdateMutation['response']>(
        'adminUsers.edit.success',
        (response) => !!response.updateUser,
        callbacks,
      ),
    })

  const resetPassword = (id: string, newPassword: string, callbacks: Callbacks) =>
    commitReset({
      variables: { id, input: { newPassword } },
      ...handlers<useUserMutationsResetMutation['response']>(
        'adminUsers.reset.success',
        (response) => !!response.resetUserPassword,
        callbacks,
      ),
    })

  /** Deletes the user and all their data; the user leaves the list. */
  const remove = (id: string, callbacks: Callbacks) =>
    commitDelete({
      variables: { id },
      // `users` is a plain list on the root, so the user is taken out of it by hand.
      updater: (store) => {
        const root = store.getRoot()
        root.setLinkedRecords(
          (root.getLinkedRecords('users') ?? []).filter((user) => user?.getDataID() !== id),
          'users',
        )
        store.delete(id)
      },
      ...handlers<useUserMutationsDeleteMutation['response']>(
        'adminUsers.delete.success',
        (response) => !!response.deleteUser,
        callbacks,
      ),
    })

  return {
    create,
    update,
    resetPassword,
    remove,
    isSaving: isCreating || isUpdating || isResetting,
    isDeleting,
  }
}
