import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RelayEnvironmentProvider } from 'react-relay'
import { Environment, Network, RecordSource, Store } from 'relay-runtime'
import { describe, expect, it } from 'vitest'
import { Provider } from '../../components/ui/provider'
import TableBodyStats from '../../components/TableBodyStats'

const entry = (id: number, date: string, weight: number) => ({
  uid: `uid-${id}`,
  date,
  weight,
  bodyFatPercentage: 20,
  musclePercentage: 40,
  waterPercentage: 55,
  boneMass: 3.2,
})

function renderTable(bodyStats: ReturnType<typeof entry>[]) {
  const environment = new Environment({
    network: Network.create(() => ({ data: { bodyStats } })),
    store: new Store(new RecordSource()),
  })
  render(
    <RelayEnvironmentProvider environment={environment}>
      <Provider>
        <TableBodyStats />
      </Provider>
    </RelayEnvironmentProvider>,
  )
}

const bodyRows = () => screen.getAllByRole('row').slice(1)

describe('TableBodyStats', () => {
  it('shows all measurement columns and formatted values', async () => {
    renderTable([entry(1, '2026-01-01T00:00:00Z', 80.25)])

    for (const name of ['Date', 'Weight', 'Fat', 'Muscle', 'Water', 'Bone']) {
      expect(
        await screen.findByRole('columnheader', { name: new RegExp(name) }),
      ).toBeInTheDocument()
    }
    expect(screen.getByText('80.3 kg')).toBeInTheDocument()
    expect(screen.getByText('3.2 kg')).toBeInTheDocument()
  })

  it('sorts by date descending, then by weight when the header is clicked', async () => {
    renderTable([
      entry(1, '2026-01-01T00:00:00Z', 90),
      entry(2, '2026-02-01T00:00:00Z', 70),
      entry(3, '2026-03-01T00:00:00Z', 80),
    ])

    await screen.findByRole('columnheader', { name: /Weight/ })
    expect(within(bodyRows()[0]).getByText('80.0 kg')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('columnheader', { name: /Weight/ }))
    const weights = () => bodyRows().map((row) => within(row).getAllByRole('cell')[1].textContent)
    expect(weights()).toEqual(['90.0 kg', '80.0 kg', '70.0 kg'])

    await userEvent.click(screen.getByRole('columnheader', { name: /Weight/ }))
    expect(weights()).toEqual(['70.0 kg', '80.0 kg', '90.0 kg'])
  })

  it('shows an empty state without entries', async () => {
    renderTable([])
    expect(await screen.findByText('No entries yet.')).toBeInTheDocument()
  })
})
