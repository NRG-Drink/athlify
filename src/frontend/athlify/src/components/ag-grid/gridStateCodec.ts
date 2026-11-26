import type { SortModelItem } from 'ag-grid-community'
import type { GridColumnState } from './useGridColumnPreferences'

export type GridFilterModel = Record<string, unknown>
export type GridSortModel = SortModelItem[]

/** A named combination of filters, sort and columns that the user keeps in the browser. */
export type GridSavedView<TColumnState extends GridColumnState = GridColumnState> = {
  id: string
  name: string
  filters: {
    quick: string
    from: string
    to: string
    grid: GridFilterModel
  }
  sort: GridSortModel
  columns: TColumnState[]
}

export interface GridStateConfig {
  columnIds: readonly string[]
  filterColumnIds: readonly string[]
  sortableColumnIds: readonly string[]
  /** URL prefix of the flattened filter model, for example `filter.name.type`. */
  filterPrefix?: string
  /** URL parameter that holds the whole filter model as JSON. */
  filtersParam?: string
  sortParam?: string
  /** Filter model keys whose value is always a list, even when the URL holds a single entry. */
  listLeaves?: readonly string[]
  /** Fixes up a filter model read from flattened URL entries, for example turns numbers from text. */
  normalizeFilterModel?: (model: GridFilterModel) => GridFilterModel
  /** Fixes up the column state after it was read, for example pins a column. */
  normalizeColumnState?: (columns: GridColumnState[]) => GridColumnState[]
}

const maxViewNameLength = 80

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function parseJson(raw: string | null): unknown {
  if (!raw) return null
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

export function createColumnStateCodec<TColumnState extends GridColumnState = GridColumnState>(
  columnIds: readonly string[],
  normalize: (columns: TColumnState[]) => TColumnState[] = (columns) => columns,
) {
  const parseValue = (parsed: unknown): TColumnState[] => {
    if (!Array.isArray(parsed)) return []
    const columns = parsed.flatMap((item): TColumnState[] => {
      if (!isRecord(item) || typeof item.colId !== 'string' || !columnIds.includes(item.colId)) {
        return []
      }
      const state: GridColumnState = { colId: item.colId, width: 100 }
      if (typeof item.width === 'number' && Number.isFinite(item.width) && item.width > 0) {
        state.width = item.width
      }
      if (typeof item.hide === 'boolean') state.hide = item.hide
      if (item.pinned === 'left' || item.pinned === 'right' || item.pinned === null) {
        state.pinned = item.pinned
      }
      return [state as TColumnState]
    })
    return normalize(columns)
  }

  const parse = (raw: string | null): TColumnState[] => parseValue(parseJson(raw))

  const serialize = (columns: TColumnState[]): string =>
    JSON.stringify(
      columns
        .filter(({ colId }) => columnIds.includes(colId))
        .map(({ colId, width, hide, pinned }) => ({ colId, width, hide, pinned })),
    )

  return { parse, parseValue, serialize }
}

/** Reads and writes the filter model, sort model, column state and saved views of one grid. */
export function createGridStateCodec<TColumnState extends GridColumnState = GridColumnState>({
  columnIds,
  filterColumnIds,
  sortableColumnIds,
  filterPrefix = 'filter.',
  filtersParam = 'gridFilters',
  sortParam = 'gridSort',
  listLeaves = [],
  normalizeFilterModel = (model) => model,
  normalizeColumnState,
}: GridStateConfig) {
  const columns = createColumnStateCodec<TColumnState>(
    columnIds,
    normalizeColumnState as ((columns: TColumnState[]) => TColumnState[]) | undefined,
  )

  const parseFilterModelValue = (parsed: unknown): GridFilterModel => {
    if (!isRecord(parsed)) return {}
    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([column, model]) => filterColumnIds.includes(column) && isRecord(model),
      ),
    )
  }

  const parseFilterModel = (params: URLSearchParams): GridFilterModel => {
    const flattened = [...params.entries()].filter(([key]) => key.startsWith(filterPrefix))
    if (flattened.length === 0) return parseFilterModelValue(parseJson(params.get(filtersParam)))

    const result: Record<string, unknown> = {}
    for (const [key, value] of flattened) {
      const path = key.slice(filterPrefix.length).split('.')
      if (!path.length || !filterColumnIds.includes(path[0] ?? '')) continue

      let current: Record<string, unknown> = result
      for (const segment of path.slice(0, -1)) {
        if (!isRecord(current[segment])) current[segment] = {}
        current = current[segment] as Record<string, unknown>
      }
      const leaf = path[path.length - 1]
      if (leaf === undefined) continue
      const previous = current[leaf]
      if (listLeaves.includes(leaf)) {
        current[leaf] = [...(Array.isArray(previous) ? previous : []), value]
      } else if (previous === undefined) {
        current[leaf] = value
      } else {
        current[leaf] = Array.isArray(previous) ? [...previous, value] : [previous, value]
      }
    }
    return parseFilterModelValue(normalizeFilterModel(result))
  }

  const parseSortModelValue = (parsed: unknown): GridSortModel => {
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap((item): SortModelItem[] => {
      if (!isRecord(item) || typeof item.colId !== 'string') return []
      if (!sortableColumnIds.includes(item.colId)) return []
      if (item.sort !== 'asc' && item.sort !== 'desc') return []
      return [{ colId: item.colId, sort: item.sort }]
    })
  }

  const parseSortModel = (params: URLSearchParams): GridSortModel =>
    parseSortModelValue(parseJson(params.get(sortParam)))

  const applyGridState = (
    params: URLSearchParams,
    filterModel: GridFilterModel,
    sortModel: GridSortModel,
  ): URLSearchParams => {
    const next = new URLSearchParams(params)
    for (const key of [...next.keys()]) {
      if (key.startsWith(filterPrefix) || key === filtersParam) next.delete(key)
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
        next.append(`${filterPrefix}${path.join('.')}`, String(value))
      }
    }
    for (const [column, model] of Object.entries(filterModel)) flatten(model, [column])

    if (sortModel.length > 0) next.set(sortParam, JSON.stringify(sortModel))
    else next.delete(sortParam)
    return next
  }

  const parseSavedViews = (raw: string | null): GridSavedView<TColumnState>[] => {
    const parsed = parseJson(raw)
    if (!Array.isArray(parsed)) return []

    const views: GridSavedView<TColumnState>[] = []
    const seenIds = new Set<string>()
    const seenNames = new Set<string>()
    for (const item of parsed) {
      if (
        !isRecord(item) ||
        typeof item.id !== 'string' ||
        !item.id ||
        typeof item.name !== 'string' ||
        !item.name.trim() ||
        item.name.length > maxViewNameLength ||
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
          grid: parseFilterModelValue(item.filters.grid),
        },
        sort: parseSortModelValue(item.sort),
        columns: columns.parseValue(item.columns),
      })
    }
    return views
  }

  const serializeSavedViews = (views: GridSavedView<TColumnState>[]): string =>
    JSON.stringify(views)

  return {
    columns,
    parseFilterModel,
    parseFilterModelValue,
    parseSortModel,
    parseSortModelValue,
    applyGridState,
    parseSavedViews,
    serializeSavedViews,
  }
}

export type GridStateCodec<TColumnState extends GridColumnState = GridColumnState> = ReturnType<
  typeof createGridStateCodec<TColumnState>
>
