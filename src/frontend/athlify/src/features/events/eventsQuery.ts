import { applySort, parseSort, sortToOrder, type ListSort } from '../../lib/sort'

export const eventTypes = [
  'CRASH',
  'INJURY',
  'ILLNESS',
  'REPAIR',
  'BREAK',
  'GOAL',
  'OTHER',
] as const

export type EventType = (typeof eventTypes)[number]

export const isEventType = (value: string | null): value is EventType =>
  eventTypes.some((eventType) => eventType === value)

export const eventSortColumns = ['name', 'type', 'description', 'startDate', 'endDate'] as const
export type EventSort = ListSort<(typeof eventSortColumns)[number]>

export const defaultEventSort: EventSort = { column: 'startDate', desc: true }

export interface EventQuery {
  filters: {
    search: string
    type: EventType | undefined
  }
  sort: EventSort
}

export function parseEventQuery(params: URLSearchParams): EventQuery {
  const type = params.get('type')
  return {
    filters: {
      search: params.get('search')?.trim() ?? '',
      type: isEventType(type) ? type : undefined,
    },
    sort: parseSort(params.get('sort'), eventSortColumns, defaultEventSort),
  }
}

export function applyEventQuery(params: URLSearchParams, query: EventQuery) {
  const next = new URLSearchParams(params)
  const search = query.filters.search.trim()
  if (search) next.set('search', search)
  else next.delete('search')

  if (query.filters.type) next.set('type', query.filters.type)
  else next.delete('type')

  return applySort(next, query.sort, defaultEventSort)
}

export function eventQueryVariables(query: EventQuery) {
  const clauses = []
  if (query.filters.search) {
    clauses.push({
      or: [
        { name: { contains: query.filters.search } },
        { description: { contains: query.filters.search } },
      ],
    })
  }
  if (query.filters.type) clauses.push({ type: { eq: query.filters.type } })

  const where =
    clauses.length === 0 ? undefined : clauses.length === 1 ? clauses[0] : { and: clauses }

  return { where, order: sortToOrder(query.sort) }
}
