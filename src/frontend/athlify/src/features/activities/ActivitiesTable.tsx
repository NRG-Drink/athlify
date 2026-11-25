import { Box, Button, Flex, Text, useBreakpointValue } from '@chakra-ui/react'
import type { CellValueChangedEvent, GridApi } from 'ag-grid-community'
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react'
import { graphql, useFragment } from 'react-relay'
import { useTranslation } from 'react-i18next'
import { LuPlus } from 'react-icons/lu'
import { AgGridTable } from '../../components/ag-grid/AgGridTable'
import { clearNoOpGridFilters } from '../../components/ag-grid/GridFilterParams'
import { GridColumnPicker } from '../../components/ag-grid/GridColumnPicker'
import { useFormat } from '../../i18n/useFormat'
import type { FilterOption } from './activityFilters'
import { type ActivityGridFilterModel, type ActivitySort } from './activityQuery'
import { useActivitiesGridColumns } from './ActivitiesGridColumns'
import type { ActivityRow } from './ActivitiesGridTypes'
import {
  ACTIVITIES_COLUMN_STORAGE_KEY,
  activitiesColumnIds,
  parseActivitiesColumnState,
  serializeActivitiesColumnState,
  type ActivitiesColumnState,
} from './ActivitiesGridState'
import type { ActivitiesTable_entries$key } from './__generated__/ActivitiesTable_entries.graphql'

const tableFragment = graphql`
  fragment ActivitiesTable_entries on Activity @relay(plural: true) {
    id
    date
    type
    description
    time
    distance
    averageSpeed
    elevationGain
    tss
    heartRateMin
    heartRateMax
    heartRateAverage
    mood
    effort
    wind
    source
    merge {
      id
    }
    vehicle {
      id
      brand
      model
      nickname
    }
    gadgets {
      id
      brand
      model
      nickname
    }
    tags {
      id
      name
    }
  }
`

function getGridSortModel(api: GridApi<ActivityRow>): ActivitySort {
  return api
    .getColumnState()
    .filter(({ sort }) => sort)
    .sort((left, right) => (left.sortIndex ?? 0) - (right.sortIndex ?? 0))
    .flatMap(({ colId, sort }) => (sort ? [{ colId, sort }] : []))
}

function ActivityEmptyOverlay({ emptyMessage }: { emptyMessage?: ReactNode }) {
  return <Box p="4">{emptyMessage}</Box>
}

interface ActivitiesTableProps {
  entries: ActivitiesTable_entries$key
  hasNextPage: boolean
  isLoadingNext: boolean
  loadMoreError: boolean
  onLoadMore: () => void
  filterModel: ActivityGridFilterModel
  vehicles: readonly FilterOption[]
  vehicleRecords: readonly NonNullable<ActivityRow['vehicle']>[]
  gadgets: readonly FilterOption[]
  gadgetRecords: readonly ActivityRow['gadgets'][number][]
  tags: readonly FilterOption[]
  tagRecords: readonly ActivityRow['tags'][number][]
  onCreateTag: (name: string, onCreated: (id: string) => void) => void
  isCreatingTag: boolean
  hasMoreVehicles: boolean
  hasMoreGadgets: boolean
  hasMoreTags: boolean
  /** Server-side state; rows arrive filtered and sorted. */
  sort: ActivitySort
  onGridStateChange: (model: ActivityGridFilterModel, sort: ActivitySort) => void
  columnState: ActivitiesColumnState[]
  resetTableVersion: number
  onColumnStateChange: (columns: ActivitiesColumnState[]) => void
  pinnedActivities: ActivityRow[]
  onTogglePin: (row: ActivityRow) => void
  /** Number of activities matching the filters, across all pages. */
  totalCount: number
  /** The data is being refreshed after a filter change. */
  busy: boolean
  /** Shown in the table body when nothing matches; the header and its filters stay. */
  emptyMessage?: ReactNode
  onCreateActivity: () => void
  isCreating: boolean
  isUpdating: boolean
  onCellValueChanged: (event: CellValueChangedEvent<ActivityRow>) => void
  onDuplicate: (row: ActivityRow) => void
  onDelete: (row: ActivityRow) => void
  /** The count line, which takes the focus after a delete. */
  countRef?: Ref<HTMLParagraphElement>
}

/** Memoized: the page re-renders for its dialogs, which does not change the rows. */
export const ActivitiesTable = memo(function ActivitiesTable({
  entries,
  hasNextPage,
  isLoadingNext,
  loadMoreError,
  onLoadMore,
  filterModel,
  vehicles,
  vehicleRecords,
  gadgets,
  gadgetRecords,
  tags,
  tagRecords,
  onCreateTag,
  isCreatingTag,
  hasMoreVehicles,
  hasMoreGadgets,
  hasMoreTags,
  sort,
  onGridStateChange,
  columnState,
  resetTableVersion,
  onColumnStateChange,
  pinnedActivities,
  onTogglePin,
  totalCount,
  busy,
  emptyMessage,
  onCreateActivity,
  isCreating,
  isUpdating,
  onCellValueChanged,
  onDuplicate,
  onDelete,
  countRef,
}: ActivitiesTableProps) {
  const { t, i18n } = useTranslation()
  const format = useFormat()
  const showMd = useBreakpointValue({ base: false, md: true }) ?? true
  const showLg = useBreakpointValue({ base: false, lg: true }) ?? true
  const show2xl = useBreakpointValue({ base: false, '2xl': true }) ?? true
  const [gridApi, setGridApi] = useState<GridApi<ActivityRow> | null>(null)
  const [visibleColumns, setVisibleColumns] = useState<string[]>([...activitiesColumnIds])
  const applyingUrlState = useRef(false)
  const rows = useFragment(tableFragment, entries)
  const pinnedActivityIds = useMemo(
    () => new Set(pinnedActivities.map((activity) => activity.id)),
    [pinnedActivities],
  )
  const columnDefs = useActivitiesGridColumns({
    t,
    format,
    showMd,
    showLg,
    show2xl,
    isUpdating,
    vehicles,
    vehicleRecords,
    gadgets,
    gadgetRecords,
    tags,
    tagRecords,
    onCreateTag,
    isCreatingTag,
    hasMoreVehicles,
    hasMoreGadgets,
    hasMoreTags,
    pinnedActivityIds,
    onTogglePin,
    onDuplicate,
    onDelete,
  })

  const updateColumnState = useCallback(
    (api: GridApi<ActivityRow>) => {
      const state = parseActivitiesColumnState(serializeActivitiesColumnState(api.getColumnState()))
      onColumnStateChange(state)
      setVisibleColumns(state.filter(({ hide }) => !hide).map(({ colId }) => colId))
    },
    [onColumnStateChange],
  )

  const persistColumnState = useCallback(
    (api: GridApi<ActivityRow>) => {
      const state = serializeActivitiesColumnState(api.getColumnState())
      updateColumnState(api)
      try {
        window.localStorage.setItem(ACTIVITIES_COLUMN_STORAGE_KEY, state)
      } catch (error) {
        console.error('Could not save Activities column preferences.', error)
      }
    },
    [updateColumnState],
  )

  const restoreColumnState = useCallback(
    (api: GridApi<ActivityRow>) => {
      try {
        const stored = parseActivitiesColumnState(
          window.localStorage.getItem(ACTIVITIES_COLUMN_STORAGE_KEY),
        )
        if (stored.length > 0) api.applyColumnState({ state: stored, applyOrder: true })
      } catch (error) {
        console.error('Could not restore Activities column preferences.', error)
      }
      updateColumnState(api)
    },
    [updateColumnState],
  )

  useEffect(() => {
    if (!gridApi || columnState.length === 0) return
    const current = serializeActivitiesColumnState(gridApi.getColumnState())
    const desired = serializeActivitiesColumnState(columnState)
    if (current !== desired) gridApi.applyColumnState({ state: columnState, applyOrder: true })
  }, [columnState, gridApi])

  useEffect(() => {
    if (!gridApi || resetTableVersion === 0) return
    gridApi.resetColumnState()
    applyingUrlState.current = true
    gridApi.setFilterModel(null)
    queueMicrotask(() => {
      applyingUrlState.current = false
    })
  }, [gridApi, resetTableVersion])

  useEffect(() => {
    if (!gridApi) return
    const current = getGridSortModel(gridApi)
    if (JSON.stringify(current) === JSON.stringify(sort)) return
    applyingUrlState.current = true
    gridApi.applyColumnState({
      state: sort.map(({ colId, sort: direction }, sortIndex) => ({
        colId,
        sort: direction,
        sortIndex,
      })),
      defaultState: { sort: null },
    })
    queueMicrotask(() => {
      applyingUrlState.current = false
    })
  }, [gridApi, sort])

  useEffect(() => {
    if (!gridApi) return
    const current = JSON.stringify(gridApi.getFilterModel() ?? {})
    const desired = JSON.stringify(filterModel)
    if (current === desired) return
    applyingUrlState.current = true
    gridApi.setFilterModel(Object.keys(filterModel).length > 0 ? filterModel : null)
    queueMicrotask(() => {
      applyingUrlState.current = false
    })
  }, [filterModel, gridApi])

  return (
    <Flex direction="column" gap="3">
      <Box
        display="grid"
        gridTemplateColumns={{ base: '1fr', sm: '1fr auto' }}
        alignItems="center"
        gap="3"
      >
        <Text
          ref={countRef}
          tabIndex={countRef ? -1 : undefined}
          fontSize="sm"
          color="fg.muted"
          aria-live="polite"
          _focusVisible={{ outline: 'none' }}
        >
          {t('activities.resultCount', { count: totalCount })}
        </Text>
        <Box
          display="grid"
          gridTemplateColumns="max-content max-content"
          justifyContent={{ base: 'start', sm: 'end' }}
          gap="2"
        >
          <Button size="sm" onClick={onCreateActivity} loading={isCreating}>
            <LuPlus aria-hidden />
            {t('activities.add.open')}
          </Button>
          <GridColumnPicker
            visibleColumns={visibleColumns}
            columns={activitiesColumnIds
              .filter((id) => id !== 'actions')
              .map((id) => ({
                id,
                label: t(
                  `activities.columns.${
                    (
                      {
                        time: 'duration',
                        averageSpeed: 'speed',
                      } as Record<string, string>
                    )[id] ?? id
                  }`,
                ),
              }))}
            openLabel={t('activities.columnPicker.open')}
            dialogLabel={t('activities.columnPicker.label')}
            onColumnVisibleChange={(column, visible) => {
              gridApi?.applyColumnState({ state: [{ colId: column, hide: !visible }] })
              if (gridApi) persistColumnState(gridApi)
            }}
          />
        </Box>
      </Box>
      <AgGridTable<ActivityRow>
        key={i18n.resolvedLanguage}
        ariaLabel={t('activities.table.caption')}
        height="clamp(24rem, calc(100dvh - 22rem), 48rem)"
        busy={busy}
        rowData={rows.filter((row) => !pinnedActivityIds.has(row.id)).map((row) => ({ ...row }))}
        columnDefs={columnDefs}
        headerHeight={48}
        defaultColDef={{
          resizable: true,
          sortable: true,
          filter: true,
          suppressHeaderMenuButton: false,
          minWidth: 100,
        }}
        getRowId={({ data }) => data?.id ?? ''}
        pinnedTopRowData={
          pinnedActivities.length > 0
            ? pinnedActivities.map((activity) => ({ ...activity }))
            : undefined
        }
        noRowsOverlayComponent={ActivityEmptyOverlay}
        noRowsOverlayComponentParams={{ emptyMessage }}
        localeText={{
          noRowsToShow: t('activities.empty.filteredTitle'),
          equals: t('activities.gridFilter.options.equals'),
          notEqual: t('activities.gridFilter.options.notEqual'),
          contains: t('activities.gridFilter.options.contains'),
          notContains: t('activities.gridFilter.options.notContains'),
          startsWith: t('activities.gridFilter.options.startsWith'),
          endsWith: t('activities.gridFilter.options.endsWith'),
          blank: t('activities.gridFilter.options.blank'),
          notBlank: t('activities.gridFilter.options.notBlank'),
          lessThan: t('activities.gridFilter.options.lessThan'),
          greaterThan: t('activities.gridFilter.options.greaterThan'),
          inRange: t('activities.gridFilter.options.inRange'),
          before: t('activities.gridFilter.options.before'),
          after: t('activities.gridFilter.options.after'),
        }}
        onGridReady={({ api }) => {
          setGridApi(api)
          restoreColumnState(api)
          applyingUrlState.current = true
          api.applyColumnState({
            state: sort.map(({ colId, sort: direction }, sortIndex) => ({
              colId,
              sort: direction,
              sortIndex,
            })),
            defaultState: { sort: null },
          })
          api.setFilterModel(Object.keys(filterModel).length > 0 ? filterModel : null)
          queueMicrotask(() => {
            applyingUrlState.current = false
          })
        }}
        onFilterChanged={({ api }) => {
          void clearNoOpGridFilters(
            api.getFilterModel() ?? {},
            (column) => api.setColumnFilterModel(column, null),
            () => api.onFilterChanged(),
          )
            .then((cleared) => {
              if (!cleared && !applyingUrlState.current) {
                onGridStateChange(api.getFilterModel() ?? {}, getGridSortModel(api))
              }
            })
            .catch((error: unknown) => {
              console.error('Could not clear no-op activity filters.', error)
            })
        }}
        onSortChanged={({ api }) => {
          if (!applyingUrlState.current) {
            onGridStateChange(
              { ...filterModel, ...(api.getFilterModel() ?? {}) },
              getGridSortModel(api),
            )
          }
        }}
        onCellValueChanged={onCellValueChanged}
        onBodyScrollEnd={({ api }) => {
          if (
            hasNextPage &&
            !isLoadingNext &&
            api.getDisplayedRowCount() > 0 &&
            api.getLastDisplayedRowIndex() >= api.getDisplayedRowCount() - 1
          ) {
            onLoadMore()
          }
        }}
        onColumnMoved={({ api }) => persistColumnState(api)}
        onColumnVisible={({ api }) => persistColumnState(api)}
        onColumnResized={({ api, finished }) => {
          if (finished) persistColumnState(api)
        }}
      />
      {loadMoreError && (
        <Flex align="center" justify="space-between" gap="3" wrap="wrap">
          <Text role="alert" color="fg.error">
            {t('activities.loadMoreFailed')}
          </Text>
          <Button size="sm" variant="outline" onClick={onLoadMore}>
            {t('page.retry')}
          </Button>
        </Flex>
      )}
      {isLoadingNext && (
        <Text aria-live="polite" color="fg.muted" textAlign="center">
          {t('activities.loadingMore')}
        </Text>
      )}
    </Flex>
  )
})
