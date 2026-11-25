import { Box } from '@chakra-ui/react'
import {
  AllCommunityModule,
  InfiniteRowModelModule,
  ModuleRegistry,
  colorSchemeDarkBlue,
  themeQuartz,
} from 'ag-grid-community'
import { AgGridProvider, AgGridReact, type AgGridReactProps } from 'ag-grid-react'

ModuleRegistry.registerModules([AllCommunityModule, InfiniteRowModelModule])

type AgGridTableProps<TData> = AgGridReactProps<TData> & {
  ariaLabel: string
  height: string
}

export function AgGridTable<TData>({ ariaLabel, height, ...props }: AgGridTableProps<TData>) {
  return (
    <AgGridProvider modules={[AllCommunityModule, InfiniteRowModelModule]}>
      <Box height={height} aria-label={ariaLabel}>
        <AgGridReact<TData>
          {...props}
          theme={themeQuartz.withPart(colorSchemeDarkBlue)}
        />
      </Box>
    </AgGridProvider>
  )
}
