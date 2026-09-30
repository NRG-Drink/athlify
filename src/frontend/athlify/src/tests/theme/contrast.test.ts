import { describe, expect, it } from 'vitest'
import { brand, gradientStops } from '../../theme/palette'
import { semanticColors as c, type ModePair } from '../../theme/semantic'
import { contrastRatio } from '../utils/contrast'

const modes = ['base', '_dark'] as const

const surfaces = { bg: c.bg.DEFAULT, 'bg.panel': c.bg.panel }

function expectContrast(fg: ModePair, bg: ModePair, min: number) {
  for (const mode of modes) {
    expect(contrastRatio(fg[mode], bg[mode]), mode).toBeGreaterThanOrEqual(min)
  }
}

describe('theme contrast', () => {
  const textTokens = {
    fg: c.fg.DEFAULT,
    'fg.muted': c.fg.muted,
    'brand.fg': c.brand.fg,
    'spark.fg': c.spark.fg,
  }

  for (const [textName, text] of Object.entries(textTokens)) {
    for (const [surfaceName, surface] of Object.entries(surfaces)) {
      it(`${textName} on ${surfaceName} reaches 4.5:1 in both modes`, () => {
        expectContrast(text, surface, 4.5)
      })
    }
  }

  it('brand.contrast on brand.solid reaches 4.5:1 in both modes', () => {
    expectContrast(c.brand.contrast, c.brand.solid, 4.5)
  })

  const graphicTokens = { ...c.chart, 'brand.focusRing': c.brand.focusRing }
  for (const [name, token] of Object.entries(graphicTokens)) {
    it(`${name} on bg.panel reaches 3:1 in both modes`, () => {
      expectContrast(token, c.bg.panel, 3)
    })
  }

  it('every stop of the nav indicator gradient reaches 3:1 on bg.panel', () => {
    for (const mode of modes) {
      for (const stop of gradientStops.indicator[mode]) {
        expect(contrastRatio(stop, c.bg.panel[mode]), `${mode} ${stop}`).toBeGreaterThanOrEqual(3)
      }
    }
  })

  it('never uses brand cyan as a text color in light mode', () => {
    const cyan: string[] = [brand[300], brand[400], brand[500]]
    const lightTextValues = [c.fg.DEFAULT, c.fg.muted, c.brand.fg, c.spark.fg].map((t) => t.base)
    for (const value of lightTextValues) {
      expect(cyan).not.toContain(value)
    }
  })
})
