import { graphql, useMutation, useRelayEnvironment } from 'react-relay'
import { commitLocalUpdate, ConnectionHandler, ROOT_ID } from 'relay-runtime'
import { useTranslation } from 'react-i18next'
import { toaster } from '../../components/ui/toaster'
import { useBodyStatsHistorySort } from './bodyStatsSort'
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

/** Keys of the analytics and history connections edited by Body-Stats mutations. */
const BODY_STATS_ANALYTICS_CONNECTION_KEY = 'BodyStatsPage_analytics__bodyStats'
const BODY_STATS_HISTORY_CONNECTION_KEY = 'BodyStatsPage_history__bodyStats'

/** The history connection is stored per `order`, so its id needs the order the table shows. */
const connectionIds = (historyOrder: ReturnType<typeof useBodyStatsHistorySort>['order']) => [
  ConnectionHandler.getConnectionID(ROOT_ID, BODY_STATS_ANALYTICS_CONNECTION_KEY),
  ConnectionHandler.getConnectionID(ROOT_ID, BODY_STATS_HISTORY_CONNECTION_KEY, {
    order: historyOrder,
  }),
]

interface Callbacks {
  /** Called after the server confirmed the change, so the dialog can close. */
  onSuccess: () => void
}

interface DeleteCallbacks {
  /** Called when the request finished, successful or not, so the confirm dialog can close. */
  onSettled: () => void
}

/**
 * Add, update and delete for Body-Stats. The Relay connections are updated from the mutation result
 * (`@prependNode`, and a local removal after a confirmed delete), never by refetching the list, and
 * the user gets a toast for every outcome.
 */
export function useBodyStatsMutations() {
  const { order: historyOrder } = useBodyStatsHistorySort()
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

  // Not in an `updater`: that also runs for a payload with errors, where `null` means "failed",
  // not "gone", and the entry must stay.
  const removeLocally = (id: string) =>
    commitLocalUpdate(environment, (store) => {
      for (const connectionId of connectionIds(historyOrder)) {
        const connection = store.get(connectionId)
        if (connection) ConnectionHandler.deleteNode(connection, id)
      }
      store.delete(id)
    })

  const add = (input: BodyStatsInput, { onSuccess }: Callbacks) =>
    commitAdd({
      variables: { input, connections: connectionIds(historyOrder) },
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
      onCompleted: (response, errors) => {
        if (errors?.length) {
          fail('bodyStats.add.errors.saveFailed')
          return
        }
        if (!response.updateBodyStats) {
          // The entry vanished on the server: drop it here as well.
          removeLocally(id)
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
      onCompleted: (_response, errors) => {
        if (errors?.length) fail('bodyStats.delete.errors.failed')
        else {
          // Also when the server no longer knows it (`null`): either way it is gone.
          removeLocally(id)
          toaster.create({ type: 'success', title: t('bodyStats.delete.success') })
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
