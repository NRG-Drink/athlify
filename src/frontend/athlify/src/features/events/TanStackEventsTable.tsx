import { chakra, Table } from '@chakra-ui/react'
import {
  createColumnHelper,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { LuArrowDown, LuArrowUp, LuArrowUpDown } from 'react-icons/lu'
import { isSortColumn } from '../../lib/sort'
import { useFormat } from '../../i18n/useFormat'
import { eventSortColumns, type EventSort } from './eventsQuery'
import type { EventRow } from './EventsTable'

const features = tableFeatures({ rowSortingFeature })
const columnHelper = createColumnHelper<typeof features, EventRow>()

interface TanStackEventsTableProps {
  rows: readonly EventRow[]
  sort: EventSort
  onSortChange: (sort: EventSort) => void
  caption: string
}

export function TanStackEventsTable({
  rows,
  sort,
  onSortChange,
  caption,
}: TanStackEventsTableProps) {
  const { t } = useTranslation()
  const format = useFormat()
  const data = useMemo(() => [...rows], [rows])
  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor('name', {
          header: t('events.columns.name'),
        }),
        columnHelper.accessor('type', {
          header: t('events.columns.type'),
          cell: ({ getValue }) => t(`events.types.${getValue()}`, { defaultValue: getValue() }),
        }),
        columnHelper.accessor('startDate', {
          header: t('events.columns.startDate'),
          cell: ({ getValue }) => (
            <time dateTime={getValue()}>{format.date(`${getValue()}T00:00:00`)}</time>
          ),
        }),
        columnHelper.accessor('endDate', {
          header: t('events.columns.endDate'),
          cell: ({ getValue }) =>
            getValue() ? (
              <time dateTime={getValue()!}>{format.date(`${getValue()}T00:00:00`)}</time>
            ) : (
              '—'
            ),
        }),
        columnHelper.accessor('description', {
          header: t('events.columns.description'),
          cell: ({ getValue }) => getValue() || '—',
        }),
        columnHelper.accessor((row) => row.tags.map((tag) => tag.name).join(', '), {
          id: 'tags',
          header: t('events.columns.tags'),
          enableSorting: false,
          cell: ({ getValue }) => getValue() || '—',
        }),
      ]),
    [t, format],
  )
  const table = useTable({
    features,
    columns,
    data,
    getRowId: (row) => row.id,
    manualSorting: true,
    initialState: {
      sorting: [{ id: sort.column, desc: sort.desc }],
    },
  })

  useEffect(() => {
    table.setSorting([{ id: sort.column, desc: sort.desc }])
  }, [table, sort.column, sort.desc])

  return (
    <Table.ScrollArea maxH="min(70dvh, 42rem)" minH="16rem">
      <Table.Root size="md" css={{ tableLayout: 'auto' }}>
        <Table.Caption srOnly>{caption}</Table.Caption>
        <Table.Header>
          {table.getHeaderGroups().map((headerGroup) => (
            <Table.Row key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const column = header.column
                const sorted = column.getIsSorted()
                const isSortable = column.getCanSort() && isSortColumn(eventSortColumns, column.id)
                const nextSort = () => {
                  if (!isSortColumn(eventSortColumns, column.id)) return
                  const desc = sort.column === column.id ? !sort.desc : true
                  onSortChange({ column: column.id, desc })
                }

                return (
                  <Table.ColumnHeader
                    key={header.id}
                    whiteSpace="nowrap"
                    aria-sort={
                      sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none'
                    }
                  >
                    {header.isPlaceholder ? null : isSortable ? (
                      <chakra.button
                        type="button"
                        onClick={nextSort}
                        display="inline-flex"
                        alignItems="center"
                        gap="1"
                        font="inherit"
                        color="inherit"
                        cursor="pointer"
                        borderRadius="l1"
                        focusVisibleRing="outside"
                      >
                        <table.FlexRender header={header} />
                        {sorted === 'asc' && <LuArrowUp aria-hidden />}
                        {sorted === 'desc' && <LuArrowDown aria-hidden />}
                        {!sorted && <LuArrowUpDown aria-hidden />}
                      </chakra.button>
                    ) : (
                      <table.FlexRender header={header} />
                    )}
                  </Table.ColumnHeader>
                )
              })}
            </Table.Row>
          ))}
        </Table.Header>
        <Table.Body>
          {table.getRowModel().rows.map((row) => (
            <Table.Row key={row.id}>
              {row.getAllCells().map((cell) => (
                <Table.Cell key={cell.id} whiteSpace="nowrap">
                  <table.FlexRender cell={cell} />
                </Table.Cell>
              ))}
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Table.ScrollArea>
  )
}
