// Raw color values of the "Night Ride" theme. The brand scale is derived
// from the favicon gradient (public/favicon.svg). Views never use these
// values directly; they use the semantic tokens from semantic.ts.

export const brand = {
  50: '#E6FCFC',
  100: '#C2F5F7',
  200: '#8AEBF0',
  300: '#4FDDE8',
  400: '#00DCDC', // favicon top
  500: '#00B4D8',
  600: '#0093D0', // favicon middle
  700: '#0070C4',
  800: '#0050C0',
  900: '#0026C2', // favicon bottom
  950: '#0A1A7A',
} as const

export const night = {
  canvas: '#0A0F24',
  panel: '#111833',
  raised: '#18214A',
  fg: '#E8ECF8',
  fgMuted: '#9AA3C7',
  border: 'rgba(232, 236, 248, 0.10)',
} as const

export const day = {
  canvas: '#F5F8FC',
  panel: '#FFFFFF',
  raised: '#EEF3FA',
  muted: '#E4EAF4',
  fg: '#0B1330',
  fgMuted: '#4A5578',
  border: '#DCE3F0',
} as const

export const spark = {
  400: '#FF8A3D',
  500: '#FF7A1A',
  600: '#E0600A',
  700: '#C2410C',
} as const

export const lavender = {
  400: '#9184D9',
  600: '#7972A9',
} as const

// `volt` is the full logo gradient (brand mark only). The nav indicator uses
// the half of it that stays visible on each mode's surface: cyan fails on
// light surfaces, cobalt fails on navy.
export const gradientStops = {
  volt: [brand[400], brand[600], brand[900]],
  indicator: {
    base: [brand[600], brand[900]],
    _dark: [brand[400], brand[600]],
  },
} as const
