import { Box, Button, Flex, Text, useBreakpointValue } from '@chakra-ui/react'
import type { ColDef, FilterModel, GridApi, GridState, IOverlayParams } from 'ag-grid-community'
import { memo, useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { graphql } from 'react-relay'
import { useTranslation } from 'react-i18next'
import { GridToolbar } from '../../components/ag-grid/GridToolbar'
import { InfiniteAgGridTable } from '../../components/ag-grid/InfiniteAgGridTable'
import { handleGridFilterChanged } from '../../components/ag-grid/gridFilterChange'
import { getGridSortModel } from '../../components/ag-grid/gridSortModel'
import { useGridColumnPreferences } from '../../components/ag-grid/useGridColumnPreferences'
import { useGridUrlSync } from '../../components/ag-grid/useGridUrlSync'
import { usePinnedRows } from '../../components/ag-grid/usePinnedRows'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useFormat } from '../../i18n/useFormat'
import type { FilterOption } from './activityFilters'
import { enumLabel } from './activityFormatting'
import type { ActivityGridFilterModel, ActivityQuery, ActivitySort } from './activityQuery'
import { useActivitiesGridColumns } from './ActivitiesGridColumns'
import type { ActivityRow } from './ActivitiesGridTypes'
import {
  ACTIVITIES_COLUMN_STORAGE_KEY,
  activitiesColumnIds,
  parseActivitiesColumnState,
  serializeActivitiesColumnState,
  type ActivitiesColumnState,
} from './ActivitiesGridState'
import { useActivitiesRows } from './useActivitiesRows'
import { useActivityRowActions } from './useActivityRowActions'

const pageQuery = graphql`
  query ActivitiesTablePageQuery(
    $first: Int!
    $after: String
    $where: ActivityFilterInput
    $order: [ActivitySortInput!]
  ) {
    activities(first: $first, after: $after, where: $where, order: $order) {
      totalCount
      nodes {
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
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
`

const activitiesToolbarColumnIds = activitiesColumnIds.filter((id) => id !== 'actions')

const activitiesColumnLabelKeys = { time: 'duration', averageSpeed: 'speed' }

function ActivityEmptyOverlay({ emptyMessage }: { emptyMessage?: ReactNode }) {
  return <Box p="4">{emptyMessage}</Box>
}

interface ActivitiesTableProps {
  /** The URL-backed query; the grid's own filter and sort model are sent to the server on top of it. */
  query: ActivityQuery
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
  onGridStateChange: (model: ActivityGridFilterModel, sort: ActivitySort) => void
  columnState: ActivitiesColumnState[]
  resetTableVersion: number
  onColumnStateChange: (columns: ActivitiesColumnState[]) => void
  /** The type of the most recent activity: a new one starts with it. */
  latestType?: string | null
  /** Shown in the table body when nothing matches; the header and its filters stay. */
  emptyMessage?: ReactNode
}

/** Memoized: the page re-renders for its controls, which does not change the rows. */
export const ActivitiesTable = memo(function ActivitiesTable({
  query,
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
  onGridStateChange,
  columnState,
  resetTableVersion,
  onColumnStateChange,
  latestType,
  emptyMessage,
}: ActivitiesTableProps) {
  const { t } = useTranslation()
  const format = useFormat()
  const showMd = useBreakpointValue({ base: false, md: true }) ?? true
  const showLg = useBreakpointValue({ base: false, lg: true }) ?? true
  const show2xl = useBreakpointValue({ base: false, '2xl': true }) ?? true
  const [gridApi, setGridApi] = useState<GridApi<ActivityRow> | null>(null)
  const countRef = useRef<HTMLParagraphElement>(null)
  const { sort } = query

  const {
    rows: pinnedActivities,
    ids: pinnedActivityIds,
    toggle: togglePinnedActivity,
    add: addPinnedActivity,
    update: updatePinnedActivity,
    remove: removePinnedActivity,
  } = usePinnedRows<ActivityRow>()

  const { datasource, loading, loadFailed, result, reloadRows } = useActivitiesRows({
    pageQuery,
    query,
    gridApi,
  })

  const actions = useActivityRowActions({
    latestType,
    result,
    reloadRows,
    pinned: { add: addPinnedActivity, update: updatePinnedActivity, remove: removePinnedActivity },
  })

  const columnDefs = useActivitiesGridColumns({
    t,
    format,
    showMd,
    showLg,
    show2xl,
    isUpdating: actions.isUpdating,
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
    onTogglePin: togglePinnedActivity,
    onDelete: actions.requestDelete,
  })

  const { visibleColumns, persistColumnState, restoreColumnState, setColumnVisible } =
    useGridColumnPreferences<ActivityRow, ActivitiesColumnState>({
      gridApi,
      columnIds: activitiesColumnIds,
      storageKey: ACTIVITIES_COLUMN_STORAGE_KEY,
      storageLabel: 'Activities',
      columnState,
      parse: parseActivitiesColumnState,
      serialize: serializeActivitiesColumnState,
      onColumnStateChange,
    })

  const { isApplyingUrlState } = useGridUrlSync<ActivityRow>({
    gridApi,
    filterModel,
    sortModel: sort,
    resetTableVersion,
  })

  const [initialState] = useState<GridState>(() => ({
    sort: { sortModel: sort.map(({ colId, sort: direction }) => ({ colId, sort: direction })) },
    filter: { filterModel: filterModel as FilterModel },
  }))

  const overlayComponentSelector = useCallback(
    ({ overlayType }: IOverlayParams<ActivityRow>) =>
      overlayType === 'noRows' || overlayType === 'noMatchingRows'
        ? { component: ActivityEmptyOverlay, params: { emptyMessage } }
        : undefined,
    [emptyMessage],
  )

  const defaultColDef = useMemo<ColDef<ActivityRow>>(
    () => ({
      resizable: true,
      sortable: true,
      filter: true,
      suppressHeaderMenuButton: false,
      minWidth: 100,
    }),
    [],
  )

  const deleteDescription = (row: ActivityRow) =>
    t('activities.delete.description', {
      context: row.merge ? 'merged' : undefined,
      date: format.date(row.date),
      name: row.description || enumLabel(t, 'types', row.type),
    })

  return (
    <Flex direction="column" gap="3">
      {loadFailed && (
        <Flex align="center" justify="space-between" gap="3" wrap="wrap">
          <Text role="alert" color="fg.error">
            {t('activities.loadFailed')}
          </Text>
          <Button size="sm" variant="outline" onClick={reloadRows}>
            {t('page.retry')}
          </Button>
        </Flex>
      )}
      <GridToolbar
        namespace="activities"
        columnIds={activitiesToolbarColumnIds}
        columnLabelKeys={activitiesColumnLabelKeys}
        countRef={countRef}
        resultCount={result?.count ?? null}
        isCreating={actions.isCreating}
        visibleColumns={visibleColumns}
        onCreate={actions.createActivity}
        onColumnVisibleChange={setColumnVisible}
      />
      <InfiniteAgGridTable<ActivityRow>
        ariaLabel={t('activities.table.caption')}
        localeNamespace="activities"
        datasource={datasource}
        getRowId={({ data }) => data?.id}
        columnDefs={columnDefs}
        headerHeight={48}
        defaultColDef={defaultColDef}
        loading={loading}
        pinnedTopRowData={pinnedActivities.length > 0 ? pinnedActivities : undefined}
        overlayComponentSelector={overlayComponentSelector}
        localeText={{ noRowsToShow: t('activities.empty.filteredTitle') }}
        initialState={initialState}
        onGridReady={({ api }) => {
          setGridApi(api)
          restoreColumnState(api)
        }}
        onFilterChanged={({ api }) =>
          handleGridFilterChanged(
            api,
            () => {
              if (!isApplyingUrlState()) {
                onGridStateChange(api.getFilterModel() ?? {}, getGridSortModel(api))
              }
            },
            'Could not clear no-op activity filters.',
          )
        }
        onSortChanged={({ api }) => {
          if (!isApplyingUrlState()) {
            onGridStateChange(
              { ...filterModel, ...(api.getFilterModel() ?? {}) },
              getGridSortModel(api),
            )
          }
        }}
        onCellValueChanged={actions.onCellValueChanged}
        onColumnMoved={({ api }) => persistColumnState(api)}
        onColumnVisible={({ api }) => persistColumnState(api)}
        onColumnResized={({ api, finished }) => {
          if (finished) persistColumnState(api)
        }}
      />
      <ConfirmDialog
        open={actions.deleting !== null}
        onOpenChange={(open) => !open && actions.cancelDelete()}
        title={t('activities.delete.title')}
        description={actions.deleting ? deleteDescription(actions.deleting) : ''}
        confirmLabel={t('activities.delete.confirm')}
        busy={actions.isDeleting}
        onConfirm={actions.confirmDelete}
        finalFocusEl={() => (actions.wasDeleted() ? countRef.current : null)}
      />
    </Flex>
  )
})
