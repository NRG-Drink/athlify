import { Box, Table, Text } from '@chakra-ui/react'
import { createColumnHelper, flexRender, tableFeatures, useTable } from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { graphql, useLazyLoadQuery } from 'react-relay'
import { DataTableSkeleton } from '../../components/DataTableSkeleton'
import { Page, PageEmptyState } from '../../components/Page'
import { QueryBoundary } from '../../components/QueryBoundary'
import { useFormat } from '../../i18n/useFormat'
import { parseDate } from '../../lib/dates'
import { useFetchKey } from '../../relay/useFetchKey'
import type { EventsPageQuery } from './__generated__/EventsPageQuery.graphql'

const pageQuery = graphql`
  query EventsPageQuery {
    events(first: 200, order: [{ startDate: DESC }, { id: DESC }]) {
      nodes {
        id
        name
        type
        description
        startDate
        endDate
      }
    }
  }
`

type EventRow = NonNullable<NonNullable<EventsPageQuery['response']['events']>['nodes']>[number]
const eventTableFeatures = tableFeatures({})
const eventColumn = createColumnHelper<typeof eventTableFeatures, EventRow>()
const emptyEvents: EventRow[] = []

function EventsContent({ fetchKey }: { fetchKey: number }) {
  const { t } = useTranslation()
  const format = useFormat()
  const queryData = useLazyLoadQuery<EventsPageQuery>(
    pageQuery,
    {},
    { fetchKey, fetchPolicy: 'network-only' },
  )
  const events = queryData.events?.nodes ?? emptyEvents
  const columns = useMemo(
    () =>
      eventColumn.columns([
        eventColumn.accessor('startDate', {
          header: t('events.columns.startDate'),
          cell: (context) => {
            const value = context.getValue()
            const date = parseDate(value.split('-').reverse().join('.'))
            return date ? format.date(date) : value
          },
        }),
        eventColumn.accessor('name', { header: t('events.columns.name') }),
        eventColumn.accessor('type', {
          header: t('events.columns.type'),
          cell: (context) => t(`events.types.${context.getValue()}`),
        }),
        eventColumn.accessor('endDate', {
          header: t('events.columns.endDate'),
          cell: (context) => {
            const value = context.getValue()
            if (!value) return '—'
            const date = parseDate(value.split('-').reverse().join('.'))
            return date ? format.date(date) : value
          },
        }),
        eventColumn.accessor('description', {
          header: t('events.columns.description'),
          cell: (context) => context.getValue() || '—',
        }),
      ]),
    [format, t],
  )
  const table = useTable({
    features: eventTableFeatures,
    data: events,
    columns,
    getRowId: (row) => row.id,
  })
  const scrollRef = useRef<HTMLDivElement>(null)
  const rows = table.getRowModel().rows
  // The virtualizer's imperative instance is used directly to render its window.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    getItemKey: (index) => rows[index].id,
    estimateSize: () => 56,
    overscan: 8,
  })
  const virtualRows = virtualizer.getVirtualItems()

  if (events.length === 0) {
    return <PageEmptyState title={t('events.empty.title')} message={t('events.empty.message')} />
  }

  return (
    <Box display="grid" gap="3">
      <Text fontSize="sm" color="fg.muted" aria-live="polite">
        {t('events.resultCount', { count: events.length })}
      </Text>
      <Box
        ref={scrollRef}
        maxH="calc(100dvh - 14rem)"
        minH="16rem"
        overflow="auto"
        borderWidth="1px"
        borderColor="border"
        borderRadius="l3"
      >
        <Table.Root size="md" css={{ tableLayout: 'fixed' }}>
          <Table.Caption srOnly>{t('events.table.caption')}</Table.Caption>
          <Table.Header position="sticky" top="0" zIndex="1" bg="bg">
            {table.getHeaderGroups().map((headerGroup) => (
              <Table.Row key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <Table.ColumnHeader key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </Table.ColumnHeader>
                ))}
              </Table.Row>
            ))}
          </Table.Header>
          <Table.Body>
            {virtualRows.length > 0 && (
              <Table.Row aria-hidden>
                <Table.Cell
                  colSpan={columns.length}
                  p="0"
                  border="0"
                  height={`${virtualRows[0].start}px`}
                />
              </Table.Row>
            )}
            {virtualRows.map((virtualRow) => {
              const row = rows[virtualRow.index]
              return (
                <Table.Row key={row.id} data-index={virtualRow.index}>
                  {row.getAllCells().map((cell) => (
                    <Table.Cell key={cell.id} overflow="hidden" textOverflow="ellipsis">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </Table.Cell>
                  ))}
                </Table.Row>
              )
            })}
            {virtualRows.length > 0 && (
              <Table.Row aria-hidden>
                <Table.Cell
                  colSpan={columns.length}
                  p="0"
                  border="0"
                  height={`${virtualizer.getTotalSize() - virtualRows.at(-1)!.end}px`}
                />
              </Table.Row>
            )}
          </Table.Body>
        </Table.Root>
      </Box>
    </Box>
  )
}

export function EventsPage() {
  const { t } = useTranslation()
  const [fetchKey, retry] = useFetchKey()

  return (
    <Page title={t('nav.events')}>
      <QueryBoundary
        onRetry={retry}
        fallback={<DataTableSkeleton />}
        errorMessage={t('events.loadFailed')}
      >
        <EventsContent fetchKey={fetchKey} />
      </QueryBoundary>
    </Page>
  )
}
