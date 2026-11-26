import { Box, Text } from '@chakra-ui/react'
import type { GridApi } from 'ag-grid-community'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { graphql, useRelayEnvironment } from 'react-relay'
import { GridToolbar } from '../../components/ag-grid/GridToolbar'
import { InfiniteAgGridTable } from '../../components/ag-grid/InfiniteAgGridTable'
import { handleGridFilterChanged } from '../../components/ag-grid/gridFilterChange'
import { getGridSortModel } from '../../components/ag-grid/gridSortModel'
import { useGridColumnPreferences } from '../../components/ag-grid/useGridColumnPreferences'
import { useGridUrlSync } from '../../components/ag-grid/useGridUrlSync'
import { usePinnedRows } from '../../components/ag-grid/usePinnedRows'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useFormat } from '../../i18n/useFormat'
import type { BodyStatsFilterInput } from './__generated__/BodyStatsGridPageQuery.graphql'
import { BodyStatsDataSource } from './BodyStatsDataSource'
import { createBodyStatsColumnDefs } from './BodyStatsGridColumns'
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
  /** Called after a measurement was edited or deleted, so other views of the data can refresh. */
  onDataChanged: () => void
  onColumnStateChange: (columns: BodyStatsColumnState[]) => void
  onGridStateChange: (filters: BodyStatsFilterModel, sort: BodyStatsSortModel) => void
}

const bodyStatsToolbarColumnIds = bodyStatsColumnIds.filter((column) => column !== 'actions')

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
  onDataChanged,
  onColumnStateChange,
  onGridStateChange,
}: BodyStatsGridProps) {
  const { t } = useTranslation()
  const format = useFormat()
  const environment = useRelayEnvironment()
  const mutations = useBodyStatsMutations()
  const [loadFailed, setLoadFailed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [resultCount, setResultCount] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<BodyStatsRow | null>(null)
  const [gridApi, setGridApi] = useState<GridApi<BodyStatsRow> | null>(null)
  const handledRefreshVersion = useRef(refreshVersion)
  const {
    rows: pinnedRows,
    ids: pinnedIds,
    toggle: togglePinned,
    add: addPinned,
    update: updatePinned,
    remove: removePinned,
  } = usePinnedRows<BodyStatsRow>(copyBodyStatsRow)

  const [pinnedCreatedRow, setPinnedCreatedRow] = useState<BodyStatsRow | null>(null)
  if (createdRow && createdRow !== pinnedCreatedRow) {
    setPinnedCreatedRow(createdRow)
    addPinned(createdRow)
  }

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
      updatePinned(row.id, () => copyBodyStatsRow(row))
      reloadRows()
      onDataChanged()
    },
    [onDataChanged, reloadRows, updatePinned],
  )
  const onBodyStatsGone = useCallback(
    (row: BodyStatsRow) => {
      removePinned(row.id)
      reloadRows()
      onDataChanged()
    },
    [onDataChanged, reloadRows, removePinned],
  )
  const { isUpdating, onCellValueChanged } = useBodyStatsCellEdit(
    onBodyStatsUpdated,
    onBodyStatsGone,
  )

  useEffect(() => {
    if (handledRefreshVersion.current === refreshVersion) return
    handledRefreshVersion.current = refreshVersion
    reloadRows()
  }, [refreshVersion, reloadRows])

  const { visibleColumns, persistColumnState, restoreColumnState, setColumnVisible } =
    useGridColumnPreferences<BodyStatsRow, BodyStatsColumnState>({
      gridApi,
      columnIds: bodyStatsColumnIds,
      storageKey: BODY_STATS_COLUMN_STORAGE_KEY,
      storageLabel: 'Body-Stats',
      columnState,
      parse: parseBodyStatsColumnState,
      serialize: serializeBodyStatsColumnState,
      onColumnStateChange,
    })

  const { applyUrlState, isApplyingUrlState } = useGridUrlSync<BodyStatsRow>({
    gridApi,
    filterModel,
    sortModel,
    resetTableVersion,
    onReset: persistColumnState,
  })

  const confirmDelete = useCallback(() => {
    if (!deleting) return
    const { id } = deleting
    mutations.remove(id, {
      onDeleted: () => {
        removePinned(id)
        reloadRows()
        onDataChanged()
      },
      onSettled: () => setDeleting(null),
    })
  }, [deleting, mutations, onDataChanged, reloadRows, removePinned])

  const columnDefs = useMemo(
    () =>
      createBodyStatsColumnDefs({
        t,
        format,
        emptyValue: t('bodyStats.emptyValue'),
        isDeleting: mutations.isDeleting,
        isUpdating,
        pinnedBodyStatsIds: pinnedIds,
        onDelete: setDeleting,
        onTogglePin: togglePinned,
      }),
    [format, isUpdating, mutations.isDeleting, pinnedIds, t, togglePinned],
  )

  const saveGridState = useCallback(
    (api: GridApi<BodyStatsRow>) => {
      if (isApplyingUrlState()) return
      onGridStateChange(api.getFilterModel() ?? {}, getGridSortModel(api))
    },
    [isApplyingUrlState, onGridStateChange],
  )

  return (
    <Box display="grid" gap="3">
      {loadFailed && (
        <Text role="alert" color="fg.error">
          {t('bodyStats.loadFailed')}
        </Text>
      )}
      <GridToolbar
        namespace="bodyStats"
        columnIds={bodyStatsToolbarColumnIds}
        resultCount={resultCount}
        visibleColumns={visibleColumns}
        isCreating={isCreating}
        onCreate={onCreate}
        onColumnVisibleChange={setColumnVisible}
      />
      <InfiniteAgGridTable<BodyStatsRow>
        ariaLabel={t('bodyStats.table.caption')}
        localeNamespace="bodyStats"
        datasource={datasource}
        getRowId={({ data }) => data?.id}
        columnDefs={columnDefs}
        loading={loading}
        pinnedTopRowData={pinnedRows.length > 0 ? pinnedRows : undefined}
        onGridReady={({ api }) => {
          setGridApi(api)
          restoreColumnState(api)
          applyUrlState(api)
        }}
        onFilterChanged={({ api }) =>
          handleGridFilterChanged(
            api,
            () => saveGridState(api),
            'Could not clear no-op body stats filters.',
          )
        }
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
