import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'
import { brand, gradientStops, lavender, spark } from './palette'
import { semanticColors, type ModePair } from './semantic'

type PairTree = { [key: string]: ModePair | PairTree }
type SemanticTree = { [key: string]: { value: Record<string, string> } | SemanticTree }

const isPair = (node: ModePair | PairTree): node is ModePair =>
  typeof (node as ModePair).base === 'string'

// Turns { bg: { panel: { base, _dark } } } into Chakra's { bg: { panel: { value: { base, _dark } } } }.
function toSemanticTokens(tree: PairTree): SemanticTree {
  return Object.fromEntries(
    Object.entries(tree).map(([key, node]) => [
      key,
      isPair(node) ? { value: { base: node.base, _dark: node._dark } } : toSemanticTokens(node),
    ]),
  )
}

const toScale = (scale: Record<string | number, string>) =>
  Object.fromEntries(Object.entries(scale).map(([step, value]) => [step, { value }]))

const linear = (angle: string, stops: readonly string[]) =>
  `linear-gradient(${angle}, ${stops.join(', ')})`

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        brand: toScale(brand),
        spark: toScale(spark),
        lavender: toScale(lavender),
      },
      gradients: {
        volt: { value: linear('180deg', gradientStops.volt) },
        voltAcross: { value: linear('90deg', gradientStops.volt) },
      },
      fonts: {
        heading: { value: "'Barlow Semi Condensed', 'Inter Variable', system-ui, sans-serif" },
        body: { value: "'Inter Variable', system-ui, sans-serif" },
      },
    },
    semanticTokens: {
      colors: toSemanticTokens(semanticColors as unknown as PairTree),
      gradients: {
        // Faint cyan "headlight" on the canvas, dark mode only.
        headlight: {
          value: {
            base: 'none',
            _dark: 'radial-gradient(40rem circle at 0 0, rgba(0, 220, 220, 0.06), transparent 70%)',
          },
        },
        indicator: {
          value: {
            base: linear('90deg', gradientStops.indicator.base),
            _dark: linear('90deg', gradientStops.indicator._dark),
          },
        },
        indicatorDown: {
          value: {
            base: linear('180deg', gradientStops.indicator.base),
            _dark: linear('180deg', gradientStops.indicator._dark),
          },
        },
      },
      radii: {
        l1: { value: '0.125rem' },
        l2: { value: '0.5rem' },
        l3: { value: '0.75rem' },
      },
    },
    textStyles: {
      kicker: {
        value: {
          fontSize: '0.75rem',
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'brand.fg',
        },
      },
      kpi: {
        value: {
          fontFamily: 'heading',
          fontStyle: 'italic',
          fontWeight: '600',
          fontSize: { base: '2rem', sm: '2.5rem' },
          lineHeight: '1',
          fontVariantNumeric: 'tabular-nums',
        },
      },
    },
    recipes: {
      button: {
        base: { fontWeight: 'semibold' },
      },
    },
  },
})

export const system = createSystem(defaultConfig, config)
