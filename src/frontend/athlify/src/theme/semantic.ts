import { brand, day, lavender, night, spark } from './palette'

// The only place that decides what a color means. Each token has a light
// (`base`) and a dark (`_dark`) value. Rule: brand cyan (300–500) is never
// used as text in light mode, because it fails contrast on light surfaces.

export interface ModePair {
  base: string
  _dark: string
}

const pair = (base: string, dark: string): ModePair => ({ base, _dark: dark })

export const semanticColors = {
  bg: {
    DEFAULT: pair(day.canvas, night.canvas),
    panel: pair(day.panel, night.panel),
    subtle: pair(day.raised, night.panel),
    muted: pair(day.muted, night.raised),
  },
  fg: {
    DEFAULT: pair(day.fg, night.fg),
    muted: pair(day.fgMuted, night.fgMuted),
  },
  border: {
    DEFAULT: pair(day.border, night.border),
  },
  brand: {
    solid: pair(brand[800], brand[400]),
    contrast: pair('#FFFFFF', night.canvas),
    fg: pair(brand[900], brand[300]),
    subtle: pair(brand[50], 'rgba(0, 220, 220, 0.12)'),
    muted: pair(brand[100], 'rgba(0, 220, 220, 0.20)'),
    emphasized: pair(brand[200], 'rgba(0, 220, 220, 0.30)'),
    focusRing: pair(brand[700], brand[400]),
  },
  spark: {
    fg: pair(spark[700], spark[400]),
    solid: pair(spark[600], spark[400]),
  },
  chart: {
    primary: pair(brand[600], brand[400]),
    secondary: pair(brand[900], '#6E8BFF'),
    effort: pair(spark[600], spark[400]),
    form: pair(lavender[600], lavender[400]),
  },
} as const
