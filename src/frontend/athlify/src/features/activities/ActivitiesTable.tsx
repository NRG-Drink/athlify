import { Button, Flex, Text } from '@chakra-ui/react'
import { useMemo } from 'react'
import { graphql, useFragment } from 'react-relay'
import { useTranslation } from 'react-i18next'
import { DataTable, type DataTableColumn } from '../../components/DataTable'
import { useFormat } from '../../i18n/useFormat'
import { formatDuration, formatOptionalMeasure } from './activityFormatting'
import type {
  ActivitiesTable_entries$data,
  ActivitiesTable_entries$key,
} from './__generated__/ActivitiesTable_entries.graphql'

const tableFragment = graphql`
  fragment ActivitiesTable_entries on Activity @relay(plural: true) {
    id
    date
    type
    time
    distance
    averageSpeed
    elevationGain
    tss
    source
    vehicle {
      id
      brand
      model
      nickname
    }
    tags {
      id
      name
    }
  }
`

export type ActivityRow = ActivitiesTable_entries$data[number]

interface ActivitiesTableProps {
  entries: ActivitiesTable_entries$key
  hasNextPage: boolean
  isLoadingNext: boolean
  loadMoreError: boolean
  onLoadMore: () => void
  onRetryLoadMore: () => void
}

export function ActivitiesTable({
  entries,
  hasNextPage,
  isLoadingNext,
  loadMoreError,
  onLoadMore,
  onRetryLoadMore,
}: ActivitiesTableProps) {
  const { t } = useTranslation()
  const format = useFormat()
  const rows = useFragment(tableFragment, entries)

  const columns = useMemo<DataTableColumn<ActivityRow>[]>(() => [
    {
      id: 'date',
      header: t('activities.columns.date'),
      accessor: (row) => new Date(row.date).getTime(),
      cell: (row) => <time dateTime={row.date}>{format.dateTime(row.date)}</time>,
      width: '9rem',
    },
    {
      id: 'type',
      header: t('activities.columns.type'),
      accessor: (row) => row.type,
      cell: (row) => t(`activities.types.${row.type}`),
    },
    {
      id: 'time',
      header: t('activities.columns.duration'),
      accessor: (row) => row.time,
      cell: (row) => formatDuration(row.time, t),
      align: 'end',
    },
    {
      id: 'distance',
      header: t('activities.columns.distance'),
      accessor: (row) => row.distance,
      cell: (row) => formatOptionalMeasure(format, row.distance, 'km', 1),
      align: 'end',
    },
    {
      id: 'vehicle',
      header: t('activities.columns.vehicle'),
      accessor: (row) => row.vehicle?.nickname ?? row.vehicle?.model ?? '',
      cell: (row) =>
        row.vehicle ? (
          <Text truncate maxW="12rem">
            {row.vehicle.nickname ?? `${row.vehicle.brand} ${row.vehicle.model}`}
          </Text>
        ) : (
          '—'
        ),
      hideBelow: 'md',
      truncate: true,
    },
    {
      id: 'source',
      header: t('activities.columns.source'),
      accessor: (row) => row.source,
      cell: (row) => t(`activities.sources.${row.source}`),
      hideBelow: 'md',
    },
    {
      id: 'elevationGain',
      header: t('activities.columns.elevation'),
      accessor: (row) => row.elevationGain ?? -1,
      cell: (row) => formatOptionalMeasure(format, row.elevationGain, 'm', 0),
      align: 'end',
      hideBelow: 'lg',
    },
    {
      id: 'averageSpeed',
      header: t('activities.columns.speed'),
      accessor: (row) => row.averageSpeed ?? -1,
      cell: (row) => formatOptionalMeasure(format, row.averageSpeed, 'km/h', 1),
      align: 'end',
      hideBelow: 'lg',
    },
    {
      id: 'tss',
      header: t('activities.columns.tss'),
      accessor: (row) => row.tss ?? -1,
      cell: (row) => (row.tss == null ? '—' : format.number(row.tss, 0)),
      align: 'end',
      hideBelow: 'lg',
    },
  ], [t, format])

  return (
    <Flex direction="column" gap="3">
      <DataTable
        data={rows}
        columns={columns}
        getRowId={(row) => row.id}
        initialSort={{ id: 'date', desc: true }}
        caption={t('activities.table.caption')}
      />
      {loadMoreError && (
        <Flex align="center" justify="space-between" gap="3" wrap="wrap">
          <Text role="alert" color="fg.error">
            {t('activities.loadMoreFailed')}
          </Text>
          <Button size="sm" variant="outline" onClick={onRetryLoadMore}>
            {t('page.retry')}
          </Button>
        </Flex>
      )}
      {hasNextPage && !loadMoreError && (
        <Button alignSelf="center" variant="outline" loading={isLoadingNext} onClick={onLoadMore}>
          {t('activities.loadMore')}
        </Button>
      )}
    </Flex>
  )
}
