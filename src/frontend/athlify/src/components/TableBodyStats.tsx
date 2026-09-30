import { Table, Text } from '@chakra-ui/react'
import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { BodyStatsEntry } from './bodyStatsTypes'

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
})

const columnHelper = createColumnHelper<typeof features, BodyStatsEntry>()

const formatNumber = (value: number, unit: string) => `${value.toFixed(1)} ${unit}`

const isNumeric = (columnId: string) => columnId !== 'date'

const sortIndicator = { asc: ' ▲', desc: ' ▼' } as const

interface TableBodyStatsProps {
  bodyStats: ReadonlyArray<BodyStatsEntry>
}

function TableBodyStats({ bodyStats }: TableBodyStatsProps) {
  const { t } = useTranslation()
  const data = useMemo(() => [...bodyStats], [bodyStats])

  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor((row) => new Date(row.date as string).getTime(), {
          id: 'date',
          header: t('bodyStats.columns.date'),
          cell: (info) => new Date(info.getValue()).toLocaleDateString(),
        }),
        columnHelper.accessor('weight', {
          header: t('bodyStats.columns.weight'),
          cell: (info) => formatNumber(info.getValue(), 'kg'),
        }),
        columnHelper.accessor('bodyFatPercentage', {
          header: t('bodyStats.columns.bodyFatPercentage'),
          cell: (info) => formatNumber(info.getValue(), '%'),
        }),
        columnHelper.accessor('musclePercentage', {
          header: t('bodyStats.columns.musclePercentage'),
          cell: (info) => formatNumber(info.getValue(), '%'),
        }),
        columnHelper.accessor('waterPercentage', {
          header: t('bodyStats.columns.waterPercentage'),
          cell: (info) => formatNumber(info.getValue(), '%'),
        }),
        columnHelper.accessor('boneMass', {
          header: t('bodyStats.columns.boneMass'),
          cell: (info) => formatNumber(info.getValue(), 'kg'),
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
                  </Table.ColumnHeader>
                )
              })}
            </Table.Row>
          ))}
        </Table.Header>
        <Table.Body>
          {table.getRowModel().rows.map((row) => (
            <Table.Row key={row.id}>
              {row.getAllCells().map((cell) => (
                <Table.Cell key={cell.id} textAlign={isNumeric(cell.column.id) ? 'end' : 'start'}>
                  <table.FlexRender cell={cell} />
                </Table.Cell>
              ))}
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Table.ScrollArea>
  )
}

export default TableBodyStats
