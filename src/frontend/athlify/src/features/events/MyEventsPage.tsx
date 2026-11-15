import { useTranslation } from 'react-i18next'
import { Page } from '../../components/Page'
import { Box, Button, Input, Text } from '@chakra-ui/react'
import type { Ref } from 'react'
import { AgGridProvider, AgGridReact } from 'ag-grid-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AllCommunityModule,
  InfiniteRowModelModule,
  colorSchemeDarkBlue,
  themeQuartz,
  type ColDef,
} from 'ag-grid-community'
import { graphql } from 'react-relay/legacy'
import type { EventFilterInput, MyEventsPageQuery } from './__generated__/MyEventsPageQuery.graphql'
import { MyEventsDataSource } from './MyEventsDataSource'
import { useRelayEnvironment } from 'react-relay'
import { MyEventsTypeFilter } from './MyEventsTypeFilter'
import { defaultOrder, getGridQuery } from './MyEventsGridQuery'

type QueryEvent = NonNullable<NonNullable<MyEventsPageQuery['response']['events']>['nodes']>[number]

type EventsRow = {
  -readonly [K in keyof QueryEvent]: QueryEvent[K]
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
  if (!id) {
    return null
  }

  const decoded = atob(id)
  const match = decoded.match(/^Event:(\d+)$/)
  if (!match) {
    return null
  }

  return Number(match[1])
}

const MyEventsGrid = ({
  gridRef,
  where,
}: {
  gridRef: Ref<AgGridReact<EventsRow>>
  where: EventFilterInput | null
}) => {
  const { t } = useTranslation()
  const environment = useRelayEnvironment()
  const agGridModules = [AllCommunityModule, InfiniteRowModelModule]
  const [loadFailed, setLoadFailed] = useState(false)
  const [loading, setLoading] = useState(true)
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

  const defaultColDef = useMemo<ColDef<EventsRow>>(
    () => ({
      resizable: true,
      sortable: true,
      filter: true,
    }),
    [],
  )
  const [columnDefs] = useState<ColDef<EventsRow>[]>([
    {
      field: 'id',
      filter: false,
      width: 100,
      pinned: 'left',
      valueGetter: (params) => getEventRowNumber(params.data?.id),
    },
    { field: 'name', flex: 1, filter: 'agTextColumnFilter', minWidth: 300, width: 200 },
    {
      field: 'startDate',
      filter: 'agDateColumnFilter',
      valueFormatter: (params) =>
        params.value ? new Date(params.value).toLocaleDateString() : '-',
    },
    {
      field: 'endDate',
      filter: 'agDateColumnFilter',
      valueFormatter: (params) =>
        params.value ? new Date(params.value).toLocaleDateString() : '-',
    },
    {
      field: 'type',
      filter: MyEventsTypeFilter,
      minWidth: 100,
    },
    {
      field: 'tags',
      filter: 'agTextColumnFilter',
      minWidth: 100,
      valueFormatter: (params) => params.value?.tags?.join(', ') ?? '-',
    },
    {
      field: 'description',
      filter: 'agTextColumnFilter',
      minWidth: 400,
    },
  ])

  return (
    <AgGridProvider modules={agGridModules}>
      {loadFailed && (
        <Text role="alert" color="fg.error">
          {t('events.loadFailed')}
        </Text>
      )}
      <Box height="400px" overflow="hidden">
        <AgGridReact<EventsRow>
          ref={gridRef}
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
        />
      </Box>
    </AgGridProvider>
  )
}

const toGraphQLDate = (dateString: string) => {
  if (!dateString) {
    return undefined
  }

  const date = new Date(dateString)
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
}

export const MyEventsPage = () => {
  const { t } = useTranslation()
  const [quickFilter, setQuickFilter] = useState('')
  const [debouncedQuickFilter, setDebouncedQuickFilter] = useState('')
  const [fromFilter, setFromFilter] = useState('')
  const [toFilter, setToFilter] = useState('')
  const gridRef = useRef<AgGridReact<EventsRow>>(null)
  const where = useMemo(() => {
    const clauses: EventFilterInput[] = []
    if (fromFilter) clauses.push({ startDate: { gte: toGraphQLDate(fromFilter) } })
    if (toFilter) clauses.push({ endDate: { lte: toGraphQLDate(toFilter) } })
    if (debouncedQuickFilter.trim()) {
      const term = debouncedQuickFilter.trim()
      clauses.push({
        or: [{ name: { contains: term } }, { description: { contains: term } }],
      })
    }
    return clauses.length === 0 ? null : clauses.length === 1 ? clauses[0] : { and: clauses }
  }, [debouncedQuickFilter, fromFilter, toFilter])

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuickFilter(quickFilter), 250)
    return () => window.clearTimeout(timeout)
  }, [quickFilter])

  return (
    <>
      <Page title={t('nav.myEvents')} />
      <Box display="flex" justifyContent="space-between" margin="10px 0">
        <Button
          onClick={() => {
            const now = new Date()
            setFromFilter(`${now.getFullYear()}-01-01`)
            setToFilter('')
          }}
        >
          {t('events.filterYtd')}
        </Button>
      </Box>
      <Box display="grid" gridTemplateColumns="1fr 1fr 1fr auto" gap="2" margin="10px 0">
        <Input
          aria-label={t('events.quickFilter')}
          placeholder={t('events.quickFilter')}
          value={quickFilter}
          onChange={(event) => setQuickFilter(event.target.value)}
        />
        <Input
          type="date"
          aria-label={t('events.fromFilter')}
          placeholder={t('events.fromFilter')}
          value={fromFilter}
          onChange={(event) => setFromFilter(event.target.value)}
        />
        <Input
          type="date"
          aria-label={t('events.toFilter')}
          placeholder={t('events.toFilter')}
          value={toFilter}
          onChange={(event) => setToFilter(event.target.value)}
        />
        <Button
          onClick={() => {
            gridRef.current?.api.setFilterModel(null)
            setQuickFilter('')
            setFromFilter('')
            setToFilter('')
          }}
        >
          {t('events.resetFilters')}
        </Button>
      </Box>
      <MyEventsGrid gridRef={gridRef} where={where} />
    </>
  )
}
