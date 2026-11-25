import { render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AgGridTable } from '../../components/ag-grid/AgGridTable'
import { gridThemeFor } from '../../components/ag-grid/gridTheme'
import { ChakraProviderAthlify } from '../../components/ui/ChakraProviderAthlify'
import { useColorMode } from '../../components/ui/color-mode'
import { mockGridViewport } from '../utils/gridViewport'
import { seenThemes } from '../utils/gridThemeRecorder'

vi.mock('ag-grid-react', async (importOriginal) => {
  const { recordGridThemes } = await import('../utils/gridThemeRecorder')
  return recordGridThemes(await importOriginal<typeof import('ag-grid-react')>())
})

beforeEach(() => {
  mockGridViewport()
  seenThemes.length = 0
})

afterEach(() => localStorage.clear())

function renderGrid(mode: 'light' | 'dark') {
  localStorage.setItem('theme', mode)
  return render(
    <ChakraProviderAthlify defaultTheme="system" enableSystem storageKey="theme">
      <AgGridTable<{ id: string; name: string }>
        ariaLabel="Probe"
        height="10rem"
        rowData={[{ id: '1', name: 'Anna' }]}
        columnDefs={[{ field: 'name' }]}
        getRowId={(params) => params.data.id}
      />
    </ChakraProviderAthlify>,
  )
}

function ToggleColorMode() {
  const { toggleColorMode } = useColorMode()
  return <button onClick={toggleColorMode}>Umschalten</button>
}

describe('AgGridTable theme', () => {
  it('switches to the other grid theme in place when the color mode changes', async () => {
    const user = userEvent.setup()
    const { findByText, getByRole } = render(
      <ChakraProviderAthlify defaultTheme="system" enableSystem storageKey="theme">
        <ToggleColorMode />
        <AgGridTable<{ id: string; name: string }>
          ariaLabel="Probe"
          height="10rem"
          rowData={[{ id: '1', name: 'Anna' }]}
          columnDefs={[{ field: 'name' }]}
          getRowId={(params) => params.data.id}
        />
      </ChakraProviderAthlify>,
    )
    await waitFor(() => expect(seenThemes.at(-1)).toBe(gridThemeFor('light')))

    await user.click(getByRole('button', { name: 'Umschalten' }))

    await waitFor(() => expect(seenThemes.at(-1)).toBe(gridThemeFor('dark')))
    expect(await findByText('Anna')).toBeInTheDocument()
  })

  it('passes the light grid theme in light mode and renders the rows', async () => {
    const { findByText } = renderGrid('light')
    await waitFor(() => expect(seenThemes.at(-1)).toBe(gridThemeFor('light')))
    expect(await findByText('Anna')).toBeInTheDocument()
  })

  it('passes the dark grid theme in dark mode', async () => {
    renderGrid('dark')
    await waitFor(() => expect(seenThemes.at(-1)).toBe(gridThemeFor('dark')))
  })
})

describe('gridThemeFor', () => {
  it('returns a different theme for each mode', () => {
    expect(gridThemeFor('light')).not.toBe(gridThemeFor('dark'))
  })

  it('reuses one theme object per mode', () => {
    expect(gridThemeFor('dark')).toBe(gridThemeFor('dark'))
  })
})
