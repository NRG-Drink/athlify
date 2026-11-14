import { Box } from '@chakra-ui/react'
import {
  AllCommunityModule,
  type ColDef,
  type GridApi,
  type GridReadyEvent,
  type SortChangedEvent,
} from 'ag-grid-community'
import { AgGridProvider, AgGridReact } from 'ag-grid-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useFormat } from '../../i18n/useFormat'
import { useAgGridTheme } from './useAgGridTheme'
import { eventSortColumns, type EventSort } from './eventsQuery'
import type { EventRow } from './EventsTable'

const modules = [AllCommunityModule]

interface AgGridEventsTableProps {
  rows: readonly EventRow[]
  sort: EventSort
  onSortChange: (sort: EventSort) => void
  caption: string
  busy: boolean
}

export function AgGridEventsTable({
  rows,
  sort,
  onSortChange,
  caption,
  busy,
}: AgGridEventsTableProps) {
  const { t } = useTranslation()
  const format = useFormat()
  const [gridApi, setGridApi] = useState<GridApi<EventRow>>()
  const rowData = useMemo(() => [...rows], [rows])
  const theme = useAgGridTheme()
  const columnDefs = useMemo<ColDef<EventRow>[]>(
    () => [
      { field: 'name', headerName: t('events.columns.name'), minWidth: 160 },
      {
        field: 'type',
        headerName: t('events.columns.type'),
        valueFormatter: ({ value }) =>
          value ? t(`events.types.${value}`, { defaultValue: value }) : '—',
        minWidth: 140,
      },
      {
        field: 'startDate',
        headerName: t('events.columns.startDate'),
        valueFormatter: ({ value }) => (value ? format.date(`${value}T00:00:00`) : '—'),
        minWidth: 140,
      },
      {
        field: 'endDate',
        headerName: t('events.columns.endDate'),
        valueFormatter: ({ value }) => (value ? format.date(`${value}T00:00:00`) : '—'),
        minWidth: 140,
      },
      {
        field: 'description',
        headerName: t('events.columns.description'),
        valueFormatter: ({ value }) => value || '—',
        minWidth: 180,
      },
      {
        colId: 'tags',
        headerName: t('events.columns.tags'),
        valueGetter: ({ data }) => data?.tags.map((tag) => tag.name).join(', ') || '—',
        sortable: false,
        minWidth: 160,
      },
    ],
    [t, format],
  )
  const localeText = useMemo(
    () => ({
      noRowsToShow: t('events.agGrid.noRows'),
      loadingOoo: t('events.agGrid.loading'),
      ariaSortableColumn: t('events.sort.headerHint'),
    }),
    [t],
  )

  const applySort = useCallback((api: GridApi<EventRow>, value: EventSort) => {
    api.applyColumnState({
      state: [{ colId: value.column, sort: value.desc ? 'desc' : 'asc' }],
      defaultState: { sort: null },
    })
  }, [])

  const onGridReady = useCallback(
    ({ api }: GridReadyEvent<EventRow>) => {
      setGridApi(api)
      applySort(api, sort)
    },
    [applySort, sort],
  )

  useEffect(() => {
    if (gridApi) applySort(gridApi, sort)
  }, [gridApi, sort, applySort])

  const onSortChanged = useCallback(
    ({ api }: SortChangedEvent<EventRow>) => {
      const state = api.getColumnState().find((column) => column.sort)
      if (!state || !eventSortColumns.some((column) => column === state.colId)) return
      const next = { column: state.colId as EventSort['column'], desc: state.sort === 'desc' }
      if (next.column !== sort.column || next.desc !== sort.desc) onSortChange(next)
    },
    [onSortChange, sort],
  )

  return (
    <Box
      as="section"
      aria-label={caption}
      aria-busy={busy || undefined}
      height="min(70dvh, 42rem)"
      minHeight="16rem"
      minWidth="0"
    >
      <AgGridProvider modules={modules}>
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={{
            flex: 1,
            minWidth: 120,
            resizable: true,
            sortable: true,
            sortingOrder: ['desc', 'asc'],
          }}
          theme={theme}
          localeText={localeText}
          suppressMultiSort
          onGridReady={onGridReady}
          onSortChanged={onSortChanged}
        />
      </AgGridProvider>
    </Box>
  )
}
