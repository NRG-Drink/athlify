import { colorSchemeDark, colorSchemeLight, themeQuartz } from 'ag-grid-community'
import { useMemo } from 'react'
import { useColorMode } from '../../components/ui/color-mode'

export function useAgGridTheme() {
  const { colorMode } = useColorMode()
  return useMemo(
    () =>
      themeQuartz.withPart(colorMode === 'dark' ? colorSchemeDark : colorSchemeLight).withParams({
        accentColor: 'var(--chakra-colors-brand-solid)',
        backgroundColor: 'var(--chakra-colors-bg)',
        borderColor: 'var(--chakra-colors-border)',
        chromeBackgroundColor: 'var(--chakra-colors-bg-panel)',
        foregroundColor: 'var(--chakra-colors-fg)',
        headerBackgroundColor: 'var(--chakra-colors-bg-panel)',
        fontFamily: 'var(--chakra-fonts-body)',
      }),
    [colorMode],
  )
}
