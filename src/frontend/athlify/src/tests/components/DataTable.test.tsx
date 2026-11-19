import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DataTable, type DataTableColumn } from '../../components/DataTable'
import { ChakraProviderAthlify } from '../../components/ui/ChakraProviderAthlify'
import { expectNoTooltip } from '../utils/tooltip'

interface Row {
  id: string
  name: string
  amount: number
}

const rows: Row[] = [
  { id: 'a', name: 'Anna', amount: 20 },
  { id: 'b', name: 'Ben', amount: 30 },
  { id: 'c', name: 'Cleo', amount: 10 },
]

const columns: DataTableColumn<Row>[] = [
  { id: 'name', header: 'Name', accessor: (row) => row.name },
  { id: 'amount', header: 'Betrag', accessor: (row) => row.amount, align: 'end', unit: 'kg' },
]

function renderTable(props: Partial<React.ComponentProps<typeof DataTable<Row>>> = {}) {
  return render(
    <ChakraProviderAthlify>
      <DataTable
        data={rows}
        columns={columns}
        getRowId={(row) => row.id}
        sort={{ column: 'name', desc: false }}
        onSortChange={() => {}}
        caption="Beträge"
        {...props}
      />
    </ChakraProviderAthlify>,
  )
}

const names = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[0].textContent)

describe('DataTable', () => {
  it('renders the rows in the given order, marks the sorted column and names the table', async () => {
    renderTable({ sort: { column: 'amount', desc: true } })

    expect(await screen.findByRole('table', { name: 'Beträge' })).toBeInTheDocument()
    // The server already sorted the data; the table does not reorder it.
    expect(names()).toEqual(['Anna', 'Ben', 'Cleo'])
    expect(screen.getByRole('columnheader', { name: /Betrag/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    )
    expect(screen.getByRole('columnheader', { name: /Name/ })).toHaveAttribute('aria-sort', 'none')
    expect(screen.getByRole('columnheader', { name: /Betrag/ })).toHaveTextContent('kg')
  })

  it('reports the next order on a header click: descending first, then flipped', async () => {
    const user = userEvent.setup()
    const onSortChange = vi.fn()
    renderTable({ onSortChange })

    await user.click(await screen.findByRole('button', { name: /Betrag/ }))
    expect(onSortChange).toHaveBeenLastCalledWith({ column: 'amount', desc: true })
    expect(names()).toEqual(['Anna', 'Ben', 'Cleo'])

    // Name is sorted ascending: the next click turns it to descending, and back.
    await user.click(screen.getByRole('button', { name: /Name/ }))
    expect(onSortChange).toHaveBeenLastCalledWith({ column: 'name', desc: true })
  })

  it('turns a descending column to ascending', async () => {
    const user = userEvent.setup()
    const onSortChange = vi.fn()
    renderTable({ sort: { column: 'amount', desc: true }, onSortChange })

    await user.click(await screen.findByRole('button', { name: /Betrag/ }))
    expect(onSortChange).toHaveBeenLastCalledWith({ column: 'amount', desc: false })
  })

  it('sorts with the keyboard', async () => {
    const user = userEvent.setup()
    const onSortChange = vi.fn()
    renderTable({ onSortChange })
    await screen.findByRole('table')

    await user.tab()
    expect(screen.getByRole('button', { name: /Name/ })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: /Betrag/ })).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(onSortChange).toHaveBeenLastCalledWith({ column: 'amount', desc: true })
  })

  it('renders a column that cannot sort without a sort button or aria-sort', async () => {
    renderTable({ columns: [{ ...columns[0], sortable: false }, columns[1]] })

    const header = await screen.findByRole('columnheader', { name: /Name/ })
    expect(header).not.toHaveAttribute('aria-sort')
    expect(within(header).queryByRole('button')).not.toBeInTheDocument()
  })

  it('keeps row actions visible and reachable without hovering', async () => {
    const user = userEvent.setup()
    renderTable({
      rowActions: (row) => <button type="button">{`Aktionen ${row.name}`}</button>,
      actionsLabel: 'Aktionen',
    })

    const action = await screen.findByRole('button', { name: 'Aktionen Anna' })

    expect(action).toBeVisible()
    await user.tab() // Name header
    await user.tab() // Betrag header
    await user.tab()
    expect(action).toHaveFocus()
  })

  it('opens a row by click and by Enter on the focused row, but not from its actions', async () => {
    const user = userEvent.setup()
    const onRowClick = vi.fn()
    renderTable({
      onRowClick,
      rowActions: (row) => <button type="button">{`Aktionen ${row.name}`}</button>,
    })

    await user.click(await screen.findByText('Ben'))
    expect(onRowClick).toHaveBeenLastCalledWith(rows[1])

    await user.click(screen.getByRole('button', { name: 'Aktionen Anna' }))
    expect(onRowClick).toHaveBeenCalledTimes(1)

    within(screen.getAllByRole('row')[3]).getAllByRole('cell')[0].closest('tr')?.focus()
    await user.keyboard('{Enter}')
    expect(onRowClick).toHaveBeenLastCalledWith(rows[2])
  })

  it('renders a filter trigger only for columns with a filter and passes close to its content', async () => {
    const user = userEvent.setup()
    renderTable({
      columns: [
        {
          ...columns[0],
          filter: {
            label: 'Nach Name filtern',
            active: true,
            activeLabel: 'Nach Name filtern, aktiv: Anna',
            content: (close) => (
              <button type="button" onClick={close}>
                Schliessen
              </button>
            ),
          },
        },
        columns[1],
      ],
    })

    const trigger = await screen.findByRole('button', { name: 'Nach Name filtern, aktiv: Anna' })
    expect(screen.getAllByRole('button', { name: /filtern/ })).toHaveLength(1)
    await user.click(trigger)
    await user.click(await screen.findByRole('button', { name: 'Schliessen' }))
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Schliessen' })).not.toBeInTheDocument(),
    )
  })

  it('shows the empty message in the body and keeps the header', async () => {
    renderTable({ data: [], emptyMessage: 'Nichts gefunden' })

    expect(await screen.findByText('Nichts gefunden')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Name/ })).toBeInTheDocument()
  })

  it('shows the count above the table', async () => {
    renderTable({ count: '42 Einträge' })

    expect(await screen.findByText('42 Einträge')).toBeInTheDocument()
  })

  it('loads more below the rows and shows a retry when that failed', async () => {
    const user = userEvent.setup()
    const onLoadMore = vi.fn()
    const pagination = {
      hasNextPage: true,
      isLoadingNext: false,
      error: false,
      onLoadMore,
      loadMoreLabel: 'Weitere laden',
      errorLabel: 'Weitere konnten nicht geladen werden.',
    }
    const { rerender } = renderTable({ pagination })

    await user.click(await screen.findByRole('button', { name: 'Weitere laden' }))
    expect(onLoadMore).toHaveBeenCalledTimes(1)

    rerender(
      <ChakraProviderAthlify>
        <DataTable
          data={rows}
          columns={columns}
          getRowId={(row) => row.id}
          sort={{ column: 'name', desc: false }}
          onSortChange={() => {}}
          caption="Beträge"
          pagination={{ ...pagination, error: true }}
        />
      </ChakraProviderAthlify>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Weitere konnten nicht geladen werden.')
    expect(screen.queryByRole('button', { name: 'Weitere laden' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Erneut versuchen' }))
    expect(onLoadMore).toHaveBeenCalledTimes(2)
  })

  it('explains a header on keyboard focus of its sort button', async () => {
    const user = userEvent.setup()
    renderTable({ columns: [columns[0], { ...columns[1], description: 'Betrag in Kilogramm.' }] })
    await screen.findByRole('table')

    await user.tab()
    await user.tab()
    expect(screen.getByRole('button', { name: /Betrag/ })).toHaveFocus()
    expect(await screen.findByText('Betrag in Kilogramm.')).toBeInTheDocument()
  })

  it('makes the header of a column that cannot sort focusable when it has an explanation', async () => {
    const user = userEvent.setup()
    renderTable({
      columns: [{ ...columns[0], sortable: false, description: 'Vorname der Person.' }, columns[1]],
    })
    await screen.findByRole('table')

    await user.tab()
    expect(await screen.findByText('Vorname der Person.')).toBeInTheDocument()
  })

  it('adds no tooltip to a self-explaining header', async () => {
    const user = userEvent.setup()
    renderTable()
    await screen.findByRole('table')

    await user.tab()
    expect(screen.getByRole('button', { name: /Name/ })).toHaveFocus()
    await expectNoTooltip()
  })

  it('marks the table busy while refreshing', async () => {
    renderTable({ busy: true })

    expect(await screen.findByRole('table')).toHaveAttribute('aria-busy', 'true')
  })
})
