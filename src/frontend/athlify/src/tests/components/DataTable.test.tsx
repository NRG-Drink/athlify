import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DataTable, type DataTableColumn } from '../../components/DataTable'
import { Provider } from '../../components/ui/provider'

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
    <Provider>
      <DataTable
        data={rows}
        columns={columns}
        getRowId={(row) => row.id}
        initialSort={{ id: 'name', desc: false }}
        caption="Beträge"
        {...props}
      />
    </Provider>,
  )
}

const names = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[0].textContent)

describe('DataTable', () => {
  it('starts in the initial order and names the table', async () => {
    renderTable()

    expect(await screen.findByRole('table', { name: 'Beträge' })).toBeInTheDocument()
    expect(names()).toEqual(['Anna', 'Ben', 'Cleo'])
    expect(screen.getByRole('columnheader', { name: /Name/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    )
    expect(screen.getByRole('columnheader', { name: /Betrag/ })).toHaveTextContent('kg')
  })

  it('sorts when a header button is clicked', async () => {
    const user = userEvent.setup()
    renderTable()

    await user.click(await screen.findByRole('button', { name: /Betrag/ }))

    // Numbers sort from high to low first.
    expect(names()).toEqual(['Ben', 'Anna', 'Cleo'])
    expect(screen.getByRole('columnheader', { name: /Betrag/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    )

    await user.click(screen.getByRole('button', { name: /Betrag/ }))

    expect(names()).toEqual(['Cleo', 'Anna', 'Ben'])
    expect(screen.getByRole('columnheader', { name: /Betrag/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    )
  })

  it('sorts with the keyboard', async () => {
    const user = userEvent.setup()
    renderTable()
    await screen.findByRole('table')

    await user.tab()
    expect(screen.getByRole('button', { name: /Name/ })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: /Betrag/ })).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(names()).toEqual(['Ben', 'Anna', 'Cleo'])
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
})
