import type { ColumnState } from 'ag-grid-community'

export const DASHBOARD_COLUMN_STORAGE_KEY = 'athlify.dashboard.columns.v1'

/** The table's columns in default order; the ones in `optionalColumnIds` start hidden. */
export const dashboardColumnIds = [
  'period',
  'count',
  'hours',
  'distance',
  'elevationGain',
  'tss',
  'speed',
  'weight',
  'bodyFat',
  'muscle',
  'water',
  'bone',
  'ctl',
  'atl',
  'tsb',
  'events',
] as const

export type DashboardColumnId = (typeof dashboardColumnIds)[number]

export const optionalColumnIds: readonly DashboardColumnId[] = [
  'bodyFat',
  'water',
  'bone',
  'atl',
  'tsb',
]

/** The part of AG Grid's column state that the browser remembers. */
export type DashboardColumnState = Pick<ColumnState, 'colId' | 'width' | 'hide'>

export function parseDashboardColumnState(raw: string | null): DashboardColumnState[] {
  if (!raw) return []
  try {
    const value: unknown = JSON.parse(raw)
    if (!Array.isArray(value)) return []
    return value.flatMap((item): DashboardColumnState[] => {
      if (typeof item !== 'object' || item === null) return []
      const { colId, width, hide } = item as Record<string, unknown>
      if (!dashboardColumnIds.includes(colId as DashboardColumnId)) return []
      const state: DashboardColumnState = { colId: colId as string }
      if (typeof width === 'number' && Number.isFinite(width) && width > 0) state.width = width
      if (typeof hide === 'boolean') state.hide = hide
      return [state]
    })
  } catch {
    return []
  }
}

export function serializeDashboardColumnState(columnState: readonly ColumnState[]): string {
  return JSON.stringify(
    columnState.map(({ colId, width, hide }) => ({ colId, width, hide: hide ?? false })),
  )
}
