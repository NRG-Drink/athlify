import { Button, Flex, Table, Text, VisuallyHidden, chakra } from '@chakra-ui/react'
import type { KeyboardEvent, ReactElement, ReactNode, Ref } from 'react'
import { useTranslation } from 'react-i18next'
import { LuArrowDown, LuArrowUp, LuArrowUpDown } from 'react-icons/lu'
import type { ListSort } from '../lib/sort'
import { ColumnFilter, type DataTableColumnFilter } from './ColumnFilter'
import { Tooltip } from './ui/tooltip'

export interface DataTableColumn<T extends object> {
  id: string
  header: string
  /** Value shown when `cell` is not given. */
  accessor: (row: T) => number | string
  /** Display of the cell; defaults to the accessor value. */
  cell?: (row: T) => ReactNode
  align?: 'start' | 'end'
  /** Unit shown after the header label, for example `kg`. */
  unit?: string
  /**
   * Explanation of an abbreviated or technical header, for example what TSS means. The label gets a
   * dotted underline and the text shows as a tooltip on hover and keyboard focus. Leave it out for
   * self-explaining headers.
   */
  description?: string
  /** Hides the column below this breakpoint (phones keep only the essential columns). */
  hideBelow?: Breakpoint
  /** Secondary data: shown in a muted colour. */
  muted?: boolean
  /** Keeps long text to one line with an ellipsis. */
  truncate?: boolean
  /** Fixed width, for example `7rem`; the other columns share the remaining space. */
  width?: string
  /** Width bounds of a truncated column, for example `12rem`; without them it collapses to nothing. */
  minWidth?: string
  maxWidth?: string
  /** Filter popover next to the sort button of the header. */
  filter?: DataTableColumnFilter
  /** Whether the header sorts the column; defaults to true. A first click sorts descending. */
  sortable?: boolean
}

/** "Load more" below the rows of a paginated list, with an inline error and retry. */
export interface DataTablePagination {
  hasNextPage: boolean
  isLoadingNext: boolean
  /** The last "load more" failed; shows `errorLabel` and a retry instead of the button. */
  error: boolean
  onLoadMore: () => void
  /** For example "Weitere Messungen laden". */
  loadMoreLabel: string
  /** For example "Weitere Messungen konnten nicht geladen werden." */
  errorLabel: string
}

type Breakpoint = 'sm' | 'md' | 'lg' | '2xl'

export interface DataTableProps<T extends object> {
  data: readonly T[]
  columns: DataTableColumn<T>[]
  getRowId: (row: T) => string
  /**
   * The order of `data`, which the server already applied (a paged list cannot be sorted on the
   * client). The rows are rendered as they are; a header click reports the next order instead.
   */
  sort: ListSort
  onSortChange: (sort: ListSort) => void
  /** Visually hidden table title for assistive technology. */
  caption: string
  /** Header text (visually hidden) of the row-actions column. */
  actionsLabel?: string
  /** Always-visible actions of a row, for example a menu. */
  rowActions?: (row: T) => ReactNode
  /** Opens the row's default action (click, or Enter on the focused row). */
  onRowClick?: (row: T) => void
  /**
   * Accessible name of a clickable row, naming its action ("Messung vom 2. Okt. 2026 bearbeiten"),
   * so the row itself replaces a separate edit button.
   */
  rowLabel?: (row: T) => string
  /** Shown in a full-width row instead of the body when `data` is empty; the header stays. */
  emptyMessage?: ReactNode
  /** The data is being refreshed: the rows stay, dimmed, and the table is marked busy. */
  busy?: boolean
  /** Number of matching rows across all pages, for example "42 Messungen"; shown above the table. */
  count?: string
  /** The count line; it can take the focus, for example after the focused row was deleted. */
  countRef?: Ref<HTMLParagraphElement>
  pagination?: DataTablePagination
}

/**
 * Every header cell, including the row-actions column, stays on top while the rows scroll under it,
 * so the header always spans the full width of the table.
 */
const stickyHeader = { position: 'sticky', top: '0', zIndex: 1, bg: 'bg' } as const

const hidden = (hideBelow?: Breakpoint) =>
  hideBelow ? { base: 'none', [hideBelow]: 'table-cell' } : undefined

/** A panel like the chart tooltip, not Chakra's inverted default: hairline border, body text. */
const hintStyle = {
  maxW: '20rem',
  px: '3',
  py: '2',
  bg: 'bg.panel',
  color: 'fg',
  borderWidth: '1px',
  borderColor: 'border',
  borderRadius: 'l2',
  fontSize: 'sm',
  fontWeight: 'normal',
  lineHeight: '1.4',
  whiteSpace: 'normal',
  textAlign: 'start',
  textTransform: 'none',
  _dark: { shadow: 'none' },
} as const

/** Shows a header's explanation on hover and keyboard focus; renders the header alone without one. */
function HeaderHint({ description, children }: { description?: string; children: ReactElement }) {
  if (!description) return children
  return (
    <Tooltip
      content={description}
      openDelay={300}
      closeDelay={0}
      positioning={{ placement: 'top' }}
      contentProps={hintStyle}
    >
      {children}
    </Tooltip>
  )
}

export function DataTable<T extends object>({
  data,
  columns,
  getRowId,
  sort,
  onSortChange,
  caption,
  actionsLabel,
  rowActions,
  onRowClick,
  rowLabel,
  emptyMessage,
  busy,
  count,
  countRef,
  pagination,
}: DataTableProps<T>) {
  const { t } = useTranslation()
  /** Current direction and click handler of a header; `toggle` is undefined when it cannot sort. */
  const sortStateOf = (column: DataTableColumn<T>) => {
    if (column.sortable === false) return { sorted: false as const, toggle: undefined }
    const sorted = sort.column === column.id ? (sort.desc ? 'desc' : 'asc') : false
    // Every sortable column is a date or a number, where the largest or newest is what you look for.
    return { sorted, toggle: () => onSortChange({ column: column.id, desc: sorted !== 'desc' }) }
  }

  const onRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, row: T) => {
    // Only the row itself: Enter on a button inside the row must keep its own meaning.
    if (event.target === event.currentTarget && event.key === 'Enter') onRowClick?.(row)
  }

  return (
    <Flex direction="column" gap="3">
      {count && (
        <Text
          ref={countRef}
          tabIndex={countRef ? -1 : undefined}
          fontSize="sm"
          color="fg.muted"
          aria-live="polite"
          _focusVisible={{ outline: 'none' }}
        >
          {count}
        </Text>
      )}
      {/* Bounded height: the horizontal scrollbar then sits at the bottom of the visible area
          instead of the end of a long list, and the header stays in view while scrolling. */}
      <Table.ScrollArea
        maxH="calc(100dvh - 14rem)"
        minH="16rem"
        opacity={busy ? 0.6 : undefined}
        transition="opacity 0.15s"
      >
        <Table.Root size="md" css={{ tableLayout: 'auto' }} aria-busy={busy || undefined}>
          <Table.Caption srOnly>{caption}</Table.Caption>
          <Table.Header>
            <Table.Row>
              {columns.map((column, index) => {
                const { sorted, toggle } = sortStateOf(column)
                const end = column.align === 'end'
                const label = (
                  <span>
                    <chakra.span
                      textDecorationLine={column.description ? 'underline' : undefined}
                      textDecorationStyle="dotted"
                      textDecorationColor="fg.muted"
                      textUnderlineOffset="0.2em"
                    >
                      {column.header}
                    </chakra.span>
                    {column.unit && (
                      <Text as="span" fontWeight="normal" color="fg.muted">
                        {' '}
                        {column.unit}
                      </Text>
                    )}
                  </span>
                )
                return (
                  <Table.ColumnHeader
                    key={column.id}
                    textAlign={end ? 'end' : 'start'}
                    display={hidden(column.hideBelow)}
                    w={column.width}
                    whiteSpace="nowrap"
                    {...stickyHeader}
                    // The first column also sticks to the left, above the other header cells.
                    left={index === 0 ? '0' : undefined}
                    zIndex={index === 0 ? 2 : stickyHeader.zIndex}
                    aria-sort={
                      !toggle
                        ? undefined
                        : sorted === 'asc'
                          ? 'ascending'
                          : sorted === 'desc'
                            ? 'descending'
                            : 'none'
                    }
                    css={{
                      '& [data-filter-idle]': { opacity: 0 },
                      '&:hover [data-filter-idle], &:focus-within [data-filter-idle]': {
                        opacity: 0.6,
                      },
                      '@media (hover: none)': { '& [data-filter-idle]': { opacity: 0.6 } },
                    }}
                  >
                    <Flex
                      display="inline-flex"
                      align="center"
                      gap="1"
                      flexDirection={end ? 'row-reverse' : 'row'}
                    >
                      <HeaderHint description={column.description}>
                        {toggle ? (
                          <chakra.button
                            type="button"
                            onClick={toggle}
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
                            {label}
                            {sorted === 'asc' && <LuArrowUp aria-hidden />}
                            {sorted === 'desc' && <LuArrowDown aria-hidden />}
                            {!sorted && <LuArrowUpDown aria-hidden data-sort-idle />}
                          </chakra.button>
                        ) : (
                          // Without a sort button the label itself takes the focus, so the
                          // explanation is reachable by keyboard too.
                          <chakra.span
                            tabIndex={column.description ? 0 : undefined}
                            borderRadius="l1"
                            focusVisibleRing="outside"
                          >
                            {label}
                          </chakra.span>
                        )}
                      </HeaderHint>
                      {column.filter && <ColumnFilter {...column.filter} />}
                    </Flex>
                  </Table.ColumnHeader>
                )
              })}
              {rowActions && (
                <Table.ColumnHeader w="1" {...stickyHeader}>
                  <VisuallyHidden>{actionsLabel}</VisuallyHidden>
                </Table.ColumnHeader>
              )}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {data.length === 0 && emptyMessage && (
              <Table.Row>
                <Table.Cell colSpan={columns.length + (rowActions ? 1 : 0)}>
                  {emptyMessage}
                </Table.Cell>
              </Table.Row>
            )}
            {data.map((original) => (
              <Table.Row
                key={getRowId(original)}
                tabIndex={onRowClick ? 0 : undefined}
                aria-label={onRowClick ? rowLabel?.(original) : undefined}
                cursor={onRowClick ? 'pointer' : undefined}
                onClick={onRowClick ? () => onRowClick(original) : undefined}
                onKeyDown={onRowClick ? (event) => onRowKeyDown(event, original) : undefined}
                focusVisibleRing="inside"
                css={{ '&:hover > td': { bg: 'var(--chakra-colors-bg-subtle)' } }}
              >
                {columns.map((column, index) => {
                  const end = column.align === 'end'
                  return (
                    <Table.Cell
                      key={column.id}
                      textAlign={end ? 'end' : 'start'}
                      display={hidden(column.hideBelow)}
                      fontVariantNumeric={end ? 'tabular-nums' : undefined}
                      whiteSpace={column.truncate ? undefined : 'nowrap'}
                      minW={column.minWidth}
                      maxW={column.truncate ? (column.maxWidth ?? '0') : undefined}
                      color={column.muted ? 'fg.muted' : undefined}
                      overflow={column.truncate ? 'hidden' : undefined}
                      textOverflow={column.truncate ? 'ellipsis' : undefined}
                      position={index === 0 ? 'sticky' : undefined}
                      left={index === 0 ? '0' : undefined}
                      bg={index === 0 ? 'bg' : undefined}
                    >
                      {column.cell ? column.cell(original) : String(column.accessor(original))}
                    </Table.Cell>
                  )
                })}
                {rowActions && (
                  <Table.Cell w="1" py="1" onClick={(event) => event.stopPropagation()}>
                    {rowActions(original)}
                  </Table.Cell>
                )}
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Table.ScrollArea>
      {pagination?.error && (
        <Flex align="center" justify="space-between" gap="3" wrap="wrap">
          <Text role="alert" color="fg.error">
            {pagination.errorLabel}
          </Text>
          <Button size="sm" variant="outline" onClick={pagination.onLoadMore}>
            {t('page.retry')}
          </Button>
        </Flex>
      )}
      {pagination?.hasNextPage && !pagination.error && (
        <Button
          alignSelf="center"
          variant="outline"
          loading={pagination.isLoadingNext}
          onClick={pagination.onLoadMore}
        >
          {pagination.loadMoreLabel}
        </Button>
      )}
    </Flex>
  )
}
