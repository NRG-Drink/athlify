import { render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AgGridTable } from '../../components/ag-grid/AgGridTable'
import { gridThemeFor } from '../../components/ag-grid/gridTheme'
import { ChakraProviderAthlify } from '../../components/ui/ChakraProviderAthlify'
import { mockGridViewport } from '../utils/gridViewport'
import { seenThemes } from '../utils/gridThemeRecorder'

vi.mock('../../components/ui/color-mode', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../components/ui/color-mode')>()
  return {
    ...actual,
    useColorMode: () => ({ colorMode: undefined, setColorMode: () => {}, toggleColorMode: () => {} }),
  }
})

vi.mock('ag-grid-react', async (importOriginal) => {
  const { recordGridThemes } = await import('../utils/gridThemeRecorder')
  return recordGridThemes(await importOriginal<typeof import('ag-grid-react')>())
})

beforeEach(() => {
  mockGridViewport()
  seenThemes.length = 0
})

describe('AgGridTable before the color mode resolves', () => {
  it('falls back to the light grid theme', async () => {
    render(
      <ChakraProviderAthlify>
        <AgGridTable<{ id: string }>
          ariaLabel="Probe"
          height="10rem"
          rowData={[{ id: '1' }]}
          columnDefs={[{ field: 'id' }]}
          getRowId={(params) => params.data.id}
        />
      </ChakraProviderAthlify>,
    )
    await waitFor(() => expect(seenThemes.at(-1)).toBe(gridThemeFor('light')))
  })
})
