import { Box, Text } from '@chakra-ui/react'
import { AllCommunityModule, ModuleRegistry, themeQuartz, type ColDef } from 'ag-grid-community'
import { AG_GRID_LOCALE_DE, AG_GRID_LOCALE_EN } from '@ag-grid-community/locale'
import { AgGridReact } from 'ag-grid-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { graphql, useLazyLoadQuery } from 'react-relay'
import { DataTableSkeleton } from '../../components/DataTableSkeleton'
import { Page, PageEmptyState } from '../../components/Page'
import { QueryBoundary } from '../../components/QueryBoundary'
import { useFormat } from '../../i18n/useFormat'
import { parseDate } from '../../lib/dates'
import { useFetchKey } from '../../relay/useFetchKey'
import type { AgEventsPageQuery } from './__generated__/AgEventsPageQuery.graphql'

ModuleRegistry.registerModules([AllCommunityModule])

const pageQuery = graphql`
  query AgEventsPageQuery {
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

type EventRow = NonNullable<NonNullable<AgEventsPageQuery['response']['events']>['nodes']>[number]
const emptyEvents: EventRow[] = []

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
  const queryData = useLazyLoadQuery<AgEventsPageQuery>(
    pageQuery,
    {},
    { fetchKey, fetchPolicy: 'network-only' },
  )
  const events = [...(queryData.events?.nodes ?? emptyEvents)]
  const columnDefs = useMemo<ColDef<EventRow>[]>(
    () => [
      {
        field: 'startDate',
        headerName: t('events.columns.startDate'),
        valueFormatter: ({ value }) => formatEventDate(value, format.date, t('events.emptyValue')),
        minWidth: 140,
      },
      { field: 'name', headerName: t('events.columns.name'), minWidth: 160 },
      {
        field: 'type',
        headerName: t('events.columns.type'),
        valueFormatter: ({ value }) => (value ? t(`events.types.${value}`) : t('events.emptyValue')),
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
        {t('events.resultCount', { count: events.length })}
      </Text>
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
          rowData={events}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          getRowId={({ data }) => data.id}
          localeText={localeText}
          theme={themeQuartz}
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
