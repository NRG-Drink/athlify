import { Box, Text } from '@chakra-ui/react'
import type { ColDef, IDatasource } from 'ag-grid-community'
import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  fetchQuery,
  graphql,
  useLazyLoadQuery,
  useMutation,
  useRelayEnvironment,
} from 'react-relay'
import { AgGridTable } from '../../components/ag-grid/AgGridTable'
import { DataTableSkeleton } from '../../components/DataTableSkeleton'
import { Page, PageEmptyState } from '../../components/Page'
import { QueryBoundary } from '../../components/QueryBoundary'
import { toaster } from '../../components/ui/toaster'
import { useFormat } from '../../i18n/useFormat'
import { parseDate } from '../../lib/dates'
import { useFetchKey } from '../../relay/useFetchKey'
import type { AgEventsPageQuery, EventSortInput } from './__generated__/AgEventsPageQuery.graphql'
import type { AgEventsPageUpdateMutation } from './__generated__/AgEventsPageUpdateMutation.graphql'

const pageQuery = graphql`
  query AgEventsPageQuery(
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
        type
        description
        startDate
        endDate
        tags {
          id
        }
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
`

function gridQuery(
  sortModel: ReadonlyArray<{ colId: string; sort: 'asc' | 'desc' }>,
  filterModel: Record<string, unknown>,
) {
  const fieldMap: Record<string, string> = { rowNumber: 'id' }
  const order: EventSortInput[] = sortModel.flatMap(({ colId, sort }) => {
    const field = fieldMap[colId] ?? colId
    return ['name', 'type', 'description', 'startDate', 'endDate', 'id'].includes(field)
      ? [{ [field]: sort.toUpperCase() as 'ASC' | 'DESC' }]
      : []
  })
  if (order.length === 0) order.push(...defaultOrder)
  else if (!order.some((item) => 'id' in item)) order.push({ id: 'DESC' })

  const where: Record<string, unknown> = {}
  for (const [column, raw] of Object.entries(filterModel)) {
    const filter = raw as { filter?: string; type?: string; dateFrom?: string }
    const field = fieldMap[column] ?? column
    if (!['name', 'type', 'description', 'startDate', 'endDate'].includes(field)) continue
    if (field === 'startDate' || field === 'endDate') {
      if (!filter.dateFrom) continue
      const operator = filter.type === 'equals' ? 'eq' : filter.type === 'lessThan' ? 'lt' : 'gt'
      where[field] = { [operator]: filter.dateFrom }
      continue
    }
    if (!filter.filter) continue
    const operator =
      filter.type === 'equals' || field === 'type'
        ? 'eq'
        : filter.type === 'notEqual'
          ? 'neq'
          : 'contains'
    where[field] = { [operator]: filter.filter }
  }
  return {
    where: Object.keys(where).length ? (where as AgEventsPageQuery['variables']['where']) : null,
    order,
  }
}

const updateEventMutation = graphql`
  mutation AgEventsPageUpdateMutation($id: ID!, $event: EventInput!) {
    updateEvent(id: $id, event: $event) {
      id
      name
      type
      description
      startDate
      endDate
      tags {
        id
      }
    }
  }
`

type EventRow = NonNullable<NonNullable<AgEventsPageQuery['response']['events']>['nodes']>[number]
type EventConnection = NonNullable<AgEventsPageQuery['response']['events']>
type EventType = EventRow['type']
const eventTypes: EventType[] = ['CRASH', 'INJURY', 'ILLNESS', 'REPAIR', 'BREAK', 'GOAL', 'OTHER']
const PAGE_SIZE = 20
const emptyEvents: EventRow[] = []
const defaultOrder: EventSortInput[] = [{ startDate: 'DESC' }, { id: 'DESC' }]

function toGridRow(event: EventRow): EventRow {
  return { ...event, tags: event.tags.map((tag) => ({ ...tag })) }
}

function getEventRowNumber(id: string): string {
  try {
    return atob(id).match(/^Event:(\d+)$/)?.[1] ?? ''
  } catch {
    return ''
  }
}

function createEventsDatasource(
  connection: EventConnection,
  environment: ReturnType<typeof useRelayEnvironment>,
  setLoadFailed: (failed: boolean) => void,
  setResultCount: (count: number) => void,
  initialQuery = true,
): IDatasource {
  const cursors = new Map<number, string | null>([[0, null]])
  let nextBlockStart = PAGE_SIZE
  let hasNextPage = connection.pageInfo.hasNextPage
  let rowCount = connection.totalCount
  let requestQueue = Promise.resolve()
  let destroyed = false

  if (connection.pageInfo.endCursor) {
    cursors.set(nextBlockStart, connection.pageInfo.endCursor)
  }

  async function fetchBlock(
    startRow: number,
    cursor: string | null,
    where: AgEventsPageQuery['variables']['where'],
    order: AgEventsPageQuery['variables']['order'],
  ): Promise<ReadonlyArray<EventRow>> {
    const page = await fetchQuery<AgEventsPageQuery>(
      environment,
      pageQuery,
      { first: PAGE_SIZE, after: cursor, where, order },
      { fetchPolicy: 'store-or-network' },
    ).toPromise()
    if (!page) throw new Error('The events page request returned no response.')

    const pageConnection = page.events
    if (startRow === nextBlockStart) {
      hasNextPage = pageConnection.pageInfo.hasNextPage
      nextBlockStart += PAGE_SIZE
      if (pageConnection.pageInfo.endCursor) {
        cursors.set(nextBlockStart, pageConnection.pageInfo.endCursor)
      }
    }

    return pageConnection.nodes ?? []
  }

  return {
    rowCount: connection.totalCount,
    getRows: (params) => {
      const { where, order } = gridQuery(params.sortModel, params.filterModel)
      const isInitialQuery =
        initialQuery &&
        params.startRow === 0 &&
        params.sortModel.length === 0 &&
        Object.keys(params.filterModel).length === 0
      if (isInitialQuery) {
        params.successCallback(
          (connection.nodes ?? emptyEvents).map(toGridRow),
          connection.totalCount,
        )
        return
      }

      if (params.startRow === 0) {
        const request = fetchQuery<AgEventsPageQuery>(
          environment,
          pageQuery,
          { first: PAGE_SIZE, after: null, where, order },
          { fetchPolicy: 'store-or-network' },
        ).toPromise()
        void request.then(
          (page) => {
            if (!page || destroyed) return
            cursors.clear()
            cursors.set(0, null)
            nextBlockStart = PAGE_SIZE
            hasNextPage = page.events.pageInfo.hasNextPage
            rowCount = page.events.totalCount
            if (page.events.pageInfo.endCursor) {
              cursors.set(nextBlockStart, page.events.pageInfo.endCursor)
            }
            setLoadFailed(false)
            setResultCount(page.events.totalCount)
            params.successCallback(
              (page.events.nodes ?? emptyEvents).map(toGridRow),
              page.events.totalCount,
            )
          },
          () => {
            if (!destroyed) {
              setLoadFailed(true)
              params.failCallback()
            }
          },
        )
        return
      }

      const request = requestQueue.then(async () => {
        while (!cursors.has(params.startRow) && hasNextPage) {
          const cursor = cursors.get(nextBlockStart)
          if (!cursor) {
            throw new Error('The events connection has no cursor for its next page.')
          }
          const fetchedBlockStart = nextBlockStart
          const rows = await fetchBlock(fetchedBlockStart, cursor, where, order)
          if (params.startRow === fetchedBlockStart) {
            return rows
          }
        }

        const cursor = cursors.get(params.startRow)
        if (cursor === undefined) return []
        return fetchBlock(params.startRow, cursor, where, order)
      })
      requestQueue = request.then(
        () => undefined,
        () => undefined,
      )

      void request.then(
        (rows) => {
          if (!destroyed) {
            setLoadFailed(false)
            params.successCallback(rows.map(toGridRow), rowCount)
          }
        },
        () => {
          if (!destroyed) {
            setLoadFailed(true)
            params.failCallback()
          }
        },
      )
    },
    destroy: () => {
      destroyed = true
    },
  }
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

function AgEventsContent({ fetchKey }: { fetchKey: number }) {
  const { t } = useTranslation()
  const format = useFormat()
  const environment = useRelayEnvironment()
  const [commitUpdate, isUpdating] = useMutation<AgEventsPageUpdateMutation>(updateEventMutation)
  const revertingEdit = useRef(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [resultCount, setResultCount] = useState<number | null>(null)
  const queryData = useLazyLoadQuery<AgEventsPageQuery>(
    pageQuery,
    { first: PAGE_SIZE, after: null, where: null, order: defaultOrder },
    { fetchKey, fetchPolicy: 'store-or-network' },
  )
  const events = [...(queryData.events?.nodes ?? emptyEvents)]
  const datasource = useMemo(
    () => createEventsDatasource(queryData.events, environment, setLoadFailed, setResultCount),
    [environment, queryData.events],
  )
  const columnDefs = useMemo<ColDef<EventRow>[]>(
    () => [
      {
        headerName: t('events.columns.rowNumber'),
        valueGetter: ({ data }) => (data ? getEventRowNumber(data.id) : ''),
        minWidth: 60,
        width: 70,
        sortable: true,
        filter: false,
      },
      {
        field: 'name',
        headerName: t('events.columns.name'),
        minWidth: 160,
        editable: !isUpdating,
      },
      {
        field: 'startDate',
        headerName: t('events.columns.startDate'),
        valueFormatter: ({ value }) => formatEventDate(value, format.date, t('events.emptyValue')),
        minWidth: 140,
        editable: !isUpdating,
        cellEditor: 'agDateStringCellEditor',
      },
      {
        field: 'type',
        headerName: t('events.columns.type'),
        valueFormatter: ({ value }) =>
          value ? t(`events.types.${value}`) : t('events.emptyValue'),
        minWidth: 130,
        editable: !isUpdating,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: {
          values: eventTypes,
          valueFormatter: ({ value }: { value: EventType }) => t(`events.types.${value}`),
        },
      },
      {
        field: 'endDate',
        headerName: t('events.columns.endDate'),
        valueFormatter: ({ value }) => formatEventDate(value, format.date, t('events.emptyValue')),
        minWidth: 140,
        editable: !isUpdating,
        cellEditor: 'agDateStringCellEditor',
      },
      {
        field: 'description',
        headerName: t('events.columns.description'),
        valueFormatter: ({ value }) => value || t('events.emptyValue'),
        minWidth: 180,
        editable: !isUpdating,
        cellEditor: 'agLargeStringCellEditor',
      },
    ],
    [format.date, isUpdating, t],
  )
  const defaultColDef = useMemo<ColDef<EventRow>>(
    () => ({ flex: 1, sortable: true, filter: true, resizable: true }),
    [],
  )
  if (events.length === 0) {
    return <PageEmptyState title={t('events.empty.title')} message={t('events.empty.message')} />
  }

  return (
    <Box display="grid" gap="3">
      <Text fontSize="sm" color="fg.muted" aria-live="polite">
        {t('events.resultCount', {
          count: resultCount ?? queryData.events?.totalCount ?? events.length,
        })}
      </Text>
      {loadFailed && (
        <Text role="alert" color="fg.error">
          {t('events.loadFailed')}
        </Text>
      )}
      <AgGridTable<EventRow>
        ariaLabel={t('events.table.caption')}
        height="calc(100dvh - 18rem)"
        minHeight="16rem"
        rowModelType="infinite"
        datasource={datasource}
        cacheBlockSize={PAGE_SIZE}
        maxBlocksInCache={5}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        getRowId={({ data }) => data.id}
        onCellValueChanged={({ data, oldValue, newValue, node, column }) => {
          if (revertingEdit.current || !data || oldValue === newValue) return
          const restoreCell = () => {
            revertingEdit.current = true
            try {
              node.setDataValue(column.getColId(), oldValue)
            } finally {
              revertingEdit.current = false
            }
          }
          commitUpdate({
            variables: {
              id: data.id,
              event: {
                name: data.name,
                type: data.type,
                description: data.description || null,
                startDate: data.startDate,
                endDate: data.endDate,
                tagIds: data.tags.map(({ id }) => id),
              },
            },
            onCompleted: (response, errors) => {
              if (errors?.length || !response.updateEvent) {
                restoreCell()
                toaster.create({ type: 'error', title: t('events.edit.saveFailed') })
                return
              }
              toaster.create({ type: 'success', title: t('events.edit.saved') })
            },
            onError: () => {
              restoreCell()
              toaster.create({ type: 'error', title: t('events.edit.saveFailed') })
            },
          })
        }}
        rowBuffer={10}
        suppressRowVirtualisation={false}
      />
    </Box>
  )
}

export function AgEventsPage() {
  const { t } = useTranslation()
  const [fetchKey, retry] = useFetchKey()

  return (
    <Page title={t('nav.agEvents')}>
      <QueryBoundary
        onRetry={retry}
        fallback={<DataTableSkeleton />}
        errorMessage={t('events.loadFailed')}
      >
        <AgEventsContent fetchKey={fetchKey} />
      </QueryBoundary>
    </Page>
  )
}
