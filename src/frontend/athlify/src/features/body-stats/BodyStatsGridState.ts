import type { ColumnState, SortModelItem } from 'ag-grid-community'

export const BODY_STATS_COLUMN_STORAGE_KEY = 'athlify.bodystats.columns.v1'
export const BODY_STATS_VIEWS_STORAGE_KEY = 'athlify.bodystats.views.v1'
export const BODY_STATS_FILTER_PREFIX = 'filter.'
export const BODY_STATS_FILTERS_PARAM = 'gridFilters'
export const BODY_STATS_SORT_PARAM = 'gridSort'
export const BODY_STATS_QUICK_PARAM = 'q'
export const BODY_STATS_FROM_PARAM = 'tableFrom'
export const BODY_STATS_TO_PARAM = 'tableTo'

export const bodyStatsColumnIds = [
  'actions',
  'id',
  'date',
  'weight',
  'bodyFatPercentage',
  'musclePercentage',
  'waterPercentage',
  'boneMass',
  'comment',
] as const

const bodyStatsFilterColumnIds = [
  'date',
  'weight',
  'bodyFatPercentage',
  'musclePercentage',
  'waterPercentage',
  'boneMass',
  'comment',
] as const

export const bodyStatsSortableColumnIds = [...bodyStatsFilterColumnIds, 'id'] as const

export type BodyStatsFilterModel = Record<string, unknown>
export type BodyStatsSortModel = SortModelItem[]
export type BodyStatsColumnState = Pick<ColumnState, 'colId' | 'width' | 'hide' | 'pinned'>
export type BodyStatsSavedView = {
  id: string
  name: string
  filters: {
    quick: string
    from: string
    to: string
    grid: BodyStatsFilterModel
  }
  sort: BodyStatsSortModel
  columns: BodyStatsColumnState[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isFilterColumn(column: string) {
  return bodyStatsFilterColumnIds.includes(column as (typeof bodyStatsFilterColumnIds)[number])
}

function parseJson(params: URLSearchParams, key: string): unknown {
  const raw = params.get(key)
  if (!raw) return null

  try {
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

export function parseBodyStatsFilterModel(params: URLSearchParams): BodyStatsFilterModel {
  const flattened = [...params.entries()].filter(([key]) =>
    key.startsWith(BODY_STATS_FILTER_PREFIX),
  )
  if (flattened.length === 0) {
    return parseBodyStatsFilterModelValue(parseJson(params, BODY_STATS_FILTERS_PARAM))
  }

  const result: Record<string, unknown> = {}
  for (const [key, value] of flattened) {
    const path = key.slice(BODY_STATS_FILTER_PREFIX.length).split('.')
    if (!path.length || !isFilterColumn(path[0] ?? '')) continue

    let current: Record<string, unknown> = result
    for (const segment of path.slice(0, -1)) {
      const nested = current[segment]
      if (!isRecord(nested)) current[segment] = {}
      current = current[segment] as Record<string, unknown>
    }
    const leaf = path[path.length - 1]
    if (leaf !== undefined) {
      const previous = current[leaf]
      current[leaf] =
        previous === undefined
          ? value
          : Array.isArray(previous)
            ? [...previous, value]
            : [previous, value]
    }
  }
  return parseBodyStatsFilterModelValue(coerceNumbers(result))
}

function coerceNumbers(model: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(model).map(([column, value]) => {
      if (!isRecord(value)) return [column, value]
      const next = { ...value }
      for (const key of ['filter', 'filterTo']) {
        const raw = next[key]
        if (column !== 'comment' && typeof raw === 'string' && raw.trim() !== '') {
          const number = Number(raw)
          if (Number.isFinite(number)) next[key] = number
        }
      }
      return [column, next]
    }),
  )
}

export function parseBodyStatsFilterModelValue(parsed: unknown): BodyStatsFilterModel {
  if (!isRecord(parsed)) return {}

  return Object.fromEntries(
    Object.entries(parsed).filter(([column, model]) => isFilterColumn(column) && isRecord(model)),
  )
}

export function parseBodyStatsSortModel(params: URLSearchParams): BodyStatsSortModel {
  return parseBodyStatsSortModelValue(parseJson(params, BODY_STATS_SORT_PARAM))
}

export function parseBodyStatsSortModelValue(parsed: unknown): BodyStatsSortModel {
  if (!Array.isArray(parsed)) return []

  return parsed.flatMap((item): SortModelItem[] => {
    if (!isRecord(item) || typeof item.colId !== 'string') return []
    if (
      !bodyStatsSortableColumnIds.includes(
        item.colId as (typeof bodyStatsSortableColumnIds)[number],
      )
    ) {
      return []
    }
    if (item.sort !== 'asc' && item.sort !== 'desc') return []
    return [{ colId: item.colId, sort: item.sort }]
  })
}

export function applyBodyStatsGridState(
  params: URLSearchParams,
  filterModel: BodyStatsFilterModel,
  sortModel: BodyStatsSortModel,
): URLSearchParams {
  const next = new URLSearchParams(params)
  for (const key of [...next.keys()]) {
    if (key.startsWith(BODY_STATS_FILTER_PREFIX) || key === BODY_STATS_FILTERS_PARAM) {
      next.delete(key)
    }
  }
  const flatten = (value: unknown, path: string[]) => {
    if (isRecord(value)) {
      for (const [key, nested] of Object.entries(value)) flatten(nested, [...path, key])
    } else if (Array.isArray(value)) {
      for (const item of value) flatten(item, path)
    } else if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      next.append(`${BODY_STATS_FILTER_PREFIX}${path.join('.')}`, String(value))
    }
  }
  for (const [column, model] of Object.entries(filterModel)) flatten(model, [column])
  if (sortModel.length > 0) next.set(BODY_STATS_SORT_PARAM, JSON.stringify(sortModel))
  else next.delete(BODY_STATS_SORT_PARAM)
  return next
}

export function parseBodyStatsColumnState(raw: string | null): BodyStatsColumnState[] {
  if (!raw) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(raw) as unknown
  } catch {
    return []
  }
  return parseBodyStatsColumnStateValue(parsed)
}

export function parseBodyStatsColumnStateValue(parsed: unknown): BodyStatsColumnState[] {
  if (!Array.isArray(parsed)) return []
  return parsed.flatMap((item): BodyStatsColumnState[] => {
    if (
      !isRecord(item) ||
      typeof item.colId !== 'string' ||
      !bodyStatsColumnIds.includes(item.colId as (typeof bodyStatsColumnIds)[number])
    ) {
      return []
    }

    const state: BodyStatsColumnState = { colId: item.colId, width: 100 }
    if (typeof item.width === 'number' && Number.isFinite(item.width) && item.width > 0) {
      state.width = item.width
    }
    if (typeof item.hide === 'boolean') state.hide = item.hide
    if (item.pinned === 'left' || item.pinned === 'right' || item.pinned === null) {
      state.pinned = item.pinned
    }
    return [state]
  })
}

export function parseBodyStatsSavedViews(raw: string | null): BodyStatsSavedView[] {
  if (!raw) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(raw) as unknown
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []

  const views: BodyStatsSavedView[] = []
  const seenIds = new Set<string>()
  const seenNames = new Set<string>()
  for (const item of parsed) {
    if (
      !isRecord(item) ||
      typeof item.id !== 'string' ||
      !item.id ||
      typeof item.name !== 'string' ||
      !item.name.trim() ||
      item.name.length > 80 ||
      !isRecord(item.filters) ||
      typeof item.filters.quick !== 'string' ||
      typeof item.filters.from !== 'string' ||
      typeof item.filters.to !== 'string'
    ) {
      continue
    }

    const name = item.name.trim()
    const nameKey = name.toLocaleLowerCase()
    if (seenIds.has(item.id) || seenNames.has(nameKey)) continue
    seenIds.add(item.id)
    seenNames.add(nameKey)
    views.push({
      id: item.id,
      name,
      filters: {
        quick: item.filters.quick,
        from: item.filters.from,
        to: item.filters.to,
        grid: parseBodyStatsFilterModelValue(item.filters.grid),
      },
      sort: parseBodyStatsSortModelValue(item.sort),
      columns: parseBodyStatsColumnStateValue(item.columns),
    })
  }
  return views
}

export function serializeBodyStatsSavedViews(views: BodyStatsSavedView[]): string {
  return JSON.stringify(views)
}

export function serializeBodyStatsColumnState(columnState: BodyStatsColumnState[]): string {
  return JSON.stringify(
    columnState
      .filter(({ colId }) =>
        bodyStatsColumnIds.includes(colId as (typeof bodyStatsColumnIds)[number]),
      )
      .map(({ colId, width, hide, pinned }) => ({ colId, width, hide, pinned })),
  )
}
