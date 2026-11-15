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
import { graphql } from 'react-relay/legacy'
import { useRelayEnvironment } from 'react-relay'
import type { EventFilterInput, MyEventsPageQuery } from './__generated__/MyEventsPageQuery.graphql'
import { MyEventsDataSource } from './MyEventsDataSource'
import { defaultOrder, getGridQuery } from './MyEventsGridQuery'
import { MyEventsTypeFilter } from './MyEventsTypeFilter'
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

type MyEventsGridProps = {
  where: EventFilterInput | null
  filterModel: MyEventsFilterModel
  sortModel: MyEventsSortModel
  columnState: MyEventsColumnState[]
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
  onColumnStateChange,
  onGridStateChange,
}: MyEventsGridProps) {
  const { t } = useTranslation()
  const environment = useRelayEnvironment()
  const agGridModules = [AllCommunityModule, InfiniteRowModelModule]
  const [loadFailed, setLoadFailed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [visibleColumns, setVisibleColumns] = useState<string[]>([...myEventsColumnIds])
  const [columnsOpen, setColumnsOpen] = useState(false)
  const gridApiRef = useRef<GridApi<EventsRow> | null>(null)
  const applyingUrlState = useRef(false)
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

  const columnDefs = useMemo<ColDef<EventsRow>[]>(
    () => [
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
      },
      {
        field: 'startDate',
        headerName: t('events.columns.startDate'),
        filter: 'agDateColumnFilter',
        valueFormatter: (params) =>
          params.value ? new Date(params.value).toLocaleDateString() : '-',
      },
      {
        field: 'endDate',
        headerName: t('events.columns.endDate'),
        filter: 'agDateColumnFilter',
        valueFormatter: (params) =>
          params.value ? new Date(params.value).toLocaleDateString() : '-',
      },
      {
        field: 'type',
        headerName: t('events.columns.type'),
        filter: MyEventsTypeFilter,
        minWidth: 100,
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
      },
    ],
    [t],
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
                    {myEventsColumnIds.map((column) => (
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
            theme={themeQuartz.withPart(colorSchemeDarkBlue)}
            onGridReady={({ api }) => {
              gridApiRef.current = api
              restoreColumnState(api)
              applyUrlGridState(api)
            }}
            onFilterChanged={({ api }) => saveGridState(api)}
            onSortChanged={({ api }) => saveGridState(api)}
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
