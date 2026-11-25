import { describe, expect, it } from 'vitest'
import {
  parseActivitiesColumnState,
  parseActivitiesSavedViews,
  serializeActivitiesColumnState,
  serializeActivitiesSavedViews,
  type ActivitiesSavedView,
} from '../../../features/activities/ActivitiesGridState'
import { defaultActivitySort } from '../../../features/activities/activityQuery'

describe('Activities grid state', () => {
  it('round-trips saved query and column state in browser storage format', () => {
    const views: ActivitiesSavedView[] = [
      {
        id: 'view-1',
        name: 'Long rides',
        query: {
          filters: { types: ['ROAD'] },
          gridFilters: { distance: { type: 'greaterThan', filter: 50 } },
          quickFilter: 'morning',
          fromFilter: '2026-01-01',
          toFilter: '2026-01-31',
          sort: [{ colId: 'distance', sort: 'desc' }],
        },
        columns: [
          { colId: 'date', width: 180, pinned: 'left' },
          { colId: 'description', width: 320, hide: false },
        ],
      },
    ]

    expect(parseActivitiesSavedViews(serializeActivitiesSavedViews(views))).toEqual(views)
  })

  it('drops invalid and duplicate views and ignores unknown columns', () => {
    const parsed = parseActivitiesSavedViews(
      JSON.stringify([
        {
          id: 'view-1',
          name: '  Long rides ',
          query: 'sort=-distance',
          columns: [
            { colId: 'date', width: 180, pinned: 'left' },
            { colId: 'unknown', width: 300 },
          ],
        },
        {
          id: 'view-2',
          name: 'long RIDES',
          query: '',
          columns: [{ colId: 'distance' }],
        },
        { id: 'view-3', name: '', query: '', columns: [] },
      ]),
    )

    expect(parsed).toHaveLength(1)
    expect(parsed[0]).toMatchObject({
      id: 'view-1',
      name: 'Long rides',
      query: { sort: [{ colId: 'distance', sort: 'desc' }] },
      columns: [{ colId: 'date', width: 180, pinned: 'left' }],
    })
    expect(parsed[0]?.query.sort).not.toEqual(defaultActivitySort)
  })

  it('validates restored column state and serializes only known columns', () => {
    const raw = JSON.stringify([
      { colId: 'date', width: 180, hide: false, pinned: 'left' },
      { colId: 'unknown', width: 200 },
      { colId: 'distance', width: -1 },
    ])

    expect(parseActivitiesColumnState(raw)).toEqual([
      { colId: 'date', width: 180, hide: false, pinned: 'left' },
      { colId: 'distance', width: 100 },
    ])
    expect(
      serializeActivitiesColumnState([
        { colId: 'date', width: 180 },
        { colId: 'unknown', width: 200 },
      ]),
    ).toBe('[{"colId":"date","width":180}]')
  })

  it('keeps restored activity actions first and left-pinned', () => {
    const restored = parseActivitiesColumnState(
      JSON.stringify([
        { colId: 'date', width: 180, pinned: 'left' },
        { colId: 'actions', width: 70, pinned: 'right' },
        { colId: 'distance', width: 120 },
      ]),
    )

    expect(restored).toEqual([
      { colId: 'actions', width: 70, pinned: 'left' },
      { colId: 'date', width: 180, pinned: 'left' },
      { colId: 'distance', width: 120 },
    ])
  })
})
