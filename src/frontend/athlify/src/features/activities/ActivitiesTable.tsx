import { Box, Button, Flex, Text, useBreakpointValue } from '@chakra-ui/react'
import type {
  CellValueChangedEvent,
  FilterModel,
  GridApi,
  GridState,
  IOverlayParams,
} from 'ag-grid-community'
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { graphql, useRelayEnvironment } from 'react-relay'
import { useTranslation } from 'react-i18next'
import { LuPlus } from 'react-icons/lu'
import { AgGridTable } from '../../components/ag-grid/AgGridTable'
import { clearNoOpGridFilters } from '../../components/ag-grid/GridFilterParams'
import { GridColumnPicker } from '../../components/ag-grid/GridColumnPicker'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { toaster } from '../../components/ui/toaster'
import { useFormat } from '../../i18n/useFormat'
import type { FilterOption } from './activityFilters'
import { newActivityValues, toInput, validate, type ActivityFormValues } from './activityForm'
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
  const { t, i18n } = useTranslation()
  const format = useFormat()
  const environment = useRelayEnvironment()
  const mutations = useActivityMutations()
  const showMd = useBreakpointValue({ base: false, md: true }) ?? true
  const showLg = useBreakpointValue({ base: false, lg: true }) ?? true
  const show2xl = useBreakpointValue({ base: false, '2xl': true }) ?? true
  const [gridApi, setGridApi] = useState<GridApi<ActivityRow> | null>(null)
  const [visibleColumns, setVisibleColumns] = useState<string[]>([...activitiesColumnIds])
  const [loadFailed, setLoadFailed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<{ count: number } | null>(null)
  const [pinnedActivities, setPinnedActivities] = useState<ActivityRow[]>([])
  const [deleting, setDeleting] = useState<ActivityRow | null>(null)
  const applyingUrlState = useRef(false)
  const countRef = useRef<HTMLParagraphElement>(null)
  const deleted = useRef(false)
  const countBeforeCreate = useRef<number | null>(null)
  const { quickFilter, fromFilter, toFilter, sort } = query

  const pinnedActivityIds = useMemo(
    () => new Set(pinnedActivities.map((activity) => activity.id)),
    [pinnedActivities],
  )

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

  const togglePinnedActivity = useCallback((row: ActivityRow) => {
    setPinnedActivities((current) =>
      current.some((activity) => activity.id === row.id)
        ? current.filter((activity) => activity.id !== row.id)
        : [...current, { ...row }],
    )
  }, [])

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
    const values: ActivityFormValues = {
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
        setPinnedActivities((current) => [
          ...current.filter((activity) => activity.id !== row.id),
          row,
        ])
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
          setPinnedActivities((current) =>
            current.map((activity) => (activity.id === updated.id ? updated : activity)),
          )
          reloadRows()
        },
        onGone: () => {
          setPinnedActivities((current) => current.filter((activity) => activity.id !== row.id))
          reloadRows()
        },
        onFailure: restoreCell,
      })
    },
    [mutations, reloadRows, t],
  )

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

  const defaultColDef = useMemo(
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
        rowModelType="infinite"
        datasource={datasource}
        getRowId={({ data }) => data?.id}
        cacheBlockSize={20}
        maxBlocksInCache={5}
        rowBuffer={10}
        suppressRowVirtualisation={false}
        columnDefs={columnDefs}
        headerHeight={48}
        defaultColDef={defaultColDef}
        loading={loading}
        pinnedTopRowData={pinnedActivities.length > 0 ? pinnedActivities : undefined}
        overlayComponentSelector={overlayComponentSelector}
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
        initialState={initialState}
        onGridReady={({ api }) => {
          setGridApi(api)
          restoreColumnState(api)
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
                setPinnedActivities((current) =>
                  current.filter((activity) => activity.id !== deleting.id),
                )
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
