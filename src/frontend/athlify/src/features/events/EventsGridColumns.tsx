import { Box, Button } from '@chakra-ui/react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import type { TFunction } from 'i18next'
import { LuPin, LuPinOff, LuTrash2 } from 'react-icons/lu'
import { parseDate } from '../../lib/dates'
import type { EventsRow } from './EventsGridTypes'
import { EventsTypeFilter } from './EventsTypeFilter'

const eventTypes = ['CRASH', 'INJURY', 'ILLNESS', 'REPAIR', 'BREAK', 'GOAL', 'OTHER'] as const

type EventsColumnOptions = {
  t: TFunction
  formatDate: (date: Date) => string
  emptyValue: string
  isDeleting: boolean
  isUpdating: boolean
  pinnedEventIds: ReadonlySet<string>
  onDelete: (id: string) => void
  onTogglePin: (row: EventsRow) => void
}

function formatEventDate(
  value: string | null | undefined,
  formatDate: (date: Date) => string,
  emptyValue: string,
): string {
  if (!value) return emptyValue
  const date = parseDate(value.split('-').reverse().join('.'))
  return date ? formatDate(date) : value
}

function getEventRowNumber(id: string | undefined): number | null {
  if (!id) return null

  try {
    const match = atob(id).match(/^Event:(\d+)$/)
    return match ? Number(match[1]) : null
  } catch {
    return null
  }
}

export function formatEventTags(
  tags: ReadonlyArray<{ name: string }> | null | undefined,
  emptyValue: string,
): string {
  return tags?.map(({ name }) => name).join(', ') || emptyValue
}

export function createEventsColumnDefs({
  t,
  formatDate,
  emptyValue,
  isDeleting,
  isUpdating,
  pinnedEventIds,
  onDelete,
  onTogglePin,
}: EventsColumnOptions): ColDef<EventsRow>[] {
  return [
    {
      colId: 'delete',
      headerName: t('events.columns.actions'),
      width: 104,
      pinned: 'left',
      filter: false,
      cellRenderer: ({ data }: ICellRendererParams<EventsRow>) => {
        if (!data) return null
        const isPinned = pinnedEventIds.has(data.id)

        return (
          <Box
            display="grid"
            gridTemplateColumns="max-content max-content"
            alignItems="center"
            justifyContent="center"
            gap="1"
          >
            <Button
              size="xs"
              variant="ghost"
              aria-label={t(isPinned ? 'events.pin.unpinRow' : 'events.pin.pinRow')}
              aria-pressed={isPinned}
              disabled={isUpdating}
              onClick={() => onTogglePin(data)}
            >
              {isPinned ? <LuPinOff aria-hidden /> : <LuPin aria-hidden />}
            </Button>
            <Button
              size="xs"
              variant="ghost"
              colorPalette="red"
              aria-label={t('events.delete.action')}
              disabled={isDeleting}
              onClick={() => onDelete(data.id)}
            >
              <LuTrash2 aria-hidden />
            </Button>
          </Box>
        )
      },
    },
    {
      field: 'id',
      headerName: t('events.columns.id'),
      filter: false,
      width: 100,
      pinned: 'left',
      valueGetter: (params) => getEventRowNumber(params.data?.id),
    },
    {
      field: 'name',
      headerName: t('events.columns.name'),
      flex: 1,
      filter: 'agTextColumnFilter',
      minWidth: 240,
      pinned: 'left',
      editable: !isUpdating,
      cellEditor: 'agTextCellEditor',
      cellEditorParams: { useFormatter: false },
    },
    {
      field: 'startDate',
      headerName: t('events.columns.startDate'),
      filter: 'agDateColumnFilter',
      valueFormatter: ({ value }) => formatEventDate(value, formatDate, emptyValue),
      editable: !isUpdating,
      cellEditor: 'agDateStringCellEditor',
    },
    {
      field: 'endDate',
      headerName: t('events.columns.endDate'),
      filter: 'agDateColumnFilter',
      valueFormatter: ({ value }) => formatEventDate(value, formatDate, emptyValue),
      editable: !isUpdating,
      cellEditor: 'agDateStringCellEditor',
    },
    {
      field: 'type',
      headerName: t('events.columns.type'),
      filter: EventsTypeFilter,
      minWidth: 120,
      valueFormatter: ({ value }) => (value ? t(`events.types.${value}`) : emptyValue),
      editable: !isUpdating,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: [...eventTypes],
        valueFormatter: ({ value }: { value: (typeof eventTypes)[number] }) =>
          t(`events.types.${value}`),
      },
    },
    {
      field: 'tags',
      headerName: t('events.columns.tags'),
      filter: 'agTextColumnFilter',
      sortable: false,
      minWidth: 160,
      valueFormatter: ({ value }) => formatEventTags(value, emptyValue),
    },
    {
      field: 'description',
      headerName: t('events.columns.description'),
      filter: 'agTextColumnFilter',
      minWidth: 320,
      valueFormatter: ({ value }) => value || emptyValue,
      editable: !isUpdating,
      cellEditor: 'agLargeStringCellEditor',
    },
  ]
}
