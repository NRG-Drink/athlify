import { graphql, useMutation, useRelayEnvironment } from 'react-relay'
import { ConnectionHandler, ROOT_ID } from 'relay-runtime'
import { useTranslation } from 'react-i18next'
import { toaster } from '../../components/ui/toaster'
import { removeFromConnections } from '../../relay/removeFromConnections'
import type { BodyStatsRow } from './BodyStatsGridTypes'
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
    comment
  }
`

const addMutation = graphql`
  mutation useBodyStatsMutationsAddMutation($input: BodyStatsInput!, $connections: [ID!]!) {
    addBodyStats(bodyStats: $input)
      @prependNode(connections: $connections, edgeTypeName: "BodyStatsEdge") {
      ...useBodyStatsMutations_entry
      id
      date
      weight
      bodyFatPercentage
      musclePercentage
      waterPercentage
      boneMass
      comment
    }
  }
`

const updateMutation = graphql`
  mutation useBodyStatsMutationsUpdateMutation($id: ID!, $input: BodyStatsInput!) {
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

/** Key of the analytics connection edited by Body-Stats mutations. */
const BODY_STATS_ANALYTICS_CONNECTION_KEY = 'BodyStatsPage_analytics__bodyStats'

const connectionIds = () => [
  ConnectionHandler.getConnectionID(ROOT_ID, BODY_STATS_ANALYTICS_CONNECTION_KEY),
]

interface Callbacks {
  /** Called after the server confirmed the change. */
  onSuccess: () => void
  /** Called when the server or the network rejected the change, so an edited cell can be restored. */
  onFailure?: () => void
}

interface UpdateCallbacks extends Callbacks {
  /** Called when the entry no longer exists on the server, instead of `onSuccess`. */
  onNotFound?: () => void
}

interface DeleteCallbacks {
  /** Called once the entry is gone, also when the server no longer knew it. */
  onDeleted: () => void
  /** Called when the request finished, successful or not, so the confirm dialog can close. */
  onSettled: () => void
}

/**
 * Add, update and delete for Body-Stats. The Relay connections are updated from the mutation result
 * (`@prependNode`, and a local removal after a confirmed delete), never by refetching the list, and
 * the user gets a toast for every outcome.
 */
export function useBodyStatsMutations() {
  const { t } = useTranslation()
  const environment = useRelayEnvironment()
  const [commitAdd, isAdding] = useMutation<useBodyStatsMutationsAddMutation>(addMutation)
  const [commitUpdate, isUpdating] =
    useMutation<useBodyStatsMutationsUpdateMutation>(updateMutation)
  const [commitDelete, isDeleting] =
    useMutation<useBodyStatsMutationsDeleteMutation>(deleteMutation)

  const fail = (key: string): void => {
    toaster.create({ type: 'error', title: t(key) })
  }

  const removeLocally = (id: string) => removeFromConnections(environment, connectionIds(), id)

  const add = (
    input: BodyStatsInput,
    { onSuccess }: { onSuccess: (created: BodyStatsRow) => void },
  ) =>
    commitAdd({
      variables: { input, connections: connectionIds() },
      onCompleted: (response, errors) => {
        if (errors?.length || !response.addBodyStats) {
          fail('bodyStats.add.errors.saveFailed')
          return
        }
        toaster.create({ type: 'success', title: t('bodyStats.add.success') })
        const {
          id,
          date,
          weight,
          bodyFatPercentage,
          musclePercentage,
          waterPercentage,
          boneMass,
          comment,
        } = response.addBodyStats
        onSuccess({
          id,
          date,
          weight,
          bodyFatPercentage,
          musclePercentage,
          waterPercentage,
          boneMass,
          comment,
        })
      },
      onError: () => fail('bodyStats.add.errors.saveFailed'),
    })

  const update = (id: string, input: BodyStatsInput, { onSuccess, onFailure, onNotFound }: UpdateCallbacks) =>
    commitUpdate({
      variables: { id, input },
      onCompleted: (response, errors) => {
        if (errors?.length) {
          fail('bodyStats.edit.errors.saveFailed')
          onFailure?.()
          return
        }
        if (!response.updateBodyStats) {
          removeLocally(id)
          fail('bodyStats.edit.errors.notFound')
          onNotFound?.()
          return
        }
        toaster.create({ type: 'success', title: t('bodyStats.edit.success') })
        onSuccess()
      },
      onError: () => {
        fail('bodyStats.edit.errors.saveFailed')
        onFailure?.()
      },
    })

  const remove = (id: string, { onSettled, onDeleted }: DeleteCallbacks) =>
    commitDelete({
      variables: { id },
      onCompleted: (_response, errors) => {
        if (errors?.length) fail('bodyStats.delete.errors.failed')
        else {
          removeLocally(id)
          toaster.create({ type: 'success', title: t('bodyStats.delete.success') })
          onDeleted()
        }
        onSettled()
      },
      onError: () => {
        fail('bodyStats.delete.errors.failed')
        onSettled()
      },
    })

  return { add, update, remove, isSaving: isAdding || isUpdating, isDeleting }
}
