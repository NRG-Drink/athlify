import { renderHook, act } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  EVENTS_PREFERENCES_STORAGE_KEY,
  parseEventsPreferences,
  useEventsPreferences,
} from '../../../features/events/eventsPreferences'

describe('events preferences', () => {
  beforeEach(() => localStorage.removeItem(EVENTS_PREFERENCES_STORAGE_KEY))

  it('falls back to an open panel for missing or invalid data', () => {
    expect(parseEventsPreferences(null).controlsOpen).toBe(true)
    expect(parseEventsPreferences('{"controlsOpen":3}').controlsOpen).toBe(true)
    expect(parseEventsPreferences('not json').controlsOpen).toBe(true)
  })

  it('stores a change and restores it on the next mount', () => {
    const first = renderHook(() => useEventsPreferences())
    act(() => first.result.current.updatePreferences({ controlsOpen: false }))
    first.unmount()

    const second = renderHook(() => useEventsPreferences())
    expect(second.result.current.preferences.controlsOpen).toBe(false)
  })
})
