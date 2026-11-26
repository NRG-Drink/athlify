import { Box, Button } from '@chakra-ui/react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import type { TFunction } from 'i18next'
import { LuPin, LuPinOff, LuTrash2 } from 'react-icons/lu'
import type { Formatter } from '../../i18n/useFormat'
import { parseDateTime } from '../../lib/dates'
import { parseDecimal } from '../../lib/formValues'
import {
  createBodyStatsDateFilterParams,
  createBodyStatsNumberFilterParams,
  createBodyStatsTextFilterParams,
} from './BodyStatsGridFilterParams'
import type { BodyStatsRow } from './BodyStatsGridTypes'
import { bodyStatsMetrics } from './bodyStatsMetrics'

type BodyStatsColumnOptions = {
  t: TFunction
  format: Formatter
  emptyValue: string
  isDeleting: boolean
  isUpdating: boolean
  pinnedBodyStatsIds: ReadonlySet<string>
  onDelete: (row: BodyStatsRow) => void
  onTogglePin: (row: BodyStatsRow) => void
}

const columnHintKeys: Record<string, string> = {
  bodyFatPercentage: 'bodyStats.columnHints.bodyFatPercentage',
  musclePercentage: 'bodyStats.columnHints.musclePercentage',
  waterPercentage: 'bodyStats.columnHints.waterPercentage',
  boneMass: 'bodyStats.columnHints.boneMass',
}

export function createBodyStatsColumnDefs({
  t,
  format,
  emptyValue,
  isDeleting,
  isUpdating,
  pinnedBodyStatsIds,
  onDelete,
  onTogglePin,
}: BodyStatsColumnOptions): ColDef<BodyStatsRow>[] {
  const textFilterParams = createBodyStatsTextFilterParams(t)
  const dateFilterParams = createBodyStatsDateFilterParams(t)
  const numberFilterParams = createBodyStatsNumberFilterParams(t)

  const metricColumns = bodyStatsMetrics.map(
    ({ key, labelKey, unit, decimals }): ColDef<BodyStatsRow> => ({
      field: key,
      headerName: `${t(labelKey)} (${unit})`,
      headerTooltip: columnHintKeys[key] ? t(columnHintKeys[key]) : undefined,
      filter: 'agNumberColumnFilter',
      filterParams: numberFilterParams,
      type: 'rightAligned',
      minWidth: 120,
      valueFormatter: ({ value }) =>
        typeof value === 'number' ? format.number(value, decimals) : emptyValue,
      valueParser: ({ newValue }) => parseDecimal(String(newValue)),
      editable: !isUpdating,
      cellEditor: 'agTextCellEditor',
      cellEditorParams: { useFormatter: false },
    }),
  )

  return [
    {
      colId: 'actions',
      headerName: t('bodyStats.columns.actions'),
      minWidth: 100,
      pinned: 'left',
      filter: false,
      sortable: false,
      cellRenderer: ({ data }: ICellRendererParams<BodyStatsRow>) => {
        if (!data) return null
        const isPinned = pinnedBodyStatsIds.has(data.id)

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
              aria-label={t(isPinned ? 'bodyStats.pin.unpinRow' : 'bodyStats.pin.pinRow')}
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
              aria-label={t('bodyStats.delete.action')}
              disabled={isDeleting}
              onClick={() => onDelete(data)}
            >
              <LuTrash2 aria-hidden />
            </Button>
          </Box>
        )
      },
    },
    {
      field: 'date',
      headerName: t('bodyStats.columns.date'),
      filter: 'agDateColumnFilter',
      filterParams: dateFilterParams,
      minWidth: 160,
      pinned: 'left',
      valueFormatter: ({ value }) => (value ? format.dateTime(value) : emptyValue),
      valueParser: ({ newValue }) => parseDateTime(String(newValue))?.toISOString() ?? newValue,
      editable: !isUpdating,
      cellEditor: 'agTextCellEditor',
      cellEditorParams: { useFormatter: true },
    },
    ...metricColumns,
    {
      field: 'comment',
      headerName: t('bodyStats.columns.comment'),
      filter: 'agTextColumnFilter',
      filterParams: textFilterParams,
      flex: 1,
      minWidth: 240,
      valueFormatter: ({ value }) => value || emptyValue,
      valueParser: ({ newValue }) => String(newValue ?? ''),
      editable: !isUpdating,
      cellEditor: 'agLargeStringCellEditor',
    },
  ]
}
