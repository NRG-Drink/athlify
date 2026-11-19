import type { ColumnState, SortModelItem } from 'ag-grid-community'

export const MY_EVENTS_COLUMN_STORAGE_KEY = 'athlify.myEvents.columns.v1'
export const MY_EVENTS_VIEWS_STORAGE_KEY = 'athlify.myEvents.views.v1'
export const MY_EVENTS_FILTERS_PARAM = 'gridFilters'
export const MY_EVENTS_SORT_PARAM = 'gridSort'

export const myEventsColumnIds = [
  'delete',
  'id',
  'name',
  'startDate',
  'endDate',
  'type',
  'tags',
  'description',
] as const

const myEventsFilterColumnIds = [
  'name',
  'startDate',
  'endDate',
  'type',
  'tags',
  'description',
] as const

const myEventsSortableColumnIds = [
  'id',
  'name',
  'startDate',
  'endDate',
  'type',
  'description',
] as const

export type MyEventsFilterModel = Record<string, unknown>
export type MyEventsSortModel = SortModelItem[]
export type MyEventsColumnState = Pick<ColumnState, 'colId' | 'width' | 'hide' | 'pinned'>
export type MyEventsSavedView = {
  id: string
  name: string
  filters: {
    quick: string
    from: string
    to: string
    grid: MyEventsFilterModel
  }
  sort: MyEventsSortModel
  columns: MyEventsColumnState[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
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

export function parseMyEventsFilterModel(params: URLSearchParams): MyEventsFilterModel {
  return parseMyEventsFilterModelValue(parseJson(params, MY_EVENTS_FILTERS_PARAM))
}

export function parseMyEventsFilterModelValue(parsed: unknown): MyEventsFilterModel {
  if (!isRecord(parsed)) return {}

  return Object.fromEntries(
    Object.entries(parsed).filter(
      ([column, model]) =>
        myEventsFilterColumnIds.includes(column as (typeof myEventsFilterColumnIds)[number]) &&
        isRecord(model),
    ),
  )
}

export function parseMyEventsSortModel(params: URLSearchParams): MyEventsSortModel {
  return parseMyEventsSortModelValue(parseJson(params, MY_EVENTS_SORT_PARAM))
}

export function parseMyEventsSortModelValue(parsed: unknown): MyEventsSortModel {
  if (!Array.isArray(parsed)) return []

  return parsed.flatMap((item): SortModelItem[] => {
    if (!isRecord(item) || typeof item.colId !== 'string') return []
    if (
      !myEventsSortableColumnIds.includes(item.colId as (typeof myEventsSortableColumnIds)[number])
    ) {
      return []
    }
    if (item.sort !== 'asc' && item.sort !== 'desc') return []
    return [{ colId: item.colId, sort: item.sort }]
  })
}

export function applyMyEventsGridState(
  params: URLSearchParams,
  filterModel: MyEventsFilterModel,
  sortModel: MyEventsSortModel,
): URLSearchParams {
  const next = new URLSearchParams(params)
  if (Object.keys(filterModel).length > 0) {
    next.set(MY_EVENTS_FILTERS_PARAM, JSON.stringify(filterModel))
  } else {
    next.delete(MY_EVENTS_FILTERS_PARAM)
  }
  if (sortModel.length > 0) {
    next.set(MY_EVENTS_SORT_PARAM, JSON.stringify(sortModel))
  } else {
    next.delete(MY_EVENTS_SORT_PARAM)
  }
  return next
}

export function parseMyEventsColumnState(raw: string | null): MyEventsColumnState[] {
  if (!raw) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(raw) as unknown
  } catch {
    return []
  }
  return parseMyEventsColumnStateValue(parsed)
}

export function parseMyEventsColumnStateValue(parsed: unknown): MyEventsColumnState[] {
  if (!Array.isArray(parsed)) return []
  return parsed.flatMap((item): MyEventsColumnState[] => {
    if (
      !isRecord(item) ||
      typeof item.colId !== 'string' ||
      !myEventsColumnIds.includes(item.colId as (typeof myEventsColumnIds)[number])
    ) {
      return []
    }

    const state: MyEventsColumnState = { colId: item.colId, width: 100 }
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

export function parseMyEventsSavedViews(raw: string | null): MyEventsSavedView[] {
  if (!raw) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(raw) as unknown
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []

  const views: MyEventsSavedView[] = []
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
        grid: parseMyEventsFilterModelValue(item.filters.grid),
      },
      sort: parseMyEventsSortModelValue(item.sort),
      columns: parseMyEventsColumnStateValue(item.columns),
    })
  }
  return views
}

export function serializeMyEventsSavedViews(views: MyEventsSavedView[]): string {
  return JSON.stringify(views)
}

export function serializeMyEventsColumnState(columnState: MyEventsColumnState[]): string {
  return JSON.stringify(
    columnState
      .filter(({ colId }) =>
        myEventsColumnIds.includes(colId as (typeof myEventsColumnIds)[number]),
      )
      .map(({ colId, width, hide, pinned }) => ({ colId, width, hide, pinned })),
  )
}
