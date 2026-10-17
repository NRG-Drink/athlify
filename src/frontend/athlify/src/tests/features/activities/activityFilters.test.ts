import { describe, expect, it, vi } from 'vitest'
import {
  activityFiltersToWhere,
  applyActivityFilters,
  parseActivityFilters,
} from '../../../features/activities/activityFilters'

describe('activity filters', () => {
  it('parses valid URL values and ignores invalid types', () => {
    expect(
      parseActivityFilters(
        new URLSearchParams('period=1y&type=INDOOR&vehicle=vehicle-1&tag=tag-1'),
      ),
    ).toEqual({
      period: '1y',
      type: 'INDOOR',
      vehicleId: 'vehicle-1',
      tagId: 'tag-1',
    })
    expect(parseActivityFilters(new URLSearchParams('period=bad&type=bad')).type).toBeUndefined()
    expect(parseActivityFilters(new URLSearchParams('period=bad')).period).toBe('90d')
  })

  it('maps filters to the existing GraphQL input', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-17T10:00:00Z'))
    expect(
      activityFiltersToWhere({
        period: 'all',
        type: 'ROAD',
        vehicleId: 'vehicle-1',
        tagId: 'tag-1',
      }),
    ).toEqual({
      type: { eq: 'ROAD' },
      vehicle: { id: { eq: 'vehicle-1' } },
      tags: { some: { id: { eq: 'tag-1' } } },
    })
    vi.useRealTimers()
  })

  it('replaces only activity parameters and preserves unrelated parameters', () => {
    expect(
      applyActivityFilters(
        new URLSearchParams('view=table&period=30d&type=ROAD'),
        { period: '1y', type: 'INDOOR' },
      ).toString(),
    ).toBe('view=table&period=1y&type=INDOOR')
  })
})
