import type { GridApi } from 'ag-grid-community'

const quickFilterParam = 'agEventsSearch'
const filterModelParam = 'agEventsFilters'
const sortParam = 'agEventsSort'
const columnStateStorageKey = 'athlify.events.agGrid.columnState'

type GridFilterModel = ReturnType<GridApi['getFilterModel']>
type GridColumnState = ReturnType<GridApi['getColumnState']>

const columnIds = new Set(['name', 'type', 'startDate', 'endDate', 'description', 'tags'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFilterModel(value: unknown): value is GridFilterModel {
  if (!isRecord(value)) return false
  return Object.entries(value).every(([column, model]) => {
    if (!columnIds.has(column) || !isRecord(model)) return false
    if (model.filterType === 'text') {
      return (
        ['contains', 'notContains', 'equals', 'notEqual', 'startsWith', 'endsWith'].includes(
          String(model.type),
        ) && typeof model.filter === 'string'
      )
    }
    if (model.filterType === 'date') {
      return (
        ['equals', 'notEqual', 'lessThan', 'greaterThan', 'inRange', 'blank', 'notBlank'].includes(
          String(model.type),
        ) &&
        (model.dateFrom === undefined || typeof model.dateFrom === 'string') &&
        (model.dateTo === undefined || typeof model.dateTo === 'string')
      )
    }
    return false
  })
}

export function readAgEventsUrlState(params: URLSearchParams) {
  const search = params.get(quickFilterParam)?.trim() ?? ''
  const filterValue = params.get(filterModelParam)
  let filterModel: GridFilterModel = {}
  if (filterValue) {
    try {
      const parsed: unknown = JSON.parse(filterValue)
      if (isFilterModel(parsed)) filterModel = parsed
    } catch (error) {
      console.warn('Ignoring invalid AG-Events filter state in the URL.', error)
    }
  }

  const sortValue = params.get(sortParam)
  const sortModel = sortValue
    ?.split(',')
    .map((item) => {
      const [colId, direction] = item.split(':')
      return columnIds.has(colId) && (direction === 'asc' || direction === 'desc')
        ? { colId, sort: direction }
        : null
    })
    .filter((item): item is { colId: string; sort: 'asc' | 'desc' } => item !== null) ?? []

  return { search, filterModel, sortModel }
}

export function writeAgEventsUrlState(
  params: URLSearchParams,
  state: {
    search: string
    filterModel: GridFilterModel
    sortModel: Array<{ colId: string; sort: 'asc' | 'desc' }>
  },
) {
  const next = new URLSearchParams(params)
  next.delete(quickFilterParam)
  next.delete(filterModelParam)
  next.delete(sortParam)

  const search = state.search.trim()
  if (search) next.set(quickFilterParam, search)
  if (Object.keys(state.filterModel).length > 0) {
    next.set(filterModelParam, JSON.stringify(state.filterModel))
  }
  if (state.sortModel.length > 0) {
    next.set(sortParam, state.sortModel.map(({ colId, sort }) => `${colId}:${sort}`).join(','))
  }
  return next
}

export function readAgEventsColumnState(): GridColumnState | undefined {
  let serialized: string | null
  try {
    serialized = window.localStorage.getItem(columnStateStorageKey)
  } catch (error) {
    console.warn('Unable to read saved AG-Events column state.', error)
    return undefined
  }
  if (!serialized) return undefined

  try {
    const parsed: unknown = JSON.parse(serialized)
    if (
      Array.isArray(parsed) &&
      parsed.every(
        (column) =>
          isRecord(column) &&
          typeof column.colId === 'string' &&
          columnIds.has(column.colId),
      )
    ) {
      return parsed as GridColumnState
    }
  } catch (error) {
    console.warn('Ignoring invalid saved AG-Events column state.', error)
    return undefined
  }

  console.warn('Ignoring invalid saved AG-Events column state.')
  return undefined
}

export function saveAgEventsColumnState(state: GridColumnState) {
  try {
    window.localStorage.setItem(columnStateStorageKey, JSON.stringify(state))
  } catch (error) {
    console.error('Unable to save AG-Events column state.', error)
  }
}
