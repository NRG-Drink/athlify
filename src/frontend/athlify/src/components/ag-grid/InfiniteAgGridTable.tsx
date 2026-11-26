import type { ColDef } from 'ag-grid-community'
import type { AgGridReactProps } from 'ag-grid-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { AgGridTable } from './AgGridTable'

const filterOptionKeys = [
  'equals',
  'notEqual',
  'contains',
  'notContains',
  'startsWith',
  'endsWith',
  'blank',
  'notBlank',
  'lessThan',
  'greaterThan',
  'inRange',
  'before',
  'after',
] as const

const defaultColDef: ColDef = { resizable: true, sortable: true, filter: true }

type InfiniteAgGridTableProps<TData> = Omit<AgGridReactProps<TData>, 'rowModelType'> & {
  ariaLabel: string
  /** Translation namespace holding `gridFilter.options.*`, for example `events`. */
  localeNamespace: string
  height?: string
}

/** A grid with the server-paged row model, the shared paging settings and translated filter labels. */
export function InfiniteAgGridTable<TData>({
  localeNamespace,
  height = 'clamp(24rem, calc(100dvh - 22rem), 48rem)',
  localeText,
  ...props
}: InfiniteAgGridTableProps<TData>) {
  const { t, i18n } = useTranslation()

  const mergedLocaleText = useMemo(
    () => ({
      ...Object.fromEntries(
        filterOptionKeys.map((key) => [key, t(`${localeNamespace}.gridFilter.options.${key}`)]),
      ),
      ...localeText,
    }),
    [localeNamespace, localeText, t],
  )

  return (
    <AgGridTable<TData>
      key={i18n.resolvedLanguage}
      height={height}
      rowModelType="infinite"
      cacheBlockSize={20}
      maxBlocksInCache={5}
      rowBuffer={10}
      suppressRowVirtualisation={false}
      defaultColDef={defaultColDef as ColDef<TData>}
      localeText={mergedLocaleText}
      {...props}
    />
  )
}
