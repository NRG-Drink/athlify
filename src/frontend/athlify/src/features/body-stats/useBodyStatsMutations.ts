import { graphql, useMutation } from 'react-relay'
import { useTranslation } from 'react-i18next'
import { toaster } from '../../components/ui/toaster'
import { appendToRootList, removeFromRootList } from '../../relay/rootList'
import type { useBodyStatsMutationsAddMutation } from './__generated__/useBodyStatsMutationsAddMutation.graphql'
import type { useBodyStatsMutationsDeleteMutation } from './__generated__/useBodyStatsMutationsDeleteMutation.graphql'
import type { useBodyStatsMutationsUpdateMutation } from './__generated__/useBodyStatsMutationsUpdateMutation.graphql'

// Every field that the list fragments read, so a saved entry is complete in the store
// without refetching the list. Keep in sync with the fragments of the page's components.
export const bodyStatsRecordFragment = graphql`
  fragment useBodyStatsMutations_entry on BodyStats {
    id
    date
    weight
    bodyFatPercentage
    musclePercentage
    waterPercentage
    boneMass
    comments {
      id
      content
    }
  }
`

const addMutation = graphql`
  mutation useBodyStatsMutationsAddMutation($input: BodyStatsDtoInput!) {
    addBodyStats(bodyStats: $input) {
      ...useBodyStatsMutations_entry
    }
  }
`

const updateMutation = graphql`
  mutation useBodyStatsMutationsUpdateMutation($id: ID!, $input: BodyStatsDtoInput!) {
    updateBodyStats(id: $id, bodyStats: $input) {
      ...useBodyStatsMutations_entry
    }
  }
`

const deleteMutation = graphql`
  mutation useBodyStatsMutationsDeleteMutation($id: ID!) {
    deleteBodyStats(id: $id)
  }
`

export type BodyStatsInput = useBodyStatsMutationsAddMutation['variables']['input']

const LIST_FIELD = 'bodyStats'

interface Callbacks {
  /** Called after the server confirmed the change, so the dialog can close. */
  onSuccess: () => void
}

interface DeleteCallbacks {
  /** Called when the request finished, successful or not, so the confirm dialog can close. */
  onSettled: () => void
}

/**
 * Add, update and delete for Body-Stats. The store is updated from the mutation payload, never by
 * refetching the list, and the user gets a toast for every outcome.
 */
export function useBodyStatsMutations() {
  const { t } = useTranslation()
  const [commitAdd, isAdding] = useMutation<useBodyStatsMutationsAddMutation>(addMutation)
  const [commitUpdate, isUpdating] =
    useMutation<useBodyStatsMutationsUpdateMutation>(updateMutation)
  const [commitDelete, isDeleting] =
    useMutation<useBodyStatsMutationsDeleteMutation>(deleteMutation)

  const fail = (key: string): void => {
    toaster.create({ type: 'error', title: t(key) })
  }

  const add = (input: BodyStatsInput, { onSuccess }: Callbacks) =>
    commitAdd({
      variables: { input },
      updater: (store) => {
        const record = store.getRootField('addBodyStats')
        if (record) appendToRootList(store, LIST_FIELD, record)
      },
      onCompleted: (response, errors) => {
        if (errors?.length || !response.addBodyStats) {
          fail('bodyStats.add.errors.saveFailed')
          return
        }
        toaster.create({ type: 'success', title: t('bodyStats.add.success') })
        onSuccess()
      },
      onError: () => fail('bodyStats.add.errors.saveFailed'),
    })

  const update = (id: string, input: BodyStatsInput, { onSuccess }: Callbacks) =>
    commitUpdate({
      variables: { id, input },
      updater: (store, data) => {
        // The entry vanished on the server: drop it here as well.
        if (data && !data.updateBodyStats) removeFromRootList(store, LIST_FIELD, id)
      },
      onCompleted: (response, errors) => {
        if (errors?.length) {
          fail('bodyStats.add.errors.saveFailed')
          return
        }
        if (!response.updateBodyStats) {
          fail('bodyStats.edit.errors.notFound')
          onSuccess()
          return
        }
        toaster.create({ type: 'success', title: t('bodyStats.edit.success') })
        onSuccess()
      },
      onError: () => fail('bodyStats.add.errors.saveFailed'),
    })

  const remove = (id: string, { onSettled }: DeleteCallbacks) =>
    commitDelete({
      variables: { id },
      updater: (store) => removeFromRootList(store, LIST_FIELD, id),
      onCompleted: (_response, errors) => {
        if (errors?.length) fail('bodyStats.delete.errors.failed')
        else toaster.create({ type: 'success', title: t('bodyStats.delete.success') })
        onSettled()
      },
      onError: () => {
        fail('bodyStats.delete.errors.failed')
        onSettled()
      },
    })

  return { add, update, remove, isSaving: isAdding || isUpdating, isDeleting }
}
