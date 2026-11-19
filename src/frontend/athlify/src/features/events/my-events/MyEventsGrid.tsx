import { Box, Text } from '@chakra-ui/react'
import type { ColDef, GridApi } from 'ag-grid-community'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { graphql, useMutation, useRelayEnvironment } from 'react-relay'
import { AgGridTable } from '../../../components/ag-grid/AgGridTable'
import { toaster } from '../../../components/ui/toaster'
import { useFormat } from '../../../i18n/useFormat'
import type { EventFilterInput } from './__generated__/MyEventsPageQuery.graphql'
import type { MyEventsGridDeleteMutation } from './__generated__/MyEventsGridDeleteMutation.graphql'
import type { MyEventsGridCreateMutation } from './__generated__/MyEventsGridCreateMutation.graphql'
import type { MyEventsGridUpdateMutation } from './__generated__/MyEventsGridUpdateMutation.graphql'
import { MyEventsDataSource } from './MyEventsDataSource'
import { createMyEventsColumnDefs } from './MyEventsGridColumns'
import { MyEventsGridToolbar } from './MyEventsGridToolbar'
import { defaultOrder, getGridQuery } from './MyEventsGridQuery'
import { copyEventRow, type EventsRow } from './MyEventsGridTypes'
import {
  MY_EVENTS_COLUMN_STORAGE_KEY,
  myEventsColumnIds,
  parseMyEventsColumnState,
  serializeMyEventsColumnState,
  type MyEventsColumnState,
  type MyEventsFilterModel,
  type MyEventsSortModel,
} from './myEventsGridState'
import { useMyEventsCellEdit } from './useMyEventsCellEdit'

type MyEventsGridProps = {
  where: EventFilterInput | null
  filterModel: MyEventsFilterModel
  sortModel: MyEventsSortModel
  columnState: MyEventsColumnState[]
  resetTableVersion: number
  onColumnStateChange: (columns: MyEventsColumnState[]) => void
  onGridStateChange: (filters: MyEventsFilterModel, sort: MyEventsSortModel) => void
}

const pageQuery = graphql`
  query MyEventsPageQuery(
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
  mutation MyEventsGridDeleteMutation($id: ID!) {
    deleteEvent(id: $id)
  }
`

const createMutation = graphql`
  mutation MyEventsGridCreateMutation($event: EventInput!) {
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

type UpdatedEvent = NonNullable<MyEventsGridUpdateMutation['response']['updateEvent']>

function getTodayLocalDate(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getGridSortModel(api: GridApi<EventsRow>): MyEventsSortModel {
  return api
    .getColumnState()
    .filter(({ sort }) => sort)
    .sort((left, right) => (left.sortIndex ?? 0) - (right.sortIndex ?? 0))
    .flatMap(({ colId, sort }) => (sort ? [{ colId, sort }] : []))
}

export function MyEventsGrid({
  where,
  filterModel,
  sortModel,
  columnState,
  resetTableVersion,
  onColumnStateChange,
  onGridStateChange,
}: MyEventsGridProps) {
  const { t } = useTranslation()
  const format = useFormat()
  const environment = useRelayEnvironment()
  const [commitDelete, isDeleting] = useMutation<MyEventsGridDeleteMutation>(deleteMutation)
  const [commitCreate, isCreating] = useMutation<MyEventsGridCreateMutation>(createMutation)
  const [loadFailed, setLoadFailed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [resultCount, setResultCount] = useState<number | null>(null)
  const [visibleColumns, setVisibleColumns] = useState<string[]>([...myEventsColumnIds])
  const [pinnedEvents, setPinnedEvents] = useState<EventsRow[]>([])
  const [gridApi, setGridApi] = useState<GridApi<EventsRow> | null>(null)
  const applyingUrlState = useRef(false)

  const onEventUpdated = useCallback((event: UpdatedEvent) => {
    setPinnedEvents((current) =>
      current.map((pinnedEvent) =>
        pinnedEvent.id === event.id
          ? { ...pinnedEvent, ...event, tags: pinnedEvent.tags }
          : pinnedEvent,
      ),
    )
  }, [])
  const { isUpdating, onCellValueChanged } = useMyEventsCellEdit(onEventUpdated)

  const togglePinnedEvent = useCallback((row: EventsRow) => {
    setPinnedEvents((current) =>
      current.some((event) => event.id === row.id)
        ? current.filter((event) => event.id !== row.id)
        : [...current, copyEventRow(row)],
    )
  }, [])

  const datasource = useMemo(
    () =>
      new MyEventsDataSource({
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

  const applyUrlGridState = useCallback(
    (api: GridApi<EventsRow>) => {
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
    (api: GridApi<EventsRow>) => {
      const state = parseMyEventsColumnState(serializeMyEventsColumnState(api.getColumnState()))
      onColumnStateChange(state)
      setVisibleColumns(state.filter(({ hide }) => !hide).map(({ colId }) => colId))
    },
    [onColumnStateChange],
  )

  const persistColumnState = useCallback(
    (api: GridApi<EventsRow>) => {
      const state = serializeMyEventsColumnState(api.getColumnState())
      updateColumnState(api)
      try {
        window.localStorage.setItem(MY_EVENTS_COLUMN_STORAGE_KEY, state)
      } catch (error) {
        console.error('Could not save My Events column preferences.', error)
      }
    },
    [updateColumnState],
  )

  const restoreColumnState = useCallback(
    (api: GridApi<EventsRow>) => {
      try {
        const storedState = parseMyEventsColumnState(
          window.localStorage.getItem(MY_EVENTS_COLUMN_STORAGE_KEY),
        )
        if (storedState.length > 0) {
          api.applyColumnState({ state: storedState, applyOrder: true })
        }
      } catch (error) {
        console.error('Could not restore My Events column preferences.', error)
      }
      updateColumnState(api)
    },
    [updateColumnState],
  )

  const applyColumnPreset = useCallback(() => {
    const api = gridApi
    if (!api || columnState.length === 0) return

    if (
      serializeMyEventsColumnState(api.getColumnState()) !==
      serializeMyEventsColumnState(columnState)
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

  const defaultColDef = useMemo<ColDef<EventsRow>>(
    () => ({
      resizable: true,
      sortable: true,
      filter: true,
    }),
    [],
  )

  const deleteEvent = useCallback(
    (id: string) => {
      commitDelete({
        variables: { id },
        onCompleted: (_response, errors) => {
          if (errors?.length) {
            toaster.create({ type: 'error', title: t('events.delete.failed') })
            return
          }
          setPinnedEvents((current) => current.filter((event) => event.id !== id))
          datasource.reset()
          gridApi?.refreshInfiniteCache()
          toaster.create({ type: 'success', title: t('events.delete.success') })
        },
        onError: () => {
          toaster.create({ type: 'error', title: t('events.delete.failed') })
        },
      })
    },
    [commitDelete, datasource, gridApi, t],
  )

  const createEvent = useCallback(() => {
    commitCreate({
      variables: {
        event: {
          name: t('events.add.defaultName'),
          startDate: getTodayLocalDate(),
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
        setPinnedEvents((current) => [...current, copyEventRow(response.createEvent)])
        datasource.reset()
        gridApi?.refreshInfiniteCache()
        toaster.create({ type: 'success', title: t('events.add.success') })
      },
      onError: () => {
        toaster.create({ type: 'error', title: t('events.add.failed') })
      },
    })
  }, [commitCreate, datasource, gridApi, t])

  const columnDefs = useMemo(
    () =>
      createMyEventsColumnDefs({
        t,
        formatDate: format.date,
        emptyValue: t('events.emptyValue'),
        isDeleting,
        isUpdating,
        pinnedEventIds: new Set(pinnedEvents.map(({ id }) => id)),
        onDelete: deleteEvent,
        onTogglePin: togglePinnedEvent,
      }),
    [deleteEvent, format.date, isDeleting, isUpdating, pinnedEvents, t, togglePinnedEvent],
  )

  const saveGridState = useCallback(
    (api: GridApi<EventsRow>) => {
      if (applyingUrlState.current) return
      onGridStateChange(api.getFilterModel() ?? {}, getGridSortModel(api))
    },
    [onGridStateChange],
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
          {t('events.loadFailed')}
        </Text>
      )}
      <MyEventsGridToolbar
        resultCount={resultCount}
        isCreating={isCreating}
        visibleColumns={visibleColumns}
        onCreateEvent={createEvent}
        onColumnVisibleChange={setColumnVisible}
      />
      <AgGridTable<EventsRow>
        ariaLabel={t('events.table.caption')}
        height="clamp(24rem, calc(100dvh - 28rem), 48rem)"
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
        pinnedTopRowData={pinnedEvents.length > 0 ? pinnedEvents : undefined}
        onGridReady={({ api }) => {
          setGridApi(api)
          restoreColumnState(api)
          applyUrlGridState(api)
        }}
        onFilterChanged={({ api }) => saveGridState(api)}
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
