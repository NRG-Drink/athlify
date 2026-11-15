import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ChakraProviderAthlify } from '../../../components/ui/ChakraProviderAthlify'
import { MyEventsTypeFilter } from '../../../features/events/MyEventsTypeFilter'

vi.mock('ag-grid-react', () => ({ useGridFilter: vi.fn() }))

type TypeFilterModel = {
  values: Array<'CRASH' | 'INJURY' | 'ILLNESS' | 'REPAIR' | 'BREAK' | 'GOAL' | 'OTHER'>
}

describe('MyEventsTypeFilter', () => {
  it('lets users select values and return to all values', async () => {
    const user = userEvent.setup()
    let activeModel: TypeFilterModel | null = null

    function FilterHarness() {
      const [model, setModel] = useState<TypeFilterModel | null>(null)
      activeModel = model
      return <MyEventsTypeFilter model={model} onModelChange={setModel} />
    }

    render(
      <ChakraProviderAthlify>
        <FilterHarness />
      </ChakraProviderAthlify>,
    )

    const selectAll = screen.getByRole('checkbox', { name: 'Alle auswählen' })
    const repair = screen.getByRole('checkbox', { name: 'Reparatur' })

    expect(selectAll).toBeChecked()
    await user.click(selectAll)
    expect(selectAll).not.toBeChecked()
    expect(activeModel).toEqual({ values: [] })

    await user.click(repair)
    expect(repair).toBeChecked()
    expect(activeModel).toEqual({ values: ['REPAIR'] })

    await user.click(selectAll)
    expect(selectAll).toBeChecked()
    expect(repair).toBeChecked()
    expect(activeModel).toBeNull()
  })
})
