import { Box } from '@chakra-ui/react'
import { AllCommunityModule, InfiniteRowModelModule, ModuleRegistry } from 'ag-grid-community'
import { AgGridProvider, AgGridReact, type AgGridReactProps } from 'ag-grid-react'
import { useColorMode } from '../ui/color-mode'
import { gridThemeFor } from './gridTheme'

const gridModules = [AllCommunityModule, InfiniteRowModelModule]

ModuleRegistry.registerModules(gridModules)

type AgGridTableProps<TData> = AgGridReactProps<TData> & {
  ariaLabel: string
  height: string
  busy?: boolean
}

export function AgGridTable<TData>({ ariaLabel, height, busy, ...props }: AgGridTableProps<TData>) {
  const { colorMode } = useColorMode()
  return (
    <AgGridProvider modules={gridModules}>
      <Box
        role="region"
        height={height}
        aria-label={ariaLabel}
        aria-busy={busy || undefined}
        opacity={busy ? 0.6 : undefined}
        transition="opacity 0.15s"
      >
        <AgGridReact<TData> {...props} theme={gridThemeFor(colorMode ?? 'light')} />
      </Box>
    </AgGridProvider>
  )
}
