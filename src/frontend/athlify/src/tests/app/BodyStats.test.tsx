import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RelayEnvironmentProvider } from 'react-relay'
import { Environment, Network, RecordSource, Store } from 'relay-runtime'
import { describe, expect, it, vi } from 'vitest'
import BodyStats from '../../app/BodyStats'
import { Provider } from '../../components/ui/provider'

const bodyStats = [
  {
    uid: 'uid-1',
    date: '2026-01-01T00:00:00Z',
    weight: 80.25,
    bodyFatPercentage: 20,
    musclePercentage: 40,
    waterPercentage: 55,
    boneMass: 3.2,
  },
]

describe('BodyStats', () => {
  it('loads the body stats once and shows them in the table', async () => {
    const fetchFn = vi.fn(() => ({ data: { bodyStats } }))
    const environment = new Environment({
      network: Network.create(fetchFn),
      store: new Store(new RecordSource()),
    })

    render(
      <RelayEnvironmentProvider environment={environment}>
        <Provider>
          <BodyStats />
        </Provider>
      </RelayEnvironmentProvider>,
    )

    expect(await screen.findByText('80.3 kg')).toBeInTheDocument()
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('opens the add-entry dialog from the page action', async () => {
    const environment = new Environment({
      network: Network.create(() => ({ data: { bodyStats } })),
      store: new Store(new RecordSource()),
    })

    render(
      <RelayEnvironmentProvider environment={environment}>
        <Provider>
          <BodyStats />
        </Provider>
      </RelayEnvironmentProvider>,
    )

    await userEvent.click(await screen.findByRole('button', { name: 'Eintrag hinzufügen' }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })
})
