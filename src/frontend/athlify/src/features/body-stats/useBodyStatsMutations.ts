import { graphql, useMutation } from 'react-relay'
import { useTranslation } from 'react-i18next'
import { toaster } from '../../components/ui/toaster'
import type { BodyStatsRow } from './BodyStatsGridTypes'
import type { useBodyStatsMutationsAddMutation } from './__generated__/useBodyStatsMutationsAddMutation.graphql'
import type { useBodyStatsMutationsDeleteMutation } from './__generated__/useBodyStatsMutationsDeleteMutation.graphql'
import type { useBodyStatsMutationsUpdateMutation } from './__generated__/useBodyStatsMutationsUpdateMutation.graphql'

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
  mutation useBodyStatsMutationsAddMutation($input: BodyStatsInput!) {
    addBodyStats(bodyStats: $input) {
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
 * Add, update and delete for Body-Stats. The user gets a toast for every outcome; the list and
 * the chart load their own data again when the caller reports the change.
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

  const add = (
    input: BodyStatsInput,
    { onSuccess }: { onSuccess: (created: BodyStatsRow) => void },
  ) =>
    commitAdd({
      variables: { input },
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
