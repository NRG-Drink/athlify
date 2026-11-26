import { useCallback, useEffect, useState } from 'react'
import { fetchQuery, graphql, useRelayEnvironment } from 'react-relay'
import type { Environment, GraphQLTaggedNode, OperationType } from 'relay-runtime'
import type { ActivityRow, BodyRow } from '../../lib/aggregate'
import { CTL_DAYS } from '../../lib/fitness'
import { localDateKey, type DateRange } from '../../lib/period'
import { ALL_SINCE } from './useDashboardPageState'
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
  query useDashboardDataActivitiesQuery($first: Int!, $after: String, $where: ActivityFilterInput) {
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
  /** Includes the warm-up days before the range; the view cuts them off for display. */
  activities: ActivityRow[]
  bodyStats: BodyRow[]
  events: DashboardEvent[]
}

export type LoadState<T> =
  { status: 'loading' } | { status: 'failed' } | { status: 'ready'; data: T }

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

/** Fetches every page of a connection, oldest first, past the cache. */
function fetchAllPages<Q extends OperationType, T>(
  environment: Environment,
  query: GraphQLTaggedNode,
  where: Q['variables'] extends { where?: infer W } ? W | undefined : never,
  selectConnection: (response: Q['response']) => Connection<T> | undefined | null,
): Promise<T[]> {
  return loadAll(async (after) => {
    const response = await fetchQuery<Q>(
      environment,
      query,
      { first: PAGE_SIZE, after, where } as Q['variables'],
      network,
    ).toPromise()
    return response ? selectConnection(response) : undefined
  })
}

function shiftDays(dateKey: string, days: number): Date {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day + days)
}

type ConnectionNode<C> = C extends { nodes?: ReadonlyArray<infer N> | null } ? N : never
type ActivityNode = ConnectionNode<useDashboardDataActivitiesQuery['response']['activities']>
type BodyStatsNode = ConnectionNode<useDashboardDataBodyStatsQuery['response']['bodyStats']>
type EventNode = ConnectionNode<useDashboardDataEventsQuery['response']['events']>

type ActivitiesWhere = useDashboardDataActivitiesQuery$variables['where']

/** The activities of the range that match the type and tag filters. */
export function activitiesWhere(range: DateRange, filters: ActivityFilters): ActivitiesWhere {
  const start = dayStartIso(range.from)
  const end = dayEndIso(range.to)
  const conditions: NonNullable<ActivitiesWhere>[] = []
  if (start) conditions.push({ date: { gte: start } })
  if (end) conditions.push({ date: { lte: end } })
  const filter = activityFiltersToWhere(filters)
  if (filter) conditions.push(filter)
  return { and: conditions }
}

/**
 * The activities with a TSS in the warm-up days before the range. Activities without a TSS do
 * not change the fitness, so they are not loaded; without any TSS this is one empty page.
 */
export function warmUpWhere(range: DateRange, filters: ActivityFilters): ActivitiesWhere {
  const start = dayStartIso(localDateKey(shiftDays(range.from, -WARM_UP_DAYS)))
  const end = dayStartIso(range.from)
  const conditions: NonNullable<ActivitiesWhere>[] = [{ tss: { neq: null } }]
  if (start) conditions.push({ date: { gte: start } })
  if (end) conditions.push({ date: { lt: end } })
  const filter = activityFiltersToWhere(filters)
  if (filter) conditions.push(filter)
  return { and: conditions }
}

export function bodyStatsWhere(
  range: DateRange,
): useDashboardDataBodyStatsQuery$variables['where'] {
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

const loadActivityRows = async (
  environment: Environment,
  where: ActivitiesWhere,
): Promise<ActivityRow[]> => {
  const rows = await fetchAllPages<useDashboardDataActivitiesQuery, ActivityNode>(
    environment,
    activitiesQuery,
    where,
    (response) => response.activities,
  )
  return rows.map((row) => ({
    date: new Date(row.date),
    time: row.time,
    distance: row.distance,
    elevationGain: row.elevationGain ?? null,
    tss: row.tss ?? null,
  }))
}

interface ActivitiesRequest {
  range: DateRange
  filters: ActivityFilters
}

/** The range's activities and, in parallel, the warm-up activities that carry a TSS, oldest first. */
async function loadActivities(
  environment: Environment,
  { range, filters }: ActivitiesRequest,
): Promise<ActivityRow[]> {
  const [warmUp, inRange] = await Promise.all([
    range.from === ALL_SINCE
      ? Promise.resolve([])
      : loadActivityRows(environment, warmUpWhere(range, filters)),
    loadActivityRows(environment, activitiesWhere(range, filters)),
  ])
  return [...warmUp, ...inRange]
}

async function loadBodyStats(environment: Environment, range: DateRange): Promise<BodyRow[]> {
  const rows = await fetchAllPages<useDashboardDataBodyStatsQuery, BodyStatsNode>(
    environment,
    bodyStatsQuery,
    bodyStatsWhere(range),
    (response) => response.bodyStats,
  )
  return rows.map((row) => ({
    date: new Date(row.date),
    weight: row.weight,
    bodyFatPercentage: row.bodyFatPercentage,
    musclePercentage: row.musclePercentage,
    waterPercentage: row.waterPercentage,
    boneMass: row.boneMass,
  }))
}

async function loadEvents(environment: Environment, range: DateRange): Promise<DashboardEvent[]> {
  const rows = await fetchAllPages<useDashboardDataEventsQuery, EventNode>(
    environment,
    eventsQuery,
    eventsWhere(range),
    (response) => response.events,
  )
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type as EventType,
    startDate: String(row.startDate),
    endDate: row.endDate ? String(row.endDate) : null,
  }))
}

/**
 * Loads one source of the dashboard. The request is compared by value, so the load only runs
 * again when it changes or when `refreshKey` changes; the other sources are not affected.
 */
function useSource<R, T>(
  request: R,
  load: (environment: Environment, request: R) => Promise<T>,
  refreshKey: number,
): LoadState<T> & { retry: () => void } {
  const environment = useRelayEnvironment()
  const [retryCount, setRetryCount] = useState(0)
  const [result, setResult] = useState<LoadState<T>>({ status: 'loading' })
  const requestKey = JSON.stringify(request)

  useEffect(() => {
    let cancelled = false
    load(environment, JSON.parse(requestKey) as R).then(
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
  }, [environment, load, requestKey, refreshKey, retryCount])

  const retry = useCallback(() => {
    setResult({ status: 'loading' })
    setRetryCount((count) => count + 1)
  }, [])
  return { ...result, retry }
}

/** The range's activities (with warm-up), reloaded when the range or the type and tag filters change. */
export function useDashboardActivities(
  range: DateRange,
  filters: ActivityFilters,
  refreshKey: number,
) {
  return useSource<ActivitiesRequest, ActivityRow[]>({ range, filters }, loadActivities, refreshKey)
}

/** The range's measurements, reloaded only when the range changes. */
export function useDashboardBodyStats(range: DateRange, refreshKey: number) {
  return useSource<DateRange, BodyRow[]>(range, loadBodyStats, refreshKey)
}

/** The events overlapping the range, reloaded only when the range changes. */
export function useDashboardEvents(range: DateRange, refreshKey: number) {
  return useSource<DateRange, DashboardEvent[]>(range, loadEvents, refreshKey)
}
