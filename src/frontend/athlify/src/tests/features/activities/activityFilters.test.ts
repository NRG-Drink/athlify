import { describe, expect, it, vi } from 'vitest'
import {
  activeFilterValueLabels,
  activityFiltersToWhere,
  applyActivityFilters,
  clearActivityFilter,
  parseActivityFilters,
  summarizeValues,
  toggleActivityFilter,
} from '../../../features/activities/activityFilters'
import i18next from 'i18next'

describe('activity filters', () => {
  it('parses every repeated value and ignores invalid enum values', () => {
    expect(
      parseActivityFilters(
        new URLSearchParams('type=INDOOR&type=ROAD&type=bad&vehicle=vehicle-1&tag=tag-1&wind=bad'),
      ),
    ).toEqual({
      types: ['INDOOR', 'ROAD'],
      vehicleIds: ['vehicle-1'],
      tagIds: ['tag-1'],
    })
    expect(parseActivityFilters(new URLSearchParams('type=bad&wind=bad'))).toEqual({})
  })

  it('maps ticked values to OR-lists in the GraphQL input', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-17T10:00:00Z'))
    expect(
      activityFiltersToWhere({
        types: ['ROAD', 'GRAVEL'],
        vehicleIds: ['vehicle-1', 'vehicle-2'],
        tagIds: ['tag-1'],
        winds: ['STRONG'],
      }),
    ).toEqual({
      type: { in: ['ROAD', 'GRAVEL'] },
      vehicle: { id: { in: ['vehicle-1', 'vehicle-2'] } },
      tags: { some: { id: { in: ['tag-1'] } } },
      wind: { in: ['STRONG'] },
    })
    expect(activityFiltersToWhere({})).toBeUndefined()
    vi.useRealTimers()
  })

  it('writes one parameter per ticked value and preserves unrelated parameters', () => {
    expect(
      applyActivityFilters(new URLSearchParams('view=table&type=ROAD&wind=CALM'), {
        types: ['INDOOR', 'GRAVEL'],
      }).toString(),
    ).toBe('view=table&type=INDOOR&type=GRAVEL')
  })

  it('toggles one value on and off and drops an empty list', () => {
    const once = toggleActivityFilter({}, 'type', 'ROAD')
    expect(once).toEqual({ types: ['ROAD'] })
    const twice = toggleActivityFilter(toggleActivityFilter(once, 'type', 'GRAVEL'), 'type', 'ROAD')
    expect(twice).toEqual({ types: ['GRAVEL'] })
    expect(toggleActivityFilter(twice, 'type', 'GRAVEL')).toEqual({ types: undefined })
    expect(toggleActivityFilter({}, 'type', 'bad')).toEqual({})
  })

  it('clears every value of one filter and keeps the others', () => {
    expect(clearActivityFilter({ types: ['ROAD'], winds: ['CALM'] }, 'type')).toEqual({
      types: undefined,
      winds: ['CALM'],
    })
  })

  it('labels the ticked values and summarizes more than two', async () => {
    const t = i18next.getFixedT('de')
    const labels = activeFilterValueLabels(
      'type',
      { types: ['ROAD', 'GRAVEL', 'INDOOR'] },
      [],
      [],
      t,
    )
    expect(labels).toEqual(['Strasse', 'Gravel', 'Indoor'])
    expect(summarizeValues(labels, 3, t)).toBe('Strasse, Gravel +1')
    expect(summarizeValues(labels.slice(0, 2), 2, t)).toBe('Strasse, Gravel')
    // Labels not loaded yet: the count stands in.
    expect(summarizeValues([], 2, t)).toBe('2 ausgewählt')
  })
})
