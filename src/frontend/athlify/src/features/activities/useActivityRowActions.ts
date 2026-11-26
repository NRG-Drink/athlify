import type { CellValueChangedEvent } from 'ag-grid-community'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toaster } from '../../components/ui/toaster'
import type { ActivityRow } from './ActivitiesGridTypes'
import { activityInputFromCellChange } from './activityCellEdit'
import { newActivityValues, toInput, validate, type ActivityInputValues } from './activityInput'
import { useActivityMutations } from './useActivityMutations'

interface PinnedActivities {
  add: (row: ActivityRow) => void
  update: (id: string, change: (row: ActivityRow) => ActivityRow) => void
  remove: (id: string) => void
}

interface UseActivityRowActionsOptions {
  /** The type of the most recent activity: a new one starts with it. */
  latestType?: string | null
  /** A new object per load, so a count that stays the same is still noticed. */
  result: { count: number } | null
  reloadRows: () => void
  pinned: PinnedActivities
}

/** Create, edit and delete of activities in the grid, with the toasts and the pinned rows they change. */
export function useActivityRowActions({
  latestType,
  result,
  reloadRows,
  pinned,
}: UseActivityRowActionsOptions) {
  const { t } = useTranslation()
  const mutations = useActivityMutations()
  const [deleting, setDeleting] = useState<ActivityRow | null>(null)
  const deleted = useRef(false)
  const countBeforeCreate = useRef<number | null>(null)
  const { add: addPinned, update: updatePinned, remove: removePinned } = pinned

  useEffect(() => {
    if (!result || countBeforeCreate.current === null) return
    const shown = result.count > countBeforeCreate.current
    countBeforeCreate.current = null
    toaster.create({
      type: 'success',
      title: t(shown ? 'activities.add.success' : 'activities.add.hiddenByFilters'),
    })
  }, [result, t])

  const createActivity = () => {
    const values: ActivityInputValues = {
      ...newActivityValues({ type: latestType }),
      duration: '0:01',
      distance: '0',
      description: t('activities.add.defaultDescription'),
    }
    const error = Object.values(validate(values, t)).find((message) => message !== undefined)
    if (error) {
      toaster.create({
        type: 'error',
        title: t('activities.add.errors.saveFailed'),
        description: error,
      })
      return
    }

    mutations.create(toInput(values), {
      onSuccess: (row) => {
        addPinned(row)
        countBeforeCreate.current = result?.count ?? 0
        reloadRows()
      },
    })
  }

  const onCellValueChanged = useCallback(
    (event: CellValueChangedEvent<ActivityRow>) => {
      const { data: row, oldValue, newValue, node, column } = event
      if (!row || oldValue === newValue) return

      const field = column.getColId()
      const restoreCell = () => node.setDataValue(field, oldValue)
      const change = activityInputFromCellChange(row, field, newValue, t)
      if (!change || 'error' in change) {
        restoreCell()
        toaster.create({
          type: 'error',
          title: t(
            change
              ? 'activities.edit.errors.validationFailed'
              : 'activities.edit.errors.saveFailed',
          ),
          description: change?.error,
        })
        return
      }

      mutations.update(row.id, change.input, {
        onSuccess: (updated) => {
          updatePinned(updated.id, () => updated)
          reloadRows()
        },
        onGone: () => {
          removePinned(row.id)
          reloadRows()
        },
        onFailure: restoreCell,
      })
    },
    [mutations, reloadRows, removePinned, t, updatePinned],
  )

  const requestDelete = useCallback((row: ActivityRow) => {
    deleted.current = false
    setDeleting(row)
  }, [])

  const cancelDelete = useCallback(() => setDeleting(null), [])

  const confirmDelete = () => {
    if (!deleting) return
    mutations.remove(deleting.id, {
      onSettled: (removed) => {
        deleted.current = removed
        if (removed) {
          removePinned(deleting.id)
          reloadRows()
        }
        setDeleting(null)
      },
    })
  }

  return {
    createActivity,
    onCellValueChanged,
    isCreating: mutations.isCreating,
    isUpdating: mutations.isUpdating,
    isDeleting: mutations.isDeleting,
    deleting,
    requestDelete,
    cancelDelete,
    confirmDelete,
    /** Whether the last delete removed the row, so the focus moves to the result count. */
    wasDeleted: () => deleted.current,
  }
}
