import { graphql, useMutation, useRelayEnvironment } from 'react-relay'
import { useTranslation } from 'react-i18next'
import { toaster } from '../../components/ui/toaster'
import { removeFromConnections } from '../../relay/removeFromConnections'
import type { ActivityFormInput } from './activityForm'
import type { useActivityMutationsCreateMutation } from './__generated__/useActivityMutationsCreateMutation.graphql'
import type { useActivityMutationsDeleteMutation } from './__generated__/useActivityMutationsDeleteMutation.graphql'
import type { useActivityMutationsUpdateMutation } from './__generated__/useActivityMutationsUpdateMutation.graphql'

// The mutations return what the table reads, so an edited row is complete in the store.
const createMutation = graphql`
  mutation useActivityMutationsCreateMutation($input: ActivityInput!) {
    createActivity(activity: $input) {
      id
      date
      type
      description
      time
      distance
      averageSpeed
      elevationGain
      tss
      heartRateMin
      heartRateMax
      heartRateAverage
      mood
      effort
      wind
      source
      merge {
        id
      }
      vehicle {
        id
        brand
        model
        nickname
      }
      gadgets {
        id
        brand
        model
        nickname
      }
      tags {
        id
        name
      }
    }
  }
`

const updateMutation = graphql`
  mutation useActivityMutationsUpdateMutation($id: ID!, $input: ActivityInput!) {
    updateActivity(id: $id, activity: $input) {
      id
      date
      type
      description
      time
      distance
      averageSpeed
      elevationGain
      tss
      heartRateMin
      heartRateMax
      heartRateAverage
      mood
      effort
      wind
      source
      merge {
        id
      }
      vehicle {
        id
        brand
        model
        nickname
      }
      gadgets {
        id
        brand
        model
        nickname
      }
      tags {
        id
        name
      }
    }
  }
`

const deleteMutation = graphql`
  mutation useActivityMutationsDeleteMutation($id: ID!) {
    deleteActivity(id: $id)
  }
`

interface Callbacks {
  /** Called with the confirmed row so callers can update temporary pinned-row state. */
  onSuccess: (row: ActivityMutationRow) => void
}

interface UpdateCallbacks extends Callbacks {
  onFailure?: () => void
}

interface DeleteCallbacks {
  /** Called when the request finished, so the confirm dialog can close; `removed` is false after an error. */
  onSettled: (removed: boolean) => void
}

type ActivityMutationRow = NonNullable<
  useActivityMutationsCreateMutation['response']['createActivity']
>

/**
 * Create, update and delete for activities. The list is sorted and filtered by the server, so a new
 * activity is not inserted here: the caller refetches the list. An update changes the row in place
 * (it does not move, even if it no longer fits the sort or filters); a deleted or vanished activity
 * leaves the list and the count. The user gets a toast for every outcome.
 */
export function useActivityMutations(connectionId: string) {
  const { t } = useTranslation()
  const environment = useRelayEnvironment()
  const [commitCreate, isCreating] = useMutation<useActivityMutationsCreateMutation>(createMutation)
  const [commitUpdate, isUpdating] = useMutation<useActivityMutationsUpdateMutation>(updateMutation)
  const [commitDelete, isDeleting] = useMutation<useActivityMutationsDeleteMutation>(deleteMutation)

  const fail = (key: string): void => {
    toaster.create({ type: 'error', title: t(key) })
  }

  const removeLocally = (id: string) => removeFromConnections(environment, [connectionId], id)

  const create = (input: ActivityFormInput, { onSuccess }: Callbacks) =>
    commitCreate({
      variables: { input },
      onCompleted: (response, errors) => {
        if (errors?.length || !response.createActivity) {
          fail('activities.add.errors.saveFailed')
          return
        }
        onSuccess(response.createActivity)
      },
      onError: () => fail('activities.add.errors.saveFailed'),
    })

  const update = (id: string, input: ActivityFormInput, { onSuccess, onFailure }: UpdateCallbacks) =>
    commitUpdate({
      variables: { id, input },
      onCompleted: (response, errors) => {
        if (errors?.length) {
          fail('activities.edit.errors.saveFailed')
          onFailure?.()
          return
        }
        if (!response.updateActivity) {
          // The activity vanished on the server: drop it here as well.
          removeLocally(id)
          fail('activities.edit.errors.notFound')
          onFailure?.()
        } else {
          toaster.create({ type: 'success', title: t('activities.edit.success') })
          onSuccess(response.updateActivity)
        }
      },
      onError: () => {
        fail('activities.edit.errors.saveFailed')
        onFailure?.()
      },
    })

  const remove = (id: string, { onSettled }: DeleteCallbacks) =>
    commitDelete({
      variables: { id },
      onCompleted: (_response, errors) => {
        if (errors?.length) fail('activities.delete.errors.failed')
        else {
          // Also when the server no longer knows it (`null`): either way it is gone.
          removeLocally(id)
          toaster.create({ type: 'success', title: t('activities.delete.success') })
        }
        onSettled(!errors?.length)
      },
      onError: () => {
        fail('activities.delete.errors.failed')
        onSettled(false)
      },
    })

  return {
    create,
    update,
    remove,
    isSaving: isCreating || isUpdating,
    isCreating,
    isUpdating,
    isDeleting,
  }
}
