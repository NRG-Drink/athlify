import {
  Box,
  Button,
  Checkbox,
  Field,
  Grid,
  IconButton,
  Input,
  NativeSelect,
  Popover,
  Portal,
  Stack,
  Table,
  Text,
} from '@chakra-ui/react'
import {
  createColumnHelper,
  createCoreRowModel,
  createFilteredRowModel,
  createSortedRowModel,
  columnFilteringFeature,
  columnVisibilityFeature,
  filterFn_includesString,
  globalFilteringFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  LuArrowDown,
  LuArrowUp,
  LuArrowUpDown,
  LuColumns3,
  LuDownload,
  LuListFilter,
  LuRotateCcw,
} from 'react-icons/lu'
import { graphql, useFragment } from 'react-relay'
import { DateField } from '../../components/DateField'
import { useFormat } from '../../i18n/useFormat'
import { localDateKey } from '../../lib/period'
import { parseDate } from '../../lib/dates'
import { eventTypes } from './eventsQuery'
import type {
  TanStackEventsShowcaseTable_rows$data,
  TanStackEventsShowcaseTable_rows$key,
} from './__generated__/TanStackEventsShowcaseTable_rows.graphql'

const features = tableFeatures({
  rowSortingFeature,
  columnFilteringFeature,
  globalFilteringFeature,
  columnVisibilityFeature,
  coreRowModel: createCoreRowModel(),
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  filterFns: { includesString: filterFn_includesString },
})
const columnHelper = createColumnHelper<typeof features, EventRow>()

type EventRow = TanStackEventsShowcaseTable_rows$data[number]

interface EventDateRange {
  from?: string
  to?: string
}

interface EventDateRangeDraft {
  from: string
  to: string
}

const initialColumnWidths: Readonly<Record<string, number>> = {
  name: 256,
  type: 144,
  startDate: 176,
  endDate: 176,
  description: 384,
  tags: 256,
}

const MIN_COLUMN_WIDTH = 144
const MAX_COLUMN_WIDTH = 640
const COLUMN_RESIZE_STEP = 16

function isEventDateRange(value: unknown): value is EventDateRange {
  return (
    typeof value === 'object' &&
    value !== null &&
    (!('from' in value) || typeof value.from === 'string') &&
    (!('to' in value) || typeof value.to === 'string')
  )
}

function dateToInputValue(value?: string) {
  if (!value) return ''
  const [year, month, day] = value.split('-')
  return `${day}.${month}.${year}`
}

function dateRangeToDraft(value: unknown): EventDateRangeDraft {
  const range = isEventDateRange(value) ? value : {}
  return { from: dateToInputValue(range.from), to: dateToInputValue(range.to) }
}

function dateToKey(value: string) {
  const date = parseDate(value)
  return date ? localDateKey(date) : null
}

function filterByDateRange(
  row: { getValue: (columnId: string) => unknown },
  columnId: string,
  value: unknown,
) {
  const date = row.getValue(columnId)
  if (typeof date !== 'string' || !isEventDateRange(value)) return false
  return (!value.from || date >= value.from) && (!value.to || date <= value.to)
}

const rowsFragment = graphql`
  fragment TanStackEventsShowcaseTable_rows on Event @relay(plural: true) {
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

interface TanStackEventsTableProps {
  entries: TanStackEventsShowcaseTable_rows$key
  loading: boolean
}

export function TanStackEventsShowcaseTable({ entries, loading }: TanStackEventsTableProps) {
  const { t, i18n } = useTranslation()
  const format = useFormat()
  const rows = useFragment(rowsFragment, entries)
  const data = useMemo(() => [...rows], [rows])
  const scrollElementRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLTableSectionElement>(null)
  const [headerHeight, setHeaderHeight] = useState(0)
  const [openFilterColumn, setOpenFilterColumn] = useState<string>()
  const [dateFilterDrafts, setDateFilterDrafts] = useState<Record<string, EventDateRangeDraft>>({})
  const [dateRangeError, setDateRangeError] = useState<string>()
  const [columnWidths, setColumnWidths] = useState({ ...initialColumnWidths })
  const [resizingColumn, setResizingColumn] = useState<string>()
  const resizeSession = useRef<{
    pointerId: number
    columnId: string
    startX: number
    startWidth: number
  } | null>(null)
  const bodyStyleBeforeResize = useRef<{ cursor: string; userSelect: string } | null>(null)
  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor('name', {
          header: t('events.columns.name'),
          enableHiding: false,
          filterFn: 'includesString',
        }),
        columnHelper.accessor((row) => t(`events.types.${row.type}`, { defaultValue: row.type }), {
          id: 'type',
          header: t('events.columns.type'),
          filterFn: (row, _columnId, value) => row.original.type === value,
        }),
        columnHelper.accessor('startDate', {
          header: t('events.columns.startDate'),
          filterFn: filterByDateRange,
          cell: ({ getValue }) => (
            <time dateTime={getValue()}>{format.date(`${getValue()}T00:00:00`)}</time>
          ),
        }),
        columnHelper.accessor('endDate', {
          header: t('events.columns.endDate'),
          filterFn: filterByDateRange,
          cell: ({ getValue }) =>
            getValue() ? (
              <time dateTime={getValue()}>{format.date(`${getValue()}T00:00:00`)}</time>
            ) : (
              t('events.agEvents.emptyValue')
            ),
        }),
        columnHelper.accessor('description', {
          header: t('events.columns.description'),
          filterFn: 'includesString',
          cell: ({ getValue }) => getValue() || t('events.agEvents.emptyValue'),
        }),
        columnHelper.accessor((row) => row.tags.map((tag) => tag.name).join(', '), {
          id: 'tags',
          header: t('events.columns.tags'),
          filterFn: 'includesString',
          cell: ({ getValue }) => getValue() || t('events.agEvents.emptyValue'),
        }),
      ]),
    [t, format],
  )
  const table = useTable({
    features,
    columns,
    data,
    getRowId: (row) => row.id,
    getColumnCanGlobalFilter: () => true,
    globalFilterFn: (row, columnId, filterValue) => {
      const value = row.getValue(columnId)
      const locale = i18n.resolvedLanguage ?? i18n.language
      return (
        typeof value === 'string' &&
        value.toLocaleLowerCase(locale).includes(String(filterValue).toLocaleLowerCase(locale))
      )
    },
    enableMultiSort: true,
    maxMultiSortColCount: 3,
    initialState: {
      sorting: [{ id: 'startDate', desc: true }],
    },
  })
  const tableRows = table.getRowModel().rows
  const virtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => 56,
    initialRect: { width: 0, height: 600 },
    overscan: 8,
    scrollMargin: headerHeight,
  })
  const virtualRows = virtualizer.getVirtualItems()
  const lastVirtualRow = virtualRows.at(-1)
  const columnOptions = table.getAllLeafColumns().filter((column) => column.getCanHide())
  const visible = table.getVisibleLeafColumns()
  const matchingCount = table.getFilteredRowModel().rows.length
  const widthOf = (columnId: string) => columnWidths[columnId] ?? 192

  const setColumnWidth = (columnId: string, width: number) => {
    setColumnWidths((current) => ({
      ...current,
      [columnId]: Math.max(MIN_COLUMN_WIDTH, Math.min(MAX_COLUMN_WIDTH, width)),
    }))
  }

  useEffect(() => {
    const header = headerRef.current
    if (!header) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setHeaderHeight(entry.contentRect.height)
    })
    observer.observe(header)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (scrollElementRef.current) scrollElementRef.current.scrollTop = 0
  }, [table.state.columnFilters, table.state.globalFilter, table.state.sorting])

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const session = resizeSession.current
      if (!session || session.pointerId !== event.pointerId) return
      setColumnWidths((current) => ({
        ...current,
        [session.columnId]: Math.max(
          MIN_COLUMN_WIDTH,
          Math.min(MAX_COLUMN_WIDTH, session.startWidth + event.clientX - session.startX),
        ),
      }))
    }

    const finishResize = (event: PointerEvent) => {
      const session = resizeSession.current
      if (!session || session.pointerId !== event.pointerId) return
      resizeSession.current = null
      setResizingColumn(undefined)
      if (bodyStyleBeforeResize.current) {
        document.body.style.cursor = bodyStyleBeforeResize.current.cursor
        document.body.style.userSelect = bodyStyleBeforeResize.current.userSelect
        bodyStyleBeforeResize.current = null
      }
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', finishResize)
    window.addEventListener('pointercancel', finishResize)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', finishResize)
      window.removeEventListener('pointercancel', finishResize)
      if (bodyStyleBeforeResize.current) {
        document.body.style.cursor = bodyStyleBeforeResize.current.cursor
        document.body.style.userSelect = bodyStyleBeforeResize.current.userSelect
        bodyStyleBeforeResize.current = null
      }
    }
  }, [])

  const onReset = () => {
    table.reset()
    setColumnWidths({ ...initialColumnWidths })
  }

  const onExport = () => {
    const csvRows = [
      visible.map((column) => t(`events.columns.${column.id}`)),
      ...table.getPrePaginatedRowModel().rows.map((row) =>
        visible.map((column) => {
          const value = row.getValue(column.id)
          if (column.id === 'startDate' && typeof value === 'string') {
            return format.date(`${value}T00:00:00`)
          }
          if (column.id === 'endDate' && typeof value === 'string') {
            return format.date(`${value}T00:00:00`)
          }
          return typeof value === 'string' ? value : ''
        }),
      ),
    ]
    const csv = csvRows
      .map((row) =>
        row
          .map((value) => {
            const safeValue = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
            return `"${safeValue.replaceAll('"', '""')}"`
          })
          .join(','),
      )
      .join('\r\n')
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = t('events.tanStack.csvFileName')
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Grid gap="4" aria-busy={loading || undefined}>
      <Grid
        alignItems="end"
        gap="3"
        templateColumns={{ base: '1fr', md: 'minmax(14rem, 1fr) auto auto' }}
      >
        <Field.Root>
          <Field.Label>{t('events.tanStack.quickFilterLabel')}</Field.Label>
          <Input
            type="search"
            value={String(table.state.globalFilter ?? '')}
            placeholder={t('events.tanStack.quickFilterPlaceholder')}
            onChange={(event) => {
              table.setGlobalFilter(event.currentTarget.value)
            }}
            disabled={loading}
          />
        </Field.Root>
        <Popover.Root positioning={{ placement: 'bottom-end', gutter: 8 }} lazyMount unmountOnExit>
          <Popover.Trigger asChild>
            <Button variant="outline" disabled={loading}>
              <LuColumns3 aria-hidden />
              {t('events.tanStack.columns')}
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
                      <Text fontWeight="semibold">{t('events.tanStack.columns')}</Text>
                      <Text fontSize="sm" color="fg.muted">
                        {t('events.tanStack.columnsHint')}
                      </Text>
                    </Stack>
                    <Stack role="group" aria-label={t('events.tanStack.columnsLabel')} gap="1">
                      {columnOptions.map((column) => (
                        <Checkbox.Root
                          key={column.id}
                          size="sm"
                          checked={column.getIsVisible()}
                          onCheckedChange={({ checked }) => {
                            column.toggleVisibility(checked === true)
                          }}
                        >
                          <Checkbox.HiddenInput />
                          <Checkbox.Control>
                            <Checkbox.Indicator />
                          </Checkbox.Control>
                          <Checkbox.Label>{t(`events.columns.${column.id}`)}</Checkbox.Label>
                        </Checkbox.Root>
                      ))}
                    </Stack>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => table.resetColumnVisibility()}
                    >
                      {t('events.tanStack.resetColumns')}
                    </Button>
                  </Stack>
                </Popover.Body>
              </Popover.Content>
            </Popover.Positioner>
          </Portal>
        </Popover.Root>
        <Button variant="outline" onClick={onExport} disabled={loading || matchingCount === 0}>
          <LuDownload aria-hidden />
          {t('events.tanStack.exportCsv')}
        </Button>
        <Button variant="outline" onClick={onReset} disabled={loading}>
          <LuRotateCcw aria-hidden />
          {t('events.tanStack.resetTable')}
        </Button>
      </Grid>
      <Text fontSize="sm" color="fg.muted">
        {t('events.tanStack.multiSortHint')}
      </Text>
      <Text fontSize="sm" color="fg.muted" aria-live="polite">
        {t('events.resultCount', { count: matchingCount })}
      </Text>
      <Box
        as="section"
        aria-label={t('events.tanStack.tableLabel')}
        ref={scrollElementRef}
        overflow="auto"
        height="min(72dvh, 48rem)"
        minHeight="24rem"
        minWidth="0"
      >
        <Table.Root
          size="sm"
          css={{ tableLayout: 'fixed', width: 'max-content', minWidth: '100%' }}
        >
          <Table.Caption srOnly>{t('events.table.caption')}</Table.Caption>
          <colgroup>
            {visible.map((column) => (
              <col key={column.id} style={{ width: `${widthOf(column.id)}px` }} />
            ))}
          </colgroup>
          <Table.Header
            ref={headerRef}
            position="sticky"
            top="0"
            zIndex="2"
            bg="bg.subtle"
            borderBottomWidth="1px"
            borderColor="border"
          >
            {table.getHeaderGroups().map((headerGroup) => (
              <Table.Row key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const column = header.column
                  const sorted = column.getIsSorted()
                  const sortIndex = table.state.sorting.findIndex((sort) => sort.id === column.id)
                  const filterLabel = t('events.tanStack.filterColumn', {
                    column: t(`events.columns.${column.id}`),
                  })
                  const isDateColumn = column.id === 'startDate' || column.id === 'endDate'
                  const filterValue = column.getFilterValue()
                  const filterActive = isDateColumn
                    ? isEventDateRange(filterValue) && Boolean(filterValue.from || filterValue.to)
                    : Boolean(filterValue)
                  const dateDraft = dateFilterDrafts[column.id] ?? dateRangeToDraft(filterValue)
                  return (
                    <Table.ColumnHeader
                      key={header.id}
                      position={column.id === 'name' ? 'sticky' : 'relative'}
                      left={column.id === 'name' ? '0' : undefined}
                      zIndex={column.id === 'name' ? '3' : undefined}
                      bg="bg.subtle"
                      fontWeight="semibold"
                      width={`${widthOf(column.id)}px`}
                      minW={`${widthOf(column.id)}px`}
                      maxW={`${widthOf(column.id)}px`}
                      whiteSpace="nowrap"
                      borderRightWidth={column.id === 'name' ? '1px' : undefined}
                      borderColor="border"
                      aria-sort={
                        sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none'
                      }
                    >
                      <Grid templateColumns="minmax(0, 1fr) auto" alignItems="center" gap="1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          justifyContent="flex-start"
                          minW="0"
                          overflow="hidden"
                          onClick={column.getToggleSortingHandler()}
                          disabled={loading}
                        >
                          <Text as="span" truncate>
                            {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                          </Text>
                          {sorted === 'asc' && <LuArrowUp aria-hidden />}
                          {sorted === 'desc' && <LuArrowDown aria-hidden />}
                          {!sorted && <LuArrowUpDown aria-hidden />}
                          {sortIndex > 0 && (
                            <Text as="span" fontSize="xs">
                              {sortIndex + 1}
                            </Text>
                          )}
                        </Button>
                        <Popover.Root
                          open={openFilterColumn === column.id}
                          onOpenChange={({ open }) => {
                            setOpenFilterColumn(open ? column.id : undefined)
                            setDateRangeError(undefined)
                            if (open && isDateColumn) {
                              setDateFilterDrafts((drafts) => ({
                                ...drafts,
                                [column.id]: dateRangeToDraft(filterValue),
                              }))
                            }
                          }}
                          positioning={{ placement: 'bottom-end', gutter: 8 }}
                        >
                          <Popover.Trigger asChild>
                            <IconButton
                              aria-label={filterLabel}
                              title={filterLabel}
                              size="sm"
                              variant={filterActive ? 'subtle' : 'ghost'}
                              color={filterActive ? 'brand.fg' : 'fg.muted'}
                              disabled={loading}
                            >
                              <LuListFilter aria-hidden />
                            </IconButton>
                          </Popover.Trigger>
                          <Portal>
                            <Popover.Positioner>
                              <Popover.Content
                                colorPalette="brand"
                                width="min(22rem, calc(100vw - 2rem))"
                                bg="bg.panel"
                                borderWidth="1px"
                                borderRadius="l3"
                              >
                                <Popover.Body p="4">
                                  <Stack gap="3">
                                    <Text fontWeight="semibold">{filterLabel}</Text>
                                    {column.id === 'type' ? (
                                      <NativeSelect.Root size="sm" disabled={loading}>
                                        <NativeSelect.Field
                                          aria-label={filterLabel}
                                          value={String(filterValue ?? '')}
                                          onChange={(event) =>
                                            column.setFilterValue(
                                              event.currentTarget.value || undefined,
                                            )
                                          }
                                        >
                                          <option value="">{t('events.filters.allTypes')}</option>
                                          {eventTypes.map((type) => (
                                            <option key={type} value={type}>
                                              {t(`events.types.${type}`)}
                                            </option>
                                          ))}
                                        </NativeSelect.Field>
                                        <NativeSelect.Indicator />
                                      </NativeSelect.Root>
                                    ) : isDateColumn ? (
                                      <>
                                        <Grid columns={2} gap="3">
                                          <Field.Root>
                                            <Field.Label>
                                              {t('events.tanStack.dateFrom')}
                                            </Field.Label>
                                            <DateField
                                              label={t('events.tanStack.dateFrom')}
                                              value={dateDraft.from}
                                              invalid={Boolean(dateRangeError)}
                                              onChange={(from) => {
                                                setDateRangeError(undefined)
                                                setDateFilterDrafts((drafts) => ({
                                                  ...drafts,
                                                  [column.id]: { ...dateDraft, from },
                                                }))
                                              }}
                                            />
                                          </Field.Root>
                                          <Field.Root>
                                            <Field.Label>{t('events.tanStack.dateTo')}</Field.Label>
                                            <DateField
                                              label={t('events.tanStack.dateTo')}
                                              value={dateDraft.to}
                                              invalid={Boolean(dateRangeError)}
                                              onChange={(to) => {
                                                setDateRangeError(undefined)
                                                setDateFilterDrafts((drafts) => ({
                                                  ...drafts,
                                                  [column.id]: { ...dateDraft, to },
                                                }))
                                              }}
                                            />
                                          </Field.Root>
                                        </Grid>
                                        {dateRangeError && (
                                          <Field.Root invalid>
                                            <Field.ErrorText role="alert">
                                              {dateRangeError}
                                            </Field.ErrorText>
                                          </Field.Root>
                                        )}
                                        <Grid templateColumns="1fr auto" gap="2">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                              column.setFilterValue(undefined)
                                              setDateFilterDrafts((drafts) => ({
                                                ...drafts,
                                                [column.id]: { from: '', to: '' },
                                              }))
                                              setDateRangeError(undefined)
                                            }}
                                          >
                                            {t('events.tanStack.clearFilter')}
                                          </Button>
                                          <Button
                                            size="sm"
                                            onClick={() => {
                                              const fromText = dateDraft.from.trim()
                                              const toText = dateDraft.to.trim()
                                              const from = fromText
                                                ? dateToKey(fromText)
                                                : undefined
                                              const to = toText ? dateToKey(toText) : undefined
                                              if (
                                                (fromText && !from) ||
                                                (toText && !to) ||
                                                (from && to && from > to)
                                              ) {
                                                setDateRangeError(
                                                  t('events.tanStack.invalidDateRange'),
                                                )
                                                return
                                              }
                                              column.setFilterValue(
                                                from || to
                                                  ? {
                                                      ...(from ? { from } : {}),
                                                      ...(to ? { to } : {}),
                                                    }
                                                  : undefined,
                                              )
                                              setDateRangeError(undefined)
                                              setOpenFilterColumn(undefined)
                                            }}
                                          >
                                            {t('events.tanStack.applyDateFilter')}
                                          </Button>
                                        </Grid>
                                      </>
                                    ) : (
                                      <Field.Root>
                                        <Field.Label>{filterLabel}</Field.Label>
                                        <Input
                                          type="search"
                                          size="sm"
                                          aria-label={filterLabel}
                                          value={String(filterValue ?? '')}
                                          onChange={(event) =>
                                            column.setFilterValue(
                                              event.currentTarget.value || undefined,
                                            )
                                          }
                                          disabled={loading}
                                        />
                                      </Field.Root>
                                    )}
                                  </Stack>
                                </Popover.Body>
                              </Popover.Content>
                            </Popover.Positioner>
                          </Portal>
                        </Popover.Root>
                      </Grid>
                      <Box
                        role="separator"
                        aria-orientation="vertical"
                        aria-label={t('events.tanStack.resizeColumn', {
                          column: t(`events.columns.${column.id}`),
                        })}
                        aria-valuemin={MIN_COLUMN_WIDTH}
                        aria-valuemax={MAX_COLUMN_WIDTH}
                        aria-valuenow={widthOf(column.id)}
                        tabIndex={0}
                        position="absolute"
                        top="0"
                        right="0"
                        bottom="0"
                        width="0.5rem"
                        zIndex={column.id === 'name' ? '4' : '2'}
                        cursor="col-resize"
                        touchAction="none"
                        userSelect="none"
                        bg={resizingColumn === column.id ? 'brand.subtle' : 'transparent'}
                        _hover={{ bg: 'brand.subtle' }}
                        focusVisibleRing="outside"
                        onPointerDown={(event) => {
                          if (event.button !== 0 || resizeSession.current) return
                          event.preventDefault()
                          resizeSession.current = {
                            pointerId: event.pointerId,
                            columnId: column.id,
                            startX: event.clientX,
                            startWidth: widthOf(column.id),
                          }
                          bodyStyleBeforeResize.current = {
                            cursor: document.body.style.cursor,
                            userSelect: document.body.style.userSelect,
                          }
                          document.body.style.cursor = 'col-resize'
                          document.body.style.userSelect = 'none'
                          setResizingColumn(column.id)
                        }}
                        onKeyDown={(event) => {
                          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
                          event.preventDefault()
                          const delta =
                            event.key === 'ArrowRight' ? COLUMN_RESIZE_STEP : -COLUMN_RESIZE_STEP
                          setColumnWidth(column.id, widthOf(column.id) + delta)
                        }}
                      >
                        <Box
                          aria-hidden
                          position="absolute"
                          top="25%"
                          bottom="25%"
                          left="50%"
                          width="1px"
                          bg="border"
                        />
                      </Box>
                    </Table.ColumnHeader>
                  )
                })}
              </Table.Row>
            ))}
          </Table.Header>
          <Table.Body>
            {tableRows.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={visible.length} textAlign="center" color="fg.muted">
                  {t('events.tanStack.noMatches')}
                </Table.Cell>
              </Table.Row>
            ) : (
              <>
                {virtualRows[0] && virtualRows[0].start > headerHeight && (
                  <Table.Row aria-hidden>
                    <Table.Cell
                      colSpan={visible.length}
                      height={`${virtualRows[0].start - headerHeight}px`}
                      p="0"
                      border="0"
                    />
                  </Table.Row>
                )}
                {virtualRows.map((virtualRow) => {
                  const row = tableRows[virtualRow.index]
                  return (
                    <Table.Row
                      key={row.id}
                      data-index={virtualRow.index}
                      ref={virtualizer.measureElement}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <Table.Cell
                          key={cell.id}
                          position={cell.column.id === 'name' ? 'sticky' : undefined}
                          left={cell.column.id === 'name' ? '0' : undefined}
                          zIndex={cell.column.id === 'name' ? '1' : undefined}
                          bg={cell.column.id === 'name' ? 'bg.panel' : undefined}
                          width={`${widthOf(cell.column.id)}px`}
                          minW={`${widthOf(cell.column.id)}px`}
                          maxW={`${widthOf(cell.column.id)}px`}
                          borderRightWidth={cell.column.id === 'name' ? '1px' : undefined}
                          borderColor="border"
                          whiteSpace="nowrap"
                        >
                          <table.FlexRender cell={cell} />
                        </Table.Cell>
                      ))}
                    </Table.Row>
                  )
                })}
                {lastVirtualRow && (
                  <Table.Row aria-hidden>
                    <Table.Cell
                      colSpan={visible.length}
                      height={`${Math.max(0, virtualizer.getTotalSize() - (lastVirtualRow.end - headerHeight))}px`}
                      p="0"
                      border="0"
                    />
                  </Table.Row>
                )}
              </>
            )}
          </Table.Body>
        </Table.Root>
      </Box>
    </Grid>
  )
}
