import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Provider } from '../../components/ui/provider'
import TableBodyStats from '../../components/TableBodyStats'

const entry = (id: number, date: string, weight: number) => ({
  dbId: id,
  uid: `uid-${id}`,
  date,
  weight,
  bodyFatPercentage: 20,
  musclePercentage: 40,
  waterPercentage: 55,
  boneMass: 3.2,
})

function renderTable(bodyStats: ReturnType<typeof entry>[]) {
  render(
    <Provider>
      <TableBodyStats bodyStats={bodyStats} />
    </Provider>,
  )
}

const bodyRows = () => screen.getAllByRole('row').slice(1)

describe('TableBodyStats', () => {
  it('shows all measurement columns and formatted values', async () => {
    renderTable([entry(1, '2026-01-01T00:00:00Z', 80.25)])

    for (const name of ['Datum', 'Gewicht', 'Fett', 'Muskeln', 'Wasser', 'Knochen']) {
      expect(
        await screen.findByRole('columnheader', { name: new RegExp(name) }),
      ).toBeInTheDocument()
    }
    expect(screen.getByText('80.3')).toBeInTheDocument()
    expect(screen.getByText('3.2')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Gewicht/ })).toHaveTextContent('[kg]')
    expect(screen.getByRole('columnheader', { name: /Fett/ })).toHaveTextContent('[%]')
  })

  it('sorts by date descending, then by weight when the header is clicked', async () => {
    renderTable([
      entry(1, '2026-01-01T00:00:00Z', 90),
      entry(2, '2026-02-01T00:00:00Z', 70),
      entry(3, '2026-03-01T00:00:00Z', 80),
    ])

    await screen.findByRole('columnheader', { name: /Gewicht/ })
    expect(within(bodyRows()[0]).getByText('80.0')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('columnheader', { name: /Gewicht/ }))
    const weights = () => bodyRows().map((row) => within(row).getAllByRole('cell')[1].textContent)
    expect(weights()).toEqual(['90.0', '80.0', '70.0'])

    await userEvent.click(screen.getByRole('columnheader', { name: /Gewicht/ }))
    expect(weights()).toEqual(['70.0', '80.0', '90.0'])
  })

  it('shows an empty state without entries', async () => {
    renderTable([])
    expect(await screen.findByText('Noch keine Einträge vorhanden.')).toBeInTheDocument()
  })

  it('offers a delete button per row that passes the entry to onDelete', async () => {
    const onDelete = vi.fn()
    const rows = [entry(1, '2026-01-01T00:00:00Z', 80), entry(2, '2026-01-02T00:00:00Z', 81)]
    render(
      <Provider>
        <TableBodyStats bodyStats={rows} onDelete={onDelete} />
      </Provider>,
    )

    const buttons = await screen.findAllByRole('button', { name: 'Eintrag löschen' })
    expect(buttons).toHaveLength(2)
    // newest first: the first row is entry 2
    await userEvent.click(buttons[0])
    expect(onDelete).toHaveBeenCalledWith(rows[1])
  })
})
