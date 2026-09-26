import { describe, expect, it } from 'vitest'
import faviconSvg from '../../../public/favicon.svg?raw'
import { brand } from '../../theme/palette'

describe('brand palette', () => {
  it('uses the three gradient stops of the favicon', () => {
    const stops = [...faviconSvg.matchAll(/stop-color="(#[0-9a-fA-F]{6})"/g)].map((m) =>
      m[1].toUpperCase(),
    )

    expect(stops).toEqual([brand[400], brand[600], brand[900]])
  })
})
