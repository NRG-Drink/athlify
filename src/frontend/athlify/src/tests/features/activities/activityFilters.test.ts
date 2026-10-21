import { describe, expect, it, vi } from 'vitest'
import {
  activityFiltersToWhere,
  applyActivityFilters,
  parseActivityFilters,
} from '../../../features/activities/activityFilters'

describe('activity filters', () => {
  it('parses valid URL values and ignores invalid types', () => {
    expect(
      parseActivityFilters(new URLSearchParams('type=INDOOR&vehicle=vehicle-1&tag=tag-1')),
    ).toEqual({
      type: 'INDOOR',
      vehicleId: 'vehicle-1',
      tagId: 'tag-1',
    })
    expect(parseActivityFilters(new URLSearchParams('type=bad&wind=bad'))).toEqual({})
  })

  it('maps filters to the existing GraphQL input', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-17T10:00:00Z'))
    expect(
      activityFiltersToWhere({
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
      applyActivityFilters(new URLSearchParams('view=table&type=ROAD&wind=CALM'), {
        type: 'INDOOR',
      }).toString(),
    ).toBe('view=table&type=INDOOR')
  })
})
