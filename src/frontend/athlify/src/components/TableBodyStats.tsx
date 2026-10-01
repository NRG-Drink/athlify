import { IconButton, Table, Text } from '@chakra-ui/react'
import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { LuTrash2 } from 'react-icons/lu'
import type { BodyStatsEntry } from './bodyStatsTypes'

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
})

const columnHelper = createColumnHelper<typeof features, BodyStatsEntry>()

const formatNumber = (value: number) => value.toFixed(1)

const units: Record<string, string> = {
  weight: 'kg',
  bodyFatPercentage: '%',
  musclePercentage: '%',
  waterPercentage: '%',
  boneMass: 'kg',
}

/** Formats a timestamp using the host's locale (e.g. 03.02.2026, 10:30 for de-CH/de-DE). */
const formatDateTime = (timestamp: number) =>
  new Date(timestamp).toLocaleString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const isNumeric = (columnId: string) => columnId !== 'date'

const sortIndicator = { asc: ' ▲', desc: ' ▼' } as const

interface TableBodyStatsProps {
  bodyStats: ReadonlyArray<BodyStatsEntry>
  onDelete?: (entry: BodyStatsEntry) => void
  /** Uid of the entry whose deletion is in flight. */
  deletingUid?: string | null
}

function TableBodyStats({ bodyStats, onDelete, deletingUid }: TableBodyStatsProps) {
  const { t } = useTranslation()
  const data = useMemo(() => [...bodyStats], [bodyStats])

  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor((row) => new Date(row.date as string).getTime(), {
          id: 'date',
          header: t('bodyStats.columns.date'),
          cell: (info) => formatDateTime(info.getValue()),
        }),
        columnHelper.accessor('weight', {
          header: t('bodyStats.columns.weight'),
          cell: (info) => formatNumber(info.getValue()),
        }),
        columnHelper.accessor('bodyFatPercentage', {
          header: t('bodyStats.columns.bodyFatPercentage'),
          cell: (info) => formatNumber(info.getValue()),
        }),
        columnHelper.accessor('musclePercentage', {
          header: t('bodyStats.columns.musclePercentage'),
          cell: (info) => formatNumber(info.getValue()),
        }),
        columnHelper.accessor('waterPercentage', {
          header: t('bodyStats.columns.waterPercentage'),
          cell: (info) => formatNumber(info.getValue()),
        }),
        columnHelper.accessor('boneMass', {
          header: t('bodyStats.columns.boneMass'),
          cell: (info) => formatNumber(info.getValue()),
        }),
      ]),
    [t],
  )

  const table = useTable({
    features,
    columns,
    data,
    initialState: { sorting: [{ id: 'date', desc: true }] },
    getRowId: (row) => row.uid,
  })

  if (data.length === 0) {
    return <Text>{t('bodyStats.empty')}</Text>
  }

  return (
    <Table.ScrollArea>
      <Table.Root size="sm" striped>
        <Table.Header>
          {table.getHeaderGroups().map((headerGroup) => (
            <Table.Row key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const sorted = header.column.getIsSorted()
                return (
                  <Table.ColumnHeader
                    key={header.id}
                    textAlign={isNumeric(header.column.id) ? 'end' : 'start'}
                    cursor="pointer"
                    userSelect="none"
                    aria-sort={
                      sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none'
                    }
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <table.FlexRender header={header} />
                    {sorted ? sortIndicator[sorted] : null}
                    {units[header.column.id] && (
                      <Text
                        as="span"
                        display="block"
                        fontSize="xs"
                        fontWeight="normal"
                        color="fg.muted"
                      >
                        [{units[header.column.id]}]
                      </Text>
                    )}
                  </Table.ColumnHeader>
                )
              })}
              {onDelete && <Table.ColumnHeader w="1" aria-label={t('bodyStats.delete.column')} />}
            </Table.Row>
          ))}
        </Table.Header>
        <Table.Body>
          {table.getRowModel().rows.map((row) => (
            <Table.Row
              key={row.id}
              css={{
                '&&:hover td': { bg: 'colorPalette.subtle' },
                '& [data-delete]': { opacity: 0 },
                '&:hover [data-delete], & [data-delete]:focus-visible, & [data-delete][data-busy]':
                  {
                    opacity: 1,
                  },
                '@media (hover: none)': { '& [data-delete]': { opacity: 1 } },
              }}
            >
              {row.getAllCells().map((cell) => (
                <Table.Cell key={cell.id} textAlign={isNumeric(cell.column.id) ? 'end' : 'start'}>
                  <table.FlexRender cell={cell} />
                </Table.Cell>
              ))}
              {onDelete && (
                <Table.Cell w="1" ps="0">
                  <IconButton
                    data-delete
                    data-busy={deletingUid === row.original.uid ? '' : undefined}
                    size="xs"
                    variant="ghost"
                    colorPalette="red"
                    aria-label={t('bodyStats.delete.action')}
                    disabled={deletingUid === row.original.uid}
                    onClick={() => onDelete(row.original)}
                  >
                    <LuTrash2 />
                  </IconButton>
                </Table.Cell>
              )}
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Table.ScrollArea>
  )
}

export default TableBodyStats
