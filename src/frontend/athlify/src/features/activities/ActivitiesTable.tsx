import { Box, Button, Flex, Text, useBreakpointValue } from '@chakra-ui/react'
import type {
  CellValueChangedEvent,
  ColDef,
  FilterModel,
  GridApi,
  GridState,
  IOverlayParams,
} from 'ag-grid-community'
import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { graphql, useRelayEnvironment } from 'react-relay'
import { useTranslation } from 'react-i18next'
import { LuPlus } from 'react-icons/lu'
import { GridColumnPicker } from '../../components/ag-grid/GridColumnPicker'
import { InfiniteAgGridTable } from '../../components/ag-grid/InfiniteAgGridTable'
import { handleGridFilterChanged } from '../../components/ag-grid/gridFilterChange'
import { getGridSortModel } from '../../components/ag-grid/gridSortModel'
import { useGridColumnPreferences } from '../../components/ag-grid/useGridColumnPreferences'
import { useGridUrlSync } from '../../components/ag-grid/useGridUrlSync'
import { usePinnedRows } from '../../components/ag-grid/usePinnedRows'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { toaster } from '../../components/ui/toaster'
import { useFormat } from '../../i18n/useFormat'
import type { FilterOption } from './activityFilters'
import { newActivityValues, toInput, validate, type ActivityInputValues } from './activityInput'
import { activityInputFromCellChange } from './activityCellEdit'
import { enumLabel } from './activityFormatting'
import {
  activityQueryVariables,
  defaultActivitySort,
  splitActivityFilterModel,
  type ActivityGridFilterModel,
  type ActivityQuery,
  type ActivitySort,
} from './activityQuery'
import { ActivitiesDataSource, type GridQuery } from './ActivitiesDataSource'
import { useActivitiesGridColumns } from './ActivitiesGridColumns'
import type { ActivityRow } from './ActivitiesGridTypes'
import {
  ACTIVITIES_COLUMN_STORAGE_KEY,
  activitiesColumnIds,
  parseActivitiesColumnState,
  serializeActivitiesColumnState,
  type ActivitiesColumnState,
} from './ActivitiesGridState'
import { useActivityMutations } from './useActivityMutations'
import type { ActivityFilterInput } from './__generated__/ActivitiesTablePageQuery.graphql'

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
  const environment = useRelayEnvironment()
  const mutations = useActivityMutations()
  const showMd = useBreakpointValue({ base: false, md: true }) ?? true
  const showLg = useBreakpointValue({ base: false, lg: true }) ?? true
  const show2xl = useBreakpointValue({ base: false, '2xl': true }) ?? true
  const [gridApi, setGridApi] = useState<GridApi<ActivityRow> | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<{ count: number } | null>(null)
  const [deleting, setDeleting] = useState<ActivityRow | null>(null)
  const countRef = useRef<HTMLParagraphElement>(null)
  const deleted = useRef(false)
  const countBeforeCreate = useRef<number | null>(null)
  const { quickFilter, fromFilter, toFilter, sort } = query

  const {
    rows: pinnedActivities,
    ids: pinnedActivityIds,
    toggle: togglePinnedActivity,
    add: addPinnedActivity,
    update: updatePinnedActivity,
    remove: removePinnedActivity,
  } = usePinnedRows<ActivityRow>()

  const getQuery = useCallback(
    (gridSort: ActivitySort, gridFilters: ActivityGridFilterModel): GridQuery => {
      const { where, order } = activityQueryVariables({
        ...splitActivityFilterModel(gridFilters),
        quickFilter,
        fromFilter,
        toFilter,
        sort: gridSort,
      })
      return { where: (where ?? null) as ActivityFilterInput | null, order }
    },
    [fromFilter, quickFilter, toFilter],
  )

  const onResultCountChange = useCallback((count: number) => setResult({ count }), [])

  useEffect(() => {
    if (!result || countBeforeCreate.current === null) return
    const shown = result.count > countBeforeCreate.current
    countBeforeCreate.current = null
    toaster.create({
      type: 'success',
      title: t(shown ? 'activities.add.success' : 'activities.add.hiddenByFilters'),
    })
  }, [result, t])

  const datasource = useMemo(
    () =>
      new ActivitiesDataSource({
        environment,
        pageQuery,
        initialQuery: getQuery(defaultActivitySort, {}),
        getQuery,
        onLoadFailed: setLoadFailed,
        onLoadStateChange: setLoading,
        onResultCountChange,
      }),
    [environment, getQuery, onResultCountChange],
  )

  const reloadRows = useCallback(() => {
    datasource.reset()
    gridApi?.refreshInfiniteCache()
  }, [datasource, gridApi])

  const confirmDelete = useCallback((row: ActivityRow) => {
    deleted.current = false
    setDeleting(row)
  }, [])

  const columnDefs = useActivitiesGridColumns({
    t,
    format,
    showMd,
    showLg,
    show2xl,
    isUpdating: mutations.isUpdating,
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
    onDelete: confirmDelete,
  })

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
        addPinnedActivity(row)
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
      const result = activityInputFromCellChange(row, field, newValue, t)
      if (!result || 'error' in result) {
        restoreCell()
        toaster.create({
          type: 'error',
          title: t(
            result
              ? 'activities.edit.errors.validationFailed'
              : 'activities.edit.errors.saveFailed',
          ),
          description: result?.error,
        })
        return
      }

      mutations.update(row.id, result.input, {
        onSuccess: (updated) => {
          updatePinnedActivity(updated.id, () => updated)
          reloadRows()
        },
        onGone: () => {
          removePinnedActivity(row.id)
          reloadRows()
        },
        onFailure: restoreCell,
      })
    },
    [mutations, reloadRows, removePinnedActivity, t, updatePinnedActivity],
  )

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
      <Box
        display="grid"
        gridTemplateColumns={{ base: '1fr', sm: '1fr auto' }}
        alignItems="center"
        gap="3"
      >
        <Text
          ref={countRef}
          tabIndex={-1}
          fontSize="sm"
          color="fg.muted"
          aria-live="polite"
          _focusVisible={{ outline: 'none' }}
        >
          {result === null ? '' : t('activities.resultCount', { count: result.count })}
        </Text>
        <Box
          display="grid"
          gridTemplateColumns="max-content max-content"
          justifyContent={{ base: 'start', sm: 'end' }}
          gap="2"
        >
          <Button size="sm" onClick={createActivity} loading={mutations.isCreating}>
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
            onColumnVisibleChange={setColumnVisible}
          />
        </Box>
      </Box>
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
        onCellValueChanged={onCellValueChanged}
        onColumnMoved={({ api }) => persistColumnState(api)}
        onColumnVisible={({ api }) => persistColumnState(api)}
        onColumnResized={({ api, finished }) => {
          if (finished) persistColumnState(api)
        }}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t('activities.delete.title')}
        description={deleting ? deleteDescription(deleting) : ''}
        confirmLabel={t('activities.delete.confirm')}
        busy={mutations.isDeleting}
        onConfirm={() =>
          deleting &&
          mutations.remove(deleting.id, {
            onSettled: (removed) => {
              deleted.current = removed
              if (removed) {
                removePinnedActivity(deleting.id)
                reloadRows()
              }
              setDeleting(null)
            },
          })
        }
        finalFocusEl={() => (deleted.current ? countRef.current : null)}
      />
    </Flex>
  )
})
