import { useEffect, useState } from 'react'
import { fetchQuery, graphql, useRelayEnvironment } from 'react-relay'
import type { MetricPoint } from '../../lib/metrics'
import type {
  BodyStatsChartPageQuery,
  BodyStatsFilterInput,
} from './__generated__/BodyStatsChartPageQuery.graphql'
import { bodyStatsMetrics, type BodyStatsMetricKey } from './bodyStatsMetrics'

const CHART_PAGE_SIZE = 200

const chartPageQuery = graphql`
  query BodyStatsChartPageQuery($first: Int!, $after: String, $where: BodyStatsFilterInput) {
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

export type BodyStatsChartPoints = Record<BodyStatsMetricKey, MetricPoint[]>

export type BodyStatsChartData =
  | { status: 'loading' }
  | { status: 'failed' }
  | { status: 'ready'; points: BodyStatsChartPoints }

type Row = Record<BodyStatsMetricKey, number> & { date: string }

function toPoints(rows: readonly Row[]): BodyStatsChartPoints {
  const points = {} as BodyStatsChartPoints
  for (const { key } of bodyStatsMetrics) {
    points[key] = rows.map((row) => ({ date: new Date(row.date), value: row[key] }))
  }
  return points
}

/**
 * Every measurement that matches the table's filters, oldest first, as one series per metric.
 * Loads again when the filters change or `refreshKey` changes.
 */
export function useBodyStatsChartPoints(
  where: BodyStatsFilterInput | null,
  refreshKey: number,
): BodyStatsChartData & { retry: () => void } {
  const environment = useRelayEnvironment()
  const [retryCount, setRetryCount] = useState(0)
  const [result, setResult] = useState<BodyStatsChartData>({ status: 'loading' })
  const whereKey = JSON.stringify(where)

  useEffect(() => {
    let cancelled = false
    const filter = JSON.parse(whereKey) as BodyStatsFilterInput | null

    async function loadAll(): Promise<Row[]> {
      const rows: Row[] = []
      let after: string | null = null
      for (;;) {
        const response: BodyStatsChartPageQuery['response'] | undefined =
          await fetchQuery<BodyStatsChartPageQuery>(
            environment,
            chartPageQuery,
            { first: CHART_PAGE_SIZE, after, where: filter },
            { fetchPolicy: 'network-only' },
          ).toPromise()
        const connection: BodyStatsChartPageQuery['response']['bodyStats'] | undefined =
          response?.bodyStats
        if (!connection) throw new Error('The body stats chart request returned no connection.')
        rows.push(...(connection.nodes ?? []))
        if (!connection.pageInfo.hasNextPage || !connection.pageInfo.endCursor) return rows
        after = connection.pageInfo.endCursor
      }
    }

    loadAll().then(
      (rows) => {
        if (!cancelled) setResult({ status: 'ready', points: toPoints(rows) })
      },
      (error) => {
        console.error('Could not load the body stats chart.', error)
        if (!cancelled) setResult({ status: 'failed' })
      },
    )
    return () => {
      cancelled = true
    }
  }, [environment, whereKey, refreshKey, retryCount])

  const retry = () => {
    setResult({ status: 'loading' })
    setRetryCount((count) => count + 1)
  }
  return { ...result, retry }
}
