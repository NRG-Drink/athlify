import type { SortModelItem } from 'ag-grid-community'
import type {
  EventFilterInput,
  EventSortInput,
  EventType,
} from './__generated__/MyEventsPageQuery.graphql'

export const defaultOrder: EventSortInput[] = [{ id: 'ASC' }]

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
      values?: EventType[]
    }
    if ((field === 'name' || field === 'description') && filter.filter) {
      clauses.push({
        [field]: { [filter.type === 'equals' ? 'eq' : 'contains']: filter.filter },
      })
    } else if (field === 'tags' && filter.filter) {
      clauses.push({
        tags: { some: { name: { contains: filter.filter } } },
      })
    } else if (field === 'type' && Array.isArray(filter.values)) {
      clauses.push({ type: { in: filter.values } })
    } else if ((field === 'startDate' || field === 'endDate') && filter.dateFrom) {
      const operator = filter.type === 'equals' ? 'eq' : filter.type === 'lessThan' ? 'lt' : 'gt'
      clauses.push({ [field]: { [operator]: filter.dateFrom } })
    }
  }

  return {
    where: clauses.length === 0 ? null : clauses.length === 1 ? clauses[0] : { and: clauses },
    order,
  }
}
