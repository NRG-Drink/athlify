import { describe, expect, it } from 'vitest'
import {
  applyBodyStatsGridState,
  parseBodyStatsColumnState,
  parseBodyStatsFilterModel,
  parseBodyStatsSavedViews,
  parseBodyStatsSortModel,
  serializeBodyStatsColumnState,
  serializeBodyStatsSavedViews,
  type BodyStatsSavedView,
} from '../../../features/body-stats/BodyStatsGridState'

const view = (id: string, name: string): BodyStatsSavedView => ({
  id,
  name,
  filters: {
    quick: 'easy',
    from: '2026-01-01',
    to: '',
    grid: { weight: { filter: 70, type: 'greaterThan' } },
  },
  sort: [{ colId: 'weight', sort: 'desc' }],
  columns: [{ colId: 'date', width: 180, hide: false, pinned: 'left' }],
})

describe('column state', () => {
  it('round-trips and drops unknown columns', () => {
    const raw = serializeBodyStatsColumnState([
      { colId: 'weight', width: 120, hide: true },
      { colId: 'unknown', width: 50 },
    ])
    expect(parseBodyStatsColumnState(raw)).toEqual([{ colId: 'weight', width: 120, hide: true }])
  })

  it('ignores broken storage', () => {
    expect(parseBodyStatsColumnState('{nope')).toEqual([])
    expect(parseBodyStatsColumnState(null)).toEqual([])
  })
})

describe('saved views', () => {
  it('round-trips', () => {
    const views = [view('a', 'Weekly')]
    expect(parseBodyStatsSavedViews(serializeBodyStatsSavedViews(views))).toEqual(views)
  })

  it('drops duplicate ids and names, blank names and names over 80 characters', () => {
    const raw = serializeBodyStatsSavedViews([
      view('a', 'Weekly'),
      view('a', 'Other'),
      view('b', 'weekly'),
      view('c', '  '),
      view('d', 'x'.repeat(81)),
      view('e', 'Monthly'),
    ])
    expect(parseBodyStatsSavedViews(raw).map(({ id }) => id)).toEqual(['a', 'e'])
  })
})

describe('URL grid state', () => {
  it('writes filters flat and the sort as JSON, and reads them back with numbers', () => {
    const filters = {
      weight: { filter: 70.5, type: 'greaterThan' },
      comment: { filter: 'easy', type: 'contains' },
    }
    const sort = [{ colId: 'weight', sort: 'asc' as const }]
    const params = applyBodyStatsGridState(new URLSearchParams('q=x'), filters, sort)

    expect(params.get('filter.weight.filter')).toBe('70.5')
    expect(params.get('q')).toBe('x')
    expect(parseBodyStatsFilterModel(params)).toEqual(filters)
    expect(parseBodyStatsSortModel(params)).toEqual(sort)
  })

  it('removes the grid state when it is empty', () => {
    const params = applyBodyStatsGridState(
      applyBodyStatsGridState(
        new URLSearchParams(),
        { weight: { filter: 1, type: 'equals' } },
        [{ colId: 'date', sort: 'desc' }],
      ),
      {},
      [],
    )
    expect(params.toString()).toBe('')
  })

  it('ignores unknown columns and invalid sort directions', () => {
    const params = new URLSearchParams({
      gridFilters: JSON.stringify({ actions: { type: 'equals' }, weight: { filter: 1 } }),
      gridSort: JSON.stringify([
        { colId: 'actions', sort: 'asc' },
        { colId: 'weight', sort: 'sideways' },
        { colId: 'date', sort: 'desc' },
      ]),
    })
    expect(Object.keys(parseBodyStatsFilterModel(params))).toEqual(['weight'])
    expect(parseBodyStatsSortModel(params)).toEqual([{ colId: 'date', sort: 'desc' }])
  })
})
