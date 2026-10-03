import { Table, Text, VisuallyHidden, chakra } from '@chakra-ui/react'
import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import { useMemo, type KeyboardEvent, type ReactNode } from 'react'
import { LuArrowDown, LuArrowUp, LuArrowUpDown } from 'react-icons/lu'

export interface DataTableColumn<T extends object> {
  id: string
  header: string
  /** Value used for sorting. */
  accessor: (row: T) => number | string
  /** Display of the cell; defaults to the accessor value. */
  cell?: (row: T) => ReactNode
  align?: 'start' | 'end'
  /** Unit shown after the header label, for example `kg`. */
  unit?: string
  /** Hides the column below this breakpoint (phones keep only the essential columns). */
  hideBelow?: 'sm' | 'md' | 'lg'
  /** Keeps long text to one line with an ellipsis. */
  truncate?: boolean
  /** Fixed width, for example `7rem`; the other columns share the remaining space. */
  width?: string
}

export interface DataTableProps<T extends object> {
  data: readonly T[]
  columns: DataTableColumn<T>[]
  getRowId: (row: T) => string
  initialSort: { id: string; desc: boolean }
  /** Visually hidden table title for assistive technology. */
  caption: string
  /** Header text (visually hidden) of the row-actions column. */
  actionsLabel?: string
  /** Always-visible actions of a row, for example a menu. */
  rowActions?: (row: T) => ReactNode
  /** Opens the row's default action (click, or Enter on the focused row). */
  onRowClick?: (row: T) => void
}

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
})

const hidden = (hideBelow?: 'sm' | 'md' | 'lg') =>
  hideBelow ? { base: 'none', [hideBelow]: 'table-cell' } : undefined

export function DataTable<T extends object>({
  data,
  columns,
  getRowId,
  initialSort,
  caption,
  actionsLabel,
  rowActions,
  onRowClick,
}: DataTableProps<T>) {
  const rows = useMemo(() => [...data], [data])
  const byId = useMemo(() => new Map(columns.map((column) => [column.id, column])), [columns])

  const tableColumns = useMemo(() => {
    const helper = createColumnHelper<typeof features, T>()
    return helper.columns(
      columns.map((column) =>
        helper.accessor(column.accessor, { id: column.id, header: column.header }),
      ),
    )
  }, [columns])

  const table = useTable({
    features,
    columns: tableColumns,
    data: rows,
    initialState: { sorting: [initialSort] },
    getRowId,
  })

  const onRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, row: T) => {
    // Only the row itself: Enter on a button inside the row must keep its own meaning.
    if (event.target === event.currentTarget && event.key === 'Enter') onRowClick?.(row)
  }

  return (
    <Table.ScrollArea>
      <Table.Root size="md" css={{ tableLayout: 'auto' }}>
        <Table.Caption srOnly>{caption}</Table.Caption>
        <Table.Header>
          {table.getHeaderGroups().map((headerGroup) => (
            <Table.Row key={headerGroup.id}>
              {headerGroup.headers.map((header, index) => {
                const column = byId.get(header.column.id)
                if (!column) return null
                const sorted = header.column.getIsSorted()
                const end = column.align === 'end'
                return (
                  <Table.ColumnHeader
                    key={header.id}
                    textAlign={end ? 'end' : 'start'}
                    display={hidden(column.hideBelow)}
                    w={column.width}
                    whiteSpace="nowrap"
                    position={index === 0 ? 'sticky' : undefined}
                    left={index === 0 ? '0' : undefined}
                    zIndex={index === 0 ? 1 : undefined}
                    bg={index === 0 ? 'bg' : undefined}
                    aria-sort={
                      sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none'
                    }
                  >
                    <chakra.button
                      type="button"
                      onClick={header.column.getToggleSortingHandler()}
                      display="inline-flex"
                      alignItems="center"
                      gap="1"
                      flexDirection={end ? 'row-reverse' : 'row'}
                      font="inherit"
                      color="inherit"
                      cursor="pointer"
                      borderRadius="l1"
                      focusVisibleRing="outside"
                      css={{
                        '& [data-sort-idle]': { opacity: 0 },
                        '&:hover [data-sort-idle], &:focus-visible [data-sort-idle]': {
                          opacity: 0.6,
                        },
                      }}
                    >
                      <span>
                        {column.header}
                        {column.unit && (
                          <Text as="span" fontWeight="normal" color="fg.muted">
                            {' '}
                            {column.unit}
                          </Text>
                        )}
                      </span>
                      {sorted === 'asc' && <LuArrowUp aria-hidden />}
                      {sorted === 'desc' && <LuArrowDown aria-hidden />}
                      {!sorted && <LuArrowUpDown aria-hidden data-sort-idle />}
                    </chakra.button>
                  </Table.ColumnHeader>
                )
              })}
              {rowActions && (
                <Table.ColumnHeader w="1">
                  <VisuallyHidden>{actionsLabel}</VisuallyHidden>
                </Table.ColumnHeader>
              )}
            </Table.Row>
          ))}
        </Table.Header>
        <Table.Body>
          {table.getRowModel().rows.map((row) => (
            <Table.Row
              key={row.id}
              tabIndex={onRowClick ? 0 : undefined}
              cursor={onRowClick ? 'pointer' : undefined}
              onClick={onRowClick ? () => onRowClick(row.original) : undefined}
              onKeyDown={onRowClick ? (event) => onRowKeyDown(event, row.original) : undefined}
              focusVisibleRing="inside"
              css={{ '&:hover > td': { bg: 'var(--chakra-colors-bg-subtle)' } }}
            >
              {row.getAllCells().map((cell, index) => {
                const column = byId.get(cell.column.id)
                if (!column) return null
                const end = column.align === 'end'
                return (
                  <Table.Cell
                    key={cell.id}
                    textAlign={end ? 'end' : 'start'}
                    display={hidden(column.hideBelow)}
                    fontVariantNumeric={end ? 'tabular-nums' : undefined}
                    whiteSpace={column.truncate ? undefined : 'nowrap'}
                    maxW={column.truncate ? '0' : undefined}
                    overflow={column.truncate ? 'hidden' : undefined}
                    textOverflow={column.truncate ? 'ellipsis' : undefined}
                    position={index === 0 ? 'sticky' : undefined}
                    left={index === 0 ? '0' : undefined}
                    bg={index === 0 ? 'bg' : undefined}
                  >
                    {column.cell
                      ? column.cell(row.original)
                      : String(column.accessor(row.original))}
                  </Table.Cell>
                )
              })}
              {rowActions && (
                <Table.Cell w="1" py="1" onClick={(event) => event.stopPropagation()}>
                  {rowActions(row.original)}
                </Table.Cell>
              )}
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Table.ScrollArea>
  )
}
