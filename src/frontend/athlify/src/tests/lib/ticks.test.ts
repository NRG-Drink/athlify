import { describe, expect, it } from 'vitest'
import { niceScale, timeTicks } from '../../lib/ticks'

describe('niceScale', () => {
  it('rounds outwards to readable steps', () => {
    const { domain, ticks } = niceScale(70.5, 73.1, 4)

    expect(domain).toEqual([70, 74])
    expect(ticks).toEqual([70, 71, 72, 73, 74])
  })

  it('uses half and quarter steps for narrow ranges', () => {
    expect(niceScale(70.4, 71.1, 4).ticks).toEqual([70.25, 70.5, 70.75, 71, 71.25])
  })

  it('still gives an axis for a single value', () => {
    const { domain, ticks } = niceScale(70, 70, 4)

    expect(domain[0]).toBeLessThanOrEqual(70)
    expect(domain[1]).toBeGreaterThan(70)
    expect(ticks.length).toBeGreaterThanOrEqual(2)
  })
})

describe('timeTicks', () => {
  it('uses weekly ticks for a month', () => {
    const ticks = timeTicks(new Date(2026, 8, 3), new Date(2026, 9, 3), 6)

    expect(ticks).toHaveLength(5)
    expect(new Date(ticks[1]).getDate()).toBe(10)
  })

  it('uses month starts for a year and thins them out', () => {
    const ticks = timeTicks(new Date(2025, 9, 3), new Date(2026, 9, 3), 4)

    expect(ticks.length).toBeLessThanOrEqual(4)
    expect(ticks.every((tick) => new Date(tick).getDate() === 1)).toBe(true)
  })

  it('uses daily ticks for a few days', () => {
    expect(timeTicks(new Date(2026, 9, 1), new Date(2026, 9, 3), 6)).toHaveLength(3)
  })
})
