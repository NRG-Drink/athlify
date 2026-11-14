import { Box, Button, Checkbox, Field, Grid, Input, Popover, Portal, Stack, Text } from '@chakra-ui/react'
import {
  AllCommunityModule,
  type ColDef,
  type ColumnMovedEvent,
  type ColumnResizedEvent,
  type ColumnVisibleEvent,
  type GridApi,
  type GridReadyEvent,
  type FilterChangedEvent,
  type SortChangedEvent,
} from 'ag-grid-community'
import { AgGridProvider, AgGridReact } from 'ag-grid-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { graphql, useFragment } from 'react-relay'
import { LuColumns3, LuDownload, LuRotateCcw } from 'react-icons/lu'
import { useFormat } from '../../i18n/useFormat'
import { useAgGridTheme } from './useAgGridTheme'
import {
  readAgEventsColumnState,
  readAgEventsUrlState,
  saveAgEventsColumnState,
  writeAgEventsUrlState,
} from './agEventsState'
import type {
  AgEventsGrid_rows$data,
  AgEventsGrid_rows$key,
} from './__generated__/AgEventsGrid_rows.graphql'

const modules = [AllCommunityModule]
const columnIds = ['name', 'type', 'startDate', 'endDate', 'description', 'tags'] as const
type EventColumnId = (typeof columnIds)[number]
type EventRow = AgEventsGrid_rows$data[number]

const rowsFragment = graphql`
  fragment AgEventsGrid_rows on Event @relay(plural: true) {
    id
    name
    type
    description
    startDate
    endDate
    tags {
      id
      name
    }
  }
`

interface AgEventsGridProps {
  entries: AgEventsGrid_rows$key
  loading: boolean
}

export function AgEventsGrid({ entries, loading }: AgEventsGridProps) {
  const { t, i18n } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const format = useFormat()
  const theme = useAgGridTheme()
  const [gridApi, setGridApi] = useState<GridApi<EventRow>>()
  const [quickFilter, setQuickFilter] = useState(
    () => readAgEventsUrlState(new URLSearchParams(window.location.search)).search,
  )
  const [wrapCellText, setWrapCellText] = useState(false)
  const internallyWrittenSearches = useRef(new Set<string>())
  const [visibleColumns, setVisibleColumns] = useState<ReadonlySet<EventColumnId>>(
    () => new Set(columnIds),
  )
  const rows = useFragment(rowsFragment, entries)
  const rowData = useMemo(() => [...rows], [rows])
  const columnOptions = useMemo(
    () =>
      columnIds.map((id) => ({
        id,
        label: t(`events.columns.${id}`),
      })),
    [t],
  )
  const columnDefs = useMemo<ColDef<EventRow>[]>(
    () => [
      {
        field: 'name',
        headerName: t('events.columns.name'),
        minWidth: 180,
        filter: 'agTextColumnFilter',
        lockVisible: true,
      },
      {
        field: 'type',
        headerName: t('events.columns.type'),
        minWidth: 140,
        filter: 'agTextColumnFilter',
        filterValueGetter: ({ data }) =>
          data ? t(`events.types.${data.type}`, { defaultValue: data.type }) : '',
        comparator: (left, right) =>
          t(`events.types.${left}`, { defaultValue: left }).localeCompare(
            t(`events.types.${right}`, { defaultValue: right }),
            i18n.resolvedLanguage ?? i18n.language,
          ),
        valueFormatter: ({ value }) =>
          value ? t(`events.types.${value}`, { defaultValue: value }) : t('events.agEvents.emptyValue'),
      },
      {
        field: 'startDate',
        headerName: t('events.columns.startDate'),
        cellDataType: 'dateString',
        sort: 'desc',
        sortIndex: 0,
        minWidth: 150,
        filter: 'agDateColumnFilter',
        filterParams: {
          buttons: ['apply', 'reset'],
          filterOptions: [
            'equals',
            'notEqual',
            'lessThan',
            'greaterThan',
            'inRange',
            'blank',
            'notBlank',
          ],
          closeOnApply: true,
        },
        valueFormatter: ({ value }) =>
          value ? format.date(`${value}T00:00:00`) : t('events.agEvents.emptyValue'),
      },
      {
        field: 'endDate',
        headerName: t('events.columns.endDate'),
        cellDataType: 'dateString',
        minWidth: 150,
        filter: 'agDateColumnFilter',
        filterParams: {
          buttons: ['apply', 'reset'],
          filterOptions: [
            'equals',
            'notEqual',
            'lessThan',
            'greaterThan',
            'inRange',
            'blank',
            'notBlank',
          ],
          closeOnApply: true,
        },
        valueFormatter: ({ value }) =>
          value ? format.date(`${value}T00:00:00`) : t('events.agEvents.emptyValue'),
      },
      {
        field: 'description',
        headerName: t('events.columns.description'),
        minWidth: 220,
        filter: 'agTextColumnFilter',
        tooltipField: 'description',
        valueFormatter: ({ value }) => value || t('events.agEvents.emptyValue'),
      },
      {
        colId: 'tags',
        headerName: t('events.columns.tags'),
        minWidth: 180,
        filter: 'agTextColumnFilter',
        valueGetter: ({ data }) => data?.tags.map((tag) => tag.name).join(', ') ?? '',
        valueFormatter: ({ value }) => value || t('events.agEvents.emptyValue'),
      },
    ],
    [format, i18n.language, i18n.resolvedLanguage, t],
  )
  const defaultColDef = useMemo<ColDef<EventRow>>(
    () => ({
      flex: 1,
      minWidth: 120,
      resizable: true,
      sortable: true,
      floatingFilter: true,
      sortingOrder: ['desc', 'asc', null],
      wrapText: wrapCellText,
      autoHeight: wrapCellText,
    }),
    [wrapCellText],
  )
  const localeText = useMemo(
    () => ({
      noRowsToShow: t('events.agGrid.noRows'),
      loadingOoo: t('events.agGrid.loading'),
      ariaSortableColumn: t('events.sort.headerHint'),
      ariaLabelColumnFilter: t('events.agEvents.locale.ariaLabelColumnFilter'),
      ariaLabelColumnMenu: t('events.agEvents.locale.ariaLabelColumnMenu'),
      ariaLabelInputClear: t('events.agEvents.locale.ariaLabelInputClear'),
      ariaPageSizeSelectorLabel: t('events.agEvents.locale.ariaPageSizeSelectorLabel'),
      pageSizeSelectorLabel: t('events.agEvents.locale.pageSizeSelectorLabel'),
      firstPage: t('events.agEvents.locale.firstPage'),
      previousPage: t('events.agEvents.locale.previousPage'),
      nextPage: t('events.agEvents.locale.nextPage'),
      lastPage: t('events.agEvents.locale.lastPage'),
      page: t('events.agEvents.locale.page'),
      number: t('events.agEvents.locale.number'),
      of: t('events.agEvents.locale.of'),
      to: t('events.agEvents.locale.to'),
      filter: t('events.agEvents.locale.filter'),
      filterOoo: t('events.agEvents.locale.filterOoo'),
      textFilter: t('events.agEvents.locale.textFilter'),
      dateFilter: t('events.agEvents.locale.dateFilter'),
      applyFilter: t('events.agEvents.locale.applyFilter'),
      clearFilter: t('events.agEvents.locale.clearFilter'),
      resetFilter: t('events.agEvents.locale.resetFilter'),
      cancelFilter: t('events.agEvents.locale.cancelFilter'),
      equals: t('events.agEvents.locale.equals'),
      notEqual: t('events.agEvents.locale.notEqual'),
      lessThan: t('events.agEvents.locale.lessThan'),
      greaterThan: t('events.agEvents.locale.greaterThan'),
      inRange: t('events.agEvents.locale.inRange'),
      inRangeStart: t('events.agEvents.locale.inRangeStart'),
      inRangeEnd: t('events.agEvents.locale.inRangeEnd'),
      lessThanOrEqual: t('events.agEvents.locale.lessThanOrEqual'),
      greaterThanOrEqual: t('events.agEvents.locale.greaterThanOrEqual'),
      contains: t('events.agEvents.locale.contains'),
      notContains: t('events.agEvents.locale.notContains'),
      startsWith: t('events.agEvents.locale.startsWith'),
      endsWith: t('events.agEvents.locale.endsWith'),
      blank: t('events.agEvents.locale.blank'),
      notBlank: t('events.agEvents.locale.notBlank'),
      before: t('events.agEvents.locale.before'),
      after: t('events.agEvents.locale.after'),
      andCondition: t('events.agEvents.locale.andCondition'),
      orCondition: t('events.agEvents.locale.orCondition'),
      dateFormatOoo: t('events.agEvents.locale.dateFormat'),
      sortAscending: t('events.agEvents.locale.sortAscending'),
      sortDescending: t('events.agEvents.locale.sortDescending'),
      sortUnSort: t('events.agEvents.locale.sortUnSort'),
      pinColumn: t('events.agEvents.locale.pinColumn'),
      pinLeft: t('events.agEvents.locale.pinLeft'),
      pinRight: t('events.agEvents.locale.pinRight'),
      noPin: t('events.agEvents.locale.noPin'),
      autosizeThisColumn: t('events.agEvents.locale.autosizeThisColumn'),
      autosizeAllColumns: t('events.agEvents.locale.autosizeAllColumns'),
      resetColumns: t('events.agEvents.locale.resetColumns'),
    }),
    [t],
  )
  const syncVisibleColumns = useCallback((api: GridApi<EventRow>) => {
    setVisibleColumns(
      new Set(
        api
          .getColumnState()
          .filter((column) => column.hide !== true)
          .map((column) => column.colId)
          .filter((id): id is EventColumnId => columnIds.some((columnId) => columnId === id)),
      ),
    )
  }, [])
  const onGridReady = useCallback(
    ({ api }: GridReadyEvent<EventRow>) => {
      setGridApi(api)
      const localColumnState = readAgEventsColumnState()
      if (localColumnState) api.applyColumnState({ state: localColumnState, applyOrder: true })
      const urlState = readAgEventsUrlState(searchParams)
      setQuickFilter(urlState.search)
      api.setFilterModel(urlState.filterModel)
      if (searchParams.has('agEventsSort')) {
        api.applyColumnState({
          state: urlState.sortModel,
          defaultState: { sort: null, sortIndex: null },
        })
      }
      syncVisibleColumns(api)
    },
    [searchParams, syncVisibleColumns],
  )
  const persistColumnState = useCallback((api: GridApi<EventRow>) => {
    saveAgEventsColumnState(
      api
        .getColumnState()
        .map(({ colId, hide, width, flex, pinned }) => ({ colId, hide, width, flex, pinned })),
    )
  }, [])
  const onColumnResized = useCallback(
    ({ api, finished }: ColumnResizedEvent<EventRow>) => {
      if (finished) persistColumnState(api)
    },
    [persistColumnState],
  )
  const onColumnMoved = useCallback(
    ({ api }: ColumnMovedEvent<EventRow>) => persistColumnState(api),
    [persistColumnState],
  )
  const onColumnVisible = useCallback(
    ({ api }: ColumnVisibleEvent<EventRow>) => {
      syncVisibleColumns(api)
      persistColumnState(api)
    },
    [persistColumnState, syncVisibleColumns],
  )
  const updateUrl = useCallback(
    (api: GridApi<EventRow>, search: string) => {
      const sortModel = api
        .getColumnState()
        .filter((column) => column.sort)
        .sort((left, right) => (left.sortIndex ?? 0) - (right.sortIndex ?? 0))
        .flatMap((column) =>
          column.sort === 'asc' || column.sort === 'desc'
            ? [{ colId: column.colId, sort: column.sort }]
            : [],
        )
      const next = writeAgEventsUrlState(searchParams, {
        search,
        filterModel: api.getFilterModel(),
        sortModel,
      })
      if (next.toString() !== searchParams.toString()) {
        const nextSearch = next.toString()
        if (internallyWrittenSearches.current.size > 20) {
          internallyWrittenSearches.current.clear()
        }
        internallyWrittenSearches.current.add(nextSearch)
        setSearchParams(next, { replace: true })
      }
    },
    [searchParams, setSearchParams],
  )
  const onFilterChanged = useCallback(
    ({ api }: FilterChangedEvent<EventRow>) => {
      const current = readAgEventsUrlState(searchParams).filterModel
      if (JSON.stringify(api.getFilterModel()) !== JSON.stringify(current)) {
        updateUrl(api, quickFilter)
      }
    },
    [quickFilter, searchParams, updateUrl],
  )
  const onSortChanged = useCallback(
    ({ api }: SortChangedEvent<EventRow>) => updateUrl(api, quickFilter),
    [quickFilter, updateUrl],
  )
  useEffect(() => {
    const currentSearch = searchParams.toString()
    if (internallyWrittenSearches.current.delete(currentSearch)) {
      return
    }
    const urlState = readAgEventsUrlState(searchParams)
    setQuickFilter(urlState.search)
    if (!gridApi) return
    const currentFilterModel = gridApi.getFilterModel()
    if (JSON.stringify(currentFilterModel) !== JSON.stringify(urlState.filterModel)) {
      gridApi.setFilterModel(urlState.filterModel)
    }
    if (searchParams.has('agEventsSort')) {
      gridApi.applyColumnState({
        state: urlState.sortModel,
        defaultState: { sort: null, sortIndex: null },
      })
    }
  }, [gridApi, searchParams])
  const onExport = useCallback(() => {
    gridApi?.exportDataAsCsv({ fileName: t('events.agEvents.csvFileName') })
  }, [gridApi, t])
  const onReset = useCallback(() => {
    gridApi?.setFilterModel(null)
    gridApi?.resetColumnState()
    gridApi?.paginationGoToFirstPage()
    setQuickFilter('')
    setWrapCellText(false)
    if (gridApi) updateUrl(gridApi, '')
  }, [gridApi, updateUrl])

  return (
    <Grid gap="4">
      <Grid
        alignItems="end"
        gap="3"
        templateColumns={{ base: '1fr', md: 'minmax(14rem, 1fr) repeat(4, auto)' }}
      >
        <Field.Root>
          <Field.Label>{t('events.agEvents.quickFilterLabel')}</Field.Label>
          <Input
            type="search"
            value={quickFilter}
            placeholder={t('events.agEvents.quickFilterPlaceholder')}
            onChange={(event) => {
              const value = event.currentTarget.value
              setQuickFilter(value)
            }}
            onBlur={(event) => {
              if (gridApi) updateUrl(gridApi, event.currentTarget.value)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && gridApi) updateUrl(gridApi, quickFilter)
            }}
            disabled={loading}
          />
        </Field.Root>
        <Popover.Root positioning={{ placement: 'bottom-end', gutter: 8 }} lazyMount unmountOnExit>
          <Popover.Trigger asChild>
            <Button variant="outline" disabled={loading || !gridApi}>
              <LuColumns3 aria-hidden />
              {t('events.agEvents.columns')}
            </Button>
          </Popover.Trigger>
          <Portal>
            <Popover.Positioner>
              <Popover.Content
                colorPalette="brand"
                width="min(20rem, calc(100vw - 2rem))"
                bg="bg.panel"
                borderWidth="1px"
                borderRadius="l3"
              >
                <Popover.Body p="3">
                  <Stack gap="3">
                    <Stack gap="1">
                      <Text fontWeight="semibold">{t('events.agEvents.columns')}</Text>
                      <Text fontSize="sm" color="fg.muted">
                        {t('events.agEvents.columnsHint')}
                      </Text>
                    </Stack>
                    <Stack role="group" aria-label={t('events.agEvents.columnsLabel')} gap="1">
                      {columnOptions.map((column) => (
                        <Checkbox.Root
                          key={column.id}
                          size="sm"
                          checked={visibleColumns.has(column.id)}
                          disabled={column.id === 'name'}
                          onCheckedChange={({ checked }) =>
                            gridApi?.setColumnsVisible([column.id], checked === true)
                          }
                        >
                          <Checkbox.HiddenInput />
                          <Checkbox.Control>
                            <Checkbox.Indicator />
                          </Checkbox.Control>
                          <Checkbox.Label>{column.label}</Checkbox.Label>
                        </Checkbox.Root>
                      ))}
                    </Stack>
                    <Button size="sm" variant="outline" onClick={() => gridApi?.resetColumnState()}>
                      {t('events.agEvents.resetColumns')}
                    </Button>
                  </Stack>
                </Popover.Body>
              </Popover.Content>
            </Popover.Positioner>
          </Portal>
        </Popover.Root>
        <Button variant="outline" onClick={onExport} disabled={loading || !gridApi}>
          <LuDownload aria-hidden />
          {t('events.agEvents.exportCsv')}
        </Button>
        <Checkbox.Root
          checked={wrapCellText}
          onCheckedChange={({ checked }) => setWrapCellText(checked === true)}
        >
          <Checkbox.HiddenInput />
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Checkbox.Label>{t('events.agEvents.wrapCellText')}</Checkbox.Label>
        </Checkbox.Root>
        <Button variant="outline" onClick={onReset} disabled={loading || !gridApi}>
          <LuRotateCcw aria-hidden />
          {t('events.agEvents.resetGrid')}
        </Button>
      </Grid>
      <Text fontSize="sm" color="fg.muted">
        {t('events.agEvents.multiSortHint')}
      </Text>
      <Box
        as="section"
        aria-label={t('events.agEvents.gridLabel')}
        aria-busy={loading || undefined}
        height="min(72dvh, 48rem)"
        minHeight="24rem"
        minWidth="0"
      >
        <AgGridProvider modules={modules}>
          <AgGridReact
            rowData={rowData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            theme={theme}
            localeText={localeText}
            quickFilterText={quickFilter}
            includeHiddenColumnsInQuickFilter
            pagination
            paginationPageSize={25}
            paginationPageSizeSelector={[10, 25, 50, 100]}
            alwaysMultiSort
            getRowId={({ data }) => data.id}
            loading={loading}
            onGridReady={onGridReady}
            onColumnVisible={onColumnVisible}
            onColumnResized={onColumnResized}
            onColumnMoved={onColumnMoved}
            onFilterChanged={onFilterChanged}
            onSortChanged={onSortChanged}
          />
        </AgGridProvider>
      </Box>
    </Grid>
  )
}
