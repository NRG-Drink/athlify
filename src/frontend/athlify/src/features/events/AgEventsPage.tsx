import { Box, Text } from '@chakra-ui/react'
import {
  AllCommunityModule,
  InfiniteRowModelModule,
  ModuleRegistry,
  themeAlpine,
  type ColDef,
  type IDatasource,
} from 'ag-grid-community'
import { AG_GRID_LOCALE_DE, AG_GRID_LOCALE_EN } from '@ag-grid-community/locale'
import { AgGridReact } from 'ag-grid-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchQuery, graphql, useLazyLoadQuery, useRelayEnvironment } from 'react-relay'
import { DataTableSkeleton } from '../../components/DataTableSkeleton'
import { Page, PageEmptyState } from '../../components/Page'
import { QueryBoundary } from '../../components/QueryBoundary'
import { useFormat } from '../../i18n/useFormat'
import { parseDate } from '../../lib/dates'
import { useFetchKey } from '../../relay/useFetchKey'
import type { AgEventsPageQuery } from './__generated__/AgEventsPageQuery.graphql'

ModuleRegistry.registerModules([AllCommunityModule, InfiniteRowModelModule])

const pageQuery = graphql`
  query AgEventsPageQuery($first: Int!, $after: String) {
    events(first: $first, after: $after, order: [{ startDate: DESC }, { id: DESC }]) {
      totalCount
      nodes {
        id
        name
        type
        description
        startDate
        endDate
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
`

type EventRow = NonNullable<NonNullable<AgEventsPageQuery['response']['events']>['nodes']>[number]
type EventConnection = NonNullable<AgEventsPageQuery['response']['events']>
const PAGE_SIZE = 20
const emptyEvents: EventRow[] = []

function createEventsDatasource(
  connection: EventConnection,
  environment: ReturnType<typeof useRelayEnvironment>,
  setLoadFailed: (failed: boolean) => void,
): IDatasource {
  const cursors = new Map<number, string | null>([[0, null]])
  let nextBlockStart = PAGE_SIZE
  let hasNextPage = connection.pageInfo.hasNextPage
  let requestQueue = Promise.resolve()
  let destroyed = false

  if (connection.pageInfo.endCursor) {
    cursors.set(nextBlockStart, connection.pageInfo.endCursor)
  }

  async function fetchBlock(
    startRow: number,
    cursor: string | null,
  ): Promise<ReadonlyArray<EventRow>> {
    const page = await fetchQuery<AgEventsPageQuery>(
      environment,
      pageQuery,
      { first: PAGE_SIZE, after: cursor },
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
      if (params.startRow === 0) {
        params.successCallback([...(connection.nodes ?? emptyEvents)], connection.totalCount)
        return
      }

      const request = requestQueue.then(async () => {
        while (!cursors.has(params.startRow) && hasNextPage) {
          const cursor = cursors.get(nextBlockStart)
          if (!cursor) {
            throw new Error('The events connection has no cursor for its next page.')
          }
          const fetchedBlockStart = nextBlockStart
          const rows = await fetchBlock(fetchedBlockStart, cursor)
          if (params.startRow === fetchedBlockStart) {
            return rows
          }
        }

        const cursor = cursors.get(params.startRow)
        if (cursor === undefined) return []
        return fetchBlock(params.startRow, cursor)
      })
      requestQueue = request.then(
        () => undefined,
        () => undefined,
      )

      void request.then(
        (rows) => {
          if (!destroyed) {
            setLoadFailed(false)
            params.successCallback([...rows], connection.totalCount)
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
  const { t, i18n } = useTranslation()
  const format = useFormat()
  const environment = useRelayEnvironment()
  const [loadFailed, setLoadFailed] = useState(false)
  const queryData = useLazyLoadQuery<AgEventsPageQuery>(
    pageQuery,
    { first: PAGE_SIZE, after: null },
    { fetchKey, fetchPolicy: 'store-or-network' },
  )
  const events = [...(queryData.events?.nodes ?? emptyEvents)]
  const datasource = useMemo(
    () => createEventsDatasource(queryData.events, environment, setLoadFailed),
    [environment, queryData.events],
  )
  const columnDefs = useMemo<ColDef<EventRow>[]>(
    () => [
      {
        headerName: t('events.columns.rowNumber'),
        valueGetter: ({ node }) => (node?.rowIndex == null ? '' : node.rowIndex + 1),
        minWidth: 60,
        width: 190,
        sortable: false,
        filter: false,
      },
      { field: 'id', headerName: t('events.columns.id'), minWidth: 180 },
      { field: 'name', headerName: t('events.columns.name'), minWidth: 160 },
      {
        field: 'startDate',
        headerName: t('events.columns.startDate'),
        valueFormatter: ({ value }) => formatEventDate(value, format.date, t('events.emptyValue')),
        minWidth: 140,
      },
      {
        field: 'type',
        headerName: t('events.columns.type'),
        valueFormatter: ({ value }) =>
          value ? t(`events.types.${value}`) : t('events.emptyValue'),
        minWidth: 130,
      },
      {
        field: 'endDate',
        headerName: t('events.columns.endDate'),
        valueFormatter: ({ value }) => formatEventDate(value, format.date, t('events.emptyValue')),
        minWidth: 140,
      },
      {
        field: 'description',
        headerName: t('events.columns.description'),
        valueFormatter: ({ value }) => value || t('events.emptyValue'),
        minWidth: 180,
      },
    ],
    [format.date, t],
  )
  const defaultColDef = useMemo<ColDef<EventRow>>(
    () => ({ flex: 1, sortable: true, filter: true, resizable: true }),
    [],
  )
  const localeText = useMemo(
    () => ({
      ...(i18n.resolvedLanguage?.startsWith('de') ? AG_GRID_LOCALE_DE : AG_GRID_LOCALE_EN),
      ariaSortableColumn: t('events.grid.ariaSortableColumn'),
    }),
    [i18n.resolvedLanguage, t],
  )

  if (events.length === 0) {
    return <PageEmptyState title={t('events.empty.title')} message={t('events.empty.message')} />
  }

  return (
    <Box display="grid" gap="3">
      <Text fontSize="sm" color="fg.muted" aria-live="polite">
        {t('events.resultCount', { count: queryData.events?.totalCount ?? events.length })}
      </Text>
      {loadFailed && (
        <Text role="alert" color="fg.error">
          {t('events.loadFailed')}
        </Text>
      )}
      <Box
        role="region"
        aria-label={t('events.table.caption')}
        h="calc(100dvh - 18rem)"
        minH="16rem"
        minW="0"
        borderWidth="1px"
        borderColor="border"
        borderRadius="l3"
        overflow="hidden"
      >
        <AgGridReact<EventRow>
          rowModelType="infinite"
          datasource={datasource}
          cacheBlockSize={PAGE_SIZE}
          maxBlocksInCache={5}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          getRowId={({ data }) => data.id}
          localeText={localeText}
          rowBuffer={10}
          suppressRowVirtualisation={false}
          theme={themeAlpine}
        />
      </Box>
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
