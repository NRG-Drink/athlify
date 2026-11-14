import { Button, Flex, Stack, Text } from '@chakra-ui/react'
import { lazy, Suspense } from 'react'
import { graphql, useFragment } from 'react-relay'
import { useTranslation } from 'react-i18next'
import { DataTableSkeleton } from '../../components/DataTableSkeleton'
import { TanStackEventsTable } from './TanStackEventsTable'
import type { EventsImplementation } from './EventsPage'
import type { EventSort } from './eventsQuery'
import type {
  EventsTable_entries$data,
  EventsTable_entries$key,
} from './__generated__/EventsTable_entries.graphql'

const AgGridEventsTable = lazy(() =>
  import('./AgGridEventsTable').then((module) => ({ default: module.AgGridEventsTable })),
)

const tableFragment = graphql`
  fragment EventsTable_entries on Event @relay(plural: true) {
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

export type EventRow = EventsTable_entries$data[number]

interface EventsTableProps {
  implementation: EventsImplementation
  entries: EventsTable_entries$key
  sort: EventSort
  onSortChange: (sort: EventSort) => void
  count: string
  busy: boolean
  hasNextPage: boolean
  isLoadingNext: boolean
  loadMoreError: boolean
  onLoadMore: () => void
}

export function EventsTable({
  implementation,
  entries,
  sort,
  onSortChange,
  count,
  busy,
  hasNextPage,
  isLoadingNext,
  loadMoreError,
  onLoadMore,
}: EventsTableProps) {
  const { t } = useTranslation()
  const rows = useFragment(tableFragment, entries)
  const pagination = (
    <>
      {loadMoreError && (
        <Flex align="center" justify="space-between" gap="3" wrap="wrap">
          <Text role="alert" color="fg.error">
            {t('events.loadMoreFailed')}
          </Text>
          <Button size="sm" variant="outline" onClick={onLoadMore}>
            {t('page.retry')}
          </Button>
        </Flex>
      )}
      {hasNextPage && !loadMoreError && (
        <Button alignSelf="center" variant="outline" loading={isLoadingNext} onClick={onLoadMore}>
          {t('events.loadMore')}
        </Button>
      )}
    </>
  )

  return (
    <Stack gap="3" aria-busy={busy || undefined}>
      <Text fontSize="sm" color="fg.muted" aria-live="polite">
        {count}
      </Text>
      {implementation === 'tanstack' ? (
        <TanStackEventsTable
          rows={rows}
          sort={sort}
          onSortChange={onSortChange}
          caption={t('events.table.caption')}
        />
      ) : (
        <Suspense fallback={<DataTableSkeleton rows={4} />}>
          <AgGridEventsTable
            rows={rows}
            sort={sort}
            onSortChange={onSortChange}
            caption={t('events.table.caption')}
            busy={busy}
          />
        </Suspense>
      )}
      {pagination}
    </Stack>
  )
}
