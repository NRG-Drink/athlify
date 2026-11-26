import { createColumnStateCodec } from '../../components/ag-grid/gridStateCodec'
import type { GridColumnState } from '../../components/ag-grid/useGridColumnPreferences'
import { applyActivityQuery, parseActivityQuery, type ActivityQuery } from './activityQuery'

export const ACTIVITIES_COLUMN_STORAGE_KEY = 'athlify.activities.columns.v1'
export const ACTIVITIES_VIEWS_STORAGE_KEY = 'athlify.activities.views.v1'

export const activitiesColumnIds = [
  'date',
  'type',
  'description',
  'time',
  'distance',
  'vehicle',
  'elevationGain',
  'averageSpeed',
  'tss',
  'heartRate',
  'heartRateMin',
  'heartRateMax',
  'effort',
  'mood',
  'wind',
  'gadgets',
  'tags',
  'actions',
] as const

export type ActivitiesColumnState = GridColumnState

export type ActivitiesSavedView = {
  id: string
  name: string
  query: ActivityQuery
  columns: ActivitiesColumnState[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

const columnStateCodec = createColumnStateCodec<ActivitiesColumnState>(
  activitiesColumnIds,
  (columns) => {
    const actions = columns.find(({ colId }) => colId === 'actions')
    if (!actions) return columns
    return [{ ...actions, pinned: 'left' }, ...columns.filter(({ colId }) => colId !== 'actions')]
  },
)

export const parseActivitiesColumnState = columnStateCodec.parse
export const parseActivitiesColumnStateValue = columnStateCodec.parseValue
export const serializeActivitiesColumnState = columnStateCodec.serialize

export function parseActivitiesSavedViews(raw: string | null): ActivitiesSavedView[] {
  if (!raw) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(raw) as unknown
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []

  const views: ActivitiesSavedView[] = []
  const ids = new Set<string>()
  const names = new Set<string>()
  for (const item of parsed) {
    if (
      !isRecord(item) ||
      typeof item.id !== 'string' ||
      !item.id ||
      typeof item.name !== 'string' ||
      !item.name.trim() ||
      item.name.length > 80 ||
      typeof item.query !== 'string'
    ) {
      continue
    }
    const name = item.name.trim()
    const nameKey = name.toLocaleLowerCase()
    if (ids.has(item.id) || names.has(nameKey)) continue
    ids.add(item.id)
    names.add(nameKey)
    views.push({
      id: item.id,
      name,
      query: parseActivityQuery(new URLSearchParams(item.query)),
      columns: parseActivitiesColumnStateValue(item.columns),
    })
  }
  return views
}

export function serializeActivitiesSavedViews(views: ActivitiesSavedView[]): string {
  return JSON.stringify(
    views.map(({ id, name, query, columns }) => ({
      id,
      name,
      query: applyActivityQuery(new URLSearchParams(), query).toString(),
      columns,
    })),
  )
}
