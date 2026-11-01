import { applySort, parseSort, SORT_PARAM, sortToOrder, type ListSort } from '../../lib/sort'
import {
  activityFiltersToWhere,
  applyActivityFilters,
  parseActivityFilters,
  type ActivityFilters,
} from './activityFilters'

/**
 * The columns the server can sort by. Enums (type, mood, wind) are stored as strings, so the server
 * would sort them alphabetically instead of in their natural order; they are not sortable.
 */
export const activitySortColumns = [
  'date',
  'time',
  'distance',
  'elevationGain',
  'averageSpeed',
  'tss',
  'heartRate',
  'effort',
] as const

export type ActivitySort = ListSort<(typeof activitySortColumns)[number]>

export const defaultActivitySort: ActivitySort = { column: 'date', desc: true }

/** Everything the URL says about which activities to show and in which order. */
export interface ActivityQuery {
  filters: ActivityFilters
  sort: ActivitySort
}

/** `sort=distance` is ascending, `sort=-distance` descending; missing or unknown is newest first. */
export function parseActivityQuery(params: URLSearchParams): ActivityQuery {
  return {
    filters: parseActivityFilters(params),
    sort: parseSort(params.get(SORT_PARAM), activitySortColumns, defaultActivitySort),
  }
}

/** Writes the query into the URL parameters; the default order is left out to keep links short. */
export function applyActivityQuery(params: URLSearchParams, query: ActivityQuery) {
  return applySort(applyActivityFilters(params, query.filters), query.sort, defaultActivitySort)
}

/** `where` and `order` (ending with the id as a tie-breaker) of the GraphQL query. */
export function activityQueryVariables(query: ActivityQuery) {
  return {
    where: activityFiltersToWhere(query.filters),
    order: sortToOrder(query.sort, { heartRate: 'heartRateAverage' }),
  }
}
