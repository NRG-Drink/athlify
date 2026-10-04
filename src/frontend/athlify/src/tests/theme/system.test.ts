import { describe, expect, it } from 'vitest'
import { system } from '../../theme'
import { brand } from '../../theme/palette'

describe('theme system', () => {
  it('resolves the brand scale', () => {
    expect(system.token('colors.brand.400')).toBe(brand[400])
    expect(system.token('colors.brand.900')).toBe(brand[900])
  })

  it('keeps Chakra default semantic tokens that the theme does not override', () => {
    expect(system.token('colors.bg.emphasized')).toBeDefined()
    expect(system.token('colors.fg.inverted')).toBeDefined()
  })

  it('defines the brand color palette used by colorPalette="brand"', () => {
    for (const key of ['solid', 'contrast', 'fg', 'subtle', 'muted', 'emphasized', 'focusRing']) {
      expect(system.token(`colors.brand.${key}`)).toBeDefined()
    }
  })

  it('builds the volt gradient from all three favicon stops', () => {
    const volt = system.token('gradients.volt')
    for (const stop of [brand[400], brand[600], brand[900]]) {
      expect(volt).toContain(stop)
    }
  })
})
