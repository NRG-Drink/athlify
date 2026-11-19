import type { ColumnState, SortModelItem } from 'ag-grid-community'

export const EVENTS_COLUMN_STORAGE_KEY = 'athlify.events.columns.v1'
export const EVENTS_VIEWS_STORAGE_KEY = 'athlify.events.views.v1'
export const EVENTS_FILTERS_PARAM = 'gridFilters'
export const EVENTS_SORT_PARAM = 'gridSort'

export const eventsColumnIds = [
  'delete',
  'id',
  'name',
  'startDate',
  'endDate',
  'type',
  'tags',
  'description',
] as const

const eventsFilterColumnIds = [
  'name',
  'startDate',
  'endDate',
  'type',
  'tags',
  'description',
] as const

const eventsSortableColumnIds = [
  'id',
  'name',
  'startDate',
  'endDate',
  'type',
  'description',
] as const

export type EventsFilterModel = Record<string, unknown>
export type EventsSortModel = SortModelItem[]
export type EventsColumnState = Pick<ColumnState, 'colId' | 'width' | 'hide' | 'pinned'>
export type EventsSavedView = {
  id: string
  name: string
  filters: {
    quick: string
    from: string
    to: string
    grid: EventsFilterModel
  }
  sort: EventsSortModel
  columns: EventsColumnState[]
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

export function parseEventsFilterModel(params: URLSearchParams): EventsFilterModel {
  return parseEventsFilterModelValue(parseJson(params, EVENTS_FILTERS_PARAM))
}

export function parseEventsFilterModelValue(parsed: unknown): EventsFilterModel {
  if (!isRecord(parsed)) return {}

  return Object.fromEntries(
    Object.entries(parsed).filter(
      ([column, model]) =>
        eventsFilterColumnIds.includes(column as (typeof eventsFilterColumnIds)[number]) &&
        isRecord(model),
    ),
  )
}

export function parseEventsSortModel(params: URLSearchParams): EventsSortModel {
  return parseEventsSortModelValue(parseJson(params, EVENTS_SORT_PARAM))
}

export function parseEventsSortModelValue(parsed: unknown): EventsSortModel {
  if (!Array.isArray(parsed)) return []

  return parsed.flatMap((item): SortModelItem[] => {
    if (!isRecord(item) || typeof item.colId !== 'string') return []
    if (
      !eventsSortableColumnIds.includes(item.colId as (typeof eventsSortableColumnIds)[number])
    ) {
      return []
    }
    if (item.sort !== 'asc' && item.sort !== 'desc') return []
    return [{ colId: item.colId, sort: item.sort }]
  })
}

export function applyEventsGridState(
  params: URLSearchParams,
  filterModel: EventsFilterModel,
  sortModel: EventsSortModel,
): URLSearchParams {
  const next = new URLSearchParams(params)
  if (Object.keys(filterModel).length > 0) {
    next.set(EVENTS_FILTERS_PARAM, JSON.stringify(filterModel))
  } else {
    next.delete(EVENTS_FILTERS_PARAM)
  }
  if (sortModel.length > 0) {
    next.set(EVENTS_SORT_PARAM, JSON.stringify(sortModel))
  } else {
    next.delete(EVENTS_SORT_PARAM)
  }
  return next
}

export function parseEventsColumnState(raw: string | null): EventsColumnState[] {
  if (!raw) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(raw) as unknown
  } catch {
    return []
  }
  return parseEventsColumnStateValue(parsed)
}

export function parseEventsColumnStateValue(parsed: unknown): EventsColumnState[] {
  if (!Array.isArray(parsed)) return []
  return parsed.flatMap((item): EventsColumnState[] => {
    if (
      !isRecord(item) ||
      typeof item.colId !== 'string' ||
      !eventsColumnIds.includes(item.colId as (typeof eventsColumnIds)[number])
    ) {
      return []
    }

    const state: EventsColumnState = { colId: item.colId, width: 100 }
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

export function parseEventsSavedViews(raw: string | null): EventsSavedView[] {
  if (!raw) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(raw) as unknown
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []

  const views: EventsSavedView[] = []
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
        grid: parseEventsFilterModelValue(item.filters.grid),
      },
      sort: parseEventsSortModelValue(item.sort),
      columns: parseEventsColumnStateValue(item.columns),
    })
  }
  return views
}

export function serializeEventsSavedViews(views: EventsSavedView[]): string {
  return JSON.stringify(views)
}

export function serializeEventsColumnState(columnState: EventsColumnState[]): string {
  return JSON.stringify(
    columnState
      .filter(({ colId }) =>
        eventsColumnIds.includes(colId as (typeof eventsColumnIds)[number]),
      )
      .map(({ colId, width, hide, pinned }) => ({ colId, width, hide, pinned })),
  )
}
