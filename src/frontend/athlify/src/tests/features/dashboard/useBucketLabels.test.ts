import { renderHook } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { useBucketLabels } from '../../../features/dashboard/useBucketLabels'

describe('useBucketLabels', () => {
  test('adds the year to axis labels when the range spans several years', () => {
    const { result } = renderHook(() => useBucketLabels())
    const start = new Date(2026, 10, 2)

    expect(result.current.axis(start, 'week', false)).toBe('KW 45')
    expect(result.current.axis(start, 'week', true)).toBe('KW 45 · 26')
    expect(result.current.axis(start, 'day', false)).toBe('02.11.')
    expect(result.current.axis(start, 'day', true)).toBe('02.11.26')
    expect(result.current.axis(start, 'month', true)).toContain('26')
    expect(result.current.axis(start, 'month', false)).not.toContain('26')
  })
})
