import { colorSchemeDarkBlue, colorSchemeLight, themeQuartz, type Theme } from 'ag-grid-community'
import { semanticColors as c, type ModePair } from '../../theme/semantic'
import type { ColorMode } from '../ui/color-mode'

const pick = (pair: ModePair, mode: ColorMode) => (mode === 'dark' ? pair._dark : pair.base)

const gridParams = (mode: ColorMode) => ({
  backgroundColor: pick(c.bg.panel, mode),
  chromeBackgroundColor: pick(c.bg.panel, mode),
  foregroundColor: pick(c.fg.DEFAULT, mode),
  headerTextColor: pick(c.fg.muted, mode),
  borderColor: pick(c.border.DEFAULT, mode),
  rowHoverColor: pick(c.bg.muted, mode),
  selectedRowBackgroundColor: pick(c.brand.subtle, mode),
  accentColor: pick(c.brand.solid, mode),
  fontFamily: "'Inter Variable', system-ui, sans-serif",
  headerFontWeight: 600,
  wrapperBorderRadius: '0.75rem',
})

const themes: Record<ColorMode, Theme> = {
  light: themeQuartz.withPart(colorSchemeLight).withParams(gridParams('light')),
  dark: themeQuartz.withPart(colorSchemeDarkBlue).withParams(gridParams('dark')),
}

export function gridThemeFor(mode: ColorMode): Theme {
  return themes[mode]
}
