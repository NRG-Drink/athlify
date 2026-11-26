import type { SortModelItem } from 'ag-grid-community'
import type {
  BodyStatsFilterInput,
  BodyStatsSortInput,
} from './__generated__/BodyStatsGridPageQuery.graphql'
import { bodyStatsSortableColumnIds } from './BodyStatsGridState'

export const defaultOrder: BodyStatsSortInput[] = [{ date: 'DESC' }, { id: 'DESC' }]

const textFilterOperators: Record<string, string> = {
  equals: 'eq',
  notEqual: 'neq',
  contains: 'contains',
  notContains: 'ncontains',
  startsWith: 'startsWith',
  endsWith: 'endsWith',
}

const numberFilterOperators: Record<string, string> = {
  equals: 'eq',
  notEqual: 'neq',
  lessThan: 'lt',
  greaterThan: 'gt',
}

const numberFields = [
  'weight',
  'bodyFatPercentage',
  'musclePercentage',
  'waterPercentage',
  'boneMass',
] as const

type NumberField = (typeof numberFields)[number]

type GridFilter = {
  filter?: number | string
  filterTo?: number
  type?: string
  dateFrom?: string
  dateTo?: string
}

const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})/

export function dayStartIso(dateKey: string): string | null {
  const match = DATE_KEY.exec(dateKey)
  if (!match) return null
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).toISOString()
}

export function dayEndIso(dateKey: string): string | null {
  const match = DATE_KEY.exec(dateKey)
  if (!match) return null
  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    23,
    59,
    59,
    999,
  ).toISOString()
}

function getIdFilter({ type = 'equals', filter }: GridFilter): BodyStatsFilterInput | null {
  if (typeof filter !== 'number' || !Number.isSafeInteger(filter)) return null
  const globalId = btoa(`BodyStats:${filter}`)
  if (type === 'equals') return { id: { eq: globalId } }
  if (type === 'notEqual') return { id: { neq: globalId } }
  return null
}

function getTextFilter(type: string, value?: number | string): BodyStatsFilterInput | null {
  const operator = textFilterOperators[type]
  if (operator && typeof value === 'string' && value) {
    return { comment: { [operator]: value } }
  }
  if (type === 'blank') return { or: [{ comment: { eq: null } }, { comment: { eq: '' } }] }
  if (type === 'notBlank') return { and: [{ comment: { neq: null } }, { comment: { neq: '' } }] }
  return null
}

function getNumberFilter(
  field: NumberField,
  { type = 'equals', filter, filterTo }: GridFilter,
): BodyStatsFilterInput | null {
  if (typeof filter !== 'number' || !Number.isFinite(filter)) return null
  if (type === 'inRange') {
    return typeof filterTo === 'number' && Number.isFinite(filterTo)
      ? { [field]: { gte: filter, lte: filterTo } }
      : null
  }
  const operator = numberFilterOperators[type]
  return operator ? { [field]: { [operator]: filter } } : null
}

function getDateFilter({
  type = 'equals',
  dateFrom,
  dateTo,
}: GridFilter): BodyStatsFilterInput | null {
  const start = dateFrom ? dayStartIso(dateFrom) : null
  const end = dateFrom ? dayEndIso(dateFrom) : null
  if (!start || !end) return null

  switch (type) {
    case 'equals':
      return { date: { gte: start, lte: end } }
    case 'notEqual':
      return { or: [{ date: { lt: start } }, { date: { gt: end } }] }
    case 'lessThan':
      return { date: { lt: start } }
    case 'greaterThan':
      return { date: { gt: end } }
    case 'inRange': {
      const rangeEnd = dateTo ? dayEndIso(dateTo) : null
      return rangeEnd ? { date: { gte: start, lte: rangeEnd } } : null
    }
    default:
      return null
  }
}

export function getGridQuery(
  sortModel: SortModelItem[],
  filterModel: Record<string, unknown>,
  baseWhere: BodyStatsFilterInput | null,
): { where: BodyStatsFilterInput | null; order: BodyStatsSortInput[] } {
  const order = sortModel.flatMap(({ colId, sort }) =>
    (bodyStatsSortableColumnIds as readonly string[]).includes(colId) && sort
      ? [{ [colId]: sort.toUpperCase() as 'ASC' | 'DESC' }]
      : [],
  ) as BodyStatsSortInput[]
  if (order.length === 0) order.push(...defaultOrder)
  else if (!order.some((item) => 'id' in item)) order.push({ id: 'DESC' })

  const clauses: BodyStatsFilterInput[] = baseWhere ? [baseWhere] : []
  for (const [field, raw] of Object.entries(filterModel)) {
    const filter = raw as GridFilter
    if (filter.type === 'none') continue

    let clause: BodyStatsFilterInput | null = null
    if (field === 'comment') clause = getTextFilter(filter.type ?? 'contains', filter.filter)
    else if (field === 'id') clause = getIdFilter(filter)
    else if (field === 'date') clause = getDateFilter(filter)
    else if ((numberFields as readonly string[]).includes(field)) {
      clause = getNumberFilter(field as NumberField, filter)
    }
    if (clause) clauses.push(clause)
  }

  return {
    where: clauses.length === 0 ? null : clauses.length === 1 ? clauses[0]! : { and: clauses },
    order,
  }
}
