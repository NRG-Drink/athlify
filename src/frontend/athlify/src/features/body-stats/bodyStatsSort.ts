import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { parseSort, SORT_PARAM, sortToOrder, type ListSort } from '../../lib/sort'
import { bodyStatsMetrics } from './bodyStatsMetrics'

export const bodyStatsSortColumns = ['date', ...bodyStatsMetrics.map((metric) => metric.key)]

export const defaultBodyStatsSort: ListSort = { column: 'date', desc: true }

/**
 * The order of the history table from `?sort=` (newest first by default) and the matching `order`
 * of the history query. The table and the mutations both read it here: the Relay connection is
 * stored per order, so an add or delete must target the connection of the order on screen.
 */
export function useBodyStatsHistorySort() {
  const [searchParams] = useSearchParams()
  const raw = searchParams.get(SORT_PARAM)
  return useMemo(() => {
    const sort = parseSort(raw, bodyStatsSortColumns, defaultBodyStatsSort)
    return { sort, order: sortToOrder(sort) }
  }, [raw])
}
