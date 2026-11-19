import { Box } from '@chakra-ui/react'
import { AllCommunityModule, InfiniteRowModelModule, themeQuartz } from 'ag-grid-community'
import { AG_GRID_LOCALE_DE, AG_GRID_LOCALE_EN } from '@ag-grid-community/locale'
import { AgGridProvider, AgGridReact, type AgGridReactProps } from 'ag-grid-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

const modules = [AllCommunityModule, InfiniteRowModelModule]

const theme = themeQuartz.withParams({
  accentColor: 'var(--chakra-colors-brand-solid)',
  backgroundColor: 'var(--chakra-colors-bg-panel)',
  borderColor: 'var(--chakra-colors-border)',
  fontFamily: 'var(--chakra-fonts-body)',
  fontSize: 14,
  foregroundColor: 'var(--chakra-colors-fg)',
  headerBackgroundColor: 'var(--chakra-colors-bg-subtle)',
  headerFontSize: 12,
  headerFontWeight: 600,
  headerTextColor: 'var(--chakra-colors-fg-muted)',
  headerHeight: 48,
  oddRowBackgroundColor: 'var(--chakra-colors-bg-subtle)',
  rowHeight: 48,
  rowHoverColor: 'var(--chakra-colors-bg-muted)',
  spacing: 8,
  wrapperBorderRadius: 'var(--chakra-radii-l3)',
})

type AgGridTableProps<TData> = Omit<AgGridReactProps<TData>, 'localeText' | 'theme'> & {
  ariaLabel: string
  height?: string
  minHeight?: string
  localeText?: AgGridReactProps<TData>['localeText']
}

export function AgGridTable<TData>({
  ariaLabel,
  height = 'clamp(24rem, calc(100dvh - 28rem), 48rem)',
  minHeight = '24rem',
  localeText,
  ...gridProps
}: AgGridTableProps<TData>) {
  const { i18n, t } = useTranslation()
  const translatedLocaleText = useMemo(
    () => ({
      ...(i18n.resolvedLanguage?.startsWith('de') ? AG_GRID_LOCALE_DE : AG_GRID_LOCALE_EN),
      ariaSortableColumn: t('agGrid.ariaSortableColumn'),
      ...localeText,
    }),
    [i18n.resolvedLanguage, localeText, t],
  )

  return (
    <Box
      role="region"
      aria-label={ariaLabel}
      height={height}
      minHeight={minHeight}
      minWidth="0"
      borderWidth="1px"
      borderColor="border"
      borderRadius="l3"
      overflow="hidden"
      bg="bg.panel"
    >
      <AgGridProvider modules={modules}>
        <AgGridReact<TData> {...gridProps} theme={theme} localeText={translatedLocaleText} />
      </AgGridProvider>
    </Box>
  )
}
