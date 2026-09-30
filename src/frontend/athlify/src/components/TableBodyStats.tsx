import { Table, Text } from '@chakra-ui/react'
import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import { Suspense, useMemo } from 'react'
import { graphql, useLazyLoadQuery } from 'react-relay'
import type { TableBodyStatsQuery } from './__generated__/TableBodyStatsQuery.graphql'

const bodyStatsQuery = graphql`
  query TableBodyStatsQuery {
    bodyStats {
      uid
      date
      weight
      bodyFatPercentage
      musclePercentage
      waterPercentage
      boneMass
    }
  }
`

type BodyStatsRow = TableBodyStatsQuery['response']['bodyStats'][number]

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
})

const columnHelper = createColumnHelper<typeof features, BodyStatsRow>()

const formatNumber = (value: number, unit: string) => `${value.toFixed(1)} ${unit}`

const columns = columnHelper.columns([
  columnHelper.accessor((row) => new Date(row.date as string).getTime(), {
    id: 'date',
    header: 'Date',
    cell: (info) => new Date(info.getValue()).toLocaleDateString(),
  }),
  columnHelper.accessor('weight', {
    header: 'Weight',
    cell: (info) => formatNumber(info.getValue(), 'kg'),
  }),
  columnHelper.accessor('bodyFatPercentage', {
    header: 'Fat',
    cell: (info) => formatNumber(info.getValue(), '%'),
  }),
  columnHelper.accessor('musclePercentage', {
    header: 'Muscle',
    cell: (info) => formatNumber(info.getValue(), '%'),
  }),
  columnHelper.accessor('waterPercentage', {
    header: 'Water',
    cell: (info) => formatNumber(info.getValue(), '%'),
  }),
  columnHelper.accessor('boneMass', {
    header: 'Bone',
    cell: (info) => formatNumber(info.getValue(), 'kg'),
  }),
])

const isNumeric = (columnId: string) => columnId !== 'date'

const sortIndicator = { asc: ' ▲', desc: ' ▼' } as const

function TableBodyStatsContent() {
  const { bodyStats } = useLazyLoadQuery<TableBodyStatsQuery>(bodyStatsQuery, {})
  const data = useMemo(() => [...bodyStats], [bodyStats])

  const table = useTable({
    features,
    columns,
    data,
    initialState: { sorting: [{ id: 'date', desc: true }] },
    getRowId: (row) => row.uid,
  })

  if (data.length === 0) {
    return <Text>No entries yet.</Text>
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
                <Table.Cell
                  key={cell.id}
                  textAlign={isNumeric(cell.column.id) ? 'end' : 'start'}
                >
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

function TableBodyStats() {
  return (
    <Suspense fallback={<p>Loading body stats…</p>}>
      <TableBodyStatsContent />
    </Suspense>
  )
}

export default TableBodyStats
