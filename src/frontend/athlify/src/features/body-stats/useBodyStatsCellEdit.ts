import type { CellValueChangedEvent } from 'ag-grid-community'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { toaster } from '../../components/ui/toaster'
import { formatDateTime } from '../../lib/dates'
import { toInput, validate, type BodyStatsFormValues } from './bodyStatsForm'
import type { BodyStatsRow } from './BodyStatsGridTypes'
import { useBodyStatsMutations } from './useBodyStatsMutations'

const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T/

export function bodyStatsRowToValues(row: BodyStatsRow): BodyStatsFormValues {
  return {
    date: ISO_DATE_TIME.test(row.date) ? formatDateTime(new Date(row.date)) : row.date,
    weight: String(row.weight),
    bodyFatPercentage: String(row.bodyFatPercentage),
    musclePercentage: String(row.musclePercentage),
    waterPercentage: String(row.waterPercentage),
    boneMass: String(row.boneMass),
    note: row.comment ?? '',
  }
}

function isSameCellValue(colId: string, oldValue: unknown, newValue: unknown): boolean {
  if (colId === 'comment') return (oldValue ?? '') === (newValue ?? '')
  if (colId === 'date' && typeof oldValue === 'string' && typeof newValue === 'string') {
    const [oldDate, newDate] = [new Date(oldValue), new Date(newValue)]
    return (
      !Number.isNaN(oldDate.getTime()) &&
      !Number.isNaN(newDate.getTime()) &&
      formatDateTime(oldDate) === formatDateTime(newDate)
    )
  }
  return Object.is(oldValue, newValue)
}

export function useBodyStatsCellEdit(
  onBodyStatsUpdated?: (row: BodyStatsRow) => void,
  onBodyStatsGone?: (row: BodyStatsRow) => void,
) {
  const { t } = useTranslation()
  const mutations = useBodyStatsMutations()
  const pendingRevert = useRef<{ colId: string; value: unknown } | null>(null)

  const onCellValueChanged = ({
    data,
    oldValue,
    newValue,
    node,
    column,
  }: CellValueChangedEvent<BodyStatsRow>) => {
    const colId = column.getColId()
    const revert = pendingRevert.current
    if (revert && revert.colId === colId && Object.is(revert.value, newValue)) {
      pendingRevert.current = null
      return
    }
    if (!data || isSameCellValue(colId, oldValue, newValue)) return

    const restoreCell = () => {
      pendingRevert.current = { colId, value: oldValue }
      node.setDataValue(colId, oldValue)
    }

    const values = bodyStatsRowToValues(data)
    const errors = validate(values, t)
    const firstError = Object.values(errors)[0]
    if (firstError) {
      restoreCell()
      toaster.create({ type: 'error', title: firstError })
      return
    }

    mutations.update(data.id, toInput(values), {
      onSuccess: () => onBodyStatsUpdated?.(data),
      onFailure: restoreCell,
      onNotFound: () => onBodyStatsGone?.(data),
    })
  }

  return { isUpdating: mutations.isSaving, onCellValueChanged }
}
