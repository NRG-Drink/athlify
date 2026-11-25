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
}

export function AgGridTable<TData>({ ariaLabel, height, ...props }: AgGridTableProps<TData>) {
  const { colorMode } = useColorMode()
  return (
    <AgGridProvider modules={gridModules}>
      <Box height={height} aria-label={ariaLabel}>
        <AgGridReact<TData> {...props} theme={gridThemeFor(colorMode ?? 'light')} />
      </Box>
    </AgGridProvider>
  )
}
