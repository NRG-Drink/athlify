import { useCallback, useState } from 'react'
import { bodyStatsMetrics, parseMetric, type BodyStatsMetricKey } from '../body-stats/bodyStatsMetrics'
import { parseTrackMetric, type TrackMetricKey } from './dashboardMetrics'

export const DASHBOARD_PREFERENCES_STORAGE_KEY = 'athlify.dashboard.preferences.v1'
export const DASHBOARD_VIEWS_STORAGE_KEY = 'athlify.dashboard.views.v1'

/** Page choices that the browser remembers; filters stay in the URL so a link reproduces a view. */
export interface DashboardPreferences {
  /** Whether the filter panel above the charts is expanded. */
  controlsOpen: boolean
  trackMetric: TrackMetricKey
  bodyMetric: BodyStatsMetricKey
}

export const defaultDashboardPreferences: DashboardPreferences = {
  controlsOpen: true,
  trackMetric: parseTrackMetric(null),
  bodyMetric: parseMetric(null),
}

export function parseDashboardPreferences(raw: string | null): DashboardPreferences {
  if (!raw) return defaultDashboardPreferences
  try {
    const value: unknown = JSON.parse(raw)
    if (typeof value !== 'object' || value === null) return defaultDashboardPreferences
    const { controlsOpen, trackMetric, bodyMetric } = value as Record<string, unknown>
    return {
      controlsOpen:
        typeof controlsOpen === 'boolean'
          ? controlsOpen
          : defaultDashboardPreferences.controlsOpen,
      trackMetric: parseTrackMetric(trackMetric),
      bodyMetric: bodyStatsMetrics.some(({ key }) => key === bodyMetric)
        ? (bodyMetric as BodyStatsMetricKey)
        : defaultDashboardPreferences.bodyMetric,
    }
  } catch {
    return defaultDashboardPreferences
  }
}

function readPreferences(): DashboardPreferences {
  try {
    return parseDashboardPreferences(window.localStorage.getItem(DASHBOARD_PREFERENCES_STORAGE_KEY))
  } catch (error) {
    console.error('Could not restore dashboard preferences.', error)
    return defaultDashboardPreferences
  }
}

/** The remembered page choices and a setter that stores a change at once. */
export function useDashboardPreferences() {
  const [preferences, setPreferences] = useState(readPreferences)

  const updatePreferences = useCallback((change: Partial<DashboardPreferences>) => {
    setPreferences((current) => {
      const next = { ...current, ...change }
      try {
        window.localStorage.setItem(DASHBOARD_PREFERENCES_STORAGE_KEY, JSON.stringify(next))
      } catch (error) {
        console.error('Could not save dashboard preferences.', error)
      }
      return next
    })
  }, [])

  return { preferences, updatePreferences }
}

/** A saved preset: a name and the URL parameters of the filters. */
export interface DashboardView {
  id: string
  name: string
  search: string
}

export function parseDashboardViews(raw: string | null): DashboardView[] {
  if (!raw) return []
  try {
    const value: unknown = JSON.parse(raw)
    if (!Array.isArray(value)) return []
    return value.filter(
      (item): item is DashboardView =>
        typeof item === 'object' &&
        item !== null &&
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        typeof item.search === 'string',
    )
  } catch {
    return []
  }
}

function readViews(): DashboardView[] {
  try {
    return parseDashboardViews(window.localStorage.getItem(DASHBOARD_VIEWS_STORAGE_KEY))
  } catch (error) {
    console.error('Could not restore dashboard presets.', error)
    return []
  }
}

/** The saved presets and the actions that store a change at once. */
export function useDashboardViews() {
  const [views, setViews] = useState(readViews)
  const [storageFailed, setStorageFailed] = useState(false)

  const store = useCallback((next: DashboardView[]) => {
    setViews(next)
    try {
      window.localStorage.setItem(DASHBOARD_VIEWS_STORAGE_KEY, JSON.stringify(next))
      setStorageFailed(false)
    } catch (error) {
      console.error('Could not save dashboard presets.', error)
      setStorageFailed(true)
    }
  }, [])

  const save = useCallback(
    (rawName: string, search: string) => {
      const name = rawName.trim()
      const duplicate = views.some((view) => view.name.toLocaleLowerCase() === name.toLocaleLowerCase())
      if (!name || duplicate) return
      store([...views, { id: crypto.randomUUID(), name, search }])
    },
    [store, views],
  )

  const remove = useCallback(
    (id: string) => store(views.filter((view) => view.id !== id)),
    [store, views],
  )

  return { views, storageFailed, save, remove }
}
