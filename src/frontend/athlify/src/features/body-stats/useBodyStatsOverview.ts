import { useEffect, useMemo, useState } from 'react'
import { fetchQuery, graphql, useRelayEnvironment } from 'react-relay'
import { useTranslation } from 'react-i18next'
import { toaster } from '../../components/ui/toaster'
import type { useBodyStatsOverviewQuery } from './__generated__/useBodyStatsOverviewQuery.graphql'
import { bodyStatsMetrics, type BodyStatsMetricKey } from './bodyStatsMetrics'

const overviewQuery = graphql`
  query useBodyStatsOverviewQuery {
    bodyStats(first: 1, order: [{ date: DESC }, { id: DESC }]) {
      totalCount
      nodes {
        weight
        bodyFatPercentage
        musclePercentage
        waterPercentage
        boneMass
      }
    }
  }
`

export type BodyStatsLatestValues = Partial<Record<BodyStatsMetricKey, number>>

export interface BodyStatsOverview {
  /** False until the first answer arrived; the page does not wait for it. */
  isLoaded: boolean
  /** True when the user has no measurement at all, whatever the filters. */
  isEmpty: boolean
  /** The newest measurement's values, the starting point of a new measurement. */
  latestValues: BodyStatsLatestValues
}

const pending: BodyStatsOverview = { isLoaded: false, isEmpty: false, latestValues: {} }

/** Whether any measurement exists and the latest values; loads again when `refreshKey` changes. */
export function useBodyStatsOverview(refreshKey: number): BodyStatsOverview {
  const { t } = useTranslation()
  const environment = useRelayEnvironment()
  const [result, setResult] = useState<BodyStatsOverview>(pending)

  useEffect(() => {
    let cancelled = false
    fetchQuery<useBodyStatsOverviewQuery>(
      environment,
      overviewQuery,
      {},
      {
        fetchPolicy: 'network-only',
      },
    )
      .toPromise()
      .then(
        (response) => {
          if (cancelled) return
          const newest = response?.bodyStats?.nodes?.[0]
          const latestValues: BodyStatsLatestValues = {}
          if (newest) for (const { key } of bodyStatsMetrics) latestValues[key] = newest[key]
          setResult({
            isLoaded: true,
            isEmpty: (response?.bodyStats?.totalCount ?? 0) === 0,
            latestValues,
          })
        },
        (error) => {
          console.error('Could not load the Body-Stats overview.', error)
          if (cancelled) return
          toaster.create({ type: 'error', title: t('bodyStats.loadFailed') })
          setResult({ isLoaded: true, isEmpty: false, latestValues: {} })
        },
      )
    return () => {
      cancelled = true
    }
  }, [environment, refreshKey, t])

  return useMemo(() => result, [result])
}
