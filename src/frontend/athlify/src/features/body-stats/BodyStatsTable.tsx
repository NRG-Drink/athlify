import { Flex, IconButton } from '@chakra-ui/react'
import { useMemo } from 'react'
import { graphql, useFragment } from 'react-relay'
import { useTranslation } from 'react-i18next'
import { LuPencil, LuTrash2 } from 'react-icons/lu'
import { DataTable, type DataTableColumn } from '../../components/DataTable'
import { useFormat } from '../../i18n/useFormat'
import type {
  BodyStatsTable_entries$data,
  BodyStatsTable_entries$key,
} from './__generated__/BodyStatsTable_entries.graphql'
import { bodyStatsMetrics } from './bodyStatsMetrics'

const tableFragment = graphql`
  fragment BodyStatsTable_entries on BodyStats @relay(plural: true) {
    id
    date
    weight
    bodyFatPercentage
    musclePercentage
    waterPercentage
    boneMass
    comments {
      id
      content
    }
  }
`

// A phone keeps date and weight (plus the actions menu); every wider step adds columns that fit.
const hiddenBelow: Partial<Record<(typeof bodyStatsMetrics)[number]['key'], 'sm' | 'md' | 'lg'>> = {
  bodyFatPercentage: 'sm',
  musclePercentage: 'md',
  waterPercentage: 'lg',
  boneMass: 'lg',
}

export type BodyStatsRow = BodyStatsTable_entries$data[number]

export interface BodyStatsTableProps {
  entries: BodyStatsTable_entries$key
  onEdit: (row: BodyStatsRow) => void
  onDelete: (row: BodyStatsRow) => void
}

export function BodyStatsTable({ entries, onEdit, onDelete }: BodyStatsTableProps) {
  const { t } = useTranslation()
  const format = useFormat()
  const rows = useFragment(tableFragment, entries)

  const columns = useMemo<DataTableColumn<BodyStatsRow>[]>(
    () => [
      {
        id: 'date',
        header: t('bodyStats.columns.date'),
        accessor: (row) => new Date(row.date).getTime(),
        cell: (row) => (
          <time dateTime={row.date} title={format.dateTime(row.date)}>
            {format.date(row.date)}
          </time>
        ),
        width: '8rem',
      },
      ...bodyStatsMetrics.map((metric): DataTableColumn<BodyStatsRow> => ({
        id: metric.key,
        header: t(metric.labelKey),
        accessor: (row) => row[metric.key],
        cell: (row) => format.number(row[metric.key], metric.decimals),
        align: 'end',
        unit: metric.unit,
        hideBelow: hiddenBelow[metric.key],
      })),
    ],
    [t, format],
  )

  return (
    <DataTable
      data={rows}
      columns={columns}
      getRowId={(row) => row.id}
      initialSort={{ id: 'date', desc: true }}
      caption={t('bodyStats.history')}
      actionsLabel={t('bodyStats.row.actionsColumn')}
      onRowClick={onEdit}
      rowActions={(row) => (
        <Flex gap="1" justify="flex-end">
          <IconButton
            variant="ghost"
            size="sm"
            color="fg.muted"
            aria-label={t('bodyStats.row.edit', { date: format.date(row.date) })}
            onClick={() => onEdit(row)}
          >
            <LuPencil />
          </IconButton>
          <IconButton
            variant="ghost"
            size="sm"
            color="fg.muted"
            _hover={{ color: 'fg.error', bg: 'bg.error' }}
            aria-label={t('bodyStats.row.delete', { date: format.date(row.date) })}
            onClick={() => onDelete(row)}
          >
            <LuTrash2 />
          </IconButton>
        </Flex>
      )}
    />
  )
}
