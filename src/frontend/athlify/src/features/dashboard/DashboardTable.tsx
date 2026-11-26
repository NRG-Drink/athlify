import { Box, Button, Collapsible, Flex, Heading } from '@chakra-ui/react'
import type { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LuChevronRight } from 'react-icons/lu'
import { AgGridTable } from '../../components/ag-grid/AgGridTable'
import { GridColumnPicker } from '../../components/ag-grid/GridColumnPicker'
import { useFormat } from '../../i18n/useFormat'
import {
  DASHBOARD_COLUMN_STORAGE_KEY,
  dashboardColumnIds,
  optionalColumnIds,
  parseDashboardColumnState,
  serializeDashboardColumnState,
  type DashboardColumnId,
} from './dashboardTableColumns'
import type { DashboardTableRow } from './dashboardTableRows'

export interface DashboardTableProps {
  rows: DashboardTableRow[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

type NumericColumn = {
  id: Exclude<DashboardColumnId, 'period' | 'events'>
  decimals: number
  width: number
}

const numericColumns: readonly NumericColumn[] = [
  { id: 'count', decimals: 0, width: 110 },
  { id: 'hours', decimals: 1, width: 100 },
  { id: 'distance', decimals: 1, width: 120 },
  { id: 'elevationGain', decimals: 0, width: 120 },
  { id: 'tss', decimals: 0, width: 90 },
  { id: 'speed', decimals: 1, width: 110 },
  { id: 'weight', decimals: 1, width: 120 },
  { id: 'bodyFat', decimals: 1, width: 120 },
  { id: 'muscle', decimals: 1, width: 120 },
  { id: 'water', decimals: 1, width: 120 },
  { id: 'bone', decimals: 1, width: 120 },
  { id: 'ctl', decimals: 0, width: 120 },
  { id: 'atl', decimals: 0, width: 100 },
  { id: 'tsb', decimals: 0, width: 100 },
]

const defaultColDef: ColDef<DashboardTableRow> = { resizable: true, sortable: true }

function readStoredColumnState() {
  try {
    return parseDashboardColumnState(window.localStorage.getItem(DASHBOARD_COLUMN_STORAGE_KEY))
  } catch (error) {
    console.error('Could not restore the dashboard column preferences.', error)
    return []
  }
}

/** One row per bucket with activities, body values, fitness and events; columns can be hidden and resized. */
export function DashboardTable({ rows, open, onOpenChange }: DashboardTableProps) {
  const { t, i18n } = useTranslation()
  const format = useFormat()
  const [gridApi, setGridApi] = useState<GridApi<DashboardTableRow> | null>(null)
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    dashboardColumnIds.filter((id) => !optionalColumnIds.includes(id)),
  )
  const label = useCallback((id: DashboardColumnId) => t(`dashboard.table.${id}`), [t])

  const columnDefs = useMemo<ColDef<DashboardTableRow>[]>(
    () => [
      {
        colId: 'period',
        field: 'key',
        headerName: label('period'),
        valueFormatter: ({ data }) => data?.period ?? '',
        width: 150,
        pinned: 'left',
        sort: 'desc',
        lockVisible: true,
      },
      ...numericColumns.map(({ id, decimals, width }): ColDef<DashboardTableRow> => ({
        colId: id,
        field: id,
        headerName: label(id),
        type: 'rightAligned',
        width,
        hide: optionalColumnIds.includes(id),
        valueFormatter: ({ value }) =>
          typeof value === 'number' ? format.number(value, decimals) : t('dashboard.table.noValue'),
      })),
      {
        colId: 'events',
        field: 'events',
        headerName: label('events'),
        width: 240,
        tooltipField: 'events',
      },
    ],
    [format, label, t],
  )

  const readColumnState = useCallback((api: GridApi<DashboardTableRow>) => {
    const state = api.getColumnState()
    setVisibleColumns(state.filter(({ hide }) => !hide).map(({ colId }) => colId))
    return state
  }, [])

  const persistColumnState = useCallback(
    (api: GridApi<DashboardTableRow>) => {
      const state = readColumnState(api)
      try {
        window.localStorage.setItem(
          DASHBOARD_COLUMN_STORAGE_KEY,
          serializeDashboardColumnState(state),
        )
      } catch (error) {
        console.error('Could not save the dashboard column preferences.', error)
      }
    },
    [readColumnState],
  )

  const onGridReady = useCallback(
    ({ api }: GridReadyEvent<DashboardTableRow>) => {
      const stored = readStoredColumnState()
      if (stored.length > 0) api.applyColumnState({ state: stored, applyOrder: true })
      readColumnState(api)
      setGridApi(api)
    },
    [readColumnState],
  )

  const resetColumns = () => {
    if (!gridApi) return
    gridApi.resetColumnState()
    persistColumnState(gridApi)
  }

  return (
    <Collapsible.Root open={open} onOpenChange={(details) => onOpenChange(details.open)}>
      <Box
        bg="bg.panel"
        borderWidth="1px"
        borderRadius="l3"
        p={{ base: '4', md: '6' }}
        display="grid"
        gap="3"
      >
        <Heading as="h2" size="lg">
          <Collapsible.Trigger display="flex" gap="2" alignItems="center" textAlign="start">
            <Collapsible.Indicator
              transition="transform 0.2s"
              _open={{ transform: 'rotate(90deg)' }}
            >
              <LuChevronRight aria-hidden />
            </Collapsible.Indicator>
            {t('dashboard.table.title')}
          </Collapsible.Trigger>
        </Heading>
        <Collapsible.Content _open={{ animation: 'none' }} _closed={{ animation: 'none' }}>
          {open && (
            <Box display="grid" gap="3">
              <Flex gap="2" justify="flex-end">
                <GridColumnPicker
                  visibleColumns={visibleColumns}
                  columns={dashboardColumnIds
                    .filter((id) => id !== 'period')
                    .map((id) => ({ id, label: label(id) }))}
                  openLabel={t('dashboard.table.columnPicker.open')}
                  dialogLabel={t('dashboard.table.columnPicker.label')}
                  onColumnVisibleChange={(column, visible) => {
                    if (!gridApi) return
                    gridApi.setColumnsVisible([column], visible)
                    persistColumnState(gridApi)
                  }}
                />
                <Button size="sm" variant="outline" onClick={resetColumns}>
                  {t('dashboard.table.columnPicker.reset')}
                </Button>
              </Flex>
              <AgGridTable<DashboardTableRow>
                key={i18n.resolvedLanguage}
                ariaLabel={t('dashboard.table.caption')}
                height="clamp(20rem, 60dvh, 36rem)"
                rowData={rows}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                getRowId={({ data }) => data.key}
                suppressColumnVirtualisation
                tooltipShowDelay={500}
                overlayNoRowsTemplate={t('dashboard.table.empty')}
                onGridReady={onGridReady}
                onColumnResized={({ finished, api }) => finished && persistColumnState(api)}
                onColumnMoved={({ finished, api }) => finished && persistColumnState(api)}
              />
            </Box>
          )}
        </Collapsible.Content>
      </Box>
    </Collapsible.Root>
  )
}
