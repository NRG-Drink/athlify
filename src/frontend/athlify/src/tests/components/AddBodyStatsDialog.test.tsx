import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { RelayEnvironmentProvider } from 'react-relay'
import { Environment, Network, RecordSource, Store } from 'relay-runtime'
import { describe, expect, it, vi } from 'vitest'
import { AddBodyStatsDialog } from '../../components/AddBodyStatsDialog'
import { Provider } from '../../components/ui/provider'

type Fetch = Parameters<typeof Network.create>[0]

function setup(fetchFn: Fetch) {
  const onCreated = vi.fn()
  const environment = new Environment({
    network: Network.create(fetchFn),
    store: new Store(new RecordSource()),
  })
  function Harness() {
    const [open, setOpen] = useState(true)
    return <AddBodyStatsDialog open={open} onOpenChange={setOpen} onCreated={onCreated} />
  }
  render(
    <RelayEnvironmentProvider environment={environment}>
      <Provider>
        <Harness />
      </Provider>
    </RelayEnvironmentProvider>,
  )
  return { onCreated, user: userEvent.setup() }
}

async function fillForm(user: ReturnType<typeof userEvent.setup>) {
  const dialog = await screen.findByRole('dialog')
  const values: Record<string, string> = {
    Datum: '2026-02-03',
    'Gewicht (kg)': '80.5',
    'Körperfett (%)': '20',
    'Muskeln (%)': '40',
    'Wasser (%)': '55',
    'Knochenmasse (kg)': '3.2',
  }
  for (const [label, value] of Object.entries(values)) {
    const input = within(dialog).getByLabelText(new RegExp(`^${label.replace(/[()]/g, '\\$&')}`))
    await user.clear(input)
    await user.type(input, value)
  }
  return dialog
}

describe('AddBodyStatsDialog', () => {
  it('sends the addBodyStats mutation and closes on success', async () => {
    const fetchFn = vi.fn(() => ({
      data: {
        addBodyStats: {
          uid: 'new',
          date: '2026-02-03T00:00:00Z',
          weight: 80.5,
          bodyFatPercentage: 20,
          musclePercentage: 40,
          waterPercentage: 55,
          boneMass: 3.2,
        },
      },
    }))
    const { onCreated, user } = setup(fetchFn as unknown as Fetch)
    const dialog = await fillForm(user)

    await user.click(within(dialog).getByRole('button', { name: 'Speichern' }))

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1))
    const [, variables] = fetchFn.mock.calls[0] as unknown as [unknown, unknown]
    expect(variables).toEqual({
      bodyStats: {
        date: '2026-02-03T00:00:00.000Z',
        weight: 80.5,
        bodyFatPercentage: 20,
        musclePercentage: 40,
        waterPercentage: 55,
        boneMass: 3.2,
        comments: [],
      },
    })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('shows validation errors and does not call the backend for an empty form', async () => {
    const fetchFn = vi.fn(() => ({ data: {} }))
    const { onCreated, user } = setup(fetchFn as unknown as Fetch)
    const dialog = await screen.findByRole('dialog')

    await user.click(within(dialog).getByRole('button', { name: 'Speichern' }))

    expect(await within(dialog).findAllByText('Pflichtfeld.')).toHaveLength(5)
    expect(fetchFn).not.toHaveBeenCalled()
    expect(onCreated).not.toHaveBeenCalled()
  })

  it('keeps the dialog open when the backend returns GraphQL errors', async () => {
    const fetchFn = vi.fn(() => ({ data: null, errors: [{ message: 'boom' }] }))
    const { onCreated, user } = setup(fetchFn as unknown as Fetch)
    const dialog = await fillForm(user)

    await user.click(within(dialog).getByRole('button', { name: 'Speichern' }))

    await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(1))
    expect(onCreated).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
