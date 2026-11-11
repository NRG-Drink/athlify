import { Flex, IconButton } from '@chakra-ui/react'
import { useMemo } from 'react'
import { graphql, useFragment } from 'react-relay'
import { useTranslation } from 'react-i18next'
import { LuTrash2 } from 'react-icons/lu'
import { DataTable, type DataTableColumn } from '../../components/DataTable'
import { useFormat } from '../../i18n/useFormat'
import type {
  BodyStatsTable_entries$data,
  BodyStatsTable_entries$key,
} from './__generated__/BodyStatsTable_entries.graphql'
import { bodyStatsMetrics } from './bodyStatsMetrics'
import type { ListSort } from '../../lib/sort'

const tableFragment = graphql`
  fragment BodyStatsTable_entries on BodyStats @relay(plural: true) {
    id
    date
    weight
    bodyFatPercentage
    musclePercentage
    waterPercentage
    boneMass
    comment
  }
`

// A phone keeps date and weight (plus the actions menu); every wider step adds columns that fit.
const hiddenBelow: Partial<Record<(typeof bodyStatsMetrics)[number]['key'], 'sm' | 'md' | 'lg'>> = {
  bodyFatPercentage: 'sm',
  musclePercentage: 'md',
  waterPercentage: 'lg',
  boneMass: 'lg',
}

// Explanations for the estimated body composition values; weight needs none.
const columnHint: Partial<Record<(typeof bodyStatsMetrics)[number]['key'], string>> = {
  bodyFatPercentage: 'bodyStats.columnHints.bodyFatPercentage',
  musclePercentage: 'bodyStats.columnHints.musclePercentage',
  waterPercentage: 'bodyStats.columnHints.waterPercentage',
  boneMass: 'bodyStats.columnHints.boneMass',
}

export type BodyStatsRow = BodyStatsTable_entries$data[number]

export interface BodyStatsTableProps {
  entries: BodyStatsTable_entries$key
  hasNextPage: boolean
  isLoadingNext: boolean
  loadMoreError: boolean
  onLoadMore: () => void
  onEdit: (row: BodyStatsRow) => void
  onDelete: (row: BodyStatsRow) => void
  /** Server-side order; the rows arrive sorted. */
  sort: ListSort
  onSortChange: (sort: ListSort) => void
  /** Number of measurements across all pages. */
  totalCount: number
  /** The rows are being refreshed after a sort change. */
  busy?: boolean
}

export function BodyStatsTable({
  entries,
  hasNextPage,
  isLoadingNext,
  loadMoreError,
  onLoadMore,
  onEdit,
  onDelete,
  sort,
  onSortChange,
  totalCount,
  busy,
}: BodyStatsTableProps) {
  const { t } = useTranslation()
  const format = useFormat()
  const rows = useFragment(tableFragment, entries)

  const columns = useMemo<DataTableColumn<BodyStatsRow>[]>(() => {
    const hintFor = (key: keyof typeof columnHint) => {
      const hintKey = columnHint[key]
      return hintKey ? t(hintKey) : undefined
    }
    return [
      {
        id: 'date',
        header: t('bodyStats.columns.date'),
        accessor: (row) => new Date(row.date).getTime(),
        cell: (row) => (
          <time dateTime={row.date} title={format.dateTime(row.date)}>
            {format.dateTime(row.date)}
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
        description: hintFor(metric.key),
        hideBelow: hiddenBelow[metric.key],
      })),
    ]
  }, [t, format])

  return (
    <DataTable
      data={rows}
      columns={columns}
      getRowId={(row) => row.id}
      sort={sort}
      onSortChange={onSortChange}
      caption={t('bodyStats.history')}
      actionsLabel={t('bodyStats.row.actionsColumn')}
      onRowClick={onEdit}
      rowLabel={(row) => t('bodyStats.row.edit', { date: format.date(row.date) })}
      busy={busy}
      count={t('bodyStats.resultCount', { count: totalCount })}
      pagination={{
        hasNextPage,
        isLoadingNext,
        error: loadMoreError,
        onLoadMore,
        loadMoreLabel: t('bodyStats.loadMore'),
        errorLabel: t('bodyStats.loadMoreFailed'),
      }}
      rowActions={(row) => (
        <Flex gap="1" justify="flex-end">
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
