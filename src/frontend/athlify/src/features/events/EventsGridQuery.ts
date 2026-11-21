import type { SortModelItem } from 'ag-grid-community'
import type {
  EventFilterInput,
  EventSortInput,
  EventType,
} from './__generated__/EventsManagementPageQuery.graphql'

export const defaultOrder: EventSortInput[] = [{ id: 'ASC' }]

const textFilterOperators: Record<string, string> = {
  equals: 'eq',
  notEqual: 'neq',
  contains: 'contains',
  notContains: 'ncontains',
  startsWith: 'startsWith',
  endsWith: 'endsWith',
}

const dateFilterOperators: Record<string, string> = {
  equals: 'eq',
  notEqual: 'neq',
  lessThan: 'lt',
  greaterThan: 'gt',
}

function getTextFilter(field: 'name' | 'description' | 'tags', type: string, value?: string) {
  const operator = textFilterOperators[type]
  if (operator && value) {
    const operation = { [operator]: value }
    return field === 'tags'
      ? { tags: { some: { name: operation } } }
      : { [field]: operation }
  }

  if (type === 'blank' || type === 'notBlank') {
    const empty = type === 'blank'
    if (field === 'tags') return { tags: { [empty ? 'none' : 'some']: {} } }
    return empty
      ? { or: [{ [field]: { eq: null } }, { [field]: { eq: '' } }] }
      : { and: [{ [field]: { neq: null } }, { [field]: { neq: '' } }] }
  }
  return null
}

export function getGridQuery(
  sortModel: SortModelItem[],
  filterModel: Record<string, unknown>,
  baseWhere: EventFilterInput | null,
): { where: EventFilterInput | null; order: EventSortInput[] } {
  const order = sortModel.flatMap(({ colId, sort }) =>
    ['name', 'startDate', 'endDate', 'id', 'type', 'description'].includes(colId) && sort
      ? [{ [colId]: sort.toUpperCase() as 'ASC' | 'DESC' }]
      : [],
  ) as EventSortInput[]
  if (order.length === 0) order.push(...defaultOrder)
  else if (!order.some((item) => 'id' in item)) order.push({ id: 'ASC' })

  const clauses: EventFilterInput[] = baseWhere ? [baseWhere] : []
  for (const [field, raw] of Object.entries(filterModel)) {
    const filter = raw as {
      filter?: string
      type?: string
      dateFrom?: string
      dateTo?: string
      values?: EventType[]
    }
    if (filter.type === 'none') continue

    if (field === 'name' || field === 'description' || field === 'tags') {
      const textFilter = getTextFilter(field, filter.type ?? 'contains', filter.filter)
      if (textFilter) clauses.push(textFilter as EventFilterInput)
    } else if (field === 'type' && Array.isArray(filter.values)) {
      clauses.push({ type: { in: filter.values } })
    } else if (
      (field === 'startDate' || field === 'endDate') &&
      (filter.type === 'blank' || filter.type === 'notBlank')
    ) {
      clauses.push({
        [field]: { [filter.type === 'blank' ? 'eq' : 'neq']: null },
      })
    } else if (
      (field === 'startDate' || field === 'endDate') &&
      filter.dateFrom &&
      dateFilterOperators[filter.type ?? 'equals']
    ) {
      const operator = dateFilterOperators[filter.type ?? 'equals']!
      clauses.push({ [field]: { [operator]: filter.dateFrom } })
    } else if ((field === 'startDate' || field === 'endDate') && filter.type === 'inRange' &&
      filter.dateFrom && filter.dateTo) {
      clauses.push({ [field]: { gte: filter.dateFrom, lte: filter.dateTo } })
    }
  }

  return {
    where: clauses.length === 0 ? null : clauses.length === 1 ? clauses[0] : { and: clauses },
    order,
  }
}
