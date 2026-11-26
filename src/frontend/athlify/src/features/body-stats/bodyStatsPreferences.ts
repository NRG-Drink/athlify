import { useCallback, useState } from 'react'
import { bodyStatsMetrics, parseMetric, type BodyStatsMetricKey } from './bodyStatsMetrics'

export const BODY_STATS_PREFERENCES_STORAGE_KEY = 'athlify.bodystats.preferences.v1'

/** Page choices that the browser remembers; filters stay in the URL so a link reproduces a view. */
export interface BodyStatsPreferences {
  /** Whether the filter and view panel above the chart is expanded. */
  controlsOpen: boolean
  /** The measurement drawn in the chart when the URL names none. */
  metric: BodyStatsMetricKey
}

export const defaultBodyStatsPreferences: BodyStatsPreferences = {
  controlsOpen: true,
  metric: parseMetric(null),
}

export function parseBodyStatsPreferences(raw: string | null): BodyStatsPreferences {
  if (!raw) return defaultBodyStatsPreferences
  try {
    const value: unknown = JSON.parse(raw)
    if (typeof value !== 'object' || value === null) return defaultBodyStatsPreferences
    const { controlsOpen, metric } = value as Record<string, unknown>
    return {
      controlsOpen:
        typeof controlsOpen === 'boolean' ? controlsOpen : defaultBodyStatsPreferences.controlsOpen,
      metric: bodyStatsMetrics.some(({ key }) => key === metric)
        ? (metric as BodyStatsMetricKey)
        : defaultBodyStatsPreferences.metric,
    }
  } catch {
    return defaultBodyStatsPreferences
  }
}

function readPreferences(): BodyStatsPreferences {
  try {
    return parseBodyStatsPreferences(
      window.localStorage.getItem(BODY_STATS_PREFERENCES_STORAGE_KEY),
    )
  } catch (error) {
    console.error('Could not restore Body-Stats preferences.', error)
    return defaultBodyStatsPreferences
  }
}

/** The remembered page choices and a setter that stores a change at once. */
export function useBodyStatsPreferences() {
  const [preferences, setPreferences] = useState(readPreferences)

  const updatePreferences = useCallback((change: Partial<BodyStatsPreferences>) => {
    setPreferences((current) => {
      const next = { ...current, ...change }
      try {
        window.localStorage.setItem(BODY_STATS_PREFERENCES_STORAGE_KEY, JSON.stringify(next))
      } catch (error) {
        console.error('Could not save Body-Stats preferences.', error)
      }
      return next
    })
  }, [])

  return { preferences, updatePreferences }
}
