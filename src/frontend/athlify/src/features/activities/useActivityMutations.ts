import { graphql, useMutation } from 'react-relay'
import { ConnectionHandler, type RecordSourceSelectorProxy } from 'relay-runtime'
import { useTranslation } from 'react-i18next'
import { toaster } from '../../components/ui/toaster'
import type { ActivityFormInput } from './activityForm'
import type { useActivityMutationsCreateMutation } from './__generated__/useActivityMutationsCreateMutation.graphql'
import type { useActivityMutationsDeleteMutation } from './__generated__/useActivityMutationsDeleteMutation.graphql'
import type { useActivityMutationsUpdateMutation } from './__generated__/useActivityMutationsUpdateMutation.graphql'

// The mutations return what the table reads, so an edited row is complete in the store.
const createMutation = graphql`
  mutation useActivityMutationsCreateMutation($input: ActivityInput!) {
    createActivity(activity: $input) {
      id
      ...ActivitiesTable_entries
    }
  }
`

const updateMutation = graphql`
  mutation useActivityMutationsUpdateMutation($id: ID!, $input: ActivityInput!) {
    updateActivity(id: $id, activity: $input) {
      id
      ...ActivitiesTable_entries
    }
  }
`

const deleteMutation = graphql`
  mutation useActivityMutationsDeleteMutation($id: ID!) {
    deleteActivity(id: $id)
  }
`

/** Takes the activity out of the loaded list and lowers the count, if it is there. */
function removeFromList(store: RecordSourceSelectorProxy, connectionId: string, id: string) {
  const connection = store.get(connectionId)
  if (!connection) return
  const edges = connection.getLinkedRecords('edges') ?? []
  if (!edges.some((edge) => edge?.getLinkedRecord('node')?.getDataID() === id)) return
  ConnectionHandler.deleteNode(connection, id)
  const count = connection.getValue('totalCount')
  if (typeof count === 'number') connection.setValue(Math.max(0, count - 1), 'totalCount')
}

interface Callbacks {
  /** Called after the server confirmed the change, so the dialog can close (and, after a create, the list refetch). */
  onSuccess: () => void
}

interface DeleteCallbacks {
  /** Called when the request finished, so the confirm dialog can close; `removed` is false after an error. */
  onSettled: (removed: boolean) => void
}

/**
 * Create, update and delete for activities. The list is sorted and filtered by the server, so a new
 * activity is not inserted here: the caller refetches the list. An update changes the row in place
 * (it does not move, even if it no longer fits the sort or filters); a deleted or vanished activity
 * leaves the list and the count. The user gets a toast for every outcome.
 */
export function useActivityMutations(connectionId: string) {
  const { t } = useTranslation()
  const [commitCreate, isCreating] = useMutation<useActivityMutationsCreateMutation>(createMutation)
  const [commitUpdate, isUpdating] = useMutation<useActivityMutationsUpdateMutation>(updateMutation)
  const [commitDelete, isDeleting] = useMutation<useActivityMutationsDeleteMutation>(deleteMutation)

  const fail = (key: string): void => {
    toaster.create({ type: 'error', title: t(key) })
  }

  const create = (input: ActivityFormInput, { onSuccess }: Callbacks) =>
    commitCreate({
      variables: { input },
      onCompleted: (response, errors) => {
        if (errors?.length || !response.createActivity) {
          fail('activities.add.errors.saveFailed')
          return
        }
        onSuccess()
      },
      onError: () => fail('activities.add.errors.saveFailed'),
    })

  const update = (id: string, input: ActivityFormInput, { onSuccess }: Callbacks) =>
    commitUpdate({
      variables: { id, input },
      updater: (store, data) => {
        // The activity vanished on the server: drop it here as well.
        if (data && !data.updateActivity) removeFromList(store, connectionId, id)
      },
      onCompleted: (response, errors) => {
        if (errors?.length) {
          fail('activities.add.errors.saveFailed')
          return
        }
        if (!response.updateActivity) fail('activities.edit.errors.notFound')
        else toaster.create({ type: 'success', title: t('activities.edit.success') })
        onSuccess()
      },
      onError: () => fail('activities.add.errors.saveFailed'),
    })

  const remove = (id: string, { onSettled }: DeleteCallbacks) =>
    commitDelete({
      variables: { id },
      // Also when the server no longer knows it (`null`): either way it is gone.
      updater: (store) => removeFromList(store, connectionId, id),
      onCompleted: (_response, errors) => {
        if (errors?.length) fail('activities.delete.errors.failed')
        else toaster.create({ type: 'success', title: t('activities.delete.success') })
        onSettled(!errors?.length)
      },
      onError: () => {
        fail('activities.delete.errors.failed')
        onSettled(false)
      },
    })

  return { create, update, remove, isSaving: isCreating || isUpdating, isDeleting }
}
