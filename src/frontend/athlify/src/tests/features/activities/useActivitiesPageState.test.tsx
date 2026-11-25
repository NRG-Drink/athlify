import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { localDateKey } from '../../../lib/period'
import { useActivitiesPageState } from '../../../features/activities/useActivitiesPageState'

describe('Activities page state', () => {
  it('sets the inclusive year-to-date range through today', () => {
    const replaceParams = vi.fn()
    const { result } = renderHook(() =>
      useActivitiesPageState(new URLSearchParams('sort=-distance'), replaceParams),
    )
    const today = new Date()

    act(() => result.current.filters.onFilterYearToDate())

    const next = replaceParams.mock.calls[0]?.[0] as URLSearchParams
    expect(next.get('from')).toBe(`${today.getFullYear()}-01-01`)
    expect(next.get('to')).toBe(localDateKey(today))
    expect(next.get('sort')).toBe('-distance')
  })

  it('resets filters without changing the sort or unrelated URL parameters', () => {
    const replaceParams = vi.fn()
    const { result } = renderHook(() =>
      useActivitiesPageState(
        new URLSearchParams('q=ride&from=2026-01-01&sort=-distance&tab=history'),
        replaceParams,
      ),
    )

    act(() => result.current.filters.onResetFilters())

    const next = replaceParams.mock.calls[0]?.[0] as URLSearchParams
    expect(next.get('q')).toBeNull()
    expect(next.get('from')).toBeNull()
    expect(next.get('sort')).toBe('-distance')
    expect(next.get('tab')).toBe('history')
  })

  it('resets filters and sorting, while preserving unrelated URL parameters', () => {
    const replaceParams = vi.fn()
    const { result } = renderHook(() =>
      useActivitiesPageState(
        new URLSearchParams('q=ride&sort=-distance&tab=history'),
        replaceParams,
      ),
    )

    act(() => result.current.filters.onResetTable())

    const next = replaceParams.mock.calls[0]?.[0] as URLSearchParams
    expect(next.get('q')).toBeNull()
    expect(next.get('sort')).toBeNull()
    expect(next.get('tab')).toBe('history')
  })
})
