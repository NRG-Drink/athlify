import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { parseGrouping, type Grouping } from '../../lib/aggregate'
import {
  defaultDateRange,
  localDateKey,
  parseDateRange,
  periods,
  type DateRange,
  type Period,
} from '../../lib/period'
import { parsePeriod } from '../../lib/period'
import { parseActivityFilters, type ActivityFilters, type ActivityType } from '../activities/activityFilters'

export const DASHBOARD_FROM_PARAM = 'from'
export const DASHBOARD_TO_PARAM = 'to'
export const DASHBOARD_PERIOD_PARAM = 'period'
export const DASHBOARD_GROUPING_PARAM = 'group'
const TYPE_PARAM = 'type'
const TAG_PARAM = 'tag'

/** Range start for "all": earlier than any measurement; the page cuts it at the first data. */
export const ALL_SINCE = '1900-01-01'

const OUTDOOR_TYPES: ActivityType[] = ['ROAD', 'MOUNTAIN', 'GRAVEL']

export interface DashboardState {
  range: DateRange
  /** The quick range that is active; undefined for a custom range. */
  period: Period | undefined
  grouping: Grouping
  /** Only the type and tag filters apply to the dashboard. */
  filters: ActivityFilters
  indoor: boolean
  outdoor: boolean
  /** Canonical URL parameters of all filters, used to match saved presets. */
  search: string
}

export interface DashboardStateActions {
  setPeriod: (period: Period) => void
  setFrom: (from: string) => void
  setTo: (to: string) => void
  setGrouping: (grouping: Grouping) => void
  setIndoor: (indoor: boolean) => void
  setOutdoor: (outdoor: boolean) => void
  setTagIds: (ids: string[]) => void
  applySearch: (search: string) => void
  reset: () => void
}

/** The dashboard's filters as read from, and written to, the URL. */
export function useDashboardPageState(): DashboardState & DashboardStateActions {
  const [params, setParams] = useSearchParams()
  const paramsKey = params.toString()
  const today = useMemo(() => new Date(), [])

  const state = useMemo<DashboardState>(() => {
    const current = new URLSearchParams(paramsKey)
    const periodParam = current.get(DASHBOARD_PERIOD_PARAM)
    const period = periods.includes(periodParam as Period)
      ? parsePeriod(periodParam, '90d')
      : undefined
    const range = parseDateRange(
      current.get(DASHBOARD_FROM_PARAM),
      current.get(DASHBOARD_TO_PARAM),
      defaultDateRange(today),
      today,
      period,
    )
    const grouping = parseGrouping(current.get(DASHBOARD_GROUPING_PARAM))
    const { types, tagIds } = parseActivityFilters(current)
    const indoor = types?.includes('INDOOR') ?? false
    const outdoor = types?.some((type) => type !== 'INDOOR') ?? false

    const canonical = new URLSearchParams()
    if (period) canonical.set(DASHBOARD_PERIOD_PARAM, period)
    else {
      canonical.set(DASHBOARD_FROM_PARAM, range.from)
      canonical.set(DASHBOARD_TO_PARAM, range.to)
    }
    canonical.set(DASHBOARD_GROUPING_PARAM, grouping)
    for (const type of types ?? []) canonical.append(TYPE_PARAM, type)
    for (const id of tagIds ?? []) canonical.append(TAG_PARAM, id)

    return {
      range,
      period,
      grouping,
      filters: { types, tagIds },
      indoor,
      outdoor,
      search: canonical.toString(),
    }
  }, [paramsKey, today])

  const update = useCallback(
    (change: (next: URLSearchParams) => void) =>
      setParams(
        (current) => {
          const next = new URLSearchParams(current)
          change(next)
          return next
        },
        { replace: true },
      ),
    [setParams],
  )

  const setTypes = useCallback(
    (indoor: boolean, outdoor: boolean) =>
      update((next) => {
        next.delete(TYPE_PARAM)
        if (indoor === outdoor) return
        for (const type of indoor ? (['INDOOR'] as ActivityType[]) : OUTDOOR_TYPES) {
          next.append(TYPE_PARAM, type)
        }
      }),
    [update],
  )

  return {
    ...state,
    setPeriod: (period) =>
      update((next) => {
        next.set(DASHBOARD_PERIOD_PARAM, period)
        next.delete(DASHBOARD_FROM_PARAM)
        next.delete(DASHBOARD_TO_PARAM)
      }),
    setFrom: (from) =>
      update((next) => {
        next.set(DASHBOARD_FROM_PARAM, from || ALL_SINCE)
        next.set(DASHBOARD_TO_PARAM, state.range.to)
        next.delete(DASHBOARD_PERIOD_PARAM)
      }),
    setTo: (to) =>
      update((next) => {
        next.set(DASHBOARD_FROM_PARAM, state.range.from)
        next.set(DASHBOARD_TO_PARAM, to || localDateKey(today))
        next.delete(DASHBOARD_PERIOD_PARAM)
      }),
    setGrouping: (grouping) => update((next) => next.set(DASHBOARD_GROUPING_PARAM, grouping)),
    // An unticked pair means "no type filter", so ticking both also shows every type.
    setIndoor: (indoor) => setTypes(indoor, state.outdoor),
    setOutdoor: (outdoor) => setTypes(state.indoor, outdoor),
    setTagIds: (ids) =>
      update((next) => {
        next.delete(TAG_PARAM)
        for (const id of ids) next.append(TAG_PARAM, id)
      }),
    applySearch: (search) => setParams(new URLSearchParams(search), { replace: true }),
    reset: () => setParams(new URLSearchParams(), { replace: true }),
  }
}
