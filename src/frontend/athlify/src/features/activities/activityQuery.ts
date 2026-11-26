import type { SortModelItem } from 'ag-grid-community'
import {
  activityFiltersToWhere,
  applyActivityFilters,
  parseActivityFilters,
  setActivityFilterValues,
  type ActivityFilters,
} from './activityFilters'
import type { ActivityType, Mood, Wind } from './activityFilters'

export const activitySortColumns = [
  'date',
  'time',
  'distance',
  'elevationGain',
  'averageSpeed',
  'tss',
  'heartRate',
  'heartRateMin',
  'heartRateMax',
  'effort',
] as const

export type ActivitySortColumn = (typeof activitySortColumns)[number]
export type ActivitySort = SortModelItem[]
export type ActivityGridFilterModel = Record<string, unknown>

export const defaultActivitySort: ActivitySort = [{ colId: 'date', sort: 'desc' }]
export const ACTIVITY_GRID_FILTERS_PARAM = 'gridFilters'

const gridFilterColumnIds = [
  'date',
  'description',
  'time',
  'distance',
  'elevationGain',
  'averageSpeed',
  'tss',
  'heartRate',
  'effort',
  'mood',
  'gadgets',
] as const
type GridFilterColumn = (typeof gridFilterColumnIds)[number]

const sortFields: Partial<Record<ActivitySortColumn, string>> = { heartRate: 'heartRateAverage' }
const dateOnly = /^(\d{4})-(\d{2})-(\d{2})/

/** Everything the URL says about which activities to show and in which order. */
export interface ActivityQuery {
  filters: ActivityFilters
  gridFilters: ActivityGridFilterModel
  quickFilter: string
  fromFilter: string
  toFilter: string
  sort: ActivitySort
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function parseGridFilters(raw: string | null): ActivityGridFilterModel {
  if (!raw) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) return {}
    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([key, value]) =>
          gridFilterColumnIds.includes(key as GridFilterColumn) && isRecord(value),
      ),
    )
  } catch {
    return {}
  }
}

function parseSortModel(params: URLSearchParams): ActivitySort {
  const items = params.getAll('sort').flatMap((raw): ActivitySort => {
    const desc = raw.startsWith('-')
    const colId = desc ? raw.slice(1) : raw
    return activitySortColumns.includes(colId as ActivitySortColumn)
      ? [{ colId, sort: desc ? 'desc' : 'asc' }]
      : []
  })
  const unique = items.filter(
    (item, index) => items.findIndex((other) => other.colId === item.colId) === index,
  )
  return unique.length > 0 ? unique : defaultActivitySort
}

/** Reads legacy single-column and repeated multi-column sort parameters. */
export function parseActivityQuery(params: URLSearchParams): ActivityQuery {
  return {
    filters: parseActivityFilters(params),
    gridFilters: parseGridFilters(params.get(ACTIVITY_GRID_FILTERS_PARAM)),
    quickFilter: params.get('q') ?? '',
    fromFilter: params.get('from') ?? '',
    toFilter: params.get('to') ?? '',
    sort: parseSortModel(params),
  }
}

/** Writes query state while preserving unrelated URL parameters and legacy filter links. */
export function applyActivityQuery(params: URLSearchParams, query: ActivityQuery) {
  const next = applyActivityFilters(params, query.filters)
  for (const key of ['q', 'from', 'to', ACTIVITY_GRID_FILTERS_PARAM, 'sort']) next.delete(key)
  if (query.quickFilter.trim()) next.set('q', query.quickFilter.trim())
  if (query.fromFilter) next.set('from', query.fromFilter)
  if (query.toFilter) next.set('to', query.toFilter)
  if (Object.keys(query.gridFilters).length > 0) {
    next.set(ACTIVITY_GRID_FILTERS_PARAM, JSON.stringify(query.gridFilters))
  }
  const sort = query.sort.length === 0 ? defaultActivitySort : query.sort
  if (
    sort.length !== defaultActivitySort.length ||
    sort[0]?.colId !== defaultActivitySort[0]?.colId ||
    sort[0]?.sort !== defaultActivitySort[0]?.sort
  ) {
    for (const item of sort) next.append('sort', `${item.sort === 'desc' ? '-' : ''}${item.colId}`)
  }
  return next
}

function localDayBounds(value: string) {
  const match = dateOnly.exec(value)
  if (!match) return null
  const [, year, month, day] = match
  const start = new Date(Number(year), Number(month) - 1, Number(day))
  if (
    start.getFullYear() !== Number(year) ||
    start.getMonth() !== Number(month) - 1 ||
    start.getDate() !== Number(day)
  ) {
    return null
  }
  const end = new Date(Number(year), Number(month) - 1, Number(day) + 1)
  return { start: start.toISOString(), end: new Date(end.getTime() - 1).toISOString() }
}

function textFilter(field: 'description', model: Record<string, unknown>) {
  const type = typeof model.type === 'string' ? model.type : 'contains'
  const filter = typeof model.filter === 'string' ? model.filter : ''
  const operators: Record<string, string> = {
    equals: 'eq',
    notEqual: 'neq',
    contains: 'contains',
    notContains: 'ncontains',
    startsWith: 'startsWith',
    endsWith: 'endsWith',
  }
  const operation = operators[type]
  if (operation && filter) return { [field]: { [operation]: filter } }
  if (type === 'blank' || type === 'notBlank') {
    return type === 'blank'
      ? { or: [{ [field]: { eq: null } }, { [field]: { eq: '' } }] }
      : { and: [{ [field]: { neq: null } }, { [field]: { neq: '' } }] }
  }
  return null
}

function numberFilter(field: string, model: Record<string, unknown>) {
  const type = typeof model.type === 'string' ? model.type : 'equals'
  if (type === 'blank' || type === 'notBlank') {
    return { [field]: { [type === 'blank' ? 'eq' : 'neq']: null } }
  }
  const rawValue = model.filter
  if (
    (typeof rawValue !== 'number' && typeof rawValue !== 'string') ||
    (typeof rawValue === 'string' && rawValue.trim() === '')
  ) {
    return null
  }
  const value = typeof rawValue === 'number' ? rawValue : Number(rawValue)
  if (!Number.isFinite(value)) return null
  if (type === 'inRange') {
    const end = typeof model.filterTo === 'number' ? model.filterTo : Number(model.filterTo)
    return Number.isFinite(end) ? { [field]: { gte: value, lte: end } } : null
  }
  const operators: Record<string, string> = {
    equals: 'eq',
    notEqual: 'neq',
    lessThan: 'lt',
    lessThanOrEqual: 'lte',
    greaterThan: 'gt',
    greaterThanOrEqual: 'gte',
  }
  const operator = operators[type]
  return operator ? { [field]: { [operator]: value } } : null
}

function gridFilterClauses(gridFilters: ActivityGridFilterModel): Record<string, unknown>[] {
  const clauses: Record<string, unknown>[] = []
  for (const [column, raw] of Object.entries(gridFilters)) {
    if (!isRecord(raw) || raw.type === 'none') continue
    if (column === 'description') {
      const filter = textFilter('description', raw)
      if (filter) clauses.push(filter)
    } else if (column === 'mood' && Array.isArray(raw.values)) {
      clauses.push({ mood: { in: raw.values.filter((value): value is Mood => typeof value === 'string') } })
    } else if (column === 'gadgets' && Array.isArray(raw.values)) {
      clauses.push({
        gadgets: { some: { id: { in: raw.values.filter((value): value is string => typeof value === 'string') } } },
      })
    } else if (column === 'time' || column === 'effort') {
      const filter = numberFilter(column, raw)
      if (filter) clauses.push(filter)
    } else if (
      column === 'distance' ||
      column === 'elevationGain' ||
      column === 'averageSpeed' ||
      column === 'tss' ||
      column === 'heartRate' ||
      column === 'heartRateMin' ||
      column === 'heartRateMax'
    ) {
      const field =
        column === 'heartRate'
          ? 'heartRateAverage'
          : column === 'heartRateMin'
            ? 'heartRateMin'
            : column === 'heartRateMax'
              ? 'heartRateMax'
              : column
      const filter = numberFilter(field, raw)
      if (filter) clauses.push(filter)
    }
  }
  return clauses
}

function dateFilterClause(raw: unknown) {
  if (!isRecord(raw)) return null
  const type = typeof raw.type === 'string' ? raw.type : 'equals'
  if (type === 'blank' || type === 'notBlank') {
    return { date: { [type === 'blank' ? 'eq' : 'neq']: null } }
  }
  const start = localDayBounds(String(raw.dateFrom ?? ''))
  if (!start) return null
  if (type === 'inRange') {
    const end = localDayBounds(String(raw.dateTo ?? ''))
    return end ? { date: { gte: start.start, lte: end.end } } : null
  }
  if (type === 'equals') return { date: { gte: start.start, lte: start.end } }
  if (type === 'notEqual') {
    return {
      or: [{ date: { lt: start.start } }, { date: { gt: start.end } }],
    }
  }
  if (type === 'lessThan') return { date: { lt: start.start } }
  if (type === 'greaterThan') return { date: { gt: start.end } }
  return null
}

/** Combines external and column filters into the server-owned GraphQL filter. */
export function activityQueryVariables(query: ActivityQuery) {
  const clauses: Record<string, unknown>[] = []
  const categorical = activityFiltersToWhere(query.filters)
  if (categorical) clauses.push(categorical)

  const quickFilter = query.quickFilter.trim()
  if (quickFilter) clauses.push({ description: { contains: quickFilter } })
  const from = localDayBounds(query.fromFilter)
  const to = localDayBounds(query.toFilter)
  if (from) clauses.push({ date: { gte: from.start } })
  if (to) clauses.push({ date: { lte: to.end } })

  const columnDate = dateFilterClause(query.gridFilters.date)
  if (columnDate) clauses.push(columnDate)
  clauses.push(...gridFilterClauses(query.gridFilters))

  const order = query.sort
    .filter(
      (item): item is SortModelItem & { colId: ActivitySortColumn; sort: 'asc' | 'desc' } =>
        activitySortColumns.includes(item.colId as ActivitySortColumn) &&
        (item.sort === 'asc' || item.sort === 'desc'),
    )
    .map(({ colId, sort }) => ({
      [sortFields[colId] ?? colId]: sort.toUpperCase() as 'ASC' | 'DESC',
    }))
  if (order.length === 0) order.push({ date: 'DESC' })
  if (!order.some((item) => 'id' in item)) order.push({ id: 'DESC' })

  return {
    where: clauses.length === 0 ? undefined : clauses.length === 1 ? clauses[0] : { and: clauses },
    order,
  }
}

const activityFilterColumns = ['type', 'vehicle', 'tags', 'wind'] as const

/** Splits an AG Grid filter model into legacy URL-backed checklists and other column filters. */
export function splitActivityFilterModel(model: ActivityGridFilterModel): {
  filters: ActivityFilters
  gridFilters: ActivityGridFilterModel
} {
  let filters: ActivityFilters = {}
  for (const column of activityFilterColumns) {
    const values = isRecord(model[column]) && Array.isArray(model[column].values)
      ? model[column].values.filter((value): value is string => typeof value === 'string')
      : []
    filters = setActivityFilterValues(
      filters,
      column === 'tags' ? 'tag' : column,
      values,
    )
  }
  return {
    filters,
    gridFilters: Object.fromEntries(
      Object.entries(model).filter(
        ([key, value]) =>
          !activityFilterColumns.includes(key as (typeof activityFilterColumns)[number]) &&
          isRecord(value),
      ),
    ),
  }
}

/** Builds the AG Grid model from the URL-backed checklist filters and native column filters. */
export function activityFilterModel(query: Pick<ActivityQuery, 'filters' | 'gridFilters'>) {
  const model: ActivityGridFilterModel = { ...query.gridFilters }
  if (query.filters.types?.length) model.type = { values: query.filters.types as ActivityType[] }
  if (query.filters.vehicleIds?.length) model.vehicle = { values: query.filters.vehicleIds }
  if (query.filters.tagIds?.length) model.tags = { values: query.filters.tagIds }
  if (query.filters.winds?.length) model.wind = { values: query.filters.winds as Wind[] }
  return model
}
