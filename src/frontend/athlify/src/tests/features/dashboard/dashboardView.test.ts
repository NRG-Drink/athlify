import { describe, expect, test } from 'vitest'
import { toMarkers } from '../../../features/dashboard/dashboardEvents'
import { buildDashboardView } from '../../../features/dashboard/dashboardView'
import { isoWeek } from '../../../features/dashboard/useBucketLabels'
import type { DashboardData } from '../../../features/dashboard/useDashboardData'
import { ALL_SINCE } from '../../../features/dashboard/useDashboardPageState'

const event = (id: string, startDate: string, endDate: string | null) => ({
  id,
  name: id,
  type: 'CRASH' as const,
  startDate,
  endDate,
})

describe('toMarkers', () => {
  test('puts events on their buckets and cuts long ones at the range edges', () => {
    const markers = toMarkers(
      [event('single', '2026-11-04', null), event('long', '2026-10-01', '2026-12-31')],
      'week',
      '2026-11-02',
      '2026-11-23',
    )
    expect(markers).toMatchObject([
      { id: 'single', startKey: '2026-11-02', endKey: '2026-11-02' },
      { id: 'long', startKey: '2026-11-02', endKey: '2026-11-23' },
    ])
  })

  test('leaves out events outside the range', () => {
    expect(toMarkers([event('old', '2025-01-01', null)], 'month', '2026-11-01', '2026-11-01')).toEqual(
      [],
    )
  })
})

describe('buildDashboardView', () => {
  const data: DashboardData = {
    activities: [
      { date: new Date(2026, 9, 1, 10), time: 3600, distance: 30, elevationGain: null, tss: 100 },
      { date: new Date(2026, 10, 3, 10), time: 3600, distance: 30, elevationGain: null, tss: 50 },
    ],
    bodyStats: [],
    events: [],
  }

  test('cuts warm-up activities from the table but keeps them for the fitness', () => {
    const view = buildDashboardView(
      data,
      { from: '2026-11-01', to: '2026-11-30' },
      'month',
    )
    expect([...view.activities.keys()]).toEqual(['2026-11-01'])
    const withoutWarmUp = buildDashboardView(
      { ...data, activities: data.activities.slice(1) },
      { from: '2026-11-01', to: '2026-11-30' },
      'month',
    )
    expect(view.fitness.get('2026-11-01')?.ctl).toBeGreaterThan(
      withoutWarmUp.fitness.get('2026-11-01')?.ctl ?? Infinity,
    )
    expect(view.buckets.map((bucket) => bucket.key)).toEqual(['2026-11-01'])
  })

  test('starts "all" at the first data instead of the year 1900', () => {
    const view = buildDashboardView(data, { from: ALL_SINCE, to: '2026-11-30' }, 'month')
    expect(view.buckets.map((bucket) => bucket.key)).toEqual(['2026-10-01', '2026-11-01'])
  })

  test('reports no data when nothing is loaded', () => {
    const view = buildDashboardView(
      { activities: [], bodyStats: [], events: [] },
      { from: ALL_SINCE, to: '2026-11-30' },
      'week',
    )
    expect(view.hasData).toBe(false)
  })
})

describe('isoWeek', () => {
  test('numbers weeks like ISO 8601', () => {
    expect(isoWeek(new Date(2026, 0, 1))).toEqual({ week: 1, year: 2026 })
    expect(isoWeek(new Date(2026, 10, 2))).toEqual({ week: 45, year: 2026 })
    expect(isoWeek(new Date(2021, 0, 3))).toEqual({ week: 53, year: 2020 })
  })
})
