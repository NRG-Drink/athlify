import { Box, Text } from '@chakra-ui/react'
import type { GridApi } from 'ag-grid-community'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { graphql, useMutation, useRelayEnvironment } from 'react-relay'
import { GridToolbar } from '../../components/ag-grid/GridToolbar'
import { InfiniteAgGridTable } from '../../components/ag-grid/InfiniteAgGridTable'
import { handleGridFilterChanged } from '../../components/ag-grid/gridFilterChange'
import { getGridSortModel } from '../../components/ag-grid/gridSortModel'
import { useGridColumnPreferences } from '../../components/ag-grid/useGridColumnPreferences'
import { useGridUrlSync } from '../../components/ag-grid/useGridUrlSync'
import { usePinnedRows } from '../../components/ag-grid/usePinnedRows'
import { toaster } from '../../components/ui/toaster'
import { useFormat } from '../../i18n/useFormat'
import { localDateKey } from '../../lib/period'
import type { EventFilterInput } from './__generated__/EventsManagementPageQuery.graphql'
import type { EventsGridDeleteMutation } from './__generated__/EventsGridDeleteMutation.graphql'
import type { EventsGridCreateMutation } from './__generated__/EventsGridCreateMutation.graphql'
import type { EventsGridUpdateMutation } from './__generated__/EventsGridUpdateMutation.graphql'
import { EventsDataSource } from './EventsDataSource'
import { createEventsColumnDefs } from './EventsGridColumns'
import { defaultOrder, getGridQuery } from './EventsGridQuery'
import { copyEventRow, type EventsRow } from './EventsGridTypes'
import {
  EVENTS_COLUMN_STORAGE_KEY,
  eventsColumnIds,
  parseEventsColumnState,
  serializeEventsColumnState,
  type EventsColumnState,
  type EventsFilterModel,
  type EventsSortModel,
} from './EventsGridState'
import { useEventsCellEdit } from './useEventsCellEdit'

type EventsGridProps = {
  where: EventFilterInput | null
  filterModel: EventsFilterModel
  sortModel: EventsSortModel
  columnState: EventsColumnState[]
  resetTableVersion: number
  onColumnStateChange: (columns: EventsColumnState[]) => void
  onGridStateChange: (filters: EventsFilterModel, sort: EventsSortModel) => void
}

const pageQuery = graphql`
  query EventsManagementPageQuery(
    $first: Int!
    $after: String
    $where: EventFilterInput
    $order: [EventSortInput!]
  ) {
    events(first: $first, after: $after, where: $where, order: $order) {
      totalCount
      nodes {
        id
        name
        startDate
        endDate
        description
        type
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

const deleteMutation = graphql`
  mutation EventsGridDeleteMutation($id: ID!) {
    deleteEvent(id: $id)
  }
`

const createMutation = graphql`
  mutation EventsGridCreateMutation($event: EventInput!) {
    createEvent(event: $event) {
      id
      name
      startDate
      endDate
      description
      type
      tags {
        id
        name
      }
    }
  }
`

const eventsToolbarColumnIds = eventsColumnIds.filter((column) => column !== 'delete')

type UpdatedEvent = NonNullable<EventsGridUpdateMutation['response']['updateEvent']>

export function EventsGrid({
  where,
  filterModel,
  sortModel,
  columnState,
  resetTableVersion,
  onColumnStateChange,
  onGridStateChange,
}: EventsGridProps) {
  const { t } = useTranslation()
  const format = useFormat()
  const environment = useRelayEnvironment()
  const [commitDelete, isDeleting] = useMutation<EventsGridDeleteMutation>(deleteMutation)
  const [commitCreate, isCreating] = useMutation<EventsGridCreateMutation>(createMutation)
  const [loadFailed, setLoadFailed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [resultCount, setResultCount] = useState<number | null>(null)
  const [gridApi, setGridApi] = useState<GridApi<EventsRow> | null>(null)
  const {
    rows: pinnedRows,
    ids: pinnedIds,
    toggle: togglePinned,
    add: addPinned,
    update: updatePinned,
    remove: removePinned,
  } = usePinnedRows<EventsRow>(copyEventRow)

  const datasource = useMemo(
    () =>
      new EventsDataSource({
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

  const onEventUpdated = useCallback(
    (event: UpdatedEvent) => {
      updatePinned(event.id, (row) => ({ ...row, ...event, tags: row.tags }))
      reloadRows()
    },
    [updatePinned, reloadRows],
  )
  const { isUpdating, onCellValueChanged } = useEventsCellEdit(onEventUpdated)

  const { visibleColumns, persistColumnState, restoreColumnState, setColumnVisible } =
    useGridColumnPreferences<EventsRow, EventsColumnState>({
      gridApi,
      columnIds: eventsColumnIds,
      storageKey: EVENTS_COLUMN_STORAGE_KEY,
      storageLabel: 'My Events',
      columnState,
      parse: parseEventsColumnState,
      serialize: serializeEventsColumnState,
      onColumnStateChange,
    })

  const { applyUrlState, isApplyingUrlState } = useGridUrlSync<EventsRow>({
    gridApi,
    filterModel,
    sortModel,
    resetTableVersion,
    onReset: persistColumnState,
  })

  const deleteEvent = useCallback(
    (id: string) => {
      commitDelete({
        variables: { id },
        onCompleted: (_response, errors) => {
          if (errors?.length) {
            toaster.create({ type: 'error', title: t('events.delete.failed') })
            return
          }
          removePinned(id)
          reloadRows()
          toaster.create({ type: 'success', title: t('events.delete.success') })
        },
        onError: () => {
          toaster.create({ type: 'error', title: t('events.delete.failed') })
        },
      })
    },
    [commitDelete, removePinned, reloadRows, t],
  )

  const createEvent = useCallback(() => {
    commitCreate({
      variables: {
        event: {
          name: t('events.add.defaultName'),
          startDate: localDateKey(new Date()),
          type: 'OTHER',
          description: null,
          endDate: null,
          tagIds: [],
        },
      },
      onCompleted: (response, errors) => {
        if (errors?.length) {
          toaster.create({ type: 'error', title: t('events.add.failed') })
          return
        }
        addPinned(response.createEvent)
        reloadRows()
        toaster.create({ type: 'success', title: t('events.add.success') })
      },
      onError: () => {
        toaster.create({ type: 'error', title: t('events.add.failed') })
      },
    })
  }, [commitCreate, addPinned, reloadRows, t])

  const columnDefs = useMemo(
    () =>
      createEventsColumnDefs({
        t,
        formatDate: format.date,
        emptyValue: t('events.emptyValue'),
        isDeleting,
        isUpdating,
        pinnedEventIds: pinnedIds,
        onDelete: deleteEvent,
        onTogglePin: togglePinned,
      }),
    [deleteEvent, format.date, isDeleting, isUpdating, pinnedIds, t, togglePinned],
  )

  const saveGridState = useCallback(
    (api: GridApi<EventsRow>) => {
      if (isApplyingUrlState()) return
      onGridStateChange(api.getFilterModel() ?? {}, getGridSortModel(api))
    },
    [isApplyingUrlState, onGridStateChange],
  )

  return (
    <Box display="grid" gap="3">
      {loadFailed && (
        <Text role="alert" color="fg.error">
          {t('events.loadFailed')}
        </Text>
      )}
      <GridToolbar
        namespace="events"
        columnIds={eventsToolbarColumnIds}
        resultCount={resultCount}
        isCreating={isCreating}
        visibleColumns={visibleColumns}
        onCreate={createEvent}
        onColumnVisibleChange={setColumnVisible}
      />
      <InfiniteAgGridTable<EventsRow>
        ariaLabel={t('events.table.caption')}
        localeNamespace="events"
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
            'Could not clear no-op event filters.',
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
    </Box>
  )
}
