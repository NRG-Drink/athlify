import { Box, Button, Popover, Portal, Stack, Text } from '@chakra-ui/react'
import {
  AllCommunityModule,
  InfiniteRowModelModule,
  colorSchemeDarkBlue,
  themeQuartz,
  type ColDef,
  type GridApi,
} from 'ag-grid-community'
import { AgGridProvider, AgGridReact } from 'ag-grid-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { graphql, useMutation, useRelayEnvironment } from 'react-relay'
import { LuPin, LuPinOff, LuTrash2 } from 'react-icons/lu'
import { toaster } from '../../components/ui/toaster'
import type { EventFilterInput, MyEventsPageQuery } from './__generated__/MyEventsPageQuery.graphql'
import type { MyEventsGridDeleteMutation } from './__generated__/MyEventsGridDeleteMutation.graphql'
import type { MyEventsGridCreateMutation } from './__generated__/MyEventsGridCreateMutation.graphql'
import type { MyEventsGridUpdateMutation } from './__generated__/MyEventsGridUpdateMutation.graphql'
import { MyEventsDataSource } from './MyEventsDataSource'
import { defaultOrder, getGridQuery } from './MyEventsGridQuery'
import { MyEventsTypeFilter } from './MyEventsTypeFilter'
import { useMyEventsCellEdit } from './useMyEventsCellEdit'
import { useFormat } from '../../i18n/useFormat'
import { parseDate } from '../../lib/dates'
import {
  MY_EVENTS_COLUMN_STORAGE_KEY,
  myEventsColumnIds,
  parseMyEventsColumnState,
  serializeMyEventsColumnState,
  type MyEventsColumnState,
  type MyEventsFilterModel,
  type MyEventsSortModel,
} from './myEventsGridState'

type QueryEvent = NonNullable<NonNullable<MyEventsPageQuery['response']['events']>['nodes']>[number]

type EventsRow = {
  -readonly [K in keyof QueryEvent]: QueryEvent[K]
}

function copyEventRow(row: EventsRow): EventsRow {
  return { ...row, tags: row.tags.map((tag) => ({ ...tag })) }
}

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

const eventTypes = ['CRASH', 'INJURY', 'ILLNESS', 'REPAIR', 'BREAK', 'GOAL', 'OTHER'] as const

function getTodayLocalDate(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatEventDate(
  value: string | null | undefined,
  formatDate: (date: Date) => string,
  emptyValue: string,
) {
  if (!value) return emptyValue
  const date = parseDate(value.split('-').reverse().join('.'))
  return date ? formatDate(date) : value
}

function getEventRowNumber(id: string | undefined): number | null {
  if (!id) return null

  const match = atob(id).match(/^Event:(\d+)$/)
  return match ? Number(match[1]) : null
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
  const agGridModules = [AllCommunityModule, InfiniteRowModelModule]
  const [loadFailed, setLoadFailed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [visibleColumns, setVisibleColumns] = useState<string[]>([...myEventsColumnIds])
  const [columnsOpen, setColumnsOpen] = useState(false)
  const [pinnedEvents, setPinnedEvents] = useState<EventsRow[]>([])
  const gridApiRef = useRef<GridApi<EventsRow> | null>(null)
  const applyingUrlState = useRef(false)
  const onEventUpdated = useCallback(
    (event: NonNullable<MyEventsGridUpdateMutation['response']['updateEvent']>) => {
      setPinnedEvents((current) =>
        current.map((pinnedEvent) =>
          pinnedEvent.id === event.id
            ? { ...pinnedEvent, ...event, tags: pinnedEvent.tags }
            : pinnedEvent,
        ),
      )
    },
    [],
  )
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
    const api = gridApiRef.current
    if (!api || columnState.length === 0) return

    if (
      serializeMyEventsColumnState(api.getColumnState()) !==
      serializeMyEventsColumnState(columnState)
    ) {
      api.applyColumnState({ state: columnState, applyOrder: true })
      persistColumnState(api)
    }
  }, [columnState, persistColumnState])

  useEffect(() => applyColumnPreset(), [applyColumnPreset])

  useEffect(() => {
    if (resetTableVersion === 0) return
    const api = gridApiRef.current
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
  }, [persistColumnState, resetTableVersion])

  useEffect(() => {
    if (gridApiRef.current) applyUrlGridState(gridApiRef.current)
  }, [applyUrlGridState])

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
          gridApiRef.current?.refreshInfiniteCache()
          toaster.create({ type: 'success', title: t('events.delete.success') })
        },
        onError: () => {
          toaster.create({ type: 'error', title: t('events.delete.failed') })
        },
      })
    },
    [commitDelete, datasource, t],
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
        gridApiRef.current?.refreshInfiniteCache()
        toaster.create({ type: 'success', title: t('events.add.success') })
      },
      onError: () => {
        toaster.create({ type: 'error', title: t('events.add.failed') })
      },
    })
  }, [commitCreate, datasource, t])

  const columnDefs = useMemo<ColDef<EventsRow>[]>(
    () => [
      {
        colId: 'delete',
        headerName: t('events.columns.actions'),
        width: 104,
        pinned: 'left',
        filter: false,
        cellRenderer: ({ data }: { data?: EventsRow }) => {
          if (!data) return null
          const isPinned = pinnedEvents.some((event) => event.id === data.id)
          return (
            <>
              <Button
                size="xs"
                variant="ghost"
                aria-label={t(isPinned ? 'events.pin.unpinRow' : 'events.pin.pinRow')}
                aria-pressed={isPinned}
                disabled={isUpdating}
                margin={0}
                padding={0}
                onClick={() => togglePinnedEvent(data)}
              >
                {isPinned ? <LuPinOff aria-hidden /> : <LuPin aria-hidden />}
              </Button>
              <Button
                size="xs"
                variant="ghost"
                colorPalette="red"
                aria-label={t('events.delete.action')}
                disabled={isDeleting}
                onClick={() => deleteEvent(data.id)}
              >
                <LuTrash2 aria-hidden />
              </Button>
            </>
          )
        },
      },
      {
        field: 'id',
        headerName: t('events.columns.id'),
        filter: false,
        width: 100,
        pinned: 'left',
        valueGetter: (params) => getEventRowNumber(params.data?.id),
      },
      {
        field: 'name',
        headerName: t('events.columns.name'),
        flex: 1,
        filter: 'agTextColumnFilter',
        minWidth: 300,
        width: 200,
        editable: !isUpdating,
        cellEditor: 'agTextCellEditor',
        cellEditorParams: { useFormatter: false },
      },
      {
        field: 'startDate',
        headerName: t('events.columns.startDate'),
        filter: 'agDateColumnFilter',
        valueFormatter: ({ value }) => formatEventDate(value, format.date, t('events.emptyValue')),
        editable: !isUpdating,
        cellEditor: 'agDateStringCellEditor',
      },
      {
        field: 'endDate',
        headerName: t('events.columns.endDate'),
        filter: 'agDateColumnFilter',
        valueFormatter: ({ value }) => formatEventDate(value, format.date, t('events.emptyValue')),
        editable: !isUpdating,
        cellEditor: 'agDateStringCellEditor',
      },
      {
        field: 'type',
        headerName: t('events.columns.type'),
        filter: MyEventsTypeFilter,
        minWidth: 100,
        valueFormatter: ({ value }) =>
          value ? t(`events.types.${value}`) : t('events.emptyValue'),
        editable: !isUpdating,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: {
          values: [...eventTypes],
          valueFormatter: ({ value }: { value: (typeof eventTypes)[number] }) =>
            t(`events.types.${value}`),
        },
      },
      {
        field: 'tags',
        headerName: t('events.columns.tags'),
        filter: 'agTextColumnFilter',
        sortable: false,
        minWidth: 100,
        valueFormatter: (params) => params.value?.tags?.join(', ') ?? '-',
      },
      {
        field: 'description',
        headerName: t('events.columns.description'),
        filter: 'agTextColumnFilter',
        minWidth: 400,
        valueFormatter: ({ value }) => value || t('events.emptyValue'),
        editable: !isUpdating,
        cellEditor: 'agLargeStringCellEditor',
      },
    ],
    [deleteEvent, format.date, isDeleting, isUpdating, pinnedEvents, t, togglePinnedEvent],
  )

  const saveGridState = useCallback(
    (api: GridApi<EventsRow>) => {
      if (applyingUrlState.current) return
      onGridStateChange(api.getFilterModel() ?? {}, getGridSortModel(api))
    },
    [onGridStateChange],
  )

  const setColumnVisible = (column: string, visible: boolean) => {
    const api = gridApiRef.current
    if (!api) return
    api.applyColumnState({ state: [{ colId: column, hide: !visible }] })
    persistColumnState(api)
  }

  return (
    <AgGridProvider modules={agGridModules}>
      {loadFailed && (
        <Text role="alert" color="fg.error">
          {t('events.loadFailed')}
        </Text>
      )}
      <Box display="grid" gap="2">
        <Box display="grid" gridTemplateColumns="max-content max-content" gap="2">
          <Button size="sm" onClick={createEvent} loading={isCreating}>
            {t('events.add.open')}
          </Button>
          <Popover.Root
            open={columnsOpen}
            onOpenChange={(details) => setColumnsOpen(details.open)}
            positioning={{ placement: 'bottom-start', gutter: 8 }}
            lazyMount
            unmountOnExit
          >
            <Popover.Trigger asChild>
              <Button size="sm" variant="outline">
                {t('events.columnPicker.open')}
              </Button>
            </Popover.Trigger>
            <Portal>
              <Popover.Positioner>
                <Popover.Content
                  aria-label={t('events.columnPicker.label')}
                  colorPalette="brand"
                  width="min(20rem, calc(100vw - 2rem))"
                  bg="bg.panel"
                  borderWidth="1px"
                  borderRadius="l3"
                  _dark={{ shadow: 'none' }}
                >
                  <Popover.Header fontWeight="semibold">
                    {t('events.columnPicker.label')}
                  </Popover.Header>
                  <Popover.Body>
                    <Stack gap="2" role="group" aria-label={t('events.columnPicker.label')}>
                      {myEventsColumnIds.filter((column) => column !== 'delete').map((column) => (
                        <Box
                          as="label"
                          key={column}
                          display="grid"
                          gridTemplateColumns="auto 1fr"
                          alignItems="center"
                          gap="2"
                          cursor="pointer"
                        >
                          <input
                            type="checkbox"
                            checked={visibleColumns.includes(column)}
                            onChange={(event) => setColumnVisible(column, event.target.checked)}
                          />
                          {t(`events.columns.${column}`)}
                        </Box>
                      ))}
                    </Stack>
                  </Popover.Body>
                </Popover.Content>
              </Popover.Positioner>
            </Portal>
          </Popover.Root>
        </Box>
        <Box height="400px" overflow="hidden">
          <AgGridReact<EventsRow>
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
            theme={themeQuartz.withPart(colorSchemeDarkBlue)}
            onGridReady={({ api }) => {
              gridApiRef.current = api
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
      </Box>
    </AgGridProvider>
  )
}
