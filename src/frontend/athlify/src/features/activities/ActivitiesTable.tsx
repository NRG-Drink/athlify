import { Button, Flex, Text } from '@chakra-ui/react'
import { useMemo } from 'react'
import { graphql, useFragment } from 'react-relay'
import { useTranslation } from 'react-i18next'
import { DataTable, type DataTableColumn } from '../../components/DataTable'
import { useFormat } from '../../i18n/useFormat'
import {
  enumLabel,
  formatDuration,
  formatHeartRate,
  formatOptionalNumber,
  moodRank,
  vehicleLabel,
  windRank,
} from './activityFormatting'
import type {
  ActivitiesTable_entries$data,
  ActivitiesTable_entries$key,
} from './__generated__/ActivitiesTable_entries.graphql'

const tableFragment = graphql`
  fragment ActivitiesTable_entries on Activity @relay(plural: true) {
    id
    date
    type
    description
    time
    distance
    averageSpeed
    elevationGain
    tss
    heartRateMin
    heartRateMax
    heartRateAverage
    mood
    effort
    wind
    vehicle {
      id
      brand
      model
      nickname
    }
    gadgets {
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

const gadgetNames = (row: ActivityRow) => row.gadgets.map(vehicleLabel).join(', ')
const tagNames = (row: ActivityRow) => row.tags.map((tag) => tag.name).join(', ')

/** Shows the full text as a tooltip, because truncated cells hide the end. */
const titled = (text: string) => (text ? <span title={text}>{text}</span> : '—')

/** Secondary data: hidden on narrow screens and shown in a muted colour. */
const secondary = { hideBelow: '2xl', muted: true } as const

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
      cell: (row) => <time dateTime={row.date}>{format.date(row.date)}</time>,
      width: '8rem',
    },
    {
      id: 'type',
      header: t('activities.columns.type'),
      accessor: (row) => row.type,
      cell: (row) => t(`activities.types.${row.type}`),
    },
    {
      id: 'description',
      header: t('activities.columns.description'),
      accessor: (row) => row.description ?? '',
      cell: (row) => titled(row.description ?? ''),
      hideBelow: 'md',
      truncate: true,
      minWidth: '12rem',
      maxWidth: '24rem',
    },
    {
      id: 'time',
      header: t('activities.columns.duration'),
      accessor: (row) => row.time,
      cell: (row) => formatDuration(row.time),
      align: 'end',
      unit: t('activities.units.duration'),
    },
    {
      id: 'distance',
      header: t('activities.columns.distance'),
      accessor: (row) => row.distance,
      cell: (row) => formatOptionalNumber(format, row.distance, 1),
      align: 'end',
      unit: t('activities.units.distance'),
    },
    {
      id: 'vehicle',
      header: t('activities.columns.vehicle'),
      accessor: (row) => (row.vehicle ? vehicleLabel(row.vehicle) : ''),
      cell: (row) =>
        row.vehicle ? (
          <Text truncate maxW="12rem">
            {vehicleLabel(row.vehicle)}
          </Text>
        ) : (
          '—'
        ),
      hideBelow: 'md',
      truncate: true,
    },
    {
      id: 'elevationGain',
      header: t('activities.columns.elevationGain'),
      accessor: (row) => row.elevationGain ?? -1,
      cell: (row) => formatOptionalNumber(format, row.elevationGain, 0),
      align: 'end',
      unit: t('activities.units.elevation'),
      hideBelow: 'lg',
    },
    {
      id: 'averageSpeed',
      header: t('activities.columns.speed'),
      accessor: (row) => row.averageSpeed ?? -1,
      cell: (row) => formatOptionalNumber(format, row.averageSpeed, 1),
      align: 'end',
      unit: t('activities.units.speed'),
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
    {
      id: 'heartRate',
      header: t('activities.columns.heartRate'),
      accessor: (row) => row.heartRateAverage ?? -1,
      cell: (row) => {
        const { text, title } = formatHeartRate(
          row.heartRateAverage,
          row.heartRateMin,
          row.heartRateMax,
        )
        return title ? <span title={title}>{text}</span> : text
      },
      align: 'end',
      unit: t('activities.units.heartRate'),
      ...secondary,
    },
    {
      id: 'effort',
      header: t('activities.columns.effort'),
      accessor: (row) => row.effort ?? -1,
      cell: (row) => row.effort ?? '—',
      align: 'end',
      unit: t('activities.units.effort'),
      ...secondary,
    },
    {
      id: 'mood',
      header: t('activities.columns.mood'),
      accessor: (row) => moodRank(row.mood),
      cell: (row) => enumLabel(t, 'moods', row.mood),
      ...secondary,
    },
    {
      id: 'wind',
      header: t('activities.columns.wind'),
      accessor: (row) => windRank(row.wind),
      cell: (row) => enumLabel(t, 'winds', row.wind),
      ...secondary,
    },
    {
      id: 'gadgets',
      header: t('activities.columns.gadgets'),
      accessor: gadgetNames,
      cell: (row) => titled(gadgetNames(row)),
      ...secondary,
      truncate: true,
      minWidth: '8rem',
      maxWidth: '14rem',
    },
    {
      id: 'tags',
      header: t('activities.columns.tags'),
      accessor: tagNames,
      cell: (row) => titled(tagNames(row)),
      ...secondary,
      truncate: true,
      minWidth: '8rem',
      maxWidth: '14rem',
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
