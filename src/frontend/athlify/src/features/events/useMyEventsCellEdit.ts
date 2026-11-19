import type { CellValueChangedEvent } from 'ag-grid-community'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { graphql, useMutation } from 'react-relay'
import { toaster } from '../../components/ui/toaster'
import { parseDate } from '../../lib/dates'
import type { MyEventsGridUpdateMutation } from './__generated__/MyEventsGridUpdateMutation.graphql'

export type MyEventsGridRow = {
  id: string
  name: string
  startDate: unknown
  endDate: unknown
  description: string | null
  type: 'BREAK' | 'CRASH' | 'GOAL' | 'ILLNESS' | 'INJURY' | 'OTHER' | 'REPAIR'
  tags: ReadonlyArray<{ id: string }>
}

const updateEventMutation = graphql`
  mutation MyEventsGridUpdateMutation($id: ID!, $event: EventInput!) {
    updateEvent(id: $id, event: $event) {
      id
      name
      startDate
      endDate
      description
      type
      tags {
        id
      }
    }
  }
`

function normalizeEventDate(value: unknown): string | null | undefined {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string') return undefined
  if (!value.trim()) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const date = parseDate(value)
  if (!date) return undefined
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

type UpdatedEvent = NonNullable<MyEventsGridUpdateMutation['response']['updateEvent']>

export function useMyEventsCellEdit(onEventUpdated?: (event: UpdatedEvent) => void) {
  const { t } = useTranslation()
  const [commitUpdate, isUpdating] = useMutation<MyEventsGridUpdateMutation>(updateEventMutation)
  const revertingEdit = useRef(false)

  const onCellValueChanged = ({
    data,
    oldValue,
    newValue,
    node,
    column,
  }: CellValueChangedEvent) => {
    const row = data as MyEventsGridRow | null
    if (revertingEdit.current || !row || oldValue === newValue) return

    const restoreCell = () => {
      revertingEdit.current = true
      try {
        node.setDataValue(column.getColId(), oldValue)
      } finally {
        revertingEdit.current = false
      }
    }

    const colId = column.getColId()
    const startDate =
      colId === 'startDate'
        ? normalizeEventDate(newValue)
        : normalizeEventDate(row.startDate)
    const endDate =
      colId === 'endDate'
        ? normalizeEventDate(newValue)
        : normalizeEventDate(row.endDate)

    if (!startDate || startDate === undefined) {
      restoreCell()
      toaster.create({ type: 'error', title: t('events.edit.saveFailed') })
      return
    }
    if (colId === 'endDate' && endDate === undefined) {
      restoreCell()
      toaster.create({ type: 'error', title: t('events.edit.saveFailed') })
      return
    }

    commitUpdate({
      variables: {
        id: row.id,
        event: {
          name: row.name,
          type: row.type,
          description: row.description || null,
          startDate,
          endDate,
          tagIds: row.tags.map(({ id }) => id),
        },
      },
      onCompleted: (response, errors) => {
        if (errors?.length || !response.updateEvent) {
          restoreCell()
          toaster.create({ type: 'error', title: t('events.edit.saveFailed') })
          return
        }
        onEventUpdated?.(response.updateEvent)
        toaster.create({ type: 'success', title: t('events.edit.saved') })
      },
      onError: () => {
        restoreCell()
        toaster.create({ type: 'error', title: t('events.edit.saveFailed') })
      },
    })
  }

  return { isUpdating, onCellValueChanged }
}
