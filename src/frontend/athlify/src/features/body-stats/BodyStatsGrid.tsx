import { Box, Text } from '@chakra-ui/react'
import type { ColDef, GridApi } from 'ag-grid-community'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { graphql, useRelayEnvironment } from 'react-relay'
import { AgGridTable } from '../../components/ag-grid/AgGridTable'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useFormat } from '../../i18n/useFormat'
import type { BodyStatsFilterInput } from './__generated__/BodyStatsGridPageQuery.graphql'
import { BodyStatsDataSource } from './BodyStatsDataSource'
import { createBodyStatsColumnDefs } from './BodyStatsGridColumns'
import { clearNoOpGridFilters } from './BodyStatsGridFilterParams'
import { defaultOrder, getGridQuery } from './BodyStatsGridQuery'
import {
  BODY_STATS_COLUMN_STORAGE_KEY,
  bodyStatsColumnIds,
  parseBodyStatsColumnState,
  serializeBodyStatsColumnState,
  type BodyStatsColumnState,
  type BodyStatsFilterModel,
  type BodyStatsSortModel,
} from './BodyStatsGridState'
import { BodyStatsGridToolbar } from './BodyStatsGridToolbar'
import { copyBodyStatsRow, type BodyStatsRow } from './BodyStatsGridTypes'
import { useBodyStatsCellEdit } from './useBodyStatsCellEdit'
import { useBodyStatsMutations } from './useBodyStatsMutations'

type BodyStatsGridProps = {
  where: BodyStatsFilterInput | null
  filterModel: BodyStatsFilterModel
  sortModel: BodyStatsSortModel
  columnState: BodyStatsColumnState[]
  resetTableVersion: number
  refreshVersion: number
  createdRow: BodyStatsRow | null
  isCreating: boolean
  onCreate: () => void
  onColumnStateChange: (columns: BodyStatsColumnState[]) => void
  onGridStateChange: (filters: BodyStatsFilterModel, sort: BodyStatsSortModel) => void
}

const pageQuery = graphql`
  query BodyStatsGridPageQuery(
    $first: Int!
    $after: String
    $where: BodyStatsFilterInput
    $order: [BodyStatsSortInput!]
  ) {
    bodyStats(first: $first, after: $after, where: $where, order: $order) {
      totalCount
      nodes {
        id
        date
        weight
        bodyFatPercentage
        musclePercentage
        waterPercentage
        boneMass
        comment
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
`

function getGridSortModel(api: GridApi<BodyStatsRow>): BodyStatsSortModel {
  return api
    .getColumnState()
    .filter(({ sort }) => sort)
    .sort((left, right) => (left.sortIndex ?? 0) - (right.sortIndex ?? 0))
    .flatMap(({ colId, sort }) => (sort ? [{ colId, sort }] : []))
}

export function BodyStatsGrid({
  where,
  filterModel,
  sortModel,
  columnState,
  resetTableVersion,
  refreshVersion,
  createdRow,
  isCreating,
  onCreate,
  onColumnStateChange,
  onGridStateChange,
}: BodyStatsGridProps) {
  const { t, i18n } = useTranslation()
  const format = useFormat()
  const environment = useRelayEnvironment()
  const mutations = useBodyStatsMutations()
  const [loadFailed, setLoadFailed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [resultCount, setResultCount] = useState<number | null>(null)
  const [visibleColumns, setVisibleColumns] = useState<string[]>([...bodyStatsColumnIds])
  const [pinnedBodyStats, setPinnedBodyStats] = useState<BodyStatsRow[]>([])
  const [deleting, setDeleting] = useState<BodyStatsRow | null>(null)
  const [gridApi, setGridApi] = useState<GridApi<BodyStatsRow> | null>(null)
  const applyingUrlState = useRef(false)
  const handledRefreshVersion = useRef(refreshVersion)

  const [pinnedCreatedRow, setPinnedCreatedRow] = useState<BodyStatsRow | null>(null)
  if (createdRow && createdRow !== pinnedCreatedRow) {
    setPinnedCreatedRow(createdRow)
    setPinnedBodyStats((current) =>
      current.some((pinned) => pinned.id === createdRow.id)
        ? current
        : [...current, copyBodyStatsRow(createdRow)],
    )
  }

  const togglePinnedBodyStats =useCallback((row: BodyStatsRow) => {
    setPinnedBodyStats((current) =>
      current.some((pinned) => pinned.id === row.id)
        ? current.filter((pinned) => pinned.id !== row.id)
        : [...current, copyBodyStatsRow(row)],
    )
  }, [])

  const datasource = useMemo(
    () =>
      new BodyStatsDataSource({
        environment,
        pageQuery,
        initialWhere: where,
        initialOrder: defaultOrder,
        getQuery: (sort, filters) => getGridQuery(sort, filters, where),
        onLoadFailed: setLoadFailed,
        onLoadStateChange: setLoading,
        onResultCountChange: setResultCount,
      }),
    [environment, where],
  )

  const reloadRows = useCallback(() => {
    datasource.reset()
    gridApi?.refreshInfiniteCache()
  }, [datasource, gridApi])

  const onBodyStatsUpdated = useCallback(
    (row: BodyStatsRow) => {
      setPinnedBodyStats((current) =>
        current.map((pinned) => (pinned.id === row.id ? copyBodyStatsRow(row) : pinned)),
      )
      reloadRows()
    },
    [reloadRows],
  )
  const { isUpdating, onCellValueChanged } = useBodyStatsCellEdit(onBodyStatsUpdated)

  useEffect(() => {
    if (handledRefreshVersion.current === refreshVersion) return
    handledRefreshVersion.current = refreshVersion
    reloadRows()
  }, [refreshVersion, reloadRows])

  const applyUrlGridState = useCallback(
    (api: GridApi<BodyStatsRow>) => {
      const currentSort = getGridSortModel(api)
      const sortChanged = JSON.stringify(currentSort) !== JSON.stringify(sortModel)
      const filtersChanged =
        JSON.stringify(api.getFilterModel() ?? {}) !== JSON.stringify(filterModel)
      if (!sortChanged && !filtersChanged) return

      applyingUrlState.current = true
      try {
        if (sortChanged) {
          api.applyColumnState({
            state: sortModel.map(({ colId, sort }, sortIndex) => ({ colId, sort, sortIndex })),
            defaultState: { sort: null },
          })
        }
        if (filtersChanged) api.setFilterModel(filterModel)
      } finally {
        queueMicrotask(() => {
          applyingUrlState.current = false
        })
      }
    },
    [filterModel, sortModel],
  )

  const updateColumnState = useCallback(
    (api: GridApi<BodyStatsRow>) => {
      const state = parseBodyStatsColumnState(serializeBodyStatsColumnState(api.getColumnState()))
      onColumnStateChange(state)
      setVisibleColumns(state.filter(({ hide }) => !hide).map(({ colId }) => colId))
    },
    [onColumnStateChange],
  )

  const persistColumnState = useCallback(
    (api: GridApi<BodyStatsRow>) => {
      const state = serializeBodyStatsColumnState(api.getColumnState())
      updateColumnState(api)
      try {
        window.localStorage.setItem(BODY_STATS_COLUMN_STORAGE_KEY, state)
      } catch (error) {
        console.error('Could not save Body-Stats column preferences.', error)
      }
    },
    [updateColumnState],
  )

  const restoreColumnState = useCallback(
    (api: GridApi<BodyStatsRow>) => {
      try {
        const storedState = parseBodyStatsColumnState(
          window.localStorage.getItem(BODY_STATS_COLUMN_STORAGE_KEY),
        )
        if (storedState.length > 0) {
          api.applyColumnState({ state: storedState, applyOrder: true })
        }
      } catch (error) {
        console.error('Could not restore Body-Stats column preferences.', error)
      }
      updateColumnState(api)
    },
    [updateColumnState],
  )

  const applyColumnPreset = useCallback(() => {
    const api = gridApi
    if (!api || columnState.length === 0) return

    if (
      serializeBodyStatsColumnState(api.getColumnState()) !==
      serializeBodyStatsColumnState(columnState)
    ) {
      api.applyColumnState({ state: columnState, applyOrder: true })
    }
  }, [columnState, gridApi])

  useEffect(() => {
    applyColumnPreset()
  }, [applyColumnPreset])

  useEffect(() => {
    if (resetTableVersion === 0) return
    const api = gridApi
    if (!api) return

    applyingUrlState.current = true
    try {
      api.resetColumnState()
      api.setFilterModel(null)
      persistColumnState(api)
    } finally {
      queueMicrotask(() => {
        applyingUrlState.current = false
      })
    }
  }, [gridApi, persistColumnState, resetTableVersion])

  useEffect(() => {
    if (gridApi) applyUrlGridState(gridApi)
  }, [applyUrlGridState, gridApi])

  const defaultColDef = useMemo<ColDef<BodyStatsRow>>(
    () => ({
      resizable: true,
      sortable: true,
      filter: true,
    }),
    [],
  )

  const confirmDelete = useCallback(() => {
    if (!deleting) return
    const { id } = deleting
    mutations.remove(id, {
      onSettled: () => {
        setDeleting(null)
        setPinnedBodyStats((current) => current.filter((pinned) => pinned.id !== id))
        reloadRows()
      },
    })
  }, [deleting, mutations, reloadRows])

  const columnDefs = useMemo(
    () =>
      createBodyStatsColumnDefs({
        t,
        format,
        emptyValue: t('bodyStats.emptyValue'),
        isDeleting: mutations.isDeleting,
        isUpdating,
        pinnedBodyStatsIds: new Set(pinnedBodyStats.map(({ id }) => id)),
        onDelete: setDeleting,
        onTogglePin: togglePinnedBodyStats,
      }),
    [format, isUpdating, mutations.isDeleting, pinnedBodyStats, t, togglePinnedBodyStats],
  )

  const saveGridState = useCallback(
    (api: GridApi<BodyStatsRow>) => {
      if (applyingUrlState.current) return
      onGridStateChange(api.getFilterModel() ?? {}, getGridSortModel(api))
    },
    [onGridStateChange],
  )

  const handleFilterChanged = useCallback(
    (api: GridApi<BodyStatsRow>) => {
      void clearNoOpGridFilters(
        api.getFilterModel() ?? {},
        (column) => api.setColumnFilterModel(column, null),
        () => api.onFilterChanged(),
      )
        .then((cleared) => {
          if (!cleared) saveGridState(api)
        })
        .catch((error: unknown) => {
          console.error('Could not clear no-op body stats filters.', error)
        })
    },
    [saveGridState],
  )

  const setColumnVisible = useCallback(
    (column: string, visible: boolean) => {
      const api = gridApi
      if (!api) return
      api.applyColumnState({ state: [{ colId: column, hide: !visible }] })
      persistColumnState(api)
    },
    [gridApi, persistColumnState],
  )

  return (
    <Box display="grid" gap="3">
      {loadFailed && (
        <Text role="alert" color="fg.error">
          {t('bodyStats.loadFailed')}
        </Text>
      )}
      <BodyStatsGridToolbar
        resultCount={resultCount}
        visibleColumns={visibleColumns}
        isCreating={isCreating}
        onCreate={onCreate}
        onColumnVisibleChange={setColumnVisible}
      />
      <AgGridTable<BodyStatsRow>
        key={i18n.resolvedLanguage}
        ariaLabel={t('bodyStats.table.caption')}
        height="clamp(24rem, calc(100dvh - 22rem), 48rem)"
        localeText={{
          equals: t('bodyStats.gridFilter.options.equals'),
          notEqual: t('bodyStats.gridFilter.options.notEqual'),
          contains: t('bodyStats.gridFilter.options.contains'),
          notContains: t('bodyStats.gridFilter.options.notContains'),
          startsWith: t('bodyStats.gridFilter.options.startsWith'),
          endsWith: t('bodyStats.gridFilter.options.endsWith'),
          blank: t('bodyStats.gridFilter.options.blank'),
          notBlank: t('bodyStats.gridFilter.options.notBlank'),
          lessThan: t('bodyStats.gridFilter.options.lessThan'),
          greaterThan: t('bodyStats.gridFilter.options.greaterThan'),
          inRange: t('bodyStats.gridFilter.options.inRange'),
          before: t('bodyStats.gridFilter.options.before'),
          after: t('bodyStats.gridFilter.options.after'),
        }}
        rowModelType="infinite"
        datasource={datasource}
        getRowId={({ data }) => data?.id}
        cacheBlockSize={20}
        maxBlocksInCache={5}
        rowBuffer={10}
        suppressRowVirtualisation={false}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        loading={loading}
        pinnedTopRowData={pinnedBodyStats.length > 0 ? pinnedBodyStats : undefined}
        onGridReady={({ api }) => {
          setGridApi(api)
          restoreColumnState(api)
          applyUrlGridState(api)
        }}
        onFilterChanged={({ api }) => handleFilterChanged(api)}
        onSortChanged={({ api }) => saveGridState(api)}
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
        title={t('bodyStats.delete.title')}
        description={
          deleting
            ? t('bodyStats.delete.description', {
                date: format.date(deleting.date),
                weight: format.measure(deleting.weight, 'kg', 1),
              })
            : ''
        }
        confirmLabel={t('bodyStats.delete.confirm')}
        busy={mutations.isDeleting}
        onConfirm={confirmDelete}
      />
    </Box>
  )
}
