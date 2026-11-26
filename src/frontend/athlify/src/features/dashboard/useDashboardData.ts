import { useCallback, useEffect, useState } from 'react'
import { fetchQuery, graphql, useRelayEnvironment } from 'react-relay'
import type { Environment } from 'relay-runtime'
import type { ActivityRow, BodyRow } from '../../lib/aggregate'
import { CTL_DAYS } from '../../lib/fitness'
import { localDateKey, type DateRange } from '../../lib/period'
import { activityFiltersToWhere, type ActivityFilters } from '../activities/activityFilters'
import { dayEndIso, dayStartIso } from '../body-stats/BodyStatsGridQuery'
import type {
  useDashboardDataActivitiesQuery,
  useDashboardDataActivitiesQuery$variables,
} from './__generated__/useDashboardDataActivitiesQuery.graphql'
import type {
  useDashboardDataBodyStatsQuery,
  useDashboardDataBodyStatsQuery$variables,
} from './__generated__/useDashboardDataBodyStatsQuery.graphql'
import type {
  useDashboardDataEventsQuery,
  useDashboardDataEventsQuery$variables,
} from './__generated__/useDashboardDataEventsQuery.graphql'
import type { EventType } from './dashboardEvents'

const PAGE_SIZE = 200

/** Days of activities loaded before the range so the fitness values are already warmed up. */
const WARM_UP_DAYS = CTL_DAYS * 3

const activitiesQuery = graphql`
  query useDashboardDataActivitiesQuery(
    $first: Int!
    $after: String
    $where: ActivityFilterInput
  ) {
    activities(first: $first, after: $after, where: $where, order: [{ date: ASC }, { id: ASC }]) {
      nodes {
        date
        time
        distance
        elevationGain
        tss
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
`

const bodyStatsQuery = graphql`
  query useDashboardDataBodyStatsQuery($first: Int!, $after: String, $where: BodyStatsFilterInput) {
    bodyStats(first: $first, after: $after, where: $where, order: [{ date: ASC }, { id: ASC }]) {
      nodes {
        date
        weight
        bodyFatPercentage
        musclePercentage
        waterPercentage
        boneMass
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
`

const eventsQuery = graphql`
  query useDashboardDataEventsQuery($first: Int!, $after: String, $where: EventFilterInput) {
    events(first: $first, after: $after, where: $where, order: [{ startDate: ASC }, { id: ASC }]) {
      nodes {
        id
        name
        type
        startDate
        endDate
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
`

export interface DashboardEvent {
  id: string
  name: string
  type: EventType
  startDate: string
  endDate: string | null
}

export interface DashboardData {
  /** Includes the warm-up days before the range; the page cuts them off for display. */
  activities: ActivityRow[]
  bodyStats: BodyRow[]
  events: DashboardEvent[]
}

export type DashboardDataState =
  | { status: 'loading' }
  | { status: 'failed' }
  | { status: 'ready'; data: DashboardData }

interface Connection<T> {
  nodes: ReadonlyArray<T> | null | undefined
  pageInfo: { endCursor: string | null | undefined; hasNextPage: boolean }
}

async function loadAll<T>(
  loadPage: (after: string | null) => Promise<Connection<T> | undefined | null>,
): Promise<T[]> {
  const rows: T[] = []
  let after: string | null = null
  for (;;) {
    const connection: Connection<T> | undefined | null = await loadPage(after)
    if (!connection) throw new Error('The dashboard request returned no connection.')
    rows.push(...(connection.nodes ?? []))
    if (!connection.pageInfo.hasNextPage || !connection.pageInfo.endCursor) return rows
    after = connection.pageInfo.endCursor
  }
}

const network = { fetchPolicy: 'network-only' } as const

function shiftDays(dateKey: string, days: number): Date {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day + days)
}

export function activitiesWhere(
  range: DateRange,
  filters: ActivityFilters,
): useDashboardDataActivitiesQuery$variables['where'] {
  const start = dayStartIso(localDateKey(shiftDays(range.from, -WARM_UP_DAYS)))
  const end = dayEndIso(range.to)
  const conditions: NonNullable<useDashboardDataActivitiesQuery$variables['where']>[] = []
  if (start) conditions.push({ date: { gte: start } })
  if (end) conditions.push({ date: { lte: end } })
  const filter = activityFiltersToWhere(filters)
  if (filter) conditions.push(filter)
  return { and: conditions }
}

export function bodyStatsWhere(range: DateRange): useDashboardDataBodyStatsQuery$variables['where'] {
  const start = dayStartIso(range.from)
  const end = dayEndIso(range.to)
  const conditions: NonNullable<useDashboardDataBodyStatsQuery$variables['where']>[] = []
  if (start) conditions.push({ date: { gte: start } })
  if (end) conditions.push({ date: { lte: end } })
  return { and: conditions }
}

/** Events that start on or before the range's end and end (or, without an end, start) on or after its start. */
export function eventsWhere(range: DateRange): useDashboardDataEventsQuery$variables['where'] {
  return {
    and: [
      { startDate: { lte: range.to } },
      {
        or: [
          { endDate: { gte: range.from } },
          { and: [{ endDate: { eq: null } }, { startDate: { gte: range.from } }] },
        ],
      },
    ],
  }
}

async function loadDashboard(
  environment: Environment,
  range: DateRange,
  filters: ActivityFilters,
): Promise<DashboardData> {
  const activitiesFilter = activitiesWhere(range, filters)
  const bodyStatsFilter = bodyStatsWhere(range)
  const eventsFilter = eventsWhere(range)

  const [activities, bodyStats, events] = await Promise.all([
    loadAll(async (after) => {
      const response = await fetchQuery<useDashboardDataActivitiesQuery>(
        environment,
        activitiesQuery,
        { first: PAGE_SIZE, after, where: activitiesFilter },
        network,
      ).toPromise()
      return response?.activities
    }),
    loadAll(async (after) => {
      const response = await fetchQuery<useDashboardDataBodyStatsQuery>(
        environment,
        bodyStatsQuery,
        { first: PAGE_SIZE, after, where: bodyStatsFilter },
        network,
      ).toPromise()
      return response?.bodyStats
    }),
    loadAll(async (after) => {
      const response = await fetchQuery<useDashboardDataEventsQuery>(
        environment,
        eventsQuery,
        { first: PAGE_SIZE, after, where: eventsFilter },
        network,
      ).toPromise()
      return response?.events
    }),
  ])

  return {
    activities: activities.map((row) => ({
      date: new Date(row.date),
      time: row.time,
      distance: row.distance,
      elevationGain: row.elevationGain ?? null,
      tss: row.tss ?? null,
    })),
    bodyStats: bodyStats.map((row) => ({
      date: new Date(row.date),
      weight: row.weight,
      bodyFatPercentage: row.bodyFatPercentage,
      musclePercentage: row.musclePercentage,
      waterPercentage: row.waterPercentage,
      boneMass: row.boneMass,
    })),
    events: events.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type as EventType,
      startDate: String(row.startDate),
      endDate: row.endDate ? String(row.endDate) : null,
    })),
  }
}

/**
 * Activities (with warm-up days), body stats and events of the range, loaded together. Loads
 * again when the range, the activity filters or `refreshKey` change.
 */
export function useDashboardData(
  range: DateRange,
  filters: ActivityFilters,
  refreshKey: number,
): DashboardDataState & { retry: () => void } {
  const environment = useRelayEnvironment()
  const [retryCount, setRetryCount] = useState(0)
  const [result, setResult] = useState<DashboardDataState>({ status: 'loading' })
  const requestKey = JSON.stringify([range, filters])

  useEffect(() => {
    let cancelled = false
    const [requestRange, requestFilters] = JSON.parse(requestKey) as [DateRange, ActivityFilters]
    loadDashboard(environment, requestRange, requestFilters).then(
      (data) => {
        if (!cancelled) setResult({ status: 'ready', data })
      },
      (error) => {
        console.error('Could not load the dashboard.', error)
        if (!cancelled) setResult({ status: 'failed' })
      },
    )
    return () => {
      cancelled = true
    }
  }, [environment, requestKey, refreshKey, retryCount])

  const retry = useCallback(() => {
    setResult({ status: 'loading' })
    setRetryCount((count) => count + 1)
  }, [])
  return { ...result, retry }
}
