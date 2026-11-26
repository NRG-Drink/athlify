import { useCallback, useState } from 'react'

export const EVENTS_PREFERENCES_STORAGE_KEY = 'athlify.events.preferences.v1'

/** Page choices that the browser remembers; filters stay in the URL so a link reproduces a view. */
export interface EventsPreferences {
  /** Whether the filter and view panel above the grid is expanded. */
  controlsOpen: boolean
}

export const defaultEventsPreferences: EventsPreferences = { controlsOpen: true }

export function parseEventsPreferences(raw: string | null): EventsPreferences {
  if (!raw) return defaultEventsPreferences
  try {
    const value: unknown = JSON.parse(raw)
    if (typeof value !== 'object' || value === null) return defaultEventsPreferences
    const { controlsOpen } = value as Record<string, unknown>
    return {
      controlsOpen:
        typeof controlsOpen === 'boolean' ? controlsOpen : defaultEventsPreferences.controlsOpen,
    }
  } catch {
    return defaultEventsPreferences
  }
}

function readPreferences(): EventsPreferences {
  try {
    return parseEventsPreferences(window.localStorage.getItem(EVENTS_PREFERENCES_STORAGE_KEY))
  } catch (error) {
    console.error('Could not restore Events preferences.', error)
    return defaultEventsPreferences
  }
}

/** The remembered page choices and a setter that stores a change at once. */
export function useEventsPreferences() {
  const [preferences, setPreferences] = useState(readPreferences)

  const updatePreferences = useCallback((change: Partial<EventsPreferences>) => {
    setPreferences((current) => {
      const next = { ...current, ...change }
      try {
        window.localStorage.setItem(EVENTS_PREFERENCES_STORAGE_KEY, JSON.stringify(next))
      } catch (error) {
        console.error('Could not save Events preferences.', error)
      }
      return next
    })
  }, [])

  return { preferences, updatePreferences }
}
